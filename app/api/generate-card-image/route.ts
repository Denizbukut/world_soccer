import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const character = searchParams.get("character")

    if (!character) {
      return NextResponse.json({ error: "Character parameter is required" }, { status: 400 })
    }

    // Generate a placeholder image URL
    const characterSlug = character.toLowerCase().replace(/\s+/g, "-")
    const imageUrl = `/anime-images/${characterSlug}.png`

    return NextResponse.json({
      success: true,
      imageUrl,
      message: `Generated image URL for ${character}`,
    })
  } catch (error) {
    console.error("Error generating card image:", error)
    return NextResponse.json({ error: "Failed to generate card image" }, { status: 500 })
  }
}
