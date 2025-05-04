"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import CardItem from "@/components/card-item"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { AlertCircle, Star, BookOpen } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import MobileNav from "@/components/mobile-nav"

export default function CollectionPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [userCards, setUserCards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")

  // Fetch user's cards
  useEffect(() => {
    async function fetchUserCards() {
      if (!user?.username) return

      setLoading(true)
      const supabase = getSupabaseBrowserClient()

      try {
        // 1. First get user's cards
        const { data: userCardsData, error: userCardsError } = await supabase
          .from("user_cards")
          .select("id, card_id, quantity, level")
          .eq("user_id", user.username)
          .gt("quantity", 0)

        if (userCardsError) {
          console.error("Error fetching user cards:", userCardsError)
          toast({
            title: "Error",
            description: "Failed to load your card collection",
            variant: "destructive",
          })
          setUserCards([])
          setLoading(false)
          return
        }

        if (!userCardsData || userCardsData.length === 0) {
          setUserCards([])
          setLoading(false)
          return
        }

        // 2. Get the card IDs to fetch
        const cardIds = userCardsData.map((item) => item.card_id)

        // 3. Fetch the card details
        const { data: cardsData, error: cardsError } = await supabase.from("cards").select("*").in("id", cardIds)

        if (cardsError) {
          console.error("Error fetching card details:", cardsError)
          toast({
            title: "Error",
            description: "Failed to load card details",
            variant: "destructive",
          })
          setUserCards([])
        } else {
          // 4. Create a map of card details by ID
          const cardDetailsMap = new Map()
          cardsData?.forEach((card) => {
            cardDetailsMap.set(card.id, card)
          })

          // 5. Combine the data
          const processedCards = userCardsData.map((userCard) => {
            const cardDetails = cardDetailsMap.get(userCard.card_id) || {}
            return {
              id: userCard.id,
              cardId: userCard.card_id,
              quantity: userCard.quantity,
              level: userCard.level || 1,
              ...cardDetails,
            }
          })

          setUserCards(processedCards)
        }
      } catch (err) {
        console.error("Unexpected error:", err)
        toast({
          title: "Error",
          description: "An unexpected error occurred",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchUserCards()
  }, [user?.username])

  // Filter cards based on active tab
  const filteredCards = userCards.filter((card) => {
    if (activeTab === "all") return true
    return card.rarity === activeTab.toLowerCase()
  })

  // Group cards by level for better organization
  const cardsByLevel = filteredCards.reduce((acc: Record<number, any[]>, card) => {
    const level = card.level || 1
    if (!acc[level]) {
      acc[level] = []
    }
    acc[level].push(card)
    return acc
  }, {})

  // Sort levels in descending order
  const sortedLevels = Object.keys(cardsByLevel)
    .map(Number)
    .sort((a, b) => b - a)

  if (loading) {
    return (
      <div className="container mx-auto p-4 pb-20">
        <h1 className="text-2xl font-bold mb-6">My Collection</h1>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className="aspect-[3/4]">
              <Skeleton className="h-full w-full rounded-lg" />
            </div>
          ))}
        </div>
        <MobileNav />
      </div>
    )
  }

  if (userCards.length === 0) {
    return (
      <div className="container mx-auto p-4 text-center pb-20">
        <h1 className="text-2xl font-bold mb-6">My Collection</h1>
        <div className="bg-gray-100 rounded-lg p-8 max-w-md mx-auto">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Cards Yet</h2>
          <p className="text-gray-600 mb-6">
            You don't have any cards in your collection yet. Open some packs to get started!
          </p>
          <Button onClick={() => router.push("/draw")} className="bg-gradient-to-r from-blue-500 to-purple-500">
            Open Card Packs
          </Button>
        </div>
        <MobileNav />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 pb-20">
      {/* Restructured header section */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">My Collection</h1>

        <div className="flex flex-wrap gap-2">
          <Link href="/catalog">
            <Button variant="outline" className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              <span>Catalog</span>
            </Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 bg-white">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="legendary">Legendary</TabsTrigger>
          <TabsTrigger value="epic">Epic</TabsTrigger>
          <TabsTrigger value="rare">Rare</TabsTrigger>
          <TabsTrigger value="common">Common</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {sortedLevels.map((level) => (
            <div key={level} className="mb-8">
              <div className="flex items-center mb-3">
                <Badge variant="outline" className="mr-2 font-bold">
                  Level {level}
                </Badge>
                <div className="flex">
                  {Array.from({ length: level }).map((_, i) => (
                    <div key={i} className="relative mx-0.5">
                      <Star
                        key={i}
                        className="h-4 w-4 text-red-600 fill-red-600 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
                        strokeWidth={1.5}
                        stroke="white"
                      />
                      <div className="absolute inset-0 overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/60 to-transparent rounded-full transform -rotate-45 scale-75 opacity-80"></div>
                      </div>
                    </div>
                  ))}
                </div>
                <span className="ml-2 text-sm text-gray-700">
                  ({cardsByLevel[level].length} {cardsByLevel[level].length === 1 ? "card" : "cards"})
                </span>
              </div>

              <motion.div
                className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ staggerChildren: 0.05 }}
              >
                <AnimatePresence>
                  {cardsByLevel[level].map((card) => (
                    <motion.div
                      key={card.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      whileHover={{ scale: 1.05 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    >
                      <CardItem
                        id={card.cardId}
                        name={card.name}
                        character={card.character}
                        imageUrl={card.image_url}
                        rarity={card.rarity}
                        level={card.level || 1}
                        quantity={card.quantity}
                        owned={true}
                        isCollection={true}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            </div>
          ))}
        </TabsContent>
      </Tabs>

      <MobileNav />
    </div>
  )
}
