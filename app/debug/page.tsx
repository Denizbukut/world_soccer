"use client"

import { useEffect, useState } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import Image from "next/image"
import SafeImage from "@/components/safe-image"

export default function DebugPage() {
  const [cards, setCards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCards() {
      setLoading(true)
      const supabase = getSupabaseBrowserClient()

      // Fetch 10 cards
      const { data, error } = await supabase.from("cards").select("*").limit(10)

      if (error) {
        console.error("Error fetching cards:", error)
        setCards([])
      } else {
        setCards(data || [])
      }

      setLoading(false)
    }

    fetchCards()
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Image Debug Page</h1>
        <div className="grid grid-cols-1 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Image Debug Page</h1>

      <div className="grid grid-cols-1 gap-8">
        {/* Test placeholder image */}
        <Card>
          <CardHeader>
            <CardTitle>Test Placeholder Image</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="relative h-40 w-full">
              <Image src="/abstract-test.png" alt="Test Placeholder" fill className="object-contain" />
            </div>
            <p className="text-sm">URL: /placeholder.svg?height=400&width=300&query=test%20character</p>
          </CardContent>
        </Card>

        {/* Test SafeImage component */}
        <Card>
          <CardHeader>
            <CardTitle>Test SafeImage Component</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="relative h-40 w-full">
              <SafeImage src="/abstract-geometric-shapes.png" alt="Safe Image Test" fill className="object-contain" />
            </div>
            <p className="text-sm">URL: /placeholder.svg?height=400&width=300&query=safe%20image%20test</p>
          </CardContent>
        </Card>

        {/* Cards from database */}
        <h2 className="text-xl font-bold mt-4">Cards from Database</h2>
        {cards.map((card) => (
          <Card key={card.id}>
            <CardHeader>
              <CardTitle>
                {card.name} ({card.character})
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-bold mb-2">Card Data:</h3>
                  <p>
                    <strong>ID:</strong> {card.id}
                  </p>
                  <p>
                    <strong>Name:</strong> {card.name}
                  </p>
                  <p>
                    <strong>Character:</strong> {card.character}
                  </p>
                  <p>
                    <strong>Image URL:</strong> {card.image_url || "None"}
                  </p>
                  <p>
                    <strong>Rarity:</strong> {card.rarity}
                  </p>
                </div>
                <div>
                  <h3 className="font-bold mb-2">Image Preview:</h3>
                  <div className="relative h-60 border border-gray-300 rounded-md overflow-hidden">
                    <SafeImage
                      src={card.image_url}
                      alt={`${card.character} - ${card.name}`}
                      fill
                      className="object-contain"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
