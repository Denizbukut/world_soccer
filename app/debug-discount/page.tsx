"use client"

import { useState, useEffect } from "react"
import { debugTimeDiscount, activateTimeDiscount } from "@/app/actions/time-discount"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function DebugDiscountPage() {
  const [debugData, setDebugData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const checkDiscount = async () => {
    setLoading(true)
    try {
      const result = await debugTimeDiscount()
      setDebugData(result)
      console.log("Debug result:", result)
    } catch (error) {
      console.error("Error checking discount:", error)
    } finally {
      setLoading(false)
    }
  }

  const activateDiscount = async () => {
    setLoading(true)
    try {
      const result = await activateTimeDiscount()
      console.log("Activate result:", result)
      if (result.success) {
        await checkDiscount()
      }
    } catch (error) {
      console.error("Error activating discount:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkDiscount()
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">🎯 Discount Debug</h1>
        
        <div className="flex gap-4">
          <Button onClick={checkDiscount} disabled={loading}>
            {loading ? "Checking..." : "Check Discount"}
          </Button>
          <Button onClick={activateDiscount} disabled={loading} variant="outline">
            {loading ? "Activating..." : "Activate 4h Discount"}
          </Button>
        </div>

        {debugData && (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle>Debug Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-green-400">Success:</h3>
                  <p>{debugData.success ? "✅ Yes" : "❌ No"}</p>
                </div>
                
                {debugData.error && (
                  <div>
                    <h3 className="font-semibold text-red-400">Error:</h3>
                    <p className="text-red-300">{debugData.error}</p>
                  </div>
                )}

                {debugData.data && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-blue-400">Discount Data:</h3>
                    <div className="bg-gray-700 p-4 rounded">
                      <pre className="text-sm overflow-auto">
                        {JSON.stringify(debugData.data, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
} 