"use client"

import { 
  debugGodPackDiscount, 
  activateGodPackDiscount, 
  deactivateGodPackDiscount,
  getGodPackDiscountHistory,
  cleanupExpiredGodPackDiscounts
} from "@/app/actions/god-pack-discount"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useState } from "react"

export default function DebugGodPackDiscountPage() {
  const [debugResult, setDebugResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [customDiscount, setCustomDiscount] = useState(20)
  const [customDuration, setCustomDuration] = useState(24)
  const [createdBy, setCreatedBy] = useState('admin')
  const [notes, setNotes] = useState('')
  const [history, setHistory] = useState<any[]>([])

  const predefinedDiscounts = [
    { percent: 5, duration: 12, label: "5% für 12h", notes: "Kleiner Rabatt" },
    { percent: 10, duration: 24, label: "10% für 24h", notes: "Standard Rabatt" },
    { percent: 15, duration: 24, label: "15% für 24h", notes: "Mittlerer Rabatt" },
    { percent: 20, duration: 24, label: "20% für 24h", notes: "Großer Rabatt" },
    { percent: 25, duration: 12, label: "25% für 12h", notes: "Flash Sale" },
    { percent: 30, duration: 6, label: "30% für 6h", notes: "Mega Flash Sale" },
    { percent: 50, duration: 2, label: "50% für 2h", notes: "Ultra Flash Sale" },
  ]

  const handleDebug = async () => {
    setLoading(true)
    try {
      const result = await debugGodPackDiscount()
      setDebugResult(result)
    } catch (error) {
      console.error("Debug error:", error)
      setDebugResult({ success: false, error: "Debug failed" })
    }
    setLoading(false)
  }

  const handleActivatePredefined = async (percent: number, duration: number, discountNotes: string) => {
    setLoading(true)
    try {
      const result = await activateGodPackDiscount(percent, duration, createdBy, discountNotes)
      setDebugResult(result)
      if (result.success) {
        setTimeout(handleDebug, 1000)
      }
    } catch (error) {
      console.error("Activate error:", error)
      setDebugResult({ success: false, error: "Activation failed" })
    }
    setLoading(false)
  }

  const handleActivateCustom = async () => {
    setLoading(true)
    try {
      const result = await activateGodPackDiscount(customDiscount, customDuration, createdBy, notes)
      setDebugResult(result)
      if (result.success) {
        setTimeout(handleDebug, 1000)
      }
    } catch (error) {
      console.error("Activate error:", error)
      setDebugResult({ success: false, error: "Activation failed" })
    }
    setLoading(false)
  }

  const handleDeactivate = async () => {
    setLoading(true)
    try {
      const result = await deactivateGodPackDiscount()
      setDebugResult(result)
      if (result.success) {
        setTimeout(handleDebug, 1000)
      }
    } catch (error) {
      console.error("Deactivate error:", error)
      setDebugResult({ success: false, error: "Deactivation failed" })
    }
    setLoading(false)
  }

  const handleGetHistory = async () => {
    setLoading(true)
    try {
      const result = await getGodPackDiscountHistory()
      if (result.success) {
        setHistory(result.data || [])
      }
    } catch (error) {
      console.error("History error:", error)
    }
    setLoading(false)
  }

  const handleCleanup = async () => {
    setLoading(true)
    try {
      const result = await cleanupExpiredGodPackDiscounts()
      setDebugResult(result)
      if (result.success) {
        setTimeout(handleDebug, 1000)
      }
    } catch (error) {
      console.error("Cleanup error:", error)
      setDebugResult({ success: false, error: "Cleanup failed" })
    }
    setLoading(false)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">God Pack Discount Manager</h1>
      <p className="text-gray-600">Verwaltet Rabatte über die separate god_pack_discounts Tabelle</p>
      
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4 flex-wrap">
            <Button onClick={handleDebug} disabled={loading} variant="outline">
              🔍 Debug Status
            </Button>
            <Button onClick={handleDeactivate} disabled={loading} variant="destructive">
              ❌ Deaktivieren
            </Button>
            <Button onClick={handleGetHistory} disabled={loading} variant="outline">
              📜 Verlauf
            </Button>
            <Button onClick={handleCleanup} disabled={loading} variant="outline">
              🧹 Bereinigen
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Predefined Discounts */}
      <Card>
        <CardHeader>
          <CardTitle>Vordefinierte Rabatte</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {predefinedDiscounts.map((discount, index) => (
              <Button
                key={index}
                onClick={() => handleActivatePredefined(discount.percent, discount.duration, discount.notes)}
                disabled={loading}
                className="h-auto p-3 flex flex-col items-center gap-1"
                variant="outline"
              >
                <span className="font-bold text-lg">{discount.percent}%</span>
                <span className="text-xs text-gray-600">{discount.duration}h</span>
                <span className="text-xs text-gray-500">{discount.notes}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom Discount */}
      <Card>
        <CardHeader>
          <CardTitle>Benutzerdefinierter Rabatt</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="discount">Rabatt (%)</Label>
              <Input
                id="discount"
                type="number"
                min="1"
                max="90"
                value={customDiscount}
                onChange={(e) => setCustomDiscount(Number(e.target.value))}
                placeholder="20"
              />
            </div>
            <div>
              <Label htmlFor="duration">Dauer (Stunden)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                max="168"
                value={customDuration}
                onChange={(e) => setCustomDuration(Number(e.target.value))}
                placeholder="24"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="createdBy">Erstellt von</Label>
              <Input
                id="createdBy"
                value={createdBy}
                onChange={(e) => setCreatedBy(e.target.value)}
                placeholder="admin"
              />
            </div>
            <div>
              <Label htmlFor="notes">Notizen (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Beschreibung des Rabatts..."
                rows={2}
              />
            </div>
          </div>
          <Button 
            onClick={handleActivateCustom} 
            disabled={loading} 
            className="w-full"
          >
            🎯 {customDiscount}% Rabatt für {customDuration}h aktivieren
          </Button>
        </CardContent>
      </Card>

      {/* Quick Presets */}
      <Card>
        <CardHeader>
          <CardTitle>Schnell-Presets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold">Kleine Rabatte</h3>
              <div className="flex gap-2 flex-wrap">
                <Button 
                  onClick={() => handleActivatePredefined(5, 12, "Kleiner Rabatt")} 
                  disabled={loading}
                  size="sm"
                  variant="outline"
                >
                  5% (12h)
                </Button>
                <Button 
                  onClick={() => handleActivatePredefined(10, 24, "Standard Rabatt")} 
                  disabled={loading}
                  size="sm"
                  variant="outline"
                >
                  10% (24h)
                </Button>
                <Button 
                  onClick={() => handleActivatePredefined(15, 24, "Mittlerer Rabatt")} 
                  disabled={loading}
                  size="sm"
                  variant="outline"
                >
                  15% (24h)
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Große Rabatte</h3>
              <div className="flex gap-2 flex-wrap">
                <Button 
                  onClick={() => handleActivatePredefined(25, 12, "Flash Sale")} 
                  disabled={loading}
                  size="sm"
                  variant="outline"
                >
                  25% (12h)
                </Button>
                <Button 
                  onClick={() => handleActivatePredefined(30, 6, "Mega Flash Sale")} 
                  disabled={loading}
                  size="sm"
                  variant="outline"
                >
                  30% (6h)
                </Button>
                <Button 
                  onClick={() => handleActivatePredefined(50, 2, "Ultra Flash Sale")} 
                  disabled={loading}
                  size="sm"
                  variant="outline"
                >
                  50% (2h)
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Rabatt Verlauf</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {history.map((discount, index) => (
                <div key={index} className="border p-3 rounded">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold">{discount.discount_percent}%</span>
                      <span className="text-gray-600 ml-2">für {discount.duration_hours}h</span>
                    </div>
                    <div className="text-right text-sm">
                      <div className={discount.is_active ? "text-green-600" : "text-gray-500"}>
                        {discount.is_active ? "Aktiv" : "Inaktiv"}
                      </div>
                      <div className="text-gray-500">
                        {new Date(discount.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  {discount.notes && (
                    <div className="text-sm text-gray-600 mt-1">
                      {discount.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debug Result */}
      {debugResult && (
        <Card>
          <CardHeader>
            <CardTitle>Debug Result</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
              {JSON.stringify(debugResult, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* SQL Commands */}
      <Card>
        <CardHeader>
          <CardTitle>SQL Commands für god_pack_discounts Tabelle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold">Tabelle erstellen:</h3>
            <pre className="bg-gray-100 p-2 rounded text-sm">
{`-- Führe das Script aus: scripts/create-god-pack-discount-table.sql`}
            </pre>
          </div>
          
          <div>
            <h3 className="font-semibold">Rabatt aktivieren:</h3>
            <pre className="bg-gray-100 p-2 rounded text-sm">
{`-- X% Rabatt für Y Stunden
SELECT activate_god_pack_discount(X, Y, 'admin', 'Notizen');

-- Beispiel: 15% für 12 Stunden
SELECT activate_god_pack_discount(15, 12, 'admin', 'Wochenend-Rabatt');`}
            </pre>
          </div>
          
          <div>
            <h3 className="font-semibold">Rabatt deaktivieren:</h3>
            <pre className="bg-gray-100 p-2 rounded text-sm">
{`SELECT deactivate_god_pack_discount();`}
            </pre>
          </div>
          
          <div>
            <h3 className="font-semibold">Aktiven Rabatt prüfen:</h3>
            <pre className="bg-gray-100 p-2 rounded text-sm">
{`SELECT * FROM get_active_god_pack_discount();`}
            </pre>
          </div>

          <div>
            <h3 className="font-semibold">Alle Rabatte anzeigen:</h3>
            <pre className="bg-gray-100 p-2 rounded text-sm">
{`SELECT * FROM god_pack_discounts ORDER BY created_at DESC;`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
