"use client"

import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, Medal, Crown, ChevronDown } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface LeaderboardUser {
  username: string
  prestige_points: number
  rank: number
}

interface PvpLeaderboardProps {
  currentUsername?: string
}

export default function PvpLeaderboard({ currentUsername }: PvpLeaderboardProps) {
  const [users, setUsers] = useState<LeaderboardUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showFullLeaderboard, setShowFullLeaderboard] = useState(false)

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  const fetchLeaderboard = async () => {
    try {
      const supabase = getSupabaseBrowserClient()
      if (!supabase) return

             const { data, error } = await supabase
         .from("users")
         .select("username, prestige_points")
         .order("prestige_points", { ascending: false })
         .limit(30)

      if (error) {
        console.error("Error fetching leaderboard:", error)
        setUsers([])
      } else {
        const leaderboardUsers = data?.map((user, index) => ({
          username: user.username as string,
          prestige_points: (user.prestige_points as number) || 0,
          rank: index + 1
        })) || []
        setUsers(leaderboardUsers)
      }
    } catch (error) {
      console.error("Error:", error)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-4 h-4 text-yellow-400" />
    if (rank === 2) return <Medal className="w-4 h-4 text-gray-300" />
    return <span className="text-sm font-semibold text-gray-400">{rank}</span>
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

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-blue-900/40 to-black/60 border-blue-500/30 mb-6">
        <CardHeader>
          <CardTitle className="text-white text-center">
            <div className="flex items-center justify-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
                             <span>Top 30 Leaderboard</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-300">Loading leaderboard...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="bg-gradient-to-br from-blue-900 to-blue-800 border-blue-500/30 mb-6 cursor-pointer hover:bg-blue-700 transition-all" onClick={() => setShowFullLeaderboard(true)}>
        <CardHeader>
          <CardTitle className="text-white text-center">
            <div className="flex items-center justify-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <span>Top 3 Leaderboard</span>
              <ChevronDown className="w-4 h-4 text-blue-300" />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {users.slice(0, 3).map((user) => (
              <div
                key={user.username}
                className={`p-3 rounded-lg border transition-all hover:scale-105 ${
                  currentUsername === user.username 
                    ? 'border-2 border-yellow-400 shadow-gold' 
                    : getRankStyle(user.rank)
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getRankIcon(user.rank)}
                    <span className="text-white font-semibold text-lg">
                      {user.username}
                    </span>
                  </div>
                  <span className="text-yellow-400 font-bold text-lg">
                    {user.prestige_points}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          {users.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-300">No users found</p>
            </div>
          )}
        </CardContent>
      </Card>

                    {/* Full Leaderboard Dialog */}
       <Dialog open={showFullLeaderboard} onOpenChange={setShowFullLeaderboard}>
         <DialogContent className="bg-gradient-to-br from-blue-900 to-blue-800 border-blue-500/30 text-white max-w-4xl max-h-[80vh]">
           <DialogHeader>
             <DialogTitle className="text-xl font-bold text-center text-white">
               <div className="flex items-center justify-center gap-2 mb-2">
                 <Trophy className="w-6 h-6 text-yellow-400" />
                                   <span>Top 30 Leaderboard</span>
               </div>
             </DialogTitle>
           </DialogHeader>
                       <div className="overflow-y-auto max-h-[60vh] pr-2 overflow-x-hidden">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {users.map((user) => (
              <div
                key={user.username}
                className={`p-3 rounded-lg border transition-all hover:scale-105 ${
                  currentUsername === user.username 
                    ? 'border-2 border-yellow-400 shadow-gold' 
                    : getRankStyle(user.rank)
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getRankIcon(user.rank)}
                    <span className="text-white font-semibold text-sm truncate">
                      {user.username}
                    </span>
                  </div>
                  <span className="text-yellow-400 font-bold text-sm">
                    {user.prestige_points}
                  </span>
                </div>
              </div>
                         ))}
           </div>
           
           {users.length === 0 && (
             <div className="text-center py-8">
               <p className="text-gray-300">No users found</p>
             </div>
           )}
           </div>
         </DialogContent>
      </Dialog>
      <style jsx>{`
        .shadow-gold {
          box-shadow: 0 0 24px 4px #FFD70044, 0 0 8px 2px #FFD70099;
        }
      `}</style>
    </>
  )
}
