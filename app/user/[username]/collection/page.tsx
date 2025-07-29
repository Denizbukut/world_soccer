import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import MobileNav from "@/components/mobile-nav"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import UserCollectionClient from "./client"

export default async function UserCollectionPage({
  params,
}: {
  params: { username: string }
}) {
  const username = params.username
  const cookieStore = cookies()
  const supabase = createSupabaseServerClient(cookieStore)

  // Get user data
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("username", username)
    .single()

  if (userError || !userData) {
    redirect("/leaderboard")
  }

  // Get user cards - deduplicate by card_id and level
  const { data: userCardsRaw, error: userCardsError } = await supabase
    .from("user_cards")
    .select(`id, user_id, card_id, quantity, favorite, obtained_at, level`)
    .eq("user_id", username)
    .gt("quantity", 0)

  if (userCardsError) {
    return (
      <div className="min-h-screen bg-[#f8f9ff] pb-20">
        <header className="sticky top-0 z-10 backdrop-blur-md bg-white/80 border-b border-gray-100">
          <div className="max-w-lg mx-auto px-4 py-3">
            <div className="flex justify-between items-center">
              <h1 className="text-lg font-medium">{username}&apos;s Collection</h1>
            </div>
          </div>
        </header>
        <main className="p-4 max-w-lg mx-auto">
          <div className="text-center py-8 bg-white rounded-xl shadow-sm">
            <p className="text-red-500">Error loading cards. Please try again later.</p>
          </div>
        </main>
        <MobileNav />
      </div>
    )
  }

  // Deduplicate user cards by card_id and level
  const userCards = userCardsRaw.reduce((acc, current) => {
    const existingCard = acc.find(card => card.card_id === current.card_id && card.level === current.level)
    if (!existingCard) {
      acc.push(current)
    }
    return acc
  }, [] as typeof userCardsRaw)

  let combinedCards: CombinedCard[] = []

  if (userCards.length > 0) {
    const cardIds = userCards.map((uc) => uc.card_id)
    const { data: cardsData } = await supabase
      .from("cards")
      .select("id, name, character, image_url, rarity, created_at")
      .in("id", cardIds)

    const cardMap = new Map()
    cardsData?.forEach((c) => {
      cardMap.set(c.id, c)
    })

    combinedCards = userCards.map((userCard) => ({
      ...userCard,
      cardDetails: cardMap.get(userCard.card_id) || null,
    }))
  }

  const collectionStats = combinedCards.reduce(
    (acc, card) => {
      acc.total += card.quantity
      const rarity = card.cardDetails?.rarity?.toLowerCase()
      if (rarity === "common") acc.common += card.quantity
      if (rarity === "rare") acc.rare += card.quantity
      if (rarity === "epic") acc.epic += card.quantity
      if (rarity === "legendary") acc.legendary += card.quantity
      return acc
    },
    { total: 0, common: 0, rare: 0, epic: 0, legendary: 0 }
  )

  const cardsByLevel = combinedCards.reduce((acc: Record<number, CombinedCard[]>, card) => {
    const level = card.level || 1
    if (!acc[level]) acc[level] = []
    acc[level].push(card)
    return acc
  }, {})

  const sortedLevels = Object.keys(cardsByLevel)
    .map(Number)
    .sort((a, b) => b - a)

  if (userCards.length === 0) {
    return (
      <div className="min-h-screen bg-[#f8f9ff] pb-20">
        <header className="sticky top-0 z-10 backdrop-blur-md bg-white/80 border-b border-gray-100">
          <div className="max-w-lg mx-auto px-4 py-3">
            <div className="flex justify-between items-center">
              <h1 className="text-lg font-medium">{username}&apos;s Collection</h1>
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
              {username} doesn&apos;t have any cards in their collection yet.
            </p>
            <Button variant="outline" onClick={() => window.history.back()}>
              ← Back
            </Button>
          </div>
        </div>
        <MobileNav />
      </div>
    )
  }

  return (
    <UserCollectionClient
      username={username}
      userData={userData}
      cardsByLevel={cardsByLevel}
      sortedLevels={sortedLevels}
      collectionStats={collectionStats}
    />
  )
}

export function Loading() {
  return (
    <div className="min-h-screen bg-[#f8f9ff] pb-20">
      <header className="sticky top-0 z-10 backdrop-blur-md bg-white/80 border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-3">
          <Skeleton className="h-6 w-40" />
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto">
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
      </main>

      <MobileNav />
    </div>
  )
}

// Types
interface UserCard {
  id: number
  user_id: string
  card_id: string
  quantity: number
  favorite: boolean
  obtained_at: string
  level: number
}

interface CardDetails {
  id: string
  name: string
  character: string
  image_url: string
  rarity: string
  created_at: string
}

interface CombinedCard extends UserCard {
  cardDetails: CardDetails | null
}
