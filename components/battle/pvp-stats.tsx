"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Trophy } from "lucide-react"
import { getUserPvpStats } from "@/app/battle-actions"

interface PvpStatsProps {
  username: string
  refreshTrigger?: number
}

interface PvpStatsData {
  totalBattles: number
  wins: number
  losses: number
  draws: number
  winRate: number
  recentBattles: Array<{
    result: string
    created_at: string
    opponent_id: { username: string }
  }>
}

export default function PvpStats({ username, refreshTrigger }: PvpStatsProps) {
  const [stats, setStats] = useState<PvpStatsData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = async () => {
    try {
      setLoading(true)
      const result = await getUserPvpStats(username)
      
      if (result.success && 'data' in result) {
        setStats(result.data)
      } else {
        // Show default stats if no data
        setStats({
          totalBattles: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          winRate: 0,
          recentBattles: []
        })
      }
    } catch (err) {
      // Show default stats on error
      setStats({
        totalBattles: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0,
        recentBattles: []
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (username) {
      fetchStats()
    } else {
      setLoading(false)
    }
  }, [username, refreshTrigger])

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-blue-900/40 to-black/60 border-blue-500/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-center">
            <div className="text-white">Loading PvP stats...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Always show stats, even if there's an error or no data
  const displayStats = stats || {
    totalBattles: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    winRate: 0,
    recentBattles: []
  }

  return (
    <Card className="bg-gradient-to-br from-blue-900/40 to-black/60 border-blue-500/30">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-5 w-5 text-blue-400" />
          <h3 className="text-lg font-bold text-white">PvP Battle Statistics</h3>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Battles */}
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">{displayStats.totalBattles}</div>
            <div className="text-xs text-gray-300">Total Battles</div>
          </div>
          
          {/* Wins */}
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{displayStats.wins}</div>
            <div className="text-xs text-gray-300">Wins</div>
          </div>
          
          {/* Losses */}
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400">{displayStats.losses}</div>
            <div className="text-xs text-gray-300">Losses</div>
          </div>
          
          {/* Win Rate */}
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">{displayStats.winRate}%</div>
            <div className="text-xs text-gray-300">Win Rate</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
