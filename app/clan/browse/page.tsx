"use client"

import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Users, ArrowLeft, Crown, Plus, Filter } from "lucide-react"
import Link from "next/link"

interface ClanListItem {
  id: number
  name: string
  level: number
  xp: number
  member_count: number
  max_members: number
  description: string | null
  founder_name: string
}

export default function ModernClanBrowsePage() {
  const { user } = useAuth()
  const [clans, setClans] = useState<ClanListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [userHasClan, setUserHasClan] = useState(false)

  useEffect(() => {
    fetchClans()
    checkUserClanStatus()
  }, [])

  const checkUserClanStatus = async () => {
    if (!user?.username) return

    const supabase = getSupabaseBrowserClient()
    if (!supabase) return

    try {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("clan_id")
        .eq("username", user.username)
        .single()

      if (!userError && userData) {
        setUserHasClan(!!userData.clan_id)
      }
    } catch (error) {
      console.error("Error checking user clan status:", error)
    }
  }

  const fetchClans = async (append = false, pageNumber = 1) => {
    setLoading(true)
    const supabase = getSupabaseBrowserClient()
    if (!supabase) return

    try {
      const from = (pageNumber - 1) * 20
      const to = from + 19

      const { data, error, count } = await supabase
  .from("clans")
  .select("id, name, level, xp, max_members, description, founder_id", { count: "exact" })
  .returns<{
    id: number
    name: string
    level: number
    xp: number
    max_members: number
    description: string | null
    founder_id: string
  }[]>()

        .order("level", { ascending: false })
        .order("xp", { ascending: false })
        .range(from, to)

      if (error) throw error

      // Get founder names for all clans
      const founderIds = data.map((c) => c.founder_id)
      const { data: foundersData, error: foundersError } = await supabase
        .from("users")
        .select("username")
        .in("username", founderIds)

      if (foundersError) {
        console.error("Error fetching founders:", foundersError)
      }

      // Create a map of founder_id to founder_name
      const founderMap = Object.fromEntries(foundersData?.map((founder) => [founder.username, founder.username]) || [])

      // Get actual member counts from clan_members table
      const clanIds = data.map((c) => c.id)
      const memberCounts: Record<number, number> = {}

      for (const clanId of clanIds) {
        const { count: memberCount, error: memberCountError } = await supabase
          .from("clan_members")
          .select("*", { count: "exact", head: true })
          .eq("clan_id", clanId)

        if (!memberCountError) {
          memberCounts[clanId] = memberCount || 0
        }
      }

      const formatted: ClanListItem[] = data.map((c) => ({
        id: Number(c.id),
        name: String(c.name),
        level: Number(c.level),
        xp: Number(c.xp || 0),
        member_count: memberCounts[c.id] || 0,
        max_members: Number(c.max_members || 30),
        description: typeof c.description === "string" ? c.description : null,
        founder_name: founderMap[c.founder_id as string] || "Unknown",
      }))

      if (append) {
        setClans((prev) => [...prev, ...formatted])
      } else {
        setClans(formatted)
      }

      setHasMore(to + 1 < (count || 0))
    } catch (err) {
      console.error("Error loading clans:", err)
    } finally {
      setLoading(false)
    }
  }

  const filteredClans = clans
    .filter((clan) => clan.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter((clan) => !showOnlyAvailable || clan.member_count < clan.max_members)

  if (user && user.level < 15) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex flex-col items-center justify-center text-center px-4">
        <div className="max-w-md">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center mx-auto mb-6">
            <Crown className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
            Clans
          </h1>
          <p className="text-gray-600 text-lg mb-6">You must reach level 15 to access clans.</p>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-purple-200">
            <p className="text-sm text-gray-500">Current Level: {user.level}</p>
            <p className="text-sm text-purple-600 font-medium">Required Level: 15</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header - Mobile Optimized */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Link href="/clan">
              <Button variant="ghost" size="sm" className="hover:bg-white/50 backdrop-blur-sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Explore Clans
              </h1>
              <p className="text-gray-600 mt-1 text-sm">Discover and join amazing clans</p>
            </div>
          </div>
          {!userHasClan && (
            <Link href="/clan/create">
              <Button
                size="sm"
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Clan
              </Button>
            </Link>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative max-w-xl mx-auto mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search for clans by name..."
              className="pl-12 pr-4 py-3 text-base rounded-2xl border-0 shadow-lg bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all duration-200"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Filter and Stats Combined */}
        <div className="flex items-center justify-between gap-4 mb-8 max-w-4xl mx-auto">
          <Button
            variant={showOnlyAvailable ? "default" : "outline"}
            onClick={() => setShowOnlyAvailable(!showOnlyAvailable)}
            className={`${
              showOnlyAvailable
                ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg"
                : "bg-white/80 backdrop-blur-sm border-green-200 text-green-600 hover:bg-green-50"
            } px-6 py-2 rounded-xl transition-all duration-200 flex-shrink-0`}
          >
            <Filter className="h-4 w-4 mr-2" />
            {showOnlyAvailable ? "Available Only" : "Show Available"}
          </Button>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl px-6 py-3 shadow-lg border border-white/50">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"></div>
              <span className="text-gray-700">
                <span className="font-bold text-purple-600">{filteredClans.length}</span> clans found
              </span>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-12">
            <div className="relative">
              <div className="h-12 w-12 border-4 border-t-transparent border-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
              <div
                className="absolute inset-0 h-12 w-12 border-4 border-t-transparent border-blue-300 rounded-full animate-spin mx-auto opacity-30"
                style={{ animationDelay: "0.5s" }}
              ></div>
            </div>
            <p className="text-base font-medium text-gray-700">Discovering clans...</p>
            <p className="text-sm text-gray-500 mt-2">Finding the best communities for you</p>
          </div>
        ) : filteredClans.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
              {filteredClans.map((clan) => (
                <Link href={`/clan/${clan.id}`} key={clan.id} className="block group">
                  <Card className="h-full border border-gray-100 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 overflow-hidden">
                    {/* Header with gradient */}
                    <div className="h-2 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500"></div>

                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-base font-bold text-gray-900 truncate group-hover:text-purple-600 transition-colors">
                        {clan.name}
                      </CardTitle>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full font-medium shadow-sm">
                            Level {clan.level}
                          </Badge>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                            {clan.xp.toLocaleString()} XP
                          </span>
                        </div>
                      </div>

                      {/* Member count with status */}
                      <div className="flex items-center justify-between mt-2">
                        <span
                          className={`flex items-center gap-1 text-sm font-medium ${
                            clan.member_count >= clan.max_members ? "text-red-600" : "text-green-600"
                          }`}
                        >
                          <Users className="h-4 w-4" />
                          {clan.member_count}/{clan.max_members}
                        </span>
                        {clan.member_count >= clan.max_members ? (
                          <Badge className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">Full</Badge>
                        ) : (
                          <Badge className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                            {clan.max_members - clan.member_count} spots
                          </Badge>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 pt-2">
                      {clan.description && (
                        <p className="text-sm text-gray-600 line-clamp-2 mb-3 leading-relaxed">{clan.description}</p>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Crown className="h-3 w-3 text-amber-500" />
                          <span className="truncate max-w-[80px] font-medium">{clan.founder_name}</span>
                        </div>
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-xs px-3 h-7 rounded-full shadow-sm hover:shadow-md transition-all duration-200"
                        >
                          View
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="text-center">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    const nextPage = page + 1
                    setPage(nextPage)
                    fetchClans(true, nextPage)
                  }}
                  className="bg-white/80 backdrop-blur-sm border-purple-200 text-purple-600 hover:bg-purple-50 hover:border-purple-300 px-8 py-3 rounded-xl shadow-lg transition-all duration-200"
                >
                  Load More Clans
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mx-auto mb-6">
                <Search className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">No clans found</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                {searchQuery
                  ? `No clans match "${searchQuery}"${showOnlyAvailable ? " with available spots" : ""}`
                  : showOnlyAvailable
                    ? "No clans have available spots at the moment"
                    : "No clans are available at the moment"}
              </p>
              <div className="flex gap-3 justify-center">
                {searchQuery && (
                  <Button variant="outline" onClick={() => setSearchQuery("")} className="bg-white/80 backdrop-blur-sm">
                    Clear Search
                  </Button>
                )}
                {showOnlyAvailable && (
                  <Button
                    variant="outline"
                    onClick={() => setShowOnlyAvailable(false)}
                    className="bg-white/80 backdrop-blur-sm"
                  >
                    Show All Clans
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
