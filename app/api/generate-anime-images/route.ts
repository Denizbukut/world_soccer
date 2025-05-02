import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase"

export async function GET() {
  try {
    const supabase = getSupabaseServerClient()

    // Get all unique characters from the database
    const { data: cards, error } = await supabase.from("cards").select("character").order("character")

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Extract unique character names
    const characters = [...new Set(cards?.map((card) => card.character))]

    return NextResponse.json({
      success: true,
      count: characters.length,
      characters,
    })
  } catch (error) {
    console.error("Error generating anime images:", error)
    return NextResponse.json({ error: "Failed to generate anime images" }, { status: 500 })
  }
}
