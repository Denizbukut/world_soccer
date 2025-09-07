import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  try {
    const { usernames } = await request.json()
    if (!usernames || !Array.isArray(usernames)) {
      return NextResponse.json({ success: false, error: "Invalid usernames provided" }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createSupabaseServerClient(cookieStore)

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Database connection failed" },
        { status: 500 }
      )
    }

    const results = []

    for (const username of usernames) {
      let teamRating = 70 // Default rating if no team or cards

      // Get user's team
      const { data: teamData, error: teamError } = await supabase
        .from("user_team")
        .select("*")
        .eq("user_id", username)
        .single()

      if (!teamError && teamData) {
        // Get team card IDs
        const cardIds = Object.entries(teamData)
          .filter(([key, value]) => key.startsWith('slot_') && typeof value === 'string' && value)
          .map(([key, value]) => value as string)

        if (cardIds.length > 0) {
          // Get card base ratings
          const { data: cardsData, error: cardsError } = await supabase
            .from("cards")
            .select("id, overall_rating")
            .in("id", cardIds)

          if (!cardsError && cardsData && cardsData.length > 0) {
            const totalRating = cardsData.reduce((sum, card) => sum + (card.overall_rating as number), 0)
            teamRating = Math.round((totalRating / cardsData.length) * 10) / 10
          }
        }
      }
      results.push({ username, teamRating })
    }

    return NextResponse.json({ success: true, data: results })

  } catch (error) {
    console.error("Error in squad ratings API:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
