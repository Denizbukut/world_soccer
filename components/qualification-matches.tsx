"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
// Remove Button import since we don't need it anymore
import { Trophy, Crown, Medal, Users, Zap, Target, Clock } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/contexts/auth-context"
import { 
  type QualificationMatch,
  type MatchResult 
} from "@/lib/qualification-simulation"

interface LeaderboardUser {
  rank: number
  username: string
  prestige_points: number
  teamRating?: number
}

// Remove the old interface since we're importing it from the simulation file

export default function QualificationMatches() {
  const { user } = useAuth()
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([])
  const [qualificationMatches, setQualificationMatches] = useState<QualificationMatch[]>([])
  const [matchResults, setMatchResults] = useState<MatchResult[]>([])
  const [loading, setLoading] = useState(true)
  const [userRank, setUserRank] = useState<number | null>(null)
  const [squadRatings, setSquadRatings] = useState<{[key: string]: number}>({})
  const [hasResults, setHasResults] = useState(false)

  useEffect(() => {
    fetchLeaderboard()
    fetchMatchResults()
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

        // Fetch squad ratings for all users
        await fetchSquadRatings(data.data)

        // Generate qualification matches
        generateQualificationMatches(data.data)
      }
    } catch (error) {
      console.error("Error fetching leaderboard:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMatchResults = async () => {
    try {
      const response = await fetch("/api/qualification/matches")
      const data = await response.json()

      if (data.success && data.data.length > 0) {
        // Convert database format to MatchResult format
        const results: MatchResult[] = data.data.map((match: any) => ({
          matchId: match.match_id,
          player1: match.player1_username,
          player2: match.player2_username,
          player1Score: match.player1_score,
          player2Score: match.player2_score,
          winner: match.winner_username,
          events: match.events || [],
          possession: { 
            player1: match.possession_player1, 
            player2: match.possession_player2 
          },
          shots: { 
            player1: match.shots_player1, 
            player2: match.shots_player2 
          }
        }))
        
        setMatchResults(results)
        setHasResults(true)
      }
    } catch (error) {
      console.error("Error fetching match results:", error)
    }
  }

  const fetchSquadRatings = async (leaderboardData: LeaderboardUser[]) => {
    try {
      const usernames = leaderboardData.map(user => user.username)
      const response = await fetch("/api/qualification/squad-ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernames })
      })
      
      const data = await response.json()
      
      if (data.success) {
        const ratings: {[key: string]: number} = {}
        data.data.forEach((item: any) => {
          ratings[item.username] = item.teamRating
        })
        setSquadRatings(ratings)
      }
    } catch (error) {
      console.error("Error fetching squad ratings:", error)
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
          player1: {
            username: player1.username,
            rank: player1.rank,
            prestige_points: player1.prestige_points,
            teamRating: squadRatings[player1.username] || 70
          },
          player2: {
            username: player2.username,
            rank: player2.rank,
            prestige_points: player2.prestige_points,
            teamRating: squadRatings[player2.username] || 70
          },
          matchId: `match-${i + 1}-${32 - i}`
        })
      }
    }
    
    setQualificationMatches(matches)
  }

  // Remove simulation functions since we now use static database results

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
            Based on Top 30 Battle Arena Leaderboard (Prestige Points)
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
                    <div className="text-xs text-blue-400">
                      Rating: {(squadRatings[player.username] || 70).toFixed(1)}
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
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-orange-400 flex items-center gap-2">
              <Target className="w-5 h-5" />
              Qualification Matches (Places 3-30)
            </h3>
            {hasResults && (
              <div className="flex items-center gap-2 text-green-400">
                <Trophy className="w-4 h-4" />
                <span className="text-sm font-medium">Results Available</span>
              </div>
            )}
          </div>

          <AnimatePresence mode="wait">
            {!hasResults ? (
              <motion.div
                key="no-results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-8"
              >
                <div className="flex items-center justify-center gap-3 mb-4">
                  <Clock className="w-6 h-6 text-gray-400" />
                  <span className="text-lg font-bold text-gray-400">No Results Available</span>
                </div>
                <p className="text-sm text-gray-300">
                  Qualification matches have not been simulated yet
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-2 max-h-96 overflow-y-auto"
              >
                <div className="text-center mb-4">
                  <Badge className="bg-green-500/20 text-green-400 border-green-400/50 text-sm px-3 py-1">
                    🏆 Qualification Results
                  </Badge>
                </div>
                
                {matchResults.map((result, index) => (
                  <motion.div
                    key={result.matchId}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-3 rounded-lg border border-green-500/30 bg-green-500/5"
                  >
                    {/* Compact Score Display */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-center flex-1 min-w-0">
                        <div className="text-xs font-bold text-white truncate" title={result.player1}>
                          {result.player1.length > 12 ? result.player1.substring(0, 12) + '...' : result.player1}
                        </div>
                        <div className="text-lg font-bold text-green-400">{result.player1Score}</div>
                      </div>
                      
                      <div className="text-center flex-shrink-0">
                        <div className="text-xs text-gray-400">VS</div>
                      </div>
                      
                      <div className="text-center flex-1 min-w-0">
                        <div className="text-xs font-bold text-white truncate" title={result.player2}>
                          {result.player2.length > 12 ? result.player2.substring(0, 12) + '...' : result.player2}
                        </div>
                        <div className="text-lg font-bold text-green-400">{result.player2Score}</div>
                      </div>
                    </div>

                    {/* Compact Winner Badge */}
                    <div className="mt-2 text-center">
                      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-400/50 text-xs px-2 py-1">
                        🏆 {result.winner.length > 15 ? result.winner.substring(0, 15) + '...' : result.winner} Wins
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
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
            <li>• <strong>Results:</strong> Match results are stored in the database and remain static</li>
            <li>• <strong>Simulation:</strong> Results are calculated based on team ratings and Battle Arena prestige points - No draws allowed</li>
            <li>• <strong>Winners:</strong> Advance to Weekend League</li>
            <li>• <strong>Weekend League:</strong> Starts at 12 PM every weekend</li>
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
