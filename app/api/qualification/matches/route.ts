import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  try {
    // Debug: Get all matches first
    const { data: allMatches, error: allError } = await supabase
      .from("qualification_matches")
      .select("*")
      .order("created_at", { ascending: false })

    console.log("🔍 DEBUG - All matches in DB:", allMatches?.length || 0)
    if (allMatches && allMatches.length > 0) {
      console.log("🔍 DEBUG - Hidden status:", allMatches.map(m => ({ id: m.match_id, hidden: m.hidden })))
    }

    // Get only visible qualification match results (hidden = false)
    const { data, error } = await supabase
      .from("qualification_matches")
      .select("*")
      .eq("hidden", false) // Only show matches that are NOT hidden
      .order("created_at", { ascending: false })

    console.log("🔍 DEBUG - Visible matches returned:", data?.length || 0)

    if (error) {
      console.error("🔍 DEBUG - Error:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      data: data || [],
      debug: {
        totalMatches: allMatches?.length || 0,
        visibleMatches: data?.length || 0,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error("🔍 DEBUG - Internal error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  try {
    const { matches } = await request.json()

    if (!matches || !Array.isArray(matches)) {
      return NextResponse.json({ success: false, error: "Matches array is required" }, { status: 400 })
    }

    // Clear existing matches first
    await supabase
      .from("qualification_matches")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000") // Delete all records

    // Insert new matches
    const { data, error } = await supabase
      .from("qualification_matches")
      .insert(matches)
      .select()

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
