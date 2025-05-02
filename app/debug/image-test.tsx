"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import SafeImage from "@/components/safe-image"

export default function ImageTestPage() {
  const [cards, setCards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [imageStatuses, setImageStatuses] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchCards()
  }, [])

  async function fetchCards() {
    setLoading(true)
    const supabase = getSupabaseBrowserClient()

    const { data, error } = await supabase.from("cards").select("id, name, character, image_url").limit(20)

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
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Image Test Page</h1>
        <Button onClick={fetchCards} disabled={loading}>
          {loading ? "Loading..." : "Refresh Cards"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Card key={card.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{card.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{card.character}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative aspect-[3/4] rounded-md overflow-hidden">
                <SafeImage
                  src={card.image_url}
                  alt={`${card.character} - ${card.name}`}
                  fill
                  className="object-cover"
                  onLoad={() => handleImageLoad(card.id)}
                  onError={() => handleImageError(card.id)}
                />
              </div>
              <div className="text-sm space-y-1">
                <p className="font-medium">Image URL:</p>
                <code className="block p-2 bg-muted rounded-md text-xs break-all">{card.image_url || "null"}</code>
                <Badge
                  variant={
                    imageStatuses[card.id] === "loaded"
                      ? "success"
                      : imageStatuses[card.id] === "error"
                        ? "destructive"
                        : "outline"
                  }
                  className="mt-2"
                >
                  {imageStatuses[card.id] || "unknown"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Test Direct Image Access</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {["naruto", "sasuke", "goku", "luffy"].map((character) => (
            <Card key={character}>
              <CardHeader>
                <CardTitle className="text-sm capitalize">{character}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative aspect-square rounded-md overflow-hidden">
                  <SafeImage src={`/anime-images/${character}.png`} alt={character} fill className="object-cover" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
