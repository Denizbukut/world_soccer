"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Star, ArrowUp } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "@/components/ui/use-toast"
import MobileNav from "@/components/mobile-nav"
import { Skeleton } from "@/components/ui/skeleton"
import TiltableCard from "@/components/tiltable-card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function CardDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [card, setCard] = useState<any>(null)
  const [userCard, setUserCard] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [owned, setOwned] = useState(false)
  const [favorite, setFavorite] = useState(false)
  const [favoriteLoading, setFavoriteLoading] = useState(false)
  const [levelUpLoading, setLevelUpLoading] = useState(false)
  const [showLevelUpAnimation, setShowLevelUpAnimation] = useState(false)
  const [newLevel, setNewLevel] = useState(1)
  const [allUserCards, setAllUserCards] = useState<any[]>([])

  const cardId = params.id as string

  useEffect(() => {
    async function fetchCardDetails() {
      if (!cardId || !user) return

      setLoading(true)
      const supabase = getSupabaseBrowserClient()
      if (!supabase) return

      try {
        // Fetch card details
        const { data: cardData, error: cardError } = await supabase.from("cards").select("*").eq("id", cardId).single()

        if (cardError) {
          console.error("Error fetching card:", cardError)
          toast({
            title: "Error",
            description: "Failed to load card details",
            variant: "destructive",
          })
        } else {
          setCard(cardData)
        }

        // Check if user owns this card at ANY level
        const { data: userCardsData, error: userCardsError } = await supabase
          .from("user_cards")
          .select("*")
          .eq("user_id", user.username)
          .eq("card_id", cardId)
          .order("level", { ascending: true })

        if (userCardsError) {
          console.error("Error fetching user cards:", userCardsError)
        } else if (userCardsData && userCardsData.length > 0) {
          // User owns this card at some level
          setOwned(true)
          setAllUserCards(userCardsData)

          // Find the highest level card for display and level-up functionality
          const highestLevelCard = userCardsData.reduce((prev, current) => {
            return (prev.level || 1) > (current.level || 1) ? prev : current
          })

          setUserCard(highestLevelCard)
          setFavorite(Boolean(highestLevelCard?.favorite))
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
    if (!user || !card || !owned || !userCard) return

    setFavoriteLoading(true)
    const supabase = getSupabaseBrowserClient()

    try {
      if (!supabase) return
      const { error } = await supabase.from("user_cards").update({ favorite: !favorite }).eq("id", userCard.id)

      if (error) {
        console.error("Error updating favorite status:", error)
        toast({
          title: "Failed to update",
          description: "Could not update favorite status",
          variant: "destructive",
        })
        return
      }

      // Update local state
      setFavorite(!favorite)

      toast({
        title: favorite ? "Removed from favorites" : "Added to favorites",
        description: favorite ? "Card removed from favorites" : "Card added to favorites",
      })
    } catch (error) {
      console.error("Error in handleToggleFavorite:", error)
      toast({
        title: "Update failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setFavoriteLoading(false)
    }
  }

  const handleLevelUp = async () => {
    if (!user || !card || !userCard) return

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
      const { data: existingCards, error: existingCardError } = await supabase
        .from("user_cards")
        .select("*")
        .eq("user_id", user.username)
        .eq("card_id", card.id)
        .eq("level", nextLevel)

      if (existingCardError) {
        console.error("Error checking for existing higher level card:", existingCardError)
      }

      // 3. If user already has this card at the next level, increment quantity
      if (existingCards && existingCards.length > 0) {
        const existingCard = existingCards[0]
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

  const goBack = () => {
    router.back()
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 pb-20">
      <div className="container mx-auto max-w-md p-4">
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
                    <div className="flex justify-center mb-4">
                      {Array.from({ length: newLevel }).map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ delay: 0.5 + i * 0.1, duration: 0.5 }}
                        >
                          <Star className="h-8 w-8 text-red-600 fill-red-600 mx-1" />
                        </motion.div>
                      ))}
                    </div>
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
                className="bg-white rounded-xl p-4 border border-gray-200"
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

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="text-sm">
                    <div className="font-medium">{card.character}</div>
                  </div>

                  {owned && (
                    <div className="text-sm text-right">
                      <span className="text-gray-500">Total Owned:</span>
                      <div className="font-medium">
                        {allUserCards.reduce((sum, card) => sum + (card.quantity || 0), 0)}
                      </div>
                    </div>
                  )}
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
                    <div className="space-y-2">
                      {allUserCards.map((userCardItem) => (
                        <div key={userCardItem.id} className="flex justify-between items-center text-sm">
                          <div className="flex items-center">
                            <span className="mr-2">Level {userCardItem.level}</span>
                            <div className="flex">
                              {Array.from({ length: userCardItem.level }).map((_, i) => (
                                <Star key={i} className="h-3 w-3 text-red-600 fill-red-600" />
                              ))}
                            </div>
                          </div>
                          <Badge variant="outline" className="bg-gray-50">
                            x{userCardItem.quantity}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Level Up Section - nur anzeigen, wenn der User die Karte besitzt */}
              {owned && userCard && (
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                  <h3 className="font-bold text-lg mb-3">Level Up Card</h3>

                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Current Level</div>
                      <div className="flex">
                        {Array.from({ length: userCard?.level || 1 }).map((_, i) => (
                          <Star key={i} className="h-4 w-4 text-red-600 fill-red-600" />
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-500 mb-1">Next Level</div>
                      <div className="flex">
                        {Array.from({ length: (userCard?.level || 1) + 1 }).map((_, i) => (
                          <Star key={i} className="h-4 w-4 text-red-600 fill-red-600" />
                        ))}
                      </div>
                    </div>
                  </div>

                  {(userCard?.quantity || 0) >= 2 ? (
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
                        className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600"
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
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
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

      <MobileNav />
    </div>
  )
}
