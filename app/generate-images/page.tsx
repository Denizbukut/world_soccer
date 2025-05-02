"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function GenerateImagesPage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const generateImages = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/generate-real-images")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate images")
      }

      setResults(data)
    } catch (err: any) {
      setError(err.message || "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  // Auto-generate images when the page loads
  useEffect(() => {
    generateImages()
  }, [])

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Generate Real Anime Character Images</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button onClick={generateImages} disabled={loading} className="w-full">
              {loading ? "Generating Images..." : "Generate Images Again"}
            </Button>

            {error && <div className="p-4 bg-red-50 text-red-700 rounded-md">{error}</div>}

            {results && (
              <div className="p-4 bg-green-50 text-green-700 rounded-md">
                <p>{results.message}</p>
                <p>Updated {results.count} cards with real images</p>

                <div className="mt-4">
                  <h3 className="font-medium">Sample Updates:</h3>
                  <ul className="list-disc pl-5 mt-2">
                    {results.results.map((item: any, index: number) => (
                      <li key={index}>
                        {item.character}: {item.imageUrl}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
