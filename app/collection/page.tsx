"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import CardItem from "@/components/card-item"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { AlertCircle, BookOpen, Search } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import MobileNav from "@/components/mobile-nav"
import { Input } from "@/components/ui/input"
import { renderStars } from "@/utils/card-stars"
import { LevelSystemInfoDialog } from "@/components/level-system-info-dialog"

export default function CollectionPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [userCards, setUserCards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")

  // Fetch user's cards
  useEffect(() => {
    async function fetchUserCards() {
      if (!user?.username) return

      setLoading(true)
      const supabase = getSupabaseBrowserClient()

      try {
        // 1. First get user's cards
        if (!supabase) return
        const { data: userCardsData, error: userCardsError } = await supabase
          .from("user_cards")
          .select(`id, card_id, quantity, level`)
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
        const cardIds = userCardsData.map((uc) => uc.card_id)

        // 3. Fetch the card details
        const { data: cardsData, error: cardsError } = await supabase
          .from("cards")
          .select("id, name, character, image_url, rarity ")
          .in("id", cardIds)

        if (cardsError) {
          console.error("Error fetching card details:", cardsError)
          toast({
            title: "Error",
            description: "Failed to load card details",
            variant: "destructive",
          })
          setUserCards([])
        setLoading(false)
          return
        }

        const cardMap = new Map()
        cardsData?.forEach((c) => {
          cardMap.set(c.id, c)
        })

          // 5. Combine the data
           const processedCards = userCardsData
          .map((userCard) => {
            const details = cardMap.get(userCard.card_id)
            if (!details) return null
            return {
              id: userCard.id,
              cardId: userCard.card_id,
              quantity: userCard.quantity,
              level: userCard.level || 1,
              ...details,
            }
          })
          .filter(Boolean)

        
        setUserCards(processedCards)
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

  // Filter cards based on active tab and search term
  const filteredCards = userCards.filter((card) => {
    const matchesSearch =
      searchTerm === "" ||
      card.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.character?.toLowerCase().includes(searchTerm.toLowerCase())

    if (activeTab === "all") return matchesSearch
    return matchesSearch && card.rarity === activeTab.toLowerCase()
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

  // Calculate collection stats
  const collectionStats = userCards.reduce(
    (acc, card) => {
      acc.total += card.quantity || 0
      if (card.rarity) {
        acc[card.rarity] = (acc[card.rarity] || 0) + (card.quantity || 0)
      }
      return acc
    },
    { total: 0, common: 0, rare: 0, epic: 0, legendary: 0 },
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9ff] pb-20">
        <header className="sticky top-0 z-10 backdrop-blur-md bg-white/80 border-b border-gray-100">
          <div className="max-w-lg mx-auto px-4 py-3">
            <div className="flex justify-between items-center">
              <h1 className="text-lg font-medium">My Collection</h1>
            </div>
          </div>
        </header>
        <div className="p-4 max-w-lg mx-auto">
          <div className="bg-white rounded-2xl shadow-sm mb-4 p-4">
            <Skeleton className="h-6 w-32 mb-3" />
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          </div>
          <Skeleton className="h-10 w-full mb-4" />
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {Array.from({ length: 9 }).map((_, index) => (
              <div key={index} className="aspect-[3/4]">
                <Skeleton className="h-full w-full rounded-xl" />
              </div>
            ))}
          </div>
        </div>
        <MobileNav />
      </div>
    )
  }

  if (userCards.length === 0) {
    return (
      <div className="min-h-screen bg-[#f8f9ff] pb-20">
        <header className="sticky top-0 z-10 backdrop-blur-md bg-white/80 border-b border-gray-100">
          <div className="max-w-lg mx-auto px-4 py-3">
            <div className="flex justify-between items-center">
              <h1 className="text-lg font-medium">My Collection</h1>
            </div>
          </div>
        </header>
        <div className="p-4 max-w-lg mx-auto">
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-medium mb-2">No Cards Yet</h2>
            <p className="text-gray-500 mb-6 max-w-xs mx-auto">
              You don't have any cards in your collection yet. Open some packs to get started!
            </p>
            <Button
              onClick={() => router.push("/draw")}
              className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 rounded-full"
            >
              Open Card Packs
            </Button>
          </div>
        </div>
        <MobileNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f9ff] pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur-md bg-white/80 border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <h1 className="text-lg font-medium">My Collection</h1>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto">
        {/* Collection Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-2xl shadow-sm mb-4 overflow-hidden"
        >
          <div className="p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-medium">Collection Stats</h2>
              <Link href="/catalog">
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white h-7 px-3 shadow-sm"
                >
                  <BookOpen className="h-3.5 w-3.5 mr-1" />
                  <span className="text-xs font-medium">Cards Gallery</span>
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-5 gap-2 text-center">
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-lg font-semibold">{collectionStats.total}</div>
                <div className="text-xs text-gray-500">Total</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-lg font-semibold text-gray-600">{collectionStats.common}</div>
                <div className="text-xs text-gray-500">Common</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-lg font-semibold text-blue-600">{collectionStats.rare}</div>
                <div className="text-xs text-gray-500">Rare</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-lg font-semibold text-purple-600">{collectionStats.epic}</div>
                <div className="text-xs text-gray-500">Epic</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-lg font-semibold text-amber-600">{collectionStats.legendary}</div>
                <div className="text-xs text-gray-500">Legend</div>
              </div>
            </div>

            {/* Level System Info Button - Now positioned below the stats grid */}
            <div className="mt-3 flex justify-center">
              <LevelSystemInfoDialog />
            </div>
          </div>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="mb-4 space-y-3"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search cards..."
              className="pl-10 bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5 bg-white h-9">
              <TabsTrigger value="all" className="text-xs h-7">
                All
              </TabsTrigger>
              <TabsTrigger value="legendary" className="text-xs h-7">
                Legendary
              </TabsTrigger>
              <TabsTrigger value="epic" className="text-xs h-7">
                Epic
              </TabsTrigger>
              <TabsTrigger value="rare" className="text-xs h-7">
                Rare
              </TabsTrigger>
              <TabsTrigger value="common" className="text-xs h-7">
                Common
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </motion.div>

        {/* Cards by Level */}
        {sortedLevels.length > 0 ? (
          sortedLevels.map((level) => (
            <motion.div
              key={level}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="mb-8"
            >
              <div className="flex items-center mb-3">
                <Badge variant="outline" className="mr-2 font-bold">
                  Level {level}
                </Badge>
                <div className="flex">{renderStars(level, "xs")}</div>
                <span className="ml-2 text-sm text-gray-700">
                  ({cardsByLevel[level].length} {cardsByLevel[level].length === 1 ? "card" : "cards"})
                </span>
              </div>

              <motion.div
                className="grid grid-cols-3 sm:grid-cols-4 gap-3"
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
                        id={`${card.cardId}`}
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
            </motion.div>
          ))
        ) : (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Search className="h-6 w-6 text-gray-400" />
            </div>
            <h2 className="text-lg font-medium mb-2">No Results</h2>
            <p className="text-gray-500 mb-4">
              No cards match your search criteria. Try different keywords or filters.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("")
                setActiveTab("all")
              }}
            >
              Clear Filters
            </Button>
          </div>
        )}
      </main>

      <MobileNav />
    </div>
  )
}
