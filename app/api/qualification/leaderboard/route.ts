import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabase = createSupabaseServerClient(cookieStore)
    
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Database connection failed" },
        { status: 500 }
      )
    }

    // Get top 30 users by prestige points
    const { data, error } = await supabase
      .from("users")
      .select("username, prestige_points")
      .order("prestige_points", { ascending: false })
      .limit(30)

    if (error) {
      console.error("Error fetching qualification leaderboard:", error)
      return NextResponse.json(
        { success: false, error: "Failed to fetch leaderboard data" },
        { status: 500 }
      )
    }

    // Format the data with ranks
    const leaderboardData = data?.map((user, index) => ({
      rank: index + 1,
      username: user.username,
      prestige_points: user.prestige_points || 0
    })) || []

    return NextResponse.json({
      success: true,
      data: leaderboardData
    })

  } catch (error) {
    console.error("Error in qualification leaderboard API:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
