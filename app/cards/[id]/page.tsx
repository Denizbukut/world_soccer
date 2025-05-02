"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PokemonStyleCard } from "@/components/pokemon-style-card"
import { ArrowLeft, Star, Coins, Check } from "lucide-react"
import { motion } from "framer-motion"
import { toast } from "@/components/ui/use-toast"
import MobileNav from "@/components/mobile-nav"
import { Skeleton } from "@/components/ui/skeleton"

export default function CardDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [card, setCard] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [owned, setOwned] = useState(false)
  const [favorite, setFavorite] = useState(false)
  const [userCoins, setUserCoins] = useState(0)
  const [purchaseLoading, setPurchaseLoading] = useState(false)
  const [favoriteLoading, setFavoriteLoading] = useState(false)

  const cardId = params.id as string

  useEffect(() => {
    async function fetchCardDetails() {
      if (!cardId || !user) return

      setLoading(true)
      const supabase = getSupabaseBrowserClient()
      if(!supabase) return

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

        // Check if user owns this card
        const { data: userCardData, error: userCardError } = await supabase
          .from("user_cards")
          .select("*")
          .eq("user_id", user.username)
          .eq("card_id", cardId)
          .single()

        if (!userCardError && userCardData) {
          setOwned(true)
          setFavorite(Boolean(userCardData?.favorite))

        }

        // Get user's coins
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("coins")
          .eq("id", user.username)
          .single()

        if (!userError && userData) {
          setUserCoins(Number(userData?.coins) || 0)

        }
      } catch (error) {
        console.error("Error in fetchCardDetails:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchCardDetails()
  }, [cardId, user])

  const handlePurchaseCard = async () => {
    if (!user || !card) return

    setPurchaseLoading(true)
    const supabase = getSupabaseBrowserClient()

    try {
      // Calculate card price based on rarity
      const cardPrice = getCardPrice(card.rarity)

      if (userCoins < cardPrice) {
        toast({
          title: "Insufficient coins",
          description: `You need ${cardPrice} coins to purchase this card`,
          variant: "destructive",
        })
        return
      }
      if(!supabase) return
      // Start a transaction
      const { data: newUserCard, error: addCardError } = await supabase.from("user_cards").insert({
        user_id: user.username,
        card_id: card.id,
        favorite: false,
      })

      if (addCardError) {
        console.error("Error adding card to user:", addCardError)
        toast({
          title: "Purchase failed",
          description: "Failed to add card to your collection",
          variant: "destructive",
        })
        return
      }

      // Update user's coins
      const { error: updateCoinsError } = await supabase
        .from("users")
        .update({ coins: userCoins - cardPrice })
        .eq("username", user.username)

      if (updateCoinsError) {
        console.error("Error updating user coins:", updateCoinsError)
        toast({
          title: "Purchase failed",
          description: "Failed to update your coins",
          variant: "destructive",
        })
        return
      }

      // Update local state
      setOwned(true)
      setUserCoins(userCoins - cardPrice)

      toast({
        title: "Card purchased!",
        description: `${card.name} has been added to your collection`,
      })
    } catch (error) {
      console.error("Error in handlePurchaseCard:", error)
      toast({
        title: "Purchase failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setPurchaseLoading(false)
    }
  }

  const handleToggleFavorite = async () => {
    if (!user || !card || !owned) return

    setFavoriteLoading(true)
    const supabase = getSupabaseBrowserClient()

    try {
      if(!supabase) return
      const { error } = await supabase
        .from("user_cards")
        .update({ favorite: !favorite })
        .eq("user_id", user.username)
        .eq("card_id", card.id)

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

  const getCardPrice = (rarity: string) => {
    switch (rarity) {
      case "legendary":
        return 5000
      case "epic":
        return 2000
      case "rare":
        return 1000
      case "common":
      default:
        return 200
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
              <Skeleton className="h-full w-full rounded-xll" />
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
            <Badge variant="outline" className="bg-white">
              <Coins className="h-3.5 w-3.5 mr-1 text-yellow-500" />
              {userCoins}
            </Badge>

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
          <div className="w-72">
            <PokemonStyleCard
              id={card.id}
              name={card.name}
              character={card.character}
              imageUrl={card.image_url}
              rarity={card.rarity}
            />
          </div>

          <div className="w-full mt-6 space-y-4">
            {!owned ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <Button
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium py-6"
                  onClick={handlePurchaseCard}
                  disabled={purchaseLoading}
                >
                  <Coins className="mr-2 h-5 w-5" />
                  Buy for {getCardPrice(card.rarity)} coins
                </Button>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-center"
              >
                <Check className="h-5 w-5 text-green-500 mr-2" />
                <span className="font-medium text-green-700">In Your Collection</span>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
      <MobileNav />
    </div>
  )
}
