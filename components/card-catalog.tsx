"use client"

import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import CardItem from "@/components/card-item"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"

type CardCatalogProps = {
  username: string | undefined
  searchTerm?: string
}

// Map database rarity to display categories
const rarityMapping: Record<string, string> = {
  goat: "G",
  ultimate: "U",
  elite: "E",
  rare: "R",
  basic: "B"
};

// Map display categories back to database rarities
const categoryToRarities: Record<string, string[]> = {
  G: ["goat"],
  U: ["ultimate"],
  E: ["elite"],
  R: ["rare"],
  B: ["basic"]
};

export default function CardCatalog({ username, searchTerm = "" }: CardCatalogProps) {
  const [allCards, setAllCards] = useState<any[]>([])
  const [userCards, setUserCards] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")

  useEffect(() => {
    async function fetchCards() {
      setLoading(true)
      const supabase = getSupabaseBrowserClient()

      // Fetch all cards
      if(!supabase) return
      const { data: cards, error: cardsError } = await supabase
        .from("cards")
        .select("id, name, character, image_url, rarity, type")
        .order("rarity", { ascending: false })

      if (cardsError) {
        console.error("Error fetching cards:", cardsError)
        setAllCards([])
      } else {
        setAllCards(cards || [])
      }

      // Fetch user's cards if username is provided
      if (username) {
        const { data: userCardData, error: userCardsError } = await supabase
          .from("user_cards")
          .select("card_id")
          .eq("user_id", username)
          .gt("quantity", 0)

        if (!userCardsError && userCardData) {
          const userCardMap: Record<string, boolean> = {}
           userCardData.forEach((item) => {
            userCardMap[item.card_id] = true
          })
          setUserCards(userCardMap)
          } else {
          setUserCards({})
        }
      }

      setLoading(false)
    }

    fetchCards()
  }, [username])

  // Filter cards based on search term
  const filteredCards = allCards.filter(
    (card) =>
      card.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.character.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const filterCardsByCategory = (category: string) => {
    if (category === "all") return filteredCards

    const rarities = categoryToRarities[category] || []
    return filteredCards.filter((card) => rarities.includes(card.rarity))
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
    const category = rarityMapping[card.rarity] || "Other"
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(card)
    return acc
  }, {})

  // Sort categories in order: G, U, E, R, B
  const sortedCategories = ["G", "U", "E", "R", "B"].filter(
    (category) => cardsByRarity[category] && cardsByRarity[category].length > 0,
  )

  if (loading) {
    return (
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
        {Array.from({ length: 10 }).map((_, index) => (
          <div key={index} className="aspect-[3/4]">
            <Skeleton className="h-full w-full rounded-lg" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <Tabs defaultValue="all" className="w-full text-black" onValueChange={setActiveTab}>
      <TabsList className="grid w-full grid-cols-6 bg-white text-black">
        <TabsTrigger value="all" className="text-black data-[state=active]:bg-gray-200 data-[state=active]:text-black">
          All
        </TabsTrigger>
        <TabsTrigger value="G" className="text-black data-[state=active]:bg-gray-200 data-[state=active]:text-black">
          Goat
        </TabsTrigger>
        <TabsTrigger value="U" className="text-black data-[state=active]:bg-gray-200 data-[state=active]:text-black">
          Ultimate
        </TabsTrigger>
        <TabsTrigger value="E" className="text-black data-[state=active]:bg-gray-200 data-[state=active]:text-black">
          Elite
        </TabsTrigger>
        <TabsTrigger value="R" className="text-black data-[state=active]:bg-gray-200 data-[state=active]:text-black">
          Rare
        </TabsTrigger>
        <TabsTrigger value="B" className="text-black data-[state=active]:bg-gray-200 data-[state=active]:text-black">
          Basic
        </TabsTrigger>
      </TabsList>

      <TabsContent value="all" className="mt-4 text-black">
        {sortedCategories.map((category) => (
          <div key={category} className="mb-8">
            <div className="flex items-center mb-2">
              <Badge variant="outline" className="mr-2 font-bold text-black border-black">
                {category}
              </Badge>
              <h3 className="text-lg font-semibold text-black">
                {category === "G"
                  ? "Goat"
                  : category === "U"
                  ? "Ultimate"
                  : category === "E"
                  ? "Elite"
                  : category === "R"
                  ? "Rare"
                  : category === "B"
                  ? "Basic"
                  : category}
              </h3>
              <span className="ml-2 text-sm text-gray-700">({cardsByRarity[category].length} cards)</span>
            </div>
            <motion.div
              className="grid grid-cols-5 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2 mb-4"
              variants={container}
              initial="hidden"
              animate="show"
            >
              {cardsByRarity[category].map((card) => (
                <motion.div
                  key={card.id}
                  variants={item}
                  whileHover={{ scale: userCards[card.id] ? 1.05 : 1.02 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <CardItem
                    id={card.id}
                    name={card.name}
                    character={card.character}
                    imageUrl={card.image_url}
                    rarity={card.rarity}
                    owned={userCards[card.id]}
                    compact={true}
                  />
                </motion.div>
              ))}
            </motion.div>
          </div>
        ))}
      </TabsContent>

      {["G", "U", "E", "R", "B"].map((category) => (
        <TabsContent key={category} value={category} className="mt-4 text-black">
          <motion.div
            className="grid grid-cols-5 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2"
            variants={container}
            initial="hidden"
            animate="show"
          >
            {filterCardsByCategory(category).map((card) => (
              <motion.div
                key={card.id}
                variants={item}
                whileHover={{ scale: userCards[card.id] ? 1.05 : 1.02 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <CardItem
                  id={card.id}
                  name={card.name}
                  character={card.character}
                  imageUrl={card.image_url}
                  rarity={card.rarity}
                  owned={userCards[card.id]}
                  compact={true}
                />
              </motion.div>
            ))}
          </motion.div>
        </TabsContent>
      ))}
    </Tabs>
  )
}
