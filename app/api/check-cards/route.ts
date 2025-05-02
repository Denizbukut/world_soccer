import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase"

export async function GET() {
  try {
    const supabase = getSupabaseServerClient()

    // Count cards in the database
    const { count, error } = await supabase.from("cards").select("*", { count: "exact", head: true })

    if (error) {
      console.error("Error checking cards:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get a sample of cards for debugging
    const { data: sampleCards } = await supabase.from("cards").select("id, name, rarity").limit(5)

    return NextResponse.json({
      success: true,
      count,
      sampleCards,
      message: count > 0 ? "Cards found in database" : "No cards found in database",
    })
  } catch (error) {
    console.error("Error in check-cards route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
