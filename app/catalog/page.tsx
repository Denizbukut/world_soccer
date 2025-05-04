"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import CardItem from "@/components/card-item"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search, ArrowLeft } from "lucide-react"
import Link from "next/link"
import MobileNav from "@/components/mobile-nav"

export default function CatalogPage() {
  const { user } = useAuth()
  const [allCards, setAllCards] = useState<any[]>([])
  const [userCards, setUserCards] = useState<Record<string, { owned: boolean; level: number }>>({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")

  // Update the fetchCards function to not rely on foreign key relationships

  async function fetchCards() {
    setLoading(true)
    const supabase = getSupabaseBrowserClient()

    try {
      // Fetch all cards
      const { data: cards, error: cardsError } = await supabase
        .from("cards")
        .select("*")
        .order("rarity", { ascending: false })

      if (cardsError) {
        console.error("Error fetching cards:", cardsError)
        setAllCards([])
      } else {
        setAllCards(cards || [])
      }

      // Fetch user's cards if username is provided
      if (user?.username) {
        const { data: userCardData, error: userCardsError } = await supabase
          .from("user_cards")
          .select("card_id, level, quantity")
          .eq("user_id", user.username)
          .gt("quantity", 0)

        if (userCardsError) {
          console.error("Error fetching user cards:", userCardsError)
        } else {
          const userCardMap: Record<string, { owned: boolean; level: number }> = {}
          userCardData?.forEach((item) => {
            userCardMap[item.card_id] = {
              owned: true,
              level: item.level || 1,
            }
          })
          setUserCards(userCardMap)
        }
      }
    } catch (error) {
      console.error("Unexpected error fetching cards:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCards()
  }, [user?.username])

  // Filter cards based on search term
  const filteredCards = allCards.filter(
    (card) =>
      card.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.character.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const filterCardsByCategory = (category: string) => {
    if (category === "all") return filteredCards

    return filteredCards.filter((card) => card.rarity === category.toLowerCase())
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  }

  // Group cards by rarity for the "all" tab
  const cardsByRarity = filteredCards.reduce((acc: Record<string, any[]>, card) => {
    const category = card.rarity
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(card)
    return acc
  }, {})

  // Sort categories in order: legendary, epic, rare, common
  const sortedCategories = ["legendary", "epic", "rare", "common"].filter(
    (category) => cardsByRarity[category] && cardsByRarity[category].length > 0,
  )

  if (loading) {
    return (
      <div className="container mx-auto p-4 pb-20">
        <div className="flex items-center mb-6">
          <Link href="/collection">
            <Button variant="ghost" size="sm" className="mr-2">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Card Catalog</h1>
        </div>

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

  return (
    <div className="container mx-auto p-4 pb-20">
      <div className="flex items-center mb-6">
        <Link href="/collection">
          <Button variant="ghost" size="sm" className="mr-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Card Catalog</h1>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search cards by name or character..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 bg-white">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="legendary">Legendary</TabsTrigger>
          <TabsTrigger value="epic">Epic</TabsTrigger>
          <TabsTrigger value="rare">Rare</TabsTrigger>
          <TabsTrigger value="common">Common</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          {sortedCategories.map((category) => (
            <div key={category} className="mb-8">
              <div className="flex items-center mb-3">
                <Badge variant="outline" className="mr-2 font-bold">
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </Badge>
                <span className="text-sm text-gray-700">({cardsByRarity[category].length} cards)</span>
              </div>

              <motion.div
                className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3"
                variants={container}
                initial="hidden"
                animate="show"
              >
                {cardsByRarity[category].map((card) => (
                  <motion.div
                    key={card.id}
                    variants={item}
                    whileHover={{ scale: userCards[card.id]?.owned ? 1.05 : 1.02 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <CardItem
                      id={card.id}
                      name={card.name}
                      character={card.character}
                      imageUrl={card.image_url}
                      rarity={card.rarity}
                      level={userCards[card.id]?.level || 1}
                      owned={userCards[card.id]?.owned || false}
                      hideOverlay={true}
                    />
                  </motion.div>
                ))}
              </motion.div>
            </div>
          ))}
        </TabsContent>

        {["legendary", "epic", "rare", "common"].map((category) => (
          <TabsContent key={category} value={category} className="mt-4">
            <motion.div
              className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3"
              variants={container}
              initial="hidden"
              animate="show"
            >
              {filterCardsByCategory(category).map((card) => (
                <motion.div
                  key={card.id}
                  variants={item}
                  whileHover={{ scale: userCards[card.id]?.owned ? 1.05 : 1.02 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <CardItem
                    id={card.id}
                    name={card.name}
                    character={card.character}
                    imageUrl={card.image_url}
                    rarity={card.rarity}
                    level={userCards[card.id]?.level || 1}
                    owned={userCards[card.id]?.owned || false}
                    hideOverlay={true}
                  />
                </motion.div>
              ))}
            </motion.div>
          </TabsContent>
        ))}
      </Tabs>

      <MobileNav />
    </div>
  )
}
