"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trophy, Crown, Medal, Users, Zap, Target } from "lucide-react"
import { motion } from "framer-motion"
import { useAuth } from "@/contexts/auth-context"

interface LeaderboardUser {
  rank: number
  username: string
  prestige_points: number
}

interface QualificationMatch {
  player1: LeaderboardUser
  player2: LeaderboardUser
  matchId: string
}

export default function QualificationMatches() {
  const { user } = useAuth()
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([])
  const [qualificationMatches, setQualificationMatches] = useState<QualificationMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [userRank, setUserRank] = useState<number | null>(null)

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch("/api/qualification/leaderboard")
      const data = await response.json()

      if (data.success) {
        setLeaderboard(data.data)
        
        // Find user's rank
        const currentUser = data.data.find((u: LeaderboardUser) => u.username === user?.username)
        if (currentUser) {
          setUserRank(currentUser.rank)
        }

        // Generate qualification matches
        generateQualificationMatches(data.data)
      }
    } catch (error) {
      console.error("Error fetching leaderboard:", error)
    } finally {
      setLoading(false)
    }
  }

  const generateQualificationMatches = (leaderboardData: LeaderboardUser[]) => {
    const matches: QualificationMatch[] = []
    
    // Plätze 1-2 sind direkt qualifiziert, keine Matches nötig
    // Ab Platz 3: 3 vs 30, 4 vs 29, 5 vs 28, etc.
    for (let i = 2; i < 16; i++) { // i=2 entspricht Platz 3, i=15 entspricht Platz 16
      const player1 = leaderboardData[i] // Platz 3, 4, 5, ...
      const player2 = leaderboardData[31 - i] // Platz 30, 29, 28, ...
      
      if (player1 && player2) {
        matches.push({
          player1,
          player2,
          matchId: `match-${i + 1}-${32 - i}`
        })
      }
    }
    
    setQualificationMatches(matches)
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-4 h-4 text-yellow-400" />
    if (rank === 2) return <Medal className="w-4 h-4 text-gray-300" />
    return <span className="text-sm font-semibold text-green-400">#{rank}</span>
  }

  const getRankStyle = (rank: number) => {
    if (rank === 1) return "bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-yellow-400/50"
    if (rank === 2) return "bg-gradient-to-r from-gray-500/20 to-gray-600/20 border-gray-400/50"
    if (rank === 3) return "bg-gradient-to-r from-amber-500/20 to-amber-600/20 border-amber-400/50"
    if (rank <= 8) return "bg-gradient-to-r from-blue-500/20 to-blue-600/20 border-blue-400/50"
    if (rank <= 16) return "bg-gradient-to-r from-green-500/20 to-green-600/20 border-green-400/50"
    if (rank <= 30) return "bg-gradient-to-r from-orange-500/20 to-orange-600/20 border-orange-400/50"
    return "bg-black/30 border-gray-600/50"
  }

  const isUserInMatch = (match: QualificationMatch) => {
    return match.player1.username === user?.username || match.player2.username === user?.username
  }

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-purple-900/40 to-black/60 border-purple-500/30">
        <CardHeader>
          <CardTitle className="text-white text-center">
            <div className="flex items-center justify-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <span>Qualification Matches</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-300">Loading qualification matches...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gradient-to-br from-purple-900/40 to-black/60 border-purple-500/30">
      <CardHeader>
        <CardTitle className="text-white text-center">
          <div className="flex items-center justify-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <span>Weekend League Qualification</span>
          </div>
        </CardTitle>
        <div className="text-center">
          <p className="text-sm text-gray-300 mb-2">
            Based on Top 30 Battle Arena Leaderboard
          </p>
          {userRank && (
            <Badge className={`${
              userRank <= 2 
                ? "bg-green-500/20 text-green-400 border-green-400/50" 
                : userRank <= 30 
                  ? "bg-orange-500/20 text-orange-400 border-orange-400/50"
                  : "bg-gray-500/20 text-gray-400 border-gray-400/50"
            }`}>
              {userRank <= 2 
                ? "✅ Directly Qualified" 
                : userRank <= 30 
                  ? `Your Rank: #${userRank} - Qualification Match Required`
                  : "Not in Top 30 - No Qualification"
              }
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Directly Qualified Players */}
        <div>
          <h3 className="text-lg font-bold text-green-400 mb-3 flex items-center gap-2">
            <Crown className="w-5 h-5" />
            Directly Qualified (Top 2)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {leaderboard.slice(0, 2).map((player) => (
              <motion.div
                key={player.username}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-2 rounded-lg border transition-all ${
                  player.username === user?.username 
                    ? 'border-2 border-yellow-400 shadow-gold' 
                    : getRankStyle(player.rank)
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getRankIcon(player.rank)}
                    <span className={`font-semibold text-sm truncate ${
                      player.username === user?.username ? 'text-yellow-400' : 'text-white'
                    }`}>
                      {player.username}
                    </span>
                  </div>
                  <div className="text-right ml-2">
                    <div className="text-green-400 font-bold text-sm">
                      {player.prestige_points}
                    </div>
                    <div className="text-xs text-green-300">Qualified</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Qualification Matches */}
        <div>
          <h3 className="text-lg font-bold text-orange-400 mb-3 flex items-center gap-2">
            <Target className="w-5 h-5" />
            Qualification Matches (Places 3-30)
          </h3>
          <div className="space-y-2">
            {qualificationMatches.map((match, index) => (
              <motion.div
                key={match.matchId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-3 rounded-lg border transition-all ${
                  isUserInMatch(match)
                    ? 'border-2 border-yellow-400 shadow-gold bg-yellow-500/10'
                    : 'border-purple-500/30 bg-purple-500/5'
                }`}
              >
                {/* Player 1 */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getRankIcon(match.player1.rank)}
                    <span className={`font-semibold text-sm truncate ${
                      match.player1.username === user?.username ? 'text-yellow-400' : 'text-white'
                    }`}>
                      {match.player1.username}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 ml-2">
                    {match.player1.prestige_points}
                  </span>
                </div>

                {/* VS */}
                <div className="flex items-center justify-center py-1">
                  <div className="flex items-center gap-1">
                    <Zap className="w-3 h-3 text-purple-400" />
                    <span className="text-purple-400 font-bold text-sm">VS</span>
                    <Zap className="w-3 h-3 text-purple-400" />
                  </div>
                </div>

                {/* Player 2 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getRankIcon(match.player2.rank)}
                    <span className={`font-semibold text-sm truncate ${
                      match.player2.username === user?.username ? 'text-yellow-400' : 'text-white'
                    }`}>
                      {match.player2.username}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 ml-2">
                    {match.player2.prestige_points}
                  </span>
                </div>
                
                {isUserInMatch(match) && (
                  <div className="mt-2 text-center">
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-400/50 text-xs">
                      Your Match
                    </Badge>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <h4 className="text-blue-400 font-bold mb-2 flex items-center gap-2">
            <Users className="w-4 h-4" />
            How it works:
          </h4>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• <strong>Places 1-2:</strong> Directly qualified for Weekend League</li>
            <li>• <strong>Places 3-30:</strong> Must win qualification match to enter Weekend League</li>
            <li>• <strong>Matchups:</strong> Place 3 vs Place 30, Place 4 vs Place 29, etc.</li>
            <li>• <strong>Matches:</strong> All qualification matches are simulated automatically</li>
            <li>• <strong>Results:</strong> Match results are announced after simulation</li>
            <li>• <strong>Winners:</strong> Advance to Weekend League</li>
          </ul>
        </div>
      </CardContent>
      
      <style jsx>{`
        .shadow-gold {
          box-shadow: 0 0 24px 4px #FFD70044, 0 0 8px 2px #FFD70099;
        }
      `}</style>
    </Card>
  )
}
