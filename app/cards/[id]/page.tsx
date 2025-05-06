"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Star, ArrowUp, Tag } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "@/components/ui/use-toast"
import MobileNav from "@/components/mobile-nav"
import { Skeleton } from "@/components/ui/skeleton"
import TiltableCard from "@/components/tiltable-card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { renderStars, getStarInfo } from "@/utils/card-stars"
import SellCardDialog from "@/components/sell-card-dialog"

// Define types for our data
interface UserCard {
  id: string
  user_id: string
  card_id: string
  quantity: number
  level?: number
  favorite?: boolean
  obtained_at?: string
}

interface Card {
  id: string
  name: string
  character: string
  image_url?: string
  rarity: string
  type?: string
  description?: string
}

// Helper functions to safely convert data to our types
function toCard(data: unknown): Card | null {
  if (!data || typeof data !== "object") return null

  const obj = data as Record<string, unknown>

  // Check if the object has the required properties
  if (
    typeof obj.id !== "string" ||
    typeof obj.name !== "string" ||
    typeof obj.character !== "string" ||
    typeof obj.rarity !== "string"
  ) {
    console.error("Invalid card data:", obj)
    return null
  }

  return {
    id: obj.id,
    name: obj.name,
    character: obj.character,
    rarity: obj.rarity,
    image_url: typeof obj.image_url === "string" ? obj.image_url : undefined,
    type: typeof obj.type === "string" ? obj.type : undefined,
    description: typeof obj.description === "string" ? obj.description : undefined,
  }
}

// Update the toUserCard function to be more lenient and add better logging
function toUserCard(data: unknown): UserCard | null {
  if (!data || typeof data !== "object") {
    console.error("User card data is not an object:", data)
    return null
  }

  const obj = data as Record<string, unknown>

  // Log the received data to help diagnose issues
  console.log("Processing user card data:", obj)

  // Check if required properties exist with more detailed logging
  // IMPORTANT: Allow id to be either string or number
  if (typeof obj.id !== "string" && typeof obj.id !== "number") {
    console.error("User card missing id or id is not a string/number:", obj.id)
    return null
  }

  if (typeof obj.user_id !== "string") {
    console.error("User card missing user_id or user_id is not a string:", obj.user_id)
    return null
  }

  if (typeof obj.card_id !== "string") {
    console.error("User card missing card_id or card_id is not a string:", obj.card_id)
    return null
  }

  // Be more lenient with quantity - convert to number if possible or use default
  let quantity = 0
  if (obj.quantity !== undefined) {
    if (typeof obj.quantity === "number") {
      quantity = obj.quantity
    } else if (typeof obj.quantity === "string") {
      // Try to parse string to number
      const parsed = Number.parseInt(obj.quantity, 10)
      if (!isNaN(parsed)) {
        quantity = parsed
      }
    }
  }

  // Create the user card with safe defaults for optional fields
  return {
    // Convert id to string regardless of whether it's a number or string
    id: String(obj.id),
    user_id: obj.user_id,
    card_id: obj.card_id,
    quantity: quantity,
    level:
      typeof obj.level === "number"
        ? obj.level
        : typeof obj.level === "string"
          ? Number.parseInt(obj.level, 10) || 1
          : 1,
    favorite:
      typeof obj.favorite === "boolean"
        ? obj.favorite
        : obj.favorite === "true"
          ? true
          : obj.favorite === "1"
            ? true
            : false,
    obtained_at: typeof obj.obtained_at === "string" ? obj.obtained_at : undefined,
  }
}

function toUserCards(data: unknown[]): UserCard[] {
  if (!Array.isArray(data)) return []

  return data.map((item) => toUserCard(item)).filter((item): item is UserCard => item !== null)
}

// Konstante für maximales Level
const MAX_CARD_LEVEL = 15

export default function CardDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [card, setCard] = useState<Card | null>(null)
  const [userCard, setUserCard] = useState<UserCard | null>(null)
  const [loading, setLoading] = useState(true)
  const [owned, setOwned] = useState(false)
  const [favorite, setFavorite] = useState(false)
  const [favoriteLoading, setFavoriteLoading] = useState(false)
  const [levelUpLoading, setLevelUpLoading] = useState(false)
  const [showLevelUpAnimation, setShowLevelUpAnimation] = useState(false)
  const [newLevel, setNewLevel] = useState(1)
  const [allUserCards, setAllUserCards] = useState<UserCard[]>([])
  const [showSellDialog, setShowSellDialog] = useState(false)
  const [selectedUserCard, setSelectedUserCard] = useState<UserCard | null>(null)
  const [specificLevelRequested, setSpecificLevelRequested] = useState<number | null>(null)

  const cardId = params.id as string

  useEffect(() => {
    async function fetchCardDetails() {
      if (!cardId || !user) return

      setLoading(true)
      const supabase = getSupabaseBrowserClient()
      if (!supabase) return

      try {
        // Parse the composite ID to extract the actual card ID and level
        let actualCardId = cardId
        let specificLevel = null

        // Check if the ID contains a level indicator
        const levelMatch = cardId.match(/^(.+)-level-(\d+)$/)
        if (levelMatch) {
          actualCardId = levelMatch[1]
          specificLevel = Number.parseInt(levelMatch[2], 10)
          setSpecificLevelRequested(specificLevel)
        }

        console.log(`Fetching card: ${actualCardId}, specific level: ${specificLevel}`)

        // Fetch card details
        const { data: cardData, error: cardError } = await supabase
          .from("cards")
          .select("*")
          .eq("id", actualCardId)
          .single()

        if (cardError) {
          console.error("Error fetching card:", cardError)
          toast({
            title: "Error",
            description: "Failed to load card details",
            variant: "destructive",
          })
        } else {
          const validCard = toCard(cardData)
          if (validCard) {
            setCard(validCard)
          } else {
            toast({
              title: "Error",
              description: "Invalid card data received",
              variant: "destructive",
            })
          }
        }

        // Check if user owns this card
        let userCardsQuery = supabase
          .from("user_cards")
          .select("*")
          .eq("user_id", user.username)
          .eq("card_id", actualCardId)

        // If a specific level was requested, filter by that level
        if (specificLevel !== null) {
          userCardsQuery = userCardsQuery.eq("level", specificLevel)
        }

        const { data: userCardsData, error: userCardsError } = await userCardsQuery

        if (userCardsError) {
          console.error("Error fetching user cards:", userCardsError)
        } else if (userCardsData && userCardsData.length > 0) {
          // User owns this card
          setOwned(true)

          const validUserCards = toUserCards(userCardsData)
          setAllUserCards(validUserCards)

          if (validUserCards.length > 0) {
            // If a specific level was requested, find that card
            if (specificLevel !== null) {
              const specificLevelCard = validUserCards.find((card) => card.level === specificLevel)
              if (specificLevelCard) {
                setUserCard(specificLevelCard)
                setFavorite(Boolean(specificLevelCard.favorite))
              } else {
                // Fallback to highest level if specific level not found
                const highestLevelCard = validUserCards.reduce((prev, current) => {
                  return (prev.level || 1) > (current.level || 1) ? prev : current
                })
                setUserCard(highestLevelCard)
                setFavorite(Boolean(highestLevelCard.favorite))
              }
            } else {
              // No specific level requested, use highest level card
              const highestLevelCard = validUserCards.reduce((prev, current) => {
                return (prev.level || 1) > (current.level || 1) ? prev : current
              })
              setUserCard(highestLevelCard)
              setFavorite(Boolean(highestLevelCard.favorite))
            }
          }
        }
      } catch (error) {
        console.error("Error in fetchCardDetails:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchCardDetails()
  }, [cardId, user])

  const handleToggleFavorite = async () => {
    if (!user || !userCard) return

    setFavoriteLoading(true)
    const supabase = getSupabaseBrowserClient()

    try {
      if (!supabase) return

      const { error } = await supabase.from("user_cards").update({ favorite: !favorite }).eq("id", userCard.id)

      if (error) {
        console.error("Error updating favorite status:", error)
        toast({
          title: "Error",
          description: "Failed to update favorite status",
          variant: "destructive",
        })
      } else {
        setFavorite(!favorite)
        toast({
          title: "Favorite Status Updated",
          description: `Card ${favorite ? "removed from" : "added to"} favorites`,
        })
      }
    } catch (error) {
      console.error("Error during favorite toggle:", error)
      toast({
        title: "Favorite Status Update Failed",
        description: "There was an error updating the favorite status",
        variant: "destructive",
      })
    } finally {
      setFavoriteLoading(false)
    }
  }

  // Aktualisiere die handleLevelUp-Funktion, um das maximale Level zu berücksichtigen
  const handleLevelUp = async () => {
    if (!user || !card || !userCard) return

    // Prüfe, ob das maximale Level bereits erreicht ist
    if ((userCard.level || 1) >= MAX_CARD_LEVEL) {
      toast({
        title: "Maximum Level Reached",
        description: "This card has already reached its maximum level.",
        variant: "default",
      })
      return
    }

    setLevelUpLoading(true)
    const supabase = getSupabaseBrowserClient()

    try {
      if (!supabase) return

      // Check if user has enough quantity of this card
      if ((userCard.quantity || 0) < 2) {
        toast({
          title: "Level up failed",
          description: "You need at least 2 cards of the same type and level",
          variant: "destructive",
        })
        setLevelUpLoading(false)
        return
      }

      // Calculate the new level
      const currentLevel = userCard.level || 1
      const nextLevel = currentLevel + 1
      setNewLevel(nextLevel)

      // 1. Decrease quantity of the current card by 2
      const { error: updateError } = await supabase
        .from("user_cards")
        .update({ quantity: userCard.quantity - 2 })
        .eq("id", userCard.id)

      if (updateError) {
        console.error("Error updating card quantity:", updateError)
        toast({
          title: "Level up failed",
          description: "Failed to update card quantity",
          variant: "destructive",
        })
        setLevelUpLoading(false)
        return
      }

      // 2. Check if user already has this card at the next level
      const { data: existingCardsData, error: existingCardError } = await supabase
        .from("user_cards")
        .select("*")
        .eq("user_id", user.username)
        .eq("card_id", card.id)
        .eq("level", nextLevel)

      if (existingCardError) {
        console.error("Error checking for existing higher level card:", existingCardError)
      }

      // 3. If user already has this card at the next level, increment quantity
      if (existingCardsData && existingCardsData.length > 0) {
        const existingCardRaw = existingCardsData[0]
        console.log("Existing card data for level up:", existingCardRaw)

        const existingCard = toUserCard(existingCardRaw)

        if (!existingCard) {
          console.error("Invalid existing card data:", existingCardRaw)

          // Fallback approach - try to work with the raw data directly
          // First check if existingCardRaw is an object and has an id property
          if (
            existingCardRaw &&
            typeof existingCardRaw === "object" &&
            "id" in existingCardRaw &&
            (typeof existingCardRaw.id === "string" || typeof existingCardRaw.id === "number")
          ) {
            const quantity =
              typeof existingCardRaw.quantity === "number"
                ? existingCardRaw.quantity
                : typeof existingCardRaw.quantity === "string"
                  ? Number.parseInt(existingCardRaw.quantity, 10) || 0
                  : 0

            const { error: incrementError } = await supabase
              .from("user_cards")
              .update({ quantity: quantity + 1 })
              .eq("id", existingCardRaw.id)

            if (incrementError) {
              console.error("Error incrementing higher level card quantity:", incrementError)
              toast({
                title: "Level up failed",
                description: "Failed to update higher level card",
                variant: "destructive",
              })
              setLevelUpLoading(false)
              return
            }
          } else {
            console.error("Cannot proceed with level up: existing card data is invalid and missing required id")
            toast({
              title: "Level up failed",
              description: "Invalid card data structure",
              variant: "destructive",
            })
            setLevelUpLoading(false)
            return
          }
        } else {
          const { error: incrementError } = await supabase
            .from("user_cards")
            .update({ quantity: (existingCard.quantity || 0) + 1 })
            .eq("id", existingCard.id)

          if (incrementError) {
            console.error("Error incrementing higher level card quantity:", incrementError)
            toast({
              title: "Level up failed",
              description: "Failed to update higher level card",
              variant: "destructive",
            })
            setLevelUpLoading(false)
            return
          }
        }
      } else {
        // 4. If user doesn't have this card at the next level, create a new entry
        const { error: insertError } = await supabase.from("user_cards").insert({
          user_id: user.username,
          card_id: card.id,
          quantity: 1,
          level: nextLevel,
          favorite: false,
          obtained_at: new Date().toISOString().split("T")[0], // Format as YYYY-MM-DD
        })

        if (insertError) {
          console.error("Error creating higher level card:", insertError)
          toast({
            title: "Level up failed",
            description: "Failed to create higher level card: " + insertError.message,
            variant: "destructive",
          })
          setLevelUpLoading(false)
          return
        }
      }

      // Show level up animation
      setShowLevelUpAnimation(true)

      // Wait for animation to complete before refreshing
      setTimeout(() => {
        setShowLevelUpAnimation(false)

        // Refresh the page to show updated card
        window.location.reload()
      }, 3000)
    } catch (error) {
      console.error("Error during level up:", error)
      toast({
        title: "Level Up Failed",
        description: "There was an error leveling up your card",
        variant: "destructive",
      })
      setLevelUpLoading(false)
    }
  }

  const handleSellCard = (userCardItem: UserCard) => {
    setSelectedUserCard(userCardItem)
    setShowSellDialog(true)
  }

  const handleSellSuccess = () => {
    toast({
      title: "Card Listed",
      description: "Your card has been listed on the marketplace",
    })
    // Refresh the page to update the card quantities
    window.location.reload()
  }

  const goBack = () => {
    router.back()
  }

  // Background patterns based on rarity
  const getBackgroundPattern = (rarity: string) => {
    switch (rarity) {
      case "legendary":
        return {
          backgroundImage: `
            radial-gradient(circle at 25% 25%, rgba(253, 224, 71, 0.15) 2%, transparent 10%),
            radial-gradient(circle at 75% 75%, rgba(253, 224, 71, 0.15) 2%, transparent 10%),
            radial-gradient(circle at 50% 50%, rgba(253, 224, 71, 0.1) 5%, transparent 15%),
            linear-gradient(45deg, rgba(253, 224, 71, 0.05) 25%, transparent 25%, transparent 50%, rgba(253, 224, 71, 0.05) 50%, rgba(253, 224, 71, 0.05) 75%, transparent 75%, transparent),
            linear-gradient(135deg, rgba(234, 179, 8, 0.05) 25%, transparent 25%, transparent 50%, rgba(234, 179, 8, 0.05) 50%, rgba(234, 179, 8, 0.05) 75%, transparent 75%, transparent)
          `,
          backgroundSize: "80px 80px, 80px 80px, 120px 120px, 40px 40px, 40px 40px",
          backgroundPosition: "0 0, 0 0, 0 0, 0 0, 0 0",
          animation: "backgroundShimmer 10s linear infinite",
        }
      case "epic":
        return {
          backgroundImage: `
            radial-gradient(circle at 25% 25%, rgba(168, 85, 247, 0.1) 2%, transparent 8%),
            radial-gradient(circle at 75% 75%, rgba(168, 85, 247, 0.1) 2%, transparent 8%),
            linear-gradient(45deg, rgba(168, 85, 247, 0.03) 25%, transparent 25%, transparent 50%, rgba(168, 85, 247, 0.03) 50%, rgba(168, 85, 247, 0.03) 75%, transparent 75%, transparent)
          `,
          backgroundSize: "80px 80px, 80px 80px, 40px 40px",
          backgroundPosition: "0 0, 0 0, 0 0",
        }
      case "rare":
        return {
          backgroundImage: `
            radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.08) 2%, transparent 6%),
            linear-gradient(45deg, rgba(59, 130, 246, 0.02) 25%, transparent 25%, transparent 50%, rgba(59, 130, 246, 0.02) 50%, rgba(59, 130, 246, 0.02) 75%, transparent 75%, transparent)
          `,
          backgroundSize: "60px 60px, 30px 30px",
          backgroundPosition: "0 0, 0 0",
        }
      default: // common
        return {
          backgroundImage: `
            radial-gradient(circle at 50% 50%, rgba(156, 163, 175, 0.05) 2%, transparent 5%)
          `,
          backgroundSize: "50px 50px",
          backgroundPosition: "0 0",
        }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
        <div className="container mx-auto max-w-md">
          <Button variant="ghost" className="mb-4" onClick={goBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <div className="flex flex-col items-center">
            <div className="w-64 aspect-[3/4]">
              <Skeleton className="h-full w-full rounded-xl" />
            </div>
            <div className="w-full mt-4 space-y-2">
              <Skeleton className="h-8 w-3/4 mx-auto" />
              <Skeleton className="h-6 w-1/2 mx-auto" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </div>
        <MobileNav />
      </div>
    )
  }

  if (!card) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Card Not Found</h1>
          <Button onClick={goBack}>Go Back</Button>
        </div>
        <MobileNav />
      </div>
    )
  }

  // Get background pattern based on card rarity
  const backgroundStyle = getBackgroundPattern(card.rarity)

  // Get star info for current level
  const currentStarInfo = getStarInfo(userCard?.level || 1)
  const nextStarInfo = getStarInfo((userCard?.level || 1) + 1)

  return (
    <div
      className="min-h-screen pb-20 relative overflow-hidden"
      style={{
        background: `linear-gradient(to bottom right, ${
          card.rarity === "legendary"
            ? "rgba(254, 240, 138, 0.2), rgba(250, 204, 21, 0.1)"
            : card.rarity === "epic"
              ? "rgba(216, 180, 254, 0.2), rgba(168, 85,   204, 21, 0.1)"
              : card.rarity === "epic"
                ? "rgba(216, 180, 254, 0.2), rgba(168, 85, 247, 0.1)"
                : card.rarity === "rare"
                  ? "rgba(191, 219, 254, 0.2), rgba(59, 130, 246, 0.1)"
                  : "rgba(229, 231, 235, 0.2), rgba(209, 213, 219, 0.1)"
        })`,
      }}
    >
      {/* Decorative background patterns */}
      <div className="absolute inset-0 z-0 opacity-70" style={backgroundStyle} />

      {/* Floating elements for legendary cards */}
      {card.rarity === "legendary" && (
        <>
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-yellow-300/20 z-0"
              style={{
                width: `${Math.random() * 40 + 20}px`,
                height: `${Math.random() * 40 + 20}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -15, 0],
                opacity: [0.2, 0.5, 0.2],
              }}
              transition={{
                duration: Math.random() * 3 + 2,
                repeat: Number.POSITIVE_INFINITY,
                repeatType: "reverse",
                delay: Math.random() * 2,
              }}
            />
          ))}
        </>
      )}

      {/* Floating elements for epic cards */}
      {card.rarity === "epic" && (
        <>
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-purple-300/20 z-0"
              style={{
                width: `${Math.random() * 30 + 15}px`,
                height: `${Math.random() * 30 + 15}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -10, 0],
                opacity: [0.1, 0.3, 0.1],
              }}
              transition={{
                duration: Math.random() * 3 + 2,
                repeat: Number.POSITIVE_INFINITY,
                repeatType: "reverse",
                delay: Math.random() * 2,
              }}
            />
          ))}
        </>
      )}

      <div className="container mx-auto max-w-md p-4 relative z-10">
        <div className="flex justify-between items-center mb-4">
          <Button variant="ghost" onClick={goBack} className="p-2 h-auto">
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-2">
            {owned && (
              <Button
                variant="outline"
                size="sm"
                className={`h-8 ${favorite ? "bg-yellow-50 border-yellow-300" : ""}`}
                onClick={handleToggleFavorite}
                disabled={favoriteLoading}
              >
                <Star className={`h-4 w-4 ${favorite ? "fill-yellow-400 text-yellow-400" : "text-gray-400"}`} />
              </Button>
            )}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center"
        >
          <div className="w-72 mb-4 relative">
            <TiltableCard
              id={card.id}
              name={card.name}
              character={card.character}
              imageUrl={card.image_url}
              rarity={card.rarity}
              level={userCard?.level || 1}
              owned={owned}
            />

            {/* Level Up Animation Overlay */}
            <AnimatePresence>
              {showLevelUpAnimation && (
                <motion.div
                  className="absolute inset-0 z-10 flex flex-col items-center justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {/* Dark overlay */}
                  <motion.div
                    className="absolute inset-0 bg-black/70 rounded-xl"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.7 }}
                  />

                  {/* Level up text */}
                  <motion.div
                    className="z-20 text-center"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                  >
                    <h2 className="text-white text-2xl font-bold mb-2 anime-text">LEVEL UP!</h2>
                    <div className="flex justify-center mb-4">{renderStars(newLevel, "lg")}</div>
                  </motion.div>

                  {/* Particles */}
                  {Array.from({ length: 30 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-2 h-2 rounded-full bg-yellow-400"
                      initial={{
                        x: "50%",
                        y: "50%",
                        opacity: 0,
                      }}
                      animate={{
                        x: `${Math.random() * 100}%`,
                        y: `${Math.random() * 100}%`,
                        opacity: [0, 1, 0],
                      }}
                      transition={{
                        duration: 2,
                        delay: Math.random() * 0.5,
                        ease: "easeOut",
                      }}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="w-full mt-4 space-y-4">
            <div className="space-y-4">
              {/* Kartendetails für alle Karten anzeigen */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className={`bg-white/90 backdrop-blur-sm rounded-xl p-4 border ${
                  card.rarity === "legendary"
                    ? "border-yellow-300 shadow-[0_0_15px_rgba(253,224,71,0.3)]"
                    : card.rarity === "epic"
                      ? "border-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.2)]"
                      : card.rarity === "rare"
                        ? "border-blue-300 shadow-[0_0_5px_rgba(59,130,246,0.2)]"
                        : "border-gray-200"
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-lg">Card Details</h3>
                  <Badge
                    variant="outline"
                    className={`
                      ${
                        card.rarity === "legendary"
                          ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                          : card.rarity === "epic"
                            ? "bg-purple-100 text-purple-800 border-purple-300"
                            : card.rarity === "rare"
                              ? "bg-blue-100 text-blue-800 border-blue-300"
                              : "bg-gray-100 text-gray-800 border-gray-300"
                      }
                    `}
                  >
                    {card.rarity.charAt(0).toUpperCase() + card.rarity.slice(1)}
                  </Badge>
                </div>

                {card.description && (
                  <div className="text-sm mt-2">
                    <span className="text-gray-500">Description:</span>
                    <p className="mt-1">{card.description}</p>
                  </div>
                )}

                {/* Zeige alle Levels an, die der User besitzt */}
                {owned && allUserCards.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Your Collection:</h4>
                    <div className="space-y-4">
                      {allUserCards.map((userCardItem) => {
                        const { color } = getStarInfo(userCardItem.level || 1)
                        const tierName = color === "red" ? "Red Tier" : color === "blue" ? "Blue Tier" : "Gold Tier"

                        return (
                          <div key={userCardItem.id} className="flex justify-between items-center">
                            <div className="flex flex-col">
                              <div className="flex items-center">
                                <span className="mr-2 font-medium">Level {userCardItem.level}</span>
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-full ${
                                    color === "red"
                                      ? "bg-red-100 text-red-800"
                                      : color === "blue"
                                        ? "bg-blue-100 text-blue-800"
                                        : "bg-yellow-100 text-yellow-800"
                                  }`}
                                >
                                  {tierName}
                                </span>
                              </div>
                              <div className="flex mt-1">{renderStars(userCardItem.level || 1, "xs")}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-gray-50 text-sm">
                                x{userCardItem.quantity}
                              </Badge>
                              {userCardItem.quantity > 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 rounded-full border-violet-300 text-violet-600 hover:bg-violet-50"
                                  onClick={() => handleSellCard(userCardItem)}
                                >
                                  <Tag className="h-3 w-3 mr-1" />
                                  Sell
                                </Button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Level Up Section - nur anzeigen, wenn der User die Karte besitzt */}
              {owned && userCard && (
                <div
                  className={`bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-sm border ${
                    card.rarity === "legendary"
                      ? "border-yellow-300"
                      : card.rarity === "epic"
                        ? "border-purple-300"
                        : card.rarity === "rare"
                          ? "border-blue-300"
                          : "border-gray-200"
                  }`}
                >
                  <h3 className="font-bold text-lg mb-3">Level Up Card</h3>

                  <div className="flex flex-col items-center justify-between mb-4 space-y-4">
                    <div className="flex justify-between w-full">
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Current Level</div>
                        <div className="flex items-center">
                          <span className="mr-2 font-medium">Level {userCard?.level || 1}</span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              currentStarInfo.color === "red"
                                ? "bg-red-100 text-red-800"
                                : currentStarInfo.color === "blue"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {currentStarInfo.color === "red"
                              ? "Red Tier"
                              : currentStarInfo.color === "blue"
                                ? "Blue Tier"
                                : "Gold Tier"}
                          </span>
                        </div>
                      </div>

                      {(userCard?.level || 1) < MAX_CARD_LEVEL && (
                        <div>
                          <div className="text-sm text-gray-500 mb-1">Next Level</div>
                          <div className="flex items-center justify-end">
                            <span className="mr-2 font-medium">Level {(userCard?.level || 1) + 1}</span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                nextStarInfo.color === "red"
                                  ? "bg-red-100 text-red-800"
                                  : nextStarInfo.color === "blue"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {nextStarInfo.color === "red"
                                ? "Red Tier"
                                : nextStarInfo.color === "blue"
                                  ? "Blue Tier"
                                  : "Gold Tier"}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between w-full">
                      <div className="flex">{renderStars(userCard?.level || 1, "sm")}</div>
                      {(userCard?.level || 1) < MAX_CARD_LEVEL && (
                        <div className="flex">{renderStars((userCard?.level || 1) + 1, "sm")}</div>
                      )}
                    </div>
                  </div>

                  {(userCard?.level || 1) >= MAX_CARD_LEVEL ? (
                    <Alert className="bg-green-50 border-green-200">
                      <AlertTitle className="text-green-800">Maximum Level Reached</AlertTitle>
                      <AlertDescription className="text-green-700">
                        This card has reached its maximum level. It cannot be leveled up further.
                      </AlertDescription>
                    </Alert>
                  ) : (userCard?.quantity || 0) >= 2 ? (
                    <>
                      <Alert className="mb-4 bg-amber-50 border-amber-200">
                        <AlertTitle className="text-amber-800">Requirements</AlertTitle>
                        <AlertDescription className="text-amber-700">
                          <ul className="list-disc list-inside text-sm">
                            <li>
                              2 cards of {card.name} at level {userCard?.level || 1}
                            </li>
                            <li>You have {userCard?.quantity || 0} cards available</li>
                          </ul>
                        </AlertDescription>
                      </Alert>

                      <Button
                        className={`w-full ${
                          card.rarity === "legendary"
                            ? "bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600"
                            : card.rarity === "epic"
                              ? "bg-gradient-to-r from-purple-500 to-fuchsia-500 hover:from-purple-600 hover:to-fuchsia-600"
                              : "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                        }`}
                        onClick={handleLevelUp}
                        disabled={levelUpLoading || showLevelUpAnimation}
                      >
                        {levelUpLoading ? (
                          <div className="flex items-center">
                            <div className="h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
                            <span>Processing...</span>
                          </div>
                        ) : (
                          <>
                            <ArrowUp className="mr-2 h-4 w-4" />
                            Level Up Card
                          </>
                        )}
                      </Button>
                    </>
                  ) : (
                    <Alert className="bg-gray-100 border-gray-200">
                      <AlertTitle>Cannot Level Up</AlertTitle>
                      <AlertDescription className="text-sm">
                        You need at least 2 cards of the same type and level to perform a level up.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {/* Hinweis anzeigen, wenn der User die Karte nicht besitzt */}
              {!owned && (
                <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-gray-200">
                  <Alert className="bg-blue-50 border-blue-200">
                    <AlertTitle className="text-blue-800">Card Not Owned</AlertTitle>
                    <AlertDescription className="text-blue-700">
                      You don't own this card yet. Open card packs for a chance to get it!
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Add CSS animation for legendary background shimmer */}
      <style jsx global>{`
        @keyframes backgroundShimmer {
          0% {
            background-position: 0% 0%, 0% 0%, 0% 0%, 0% 0%, 0% 0%;
          }
          100% {
            background-position: 100% 100%, 100% 100%, 100% 100%, 40px 40px, 40px 40px;
          }
        }
      `}</style>

      {/* Sell Card Dialog */}
      {selectedUserCard && card && (
        <SellCardDialog
          isOpen={showSellDialog}
          onClose={() => setShowSellDialog(false)}
          card={{
            id: Number(selectedUserCard.id),
            card_id: selectedUserCard.card_id,
            name: card.name,
            character: card.character,
            image_url: card.image_url,
            rarity: card.rarity as "common" | "rare" | "epic" | "legendary",
            level: selectedUserCard.level || 1,
            quantity: selectedUserCard.quantity,
          }}
          username={user?.username || ""}
          onSuccess={handleSellSuccess}
        />
      )}

      <MobileNav />
    </div>
  )
}
