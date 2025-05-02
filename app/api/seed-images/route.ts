import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase"

// These are actual image URLs that will work in our app
const cardImages = [
  {
    character: "Naruto Uzumaki",
    image_url: "/sage-ascension.png",
  },
  {
    character: "Sasuke Uchiha",
    image_url: "/sasuke-rinnegan-card.png",
  },
  {
    character: "Kakashi Hatake",
    image_url: "/kakashi-sharingan-card.png",
  },
  {
    character: "Sakura Haruno",
    image_url: "/sakura-hundred-healings.png",
  },
  {
    character: "Hinata Hyuga",
    image_url: "/byakugan-awakening.png",
  },
]

export async function GET() {
  try {
    const supabase = getSupabaseServerClient()

    // Update each card with its corresponding image
    for (const cardImage of cardImages) {
      const { error } = await supabase
        .from("cards")
        .update({ image_url: cardImage.image_url })
        .eq("character", cardImage.character)

      if (error) {
        console.error(`Error updating image for ${cardImage.character}:`, error)
      }
    }

    return NextResponse.json({ success: true, message: "Card images updated successfully" })
  } catch (error) {
    console.error("Error in seed-images route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
