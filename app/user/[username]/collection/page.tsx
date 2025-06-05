import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import MobileNav from "@/components/mobile-nav"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import UserCollectionClient from "./client"

// Define types for our data
type UserCard = {
  id: number
  user_id: string
  card_id: string
  quantity: number
  favorite: boolean
  obtained_at: string
  level: number
}

type CardDetails = {
  id: string
  name: string
  character: string
  image_url: string
  rarity: string
  created_at: string
}

type CombinedCard = UserCard & {
  cardDetails: CardDetails | null
}

export default async function UserCollectionPage({ params }: { params: { username: string } }) {
  const username = params.username
  const cookieStore = cookies()
  const supabase = createSupabaseServerClient(cookieStore)

  console.log(`Fetching collection for user: ${username}`)

  // Get user data
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("username", username)
    .single()

  if (userError || !userData) {
    console.error("Error fetching user data:", userError)
    redirect("/leaderboard")
  }

  console.log(`Found user: ${userData.username}, level: ${userData.level}`)

  // STEP 1: Get user's cards
  console.log("Fetching user cards...")
  const { data: userCards, error: userCardsError } = await supabase
    .from("user_cards")
    .select(
      `id, user_id, card_id, quantity, favorite, obtained_at, level`,
    )
    .eq("user_id", username)
    .gt("quantity", 0)

  if (userCardsError) {
    console.error("Error fetching user cards:", userCardsError)
    return (
      <div className="min-h-screen bg-[#f8f9ff] pb-20">
        <header className="sticky top-0 z-10 backdrop-blur-md bg-white/80 border-b border-gray-100">
          <div className="max-w-lg mx-auto px-4 py-3">
            <div className="flex justify-between items-center">
              <h1 className="text-lg font-medium">{username}'s Collection</h1>
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

  console.log(`Found ${userCards?.length || 0} cards for user ${username}`)

  // STEP 2: If we have user cards, get the card details
  let combinedCards: CombinedCard[] = []

  if (userCards && userCards.length > 0) {
    const cardIds = userCards.map((uc) => uc.card_id)
    const { data: cardsData, error: cardsError } = await supabase
      .from("cards")
      .select("id, name, character, image_url, rarity, created_at")
      .in("id", cardIds)

    if (cardsError) {
      console.error("Error fetching card details:", cardsError)
    }
    const cardMap = new Map()
    cardsData?.forEach((c) => {
      cardMap.set(c.id, c)
    })

    combinedCards = userCards.map((userCard) => ({
      ...userCard,
      cardDetails: cardMap.get(userCard.card_id) || null,
    }))
  }

  // Calculate collection stats
  const collectionStats = combinedCards.reduce(
    (acc: { total: number; common: number; rare: number; epic: number; legendary: number }, card) => {
      acc.total += card.quantity || 0
      if (card.cardDetails?.rarity) {
        const rarity = card.cardDetails.rarity.toLowerCase()
        if (rarity === "common") acc.common += card.quantity || 0
        if (rarity === "rare") acc.rare += card.quantity || 0
        if (rarity === "epic") acc.epic += card.quantity || 0
        if (rarity === "legendary") acc.legendary += card.quantity || 0
      }
      return acc
    },
    { total: 0, common: 0, rare: 0, epic: 0, legendary: 0 },
  )

  // Group cards by level for better organization
  const cardsByLevel = combinedCards.reduce((acc: Record<number, CombinedCard[]>, card) => {
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

  if (userCards.length === 0) {
    return (
      <div className="min-h-screen bg-[#f8f9ff] pb-20">
        <header className="sticky top-0 z-10 backdrop-blur-md bg-white/80 border-b border-gray-100">
          <div className="max-w-lg mx-auto px-4 py-3">
            <div className="flex justify-between items-center">
              <h1 className="text-lg font-medium">{username}'s Collection</h1>
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
              {username} doesn't have any cards in their collection yet.
            </p>
            <Link href="/leaderboard">
              <Button className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 rounded-full">
                Back to Leaderboard
              </Button>
            </Link>
          </div>
        </div>
        <MobileNav />
      </div>
    )
  }

  // Pass the data to the client component
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

// Loading state
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
