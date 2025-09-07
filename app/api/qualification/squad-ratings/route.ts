import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  
  try {
    const { usernames } = await request.json()
    
    if (!usernames || !Array.isArray(usernames)) {
      return NextResponse.json({ success: false, error: "Usernames array is required" }, { status: 400 })
    }

    const ratings = []
    
    for (const username of usernames) {
      // Get user's team
      const { data: teamData, error: teamError } = await supabase
        .from("user_team")
        .select("*")
        .eq("user_id", username)
        .single()

      if (teamError || !teamData) {
        ratings.push({ username, teamRating: 70 }) // Default rating
        continue
      }

      // Get card IDs from team slots
      const cardIds = Object.entries(teamData)
        .filter(([key, value]) => key.startsWith('slot_') && typeof value === 'string' && value)
        .map(([key, value]) => value as string)

      if (cardIds.length === 0) {
        ratings.push({ username, teamRating: 70 }) // Default rating
        continue
      }

      // Get card details
      const { data: cardsData, error: cardsError } = await supabase
        .from("cards")
        .select("overall_rating")
        .in("id", cardIds)

      if (cardsError || !cardsData || cardsData.length === 0) {
        ratings.push({ username, teamRating: 70 }) // Default rating
        continue
      }

      // Calculate average rating
      const validCards = cardsData.filter(card => card.overall_rating && card.overall_rating > 0)
      if (validCards.length === 0) {
        ratings.push({ username, teamRating: 70 }) // Default rating
        continue
      }

      const totalRating = validCards.reduce((sum, card) => sum + card.overall_rating, 0)
      const averageRating = totalRating / validCards.length
      const roundedRating = Math.round(averageRating * 10) / 10

      ratings.push({ username, teamRating: roundedRating })
    }

    return NextResponse.json({ success: true, data: ratings })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}