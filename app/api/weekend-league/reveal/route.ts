import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  try {
    const { round } = await request.json()

    if (!round) {
      return NextResponse.json({ success: false, error: "Round is required" }, { status: 400 })
    }

    // Validate round
    const validRounds = ['round16', 'quarter', 'semi', 'final']
    if (!validRounds.includes(round)) {
      return NextResponse.json({ success: false, error: "Invalid round" }, { status: 400 })
    }

    // Reveal matches for the specified round
    const { data, error } = await supabase
      .from("weekend_league_matches")
      .update({ hidden: false })
      .eq("round", round)
      .eq("hidden", true)
      .select()

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      data,
      message: `Successfully revealed ${data.length} matches for ${round}`
    })
  } catch (error) {
    console.error("Error revealing weekend league matches:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

// Reveal all matches at once
export async function PUT() {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  try {
    // Reveal all hidden matches
    const { data, error } = await supabase
      .from("weekend_league_matches")
      .update({ hidden: false })
      .eq("hidden", true)
      .select()

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      data,
      message: `Successfully revealed all ${data.length} hidden matches`
    })
  } catch (error) {
    console.error("Error revealing all weekend league matches:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
