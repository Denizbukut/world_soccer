"use client"

import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Shield, Search, Users, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface ClanListItem {
  id: number
  name: string
  level: number
  member_count: number
  description: string | null
}

export default function ClanBrowsePage() {
  const [clans, setClans] = useState<ClanListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    fetchClans()
  }, [])

  const fetchClans = async () => {
    setLoading(true)
    const supabase = getSupabaseBrowserClient()
    if (!supabase) return

    try {
      const { data, error } = await supabase
        .from("clans")
        .select("id, name, level, member_count, description")
        .order("member_count", { ascending: false })

      if (error) {
        console.error("Error fetching clans:", error)
        return
      }

      if (data) {
        const formattedClans = data.map((clan) => ({
          id: Number(clan.id),
          name: String(clan.name),
          level: typeof clan.level === "number" ? clan.level : 1,
          member_count: typeof clan.member_count === "number" ? clan.member_count : 0,
          description: clan.description ? String(clan.description) : null,
        }))

        setClans(formattedClans)
      }
    } catch (error) {
      console.error("Error in fetchClans:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredClans = clans.filter((clan) => clan.name.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center mb-6">
        <Link href="/clan">
          <Button variant="ghost" size="sm" className="mr-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Zurück
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Clans durchsuchen</h1>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Clan suchen..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="h-8 w-8 border-4 border-t-transparent border-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Lade Clans...</p>
        </div>
      ) : filteredClans.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredClans.map((clan) => (
            <Link href={`/clan/${clan.id}`} key={clan.id} className="block">
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold">
                        {clan.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{clan.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">Level {clan.level}</Badge>
                          <span className="text-xs text-muted-foreground flex items-center">
                            <Users className="h-3 w-3 mr-1" />
                            {clan.member_count}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Shield className="h-5 w-5 text-violet-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {clan.description || "Keine Beschreibung vorhanden."}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Keine Clans gefunden</p>
        </div>
      )}
    </div>
  )
}
