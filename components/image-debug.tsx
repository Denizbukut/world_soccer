"use client"

import { useState, useEffect } from "react"
// Removed Next.js Image import - using regular img tags
import { Card } from "@/components/ui/card"
import { getSupabaseBrowserClient } from "@/lib/supabase"

export default function ImageDebug() {
  const [cards, setCards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [imageStatuses, setImageStatuses] = useState<Record<string, string>>({})

  useEffect(() => {
    async function fetchCards() {
      setLoading(true)
      const supabase = getSupabaseBrowserClient()

      const { data, error } = await supabase.from("cards").select("id, name, character, image_url").limit(10)

      if (error) {
        console.error("Error fetching cards:", error)
      } else {
        setCards(data || [])

        // Initialize image statuses
        const initialStatuses: Record<string, string> = {}
        data?.forEach((card) => {
          initialStatuses[card.id] = "loading"
        })
        setImageStatuses(initialStatuses)
      }

      setLoading(false)
    }

    fetchCards()
  }, [])

  const handleImageLoad = (id: string) => {
    setImageStatuses((prev) => ({
      ...prev,
      [id]: "loaded",
    }))
  }

  const handleImageError = (id: string) => {
    setImageStatuses((prev) => ({
      ...prev,
      [id]: "error",
    }))
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Image Debug Tool</h1>

      {loading ? (
        <p>Loading cards...</p>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cards.map((card) => (
              <Card key={card.id} className="p-4">
                <h2 className="text-lg font-bold mb-2">{card.name}</h2>
                <p className="text-sm text-gray-500 mb-2">Character: {card.character}</p>
                <p className="text-sm mb-4">
                  Image URL: <code className="bg-gray-100 px-1 py-0.5 rounded">{card.image_url || "null"}</code>
                </p>

                <div className="relative h-60 mb-2 bg-gray-100 rounded">
                  {card.image_url && (
                    <img
                      src={card.image_url || "/placeholder.svg"}
                      alt={card.name}
                      className="absolute inset-0 w-full h-full object-contain"
                      onLoad={() => handleImageLoad(card.id)}
                      onError={() => handleImageError(card.id)}
                    />
                  )}
                </div>

                <div
                  className={`text-sm font-medium ${
                    imageStatuses[card.id] === "loaded"
                      ? "text-green-500"
                      : imageStatuses[card.id] === "error"
                        ? "text-red-500"
                        : "text-yellow-500"
                  }`}
                >
                  Status: {imageStatuses[card.id] || "unknown"}
                </div>
              </Card>
            ))}
          </div>

          <div className="mt-8 p-4 bg-gray-100 rounded">
            <h2 className="text-lg font-bold mb-2">Test Placeholder Image</h2>
            <div className="relative h-60 mb-2 bg-gray-200 rounded">
              <img src="/determined-ninja.png" alt="Test placeholder" className="absolute inset-0 w-full h-full object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
