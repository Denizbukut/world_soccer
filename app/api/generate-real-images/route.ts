import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// Helper function to generate a proper image URL for a character
function generateImageUrl(character: string): string {
  // Convert character name to kebab-case for the file name
  const fileName = character.toLowerCase().replace(/\s+/g, "-")
  return `/anime-images/${fileName}.png`
}

export async function GET() {
  try {
    const supabase = createClient()

    // 1. Get all cards from the database
    const { data: cards, error: fetchError } = await supabase.from("cards").select("id, character")

    if (fetchError) {
      throw new Error(`Error fetching cards: ${fetchError.message}`)
    }

    if (!cards || cards.length === 0) {
      return NextResponse.json({ message: "No cards found" }, { status: 404 })
    }

    // 2. Update each card with a proper image URL
    const updates = cards.map(async (card) => {
      const imageUrl = generateImageUrl(card.character)

      const { error: updateError } = await supabase.from("cards").update({ image_url: imageUrl }).eq("id", card.id)

      if (updateError) {
        throw new Error(`Error updating card ${card.id}: ${updateError.message}`)
      }

      return { id: card.id, character: card.character, imageUrl }
    })

    const results = await Promise.all(updates)

    return NextResponse.json({
      message: "Successfully updated all card images",
      count: results.length,
      results: results.slice(0, 10), // Return first 10 results as sample
    })
  } catch (error) {
    console.error("Error generating real images:", error)
    return NextResponse.json({ error: "Failed to generate real images" }, { status: 500 })
  }
}
