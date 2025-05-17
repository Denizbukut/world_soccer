"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { ArrowLeft, Shield } from "lucide-react"
import Link from "next/link"

export default function CreateClanPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [clanName, setClanName] = useState("")
  const [clanDescription, setClanDescription] = useState("")
  const [loading, setLoading] = useState(false)

  const handleCreateClan = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user?.username) {
      toast({
        title: "Fehler",
        description: "Du musst eingeloggt sein, um einen Clan zu gründen",
        variant: "destructive",
      })
      return
    }

    if (!clanName.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte gib einen Clan-Namen ein",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    const supabase = getSupabaseBrowserClient()
    if (!supabase) return

    try {
      // Check if user is already in a clan
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("clan_id")
        .eq("username", user.username)
        .single()

      if (userError) {
        console.error("Error checking user clan:", userError)
        toast({
          title: "Fehler",
          description: "Fehler beim Überprüfen deines Accounts",
          variant: "destructive",
        })
        return
      }

      if (userData.clan_id) {
        toast({
          title: "Fehler",
          description: "Du bist bereits in einem Clan",
          variant: "destructive",
        })
        return
      }

      // Create new clan
      const { data: clanData, error: clanError } = await supabase
        .from("clans")
        .insert({
          name: clanName.trim(),
          description: clanDescription.trim() || null,
          level: 1,
          xp: 0,
          xp_needed: 500,
          founder_id: user.username,
          member_count: 1,
        })
        .select("id")
        .single()

      if (clanError) {
        console.error("Error creating clan:", clanError)
        toast({
          title: "Fehler",
          description: "Fehler beim Erstellen des Clans",
          variant: "destructive",
        })
        return
      }

      // Update user's clan_id
      const { error: updateError } = await supabase
        .from("users")
        .update({ clan_id: clanData.id })
        .eq("username", user.username)

      if (updateError) {
        console.error("Error updating user clan:", updateError)
        toast({
          title: "Warnung",
          description: "Clan wurde erstellt, aber deine Mitgliedschaft konnte nicht aktualisiert werden",
          variant: "destructive",
        })
      }

      // Add clan creation activity
      await supabase.from("clan_activities").insert({
        clan_id: clanData.id,
        activity_type: "create",
        description: `Clan wurde von ${user.username} gegründet`,
        user_id: user.username,
        created_at: new Date().toISOString(),
      })

      toast({
        title: "Erfolg",
        description: "Dein Clan wurde erfolgreich erstellt",
      })

      // Redirect to clan page
      router.push(`/clan/${clanData.id}`)
    } catch (error) {
      console.error("Error in handleCreateClan:", error)
      toast({
        title: "Fehler",
        description: "Fehler beim Erstellen des Clans",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center mb-6">
        <Link href="/clan">
          <Button variant="ghost" size="sm" className="mr-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Zurück
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Clan gründen</h1>
      </div>

      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-violet-500" />
            Neuen Clan erstellen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateClan} className="space-y-4">
            <div>
              <label htmlFor="clanName" className="block text-sm font-medium mb-1">
                Clan-Name
              </label>
              <Input
                id="clanName"
                value={clanName}
                onChange={(e) => setClanName(e.target.value)}
                placeholder="Gib deinem Clan einen Namen"
                maxLength={20}
                required
              />
            </div>

            <div>
              <label htmlFor="clanDescription" className="block text-sm font-medium mb-1">
                Beschreibung (optional)
              </label>
              <Textarea
                id="clanDescription"
                value={clanDescription}
                onChange={(e) => setClanDescription(e.target.value)}
                placeholder="Beschreibe deinen Clan (max. 200 Zeichen)"
                maxLength={200}
                rows={4}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <div className="h-4 w-4 border-2 border-t-transparent border-current rounded-full animate-spin mr-2"></div>
                  Erstelle Clan...
                </>
              ) : (
                "Clan gründen"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
