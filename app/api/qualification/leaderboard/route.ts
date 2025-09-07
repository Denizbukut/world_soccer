import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  try {
    // Get top 30 users by prestige points from Battle Arena
    const { data, error } = await supabase
      .from("users")
      .select("username, prestige_points")
      .order("prestige_points", { ascending: false })
      .limit(30)

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    // Add rank to each user
    const dataWithRank = data.map((user, index) => ({
      username: user.username,
      prestige_points: user.prestige_points || 100, // Default to 100 if null
      rank: index + 1
    }))

    return NextResponse.json({ success: true, data: dataWithRank })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}