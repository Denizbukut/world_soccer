"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import ProtectedRoute from "@/components/protected-route"
import MobileNav from "@/components/mobile-nav"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { Trophy, RefreshCw, Info, AlertCircle, Loader2, User } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { getOverallLeaderboard } from "@/app/actions/leaderboard"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from "next/link"
import type { JSX } from "react"

// Types for leaderboard data
type LeaderboardEntry = {
  username: string
  score: number
  rank: number
  level?: number
  has_premium?: boolean
  card_count?: number
  legendary_count?: number
  epic_count?: number
  rare_count?: number
  common_count?: number
  highest_card_level?: number
}

// Helper function to truncate username
function truncateUsername(username: string, maxLength = 15): string {
  if (username.length <= maxLength) return username
  return username.substring(0, maxLength) + "..."
}

export default function LeaderboardPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [overallLeaderboard, setOverallLeaderboard] = useState<LeaderboardEntry[]>([])
  const [userRanking, setUserRanking] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load leaderboard data
  useEffect(() => {
    if (!user?.username) return

    console.log("LeaderboardPage: User authenticated, loading data")
    loadLeaderboardData()
  }, [user?.username])

  const loadLeaderboardData = async () => {
    console.log("LeaderboardPage: Starting to load leaderboard data")
    setLoading(true)
    setError(null)

    try {
      console.log("LeaderboardPage: Fetching overall leaderboard")
      // Fetch data from server actions
      const overallResult = await getOverallLeaderboard()
      console.log("LeaderboardPage: Overall leaderboard result:", {
        success: overallResult.success,
        count: overallResult.leaderboard?.length || 0,
        error: overallResult.error,
      })

      if (overallResult.success) {
        console.log("LeaderboardPage: Setting overall leaderboard data")
        setOverallLeaderboard(overallResult.leaderboard || [])

        // Find user's ranking in the leaderboard
        console.log("LeaderboardPage: Finding user rankings")
        setUserRanking(findUserRanking(overallResult.leaderboard || [], user?.username || ""))
      } else {
        console.error("LeaderboardPage: Failed to fetch overall leaderboard", overallResult.error)
        setError(overallResult.error || "Failed to load leaderboard data")
        toast({
          title: "Error",
          description: overallResult.error || "Failed to load leaderboard data",
          variant: "destructive",
        })
      }

      console.log("LeaderboardPage: Data loading complete")
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      console.error("LeaderboardPage: Error loading leaderboard data:", error)
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      console.log("LeaderboardPage: Loading state set to false")
    }
  }

  // Helper function to find user's ranking
  const findUserRanking = (leaderboard: LeaderboardEntry[], username: string): number | null => {
    const userEntry = leaderboard.find((entry) => entry.username === username)
    return userEntry ? userEntry.rank : null
  }

  // Handle refresh button click
  const handleRefresh = () => {
    console.log("LeaderboardPage: Refresh button clicked")
    loadLeaderboardData()
  }

  // Format score
  const formatScore = (score: number): string => {
    return score.toLocaleString()
  }

  // Get score explanation
  const getScoreExplanation = (): JSX.Element => {
    return (
      <div className="space-y-2 text-sm">
        <p>The overall score is calculated using the following formula:</p>
        <div className="bg-gray-100 p-2 rounded-md font-mono text-xs">
          Score = (Player Level × 100) + <br />
          (Legendary Cards × 500) + <br />
          (Epic Cards × 100) + <br />
          (Rare Cards × 20) + <br />
          (Common Cards × 5) + <br />
          (Highest Card Level × 50)
        </div>
        <p>This balanced approach rewards both progression and collection quality.</p>
      </div>
    )
  }

  console.log("LeaderboardPage: Rendering with data", {
    overallCount: overallLeaderboard.length,
    loading,
    error,
  })

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#f8f9ff] pb-20">
        {/* Header */}
        <header className="sticky top-0 z-10 backdrop-blur-md bg-white/80 border-b border-gray-100">
          <div className="max-w-lg mx-auto px-4 py-3">
            <div className="flex justify-between items-center">
              <h1 className="text-lg font-medium">Leaderboard</h1>
              <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={loading} className="text-gray-500">
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </header>

        <main className="p-4 max-w-lg mx-auto">
          {/* Score Explanation Box */}
          <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Info className="h-4 w-4 mr-2 text-amber-500" />
                <h3 className="font-medium text-sm">How Scores Are Calculated</h3>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs">
                    Learn More
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-2">
                    <h4 className="font-medium">Score Calculation</h4>
                    {getScoreExplanation()}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <p className="text-xs text-gray-500 mt-2">Based on player level, card collection, and card levels</p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {error}
                <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-2 w-full">
                  Try Again
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Loading Indicator */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-12 w-12 text-violet-500 animate-spin mb-4" />
              <p className="text-gray-500 text-sm">Loading leaderboard data...</p>
            </div>
          ) : (
            /* Overall Leaderboard */
            <LeaderboardContent
              entries={overallLeaderboard}
              loading={loading}
              userRank={userRanking}
              formatScore={formatScore}
              username={user?.username}
            />
          )}
        </main>

        <MobileNav />
      </div>
    </ProtectedRoute>
  )
}

// Leaderboard Content Component
function LeaderboardContent({
  entries,
  loading,
  userRank,
  formatScore,
  username,
}: {
  entries: LeaderboardEntry[]
  loading: boolean
  userRank: number | null
  formatScore: (score: number) => string
  username?: string
}) {
  console.log(`LeaderboardContent: Rendering with ${entries.length} entries, loading=${loading}`)

  // Get top 20 entries
  const top20Entries = entries.slice(0, 20)

  // Check if user is in top 20
  const userInTop20 = username ? top20Entries.some((entry) => entry.username === username) : false

  // Find user entry if not in top 20
  const userEntry = !userInTop20 && username ? entries.find((entry) => entry.username === username) : null

  if (loading) {
    return null // We're handling loading state in the parent component now
  }

  return (
    <div className="space-y-4">
      {entries.length > 0 ? (
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center px-4 py-2 text-sm text-gray-500 font-medium">
            <div className="w-10 text-center">Rank</div>
            <div className="flex-1 ml-2">Player</div>
            <div className="w-24 text-right">Score</div>
          </div>

          {/* Top 20 Entries */}
          {top20Entries.map((entry, index) => (
            <LeaderboardRow
              key={entry.username}
              entry={entry}
              isCurrentUser={entry.username === username}
              formatScore={formatScore}
              delay={0.05 * index}
            />
          ))}

          {/* User entry if not in top 20 */}
          {userEntry && (
            <>
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="px-2 bg-[#f8f9ff] text-xs text-gray-500">Your Ranking</span>
                </div>
              </div>

              <LeaderboardRow entry={userEntry} isCurrentUser={true} formatScore={formatScore} delay={0.5} />
            </>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl p-6 shadow-sm text-center">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <Trophy className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium mb-1">No Data Available</h3>
            <p className="text-gray-500 text-sm mb-4">We couldn't find any leaderboard data. Please try again later.</p>
          </div>
        </div>
      )}
    </div>
  )
}

// Leaderboard Row Component
function LeaderboardRow({
  entry,
  isCurrentUser,
  formatScore,
  delay = 0,
}: {
  entry: LeaderboardEntry
  isCurrentUser: boolean
  formatScore: (score: number) => string
  delay?: number
}) {
  // Truncate username if longer than 15 characters
  const displayUsername = truncateUsername(entry.username)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className={`flex items-center p-3 rounded-xl cursor-pointer hover:shadow-md transition-all ${
        isCurrentUser ? "bg-violet-50 border border-violet-200" : "bg-white shadow-sm"
      }`}
    >
      {/* Rank number - Fixed width and text alignment */}
      <div className="w-10 flex justify-center">
        <div className="w-6 h-6 flex items-center justify-center">
          <span className={`font-bold text-sm ${entry.rank <= 3 ? "text-amber-500" : "text-gray-700"}`}>
            {entry.rank}
          </span>
        </div>
      </div>

      {/* Player info with fixed layout */}
      <div className="flex-1 flex items-center ml-2">
        <div className="w-full grid grid-cols-[auto_1fr_auto] items-center gap-1">
          {/* Username with view collection link */}
          <Link
            href={`/user/${entry.username}/collection`}
            className="font-medium text-sm hover:text-violet-600 hover:underline flex items-center group"
          >
            <div className="flex items-center bg-violet-50 px-2 py-1 rounded-md group-hover:bg-violet-100 transition-colors">
              {displayUsername}
              <User className="h-3 w-3 ml-1 opacity-70" />
            </div>
            
          </Link>

          {/* Badges container with fixed position */}
          <div className="flex items-center justify-start ml-2">
            {isCurrentUser && <Badge className="text-[10px] h-4 px-1 bg-violet-500 mr-1">You</Badge>}
            {entry.has_premium && <Badge className="text-[10px] h-4 px-1 bg-amber-500">Premium</Badge>}
          </div>

          {/* Empty space to maintain grid */}
          <div></div>

          {/* Level info - spans full width under username */}
          <div className="col-span-3">
            {entry.level && <p className="text-xs text-gray-500">Level {entry.level}</p>}
          </div>
        </div>
      </div>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="w-24 text-right font-medium">{formatScore(entry.score)}</div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs">
              <p>Level: {entry.level}</p>
              <p>Cards: {entry.card_count}</p>
              <p>Legendary: {entry.legendary_count}</p>
              <p>Epic: {entry.epic_count}</p>
              <p>Rare: {entry.rare_count}</p>
              <p>Common: {entry.common_count}</p>
              <p>Highest Card Level: {entry.highest_card_level}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </motion.div>
  )
}
