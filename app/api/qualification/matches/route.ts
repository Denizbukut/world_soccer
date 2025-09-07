import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  try {
    // Get all qualification match results
    const { data, error } = await supabase
      .from("qualification_matches")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error) {
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
