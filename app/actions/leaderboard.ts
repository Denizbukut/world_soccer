"use server"

import { createSupabaseServerClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

// Types for leaderboard data
type LeaderboardEntry = {
  username: string
  score: number
  rank: number
  level?: number
  has_premium?: boolean
  card_count?: number
  legendary_count?: number
  epic_count?: number
  rare_count?: number
  common_count?: number
  highest_card_level?: number
}

// Usernames to exclude from the leaderboard
const EXCLUDED_USERNAMES = ["MejaEliana", "sasuke"]

// Get overall leaderboard - simplified for reliability
export async function getOverallLeaderboard() {
  console.log("Starting getOverallLeaderboard function - SIMPLIFIED")
  const cookieStore = cookies()
  const supabase = createSupabaseServerClient(cookieStore)

  try {
    // Get current user for later comparison
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const currentUsername = user?.email?.split("@")[0] || user?.id || ""

    console.log("Current user:", currentUsername)

    // Step 1: Get all users with their basic info
    console.log("Fetching users...")
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("username, level, has_premium")
      .order("level", { ascending: false })
      .limit(50)

    if (usersError) {
      console.error("Error fetching users:", usersError)
      return {
        success: false,
        error: `Failed to fetch users: ${usersError.message}`,
        leaderboard: [],
      }
    }

    console.log(`Successfully fetched ${users.length} users`)

    // Step 2: Create a basic leaderboard with just user data
    // Filter out excluded usernames
    const filteredUsers = users.filter((user) => !EXCLUDED_USERNAMES.includes(user.username))
    console.log(`Filtered out ${users.length - filteredUsers.length} excluded users`)

    const leaderboard: LeaderboardEntry[] = filteredUsers.map((user) => ({
      username: user.username,
      level: user.level || 1,
      has_premium: user.has_premium || false,
      score: (user.level || 1) * 100, // Initial score based on level
      rank: 0, // Will be calculated later
      card_count: 0,
      legendary_count: 0,
      epic_count: 0,
      rare_count: 0,
      common_count: 0,
      highest_card_level: 0,
    }))

    // Step 3: For each user, get their card data and update their score
    console.log("Fetching card data for each user...")
    for (const entry of leaderboard) {
      try {
        // Get user's cards
        const { data: userCards, error: cardsError } = await supabase
          .from("user_cards")
          .select("card_id, level")
          .eq("user_id", entry.username)

        if (cardsError) {
          console.error(`Error fetching cards for user ${entry.username}:`, cardsError)
          continue
        }

        if (!userCards || userCards.length === 0) {
          console.log(`User ${entry.username} has no cards`)
          continue
        }

        entry.card_count = userCards.length

        // Find highest card level
        entry.highest_card_level = userCards.reduce((max, card) => Math.max(max, card.level || 0), 0)

        // Get card details to determine rarity
        const cardIds = userCards.map((card) => card.card_id)

        const { data: cards, error: cardDetailsError } = await supabase
          .from("cards")
          .select("id, rarity")
          .in("id", cardIds)

        if (cardDetailsError) {
          console.error(`Error fetching card details for user ${entry.username}:`, cardDetailsError)
          continue
        }

        if (!cards || cards.length === 0) {
          console.log(`No card details found for user ${entry.username}`)
          continue
        }

        // Count cards by rarity
        cards.forEach((card) => {
          switch (card.rarity) {
            case "legendary":
              entry.legendary_count = (entry.legendary_count || 0) + 1
              break
            case "epic":
              entry.epic_count = (entry.epic_count || 0) + 1
              break
            case "rare":
              entry.rare_count = (entry.rare_count || 0) + 1
              break
            case "common":
              entry.common_count = (entry.common_count || 0) + 1
              break
          }
        })

        // Calculate overall score using the formula
        entry.score =
          (entry.level || 1) * 100 +
          (entry.legendary_count || 0) * 500 +
          (entry.epic_count || 0) * 100 +
          (entry.rare_count || 0) * 20 +
          (entry.common_count || 0) * 5 +
          (entry.highest_card_level || 0) * 50

        console.log(`Updated score for ${entry.username}: ${entry.score}`)
      } catch (error) {
        console.error(`Error processing user ${entry.username}:`, error)
      }
    }

    // Step 4: Sort by score and assign ranks
    leaderboard.sort((a, b) => b.score - a.score)
    leaderboard.forEach((entry, index) => {
      entry.rank = index + 1
    })

    console.log(`Processed ${leaderboard.length} users for the leaderboard`)
    console.log(
      "Top 3 users:",
      leaderboard.slice(0, 3).map((u) => `${u.username}: ${u.score}`),
    )

    return { success: true, leaderboard }
  } catch (error) {
    console.error("Error fetching overall leaderboard:", error)
    return {
      success: false,
      error: `Failed to fetch leaderboard data: ${error instanceof Error ? error.message : String(error)}`,
      leaderboard: [],
    }
  }
}
