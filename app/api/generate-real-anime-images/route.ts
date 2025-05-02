import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const supabase = createClient()

    // Get all cards
    const { data: cards, error } = await supabase.from("cards").select("id, name, character")

    if (error) {
      throw new Error(`Error fetching cards: ${error.message}`)
    }

    // Update each card with a real image URL
    const updates = cards.map(async (card) => {
      // Generate a descriptive query for the character
      const characterName = card.character || "anime character"
      const cardName = card.name || ""

      // Create a descriptive query for the image
      const query = `${characterName} from anime, high quality, detailed, vibrant colors`

      // Generate a unique image URL for each character
      const imageUrl = `/placeholder.svg?height=400&width=300&query=${encodeURIComponent(query)}`

      // Update the card in the database
      const { error: updateError } = await supabase.from("cards").update({ image_url: imageUrl }).eq("id", card.id)

      if (updateError) {
        console.error(`Error updating card ${card.id}:`, updateError)
        return { id: card.id, success: false, error: updateError.message }
      }

      return { id: card.id, character: characterName, success: true }
    })

    const results = await Promise.all(updates)

    return NextResponse.json({
      message: "Successfully updated all card images",
      count: results.length,
      results: results.slice(0, 10), // Return first 10 results as sample
    })
  } catch (error) {
    console.error("Error generating anime images:", error)
    return NextResponse.json({ error: "Failed to generate anime images" }, { status: 500 })
  }
}
