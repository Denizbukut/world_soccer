"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/components/ui/use-toast"

export default function UpdateImagesPage() {
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<any>(null)

  const updateImages = async () => {
    try {
      setLoading(true)
      setProgress(10)

      // Call the API to update all card images
      const response = await fetch("/api/generate-real-anime-images")
      setProgress(50)

      const data = await response.json()
      setProgress(100)

      setResults(data)

      toast({
        title: "Success",
        description: `Updated ${data.count} card images!`,
      })
    } catch (error) {
      console.error("Error updating images:", error)
      toast({
        title: "Error",
        description: "Failed to update card images",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Auto-update images when the page loads
  useEffect(() => {
    updateImages()
  }, [])

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Update Card Images</CardTitle>
          <CardDescription>Generate real anime character images for all cards</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <p>Updating card images...</p>
              <Progress value={progress} />
            </div>
          ) : results ? (
            <div className="space-y-4">
              <p className="text-green-600 font-medium">✅ Successfully updated {results.count} card images!</p>

              <div className="mt-4">
                <h3 className="font-medium mb-2">Sample of updated cards:</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {results.results?.map((result: any, index: number) => (
                    <li key={index}>{result.character}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p>Ready to update card images</p>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={updateImages} disabled={loading}>
            {loading ? "Updating..." : "Update Images Again"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
