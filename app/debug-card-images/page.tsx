"use client"

import { useEffect, useState } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"

export default function DebugCardImagesPage() {
  const [cards, setCards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCards() {
      const supabase = getSupabaseBrowserClient()
      if (!supabase) return

      try {
        const { data, error } = await supabase
          .from("cards")
          .select("id, name, image_url, rarity")
          .limit(5)

        if (error) {
          console.error("Error:", error)
          return
        }

        console.log("Raw cards from database:", data)
        setCards(data || [])
      } catch (err) {
        console.error("Unexpected error:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchCards()
  }, [])

  const getCardImageUrl = (imageUrl?: string) => {
    if (!imageUrl) return "/placeholder.svg"
    let cleaned = imageUrl.replace(/^\/?world_soccer\//, "")
    return `https://pub-e74caca70ffd49459342dd56ea2b67c9.r2.dev/${cleaned}`
  }

  if (loading) {
    return <div className="p-4">Loading...</div>
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Debug Card Images</h1>
      
      <div className="space-y-4">
        {cards.map((card) => {
          const processedUrl = getCardImageUrl(card.image_url)
          return (
            <div key={card.id} className="border p-4 rounded">
              <h3 className="font-bold">{card.name}</h3>
              <p>Original image_url: {card.image_url}</p>
              <p>Processed URL: {processedUrl}</p>
              <div className="mt-2">
                <img 
                  src={processedUrl} 
                  alt={card.name}
                  className="w-32 h-40 object-cover border"
                  onError={(e) => {
                    console.error(`Failed to load image for ${card.name}:`, processedUrl)
                    e.currentTarget.src = "/placeholder.svg"
                  }}
                  onLoad={() => {
                    console.log(`Successfully loaded image for ${card.name}:`, processedUrl)
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
} 