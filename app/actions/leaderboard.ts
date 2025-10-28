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
  isCurrentUser?: boolean
}

// Usernames to exclude from the leaderboard
const EXCLUDED_USERNAMES = ["MejaEliana", "sasuke"]

// Get current user's score and rank
export async function getCurrentUserScore() {
  try {
    const cookieStore = await cookies()
    const supabase = createSupabaseServerClient(cookieStore)

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "User not authenticated" }
    }

    // Get the user's data including score
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("username, level, has_premium, score")
      .eq("id", user.id)
      .single()

    if (userError) {
      console.error("Error fetching user data:", userError)
      return { success: false, error: "Failed to fetch user data" }
    }

    // Get all scores to calculate rank
    const { data: allScores, error: scoresError } = await supabase
      .from("users")
      .select("score")
      .order("score", { ascending: false })

    if (scoresError) {
      console.error("Error fetching scores:", scoresError)
      return { success: false, error: "Failed to fetch scores" }
    }

    // Calculate user's rank
    const userRank = allScores.findIndex((item) => item.score === userData.score) + 1

    return {
      success: true,
      data: {
        username: userData.username,
        score: userData.score || 0,
        level: userData.level || 1,
        has_premium: userData.has_premium || false,
        rank: userRank,
      },
    }
  } catch (error) {
    console.error("Error in getCurrentUserScore:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// Get overall leaderboard - vereinfacht, um die vorberechneten Scores zu verwenden
export async function getOverallLeaderboard() {
  try {
    const cookieStore = await cookies()
    const supabase = createSupabaseServerClient(cookieStore)

    // Get the current user's username for highlighting in the leaderboard
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const currentUsername = user?.email || null

    // Vereinfachte Abfrage, die den vorberechneten Score verwendet
    const { data, error } = await supabase
      .from("users")
      .select("username, level, has_premium, score")
      .order("score", { ascending: false })
      .limit(50) // Erhöht, um nach dem Filtern noch genügend Einträge zu haben

    if (error) {
      console.error("Error fetching leaderboard:", error)
      return { success: false, error: "Failed to fetch leaderboard data" }
    }

    // Filter out excluded usernames
    const filteredData = data.filter((user) => !EXCLUDED_USERNAMES.includes(user.username))
    console.log(`Filtered out ${data.length - filteredData.length} excluded users`)

    // Format the data for the frontend and limit to top 20
    const formattedData = filteredData.slice(0, 20).map((user, index) => ({
      rank: index + 1,
      username: user.username,
      level: user.level || 1,
      score: user.score || 0,
      isPremium: user.has_premium || false,
      isCurrentUser: user.username === currentUsername,
    }))

    return { success: true, data: formattedData }
  } catch (error) {
    console.error("Error in getOverallLeaderboard:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}
