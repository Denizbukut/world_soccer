"use client"

import { useEffect, useState, useMemo } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { ArrowLeft, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import CardItem from "@/components/card-item"

const WEEKLY_PRIZE_POOL = [
  { rank: "1st Place", reward: "100 WLD", icon: "🥇" },
  { rank: "2nd Place", reward: "80 WLD", icon: "🥈" },
  { rank: "3rd Place", reward: "50 WLD", icon: "🥉" },
  { rank: "4th–7th Place", reward: "25 WLD each", icon: "🎖️" },
  { rank: "8th–12th Place", reward: "15 WLD each", icon: "🎖️" },
]

const CONTEST_END_TIMESTAMP = new Date("2025-06-24T23:59:59Z").getTime()

type Entry = {
  user_id: string
  legendary_count: number
}

type UserStats = {
  legendary_count: number
  rank: number | null
}

export default function WeeklyContestPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [leaderboard, setLeaderboard] = useState<Entry[]>([])
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [countdown, setCountdown] = useState(CONTEST_END_TIMESTAMP - Date.now())

  const firstPlaceRewardCard = useMemo(() => (
  <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-3">
    <h3 className="text-sm font-semibold text-yellow-700 mb-2 flex flex-col items-center gap-1 text-center">
      1st Place Bonus Reward <br></br> 1 of 1 - Level 15 Godlike Itachi
    </h3>
    <div className="max-w-[160px] mx-auto">
      <CardItem
        id="itachi_godlike"
        name="Godlike Itachi"
        character="Itachi Uchiha"
        imageUrl="itachi_oneofone.jpg"
        rarity="godlike"
        isContest={true}
        owned={true}
        level={15}
      />
    </div>
  </div>
), [])


  useEffect(() => {
    const fetchData = async () => {
      try {
        const leaderboardRes = await fetch("/api/weekly-contest/leaderboard")
        const leaderboardData = await leaderboardRes.json()

        if (leaderboardData.success) {
          setLeaderboard(leaderboardData.data)
        }

        if (user?.username) {
          const userRes = await fetch(`/api/weekly-contest/user?username=${encodeURIComponent(user.username)}`)
          const userData = await userRes.json()

          if (userData.success) {
            setUserStats(userData.data)
          }
        }
      } catch (error) {
        console.error("Error fetching contest data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user?.username])

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = CONTEST_END_TIMESTAMP - Date.now()
      setCountdown(diff > 0 ? diff : 0)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const formatCountdown = (ms: number) => {
    if (ms <= 0) return null
    const totalSeconds = Math.floor(ms / 1000)
    const days = Math.floor(totalSeconds / 86400)
    const hours = Math.floor((totalSeconds % 86400) / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    return { days, hours, minutes, seconds }
  }

  const time = formatCountdown(countdown)
  const contestEnded = countdown <= 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-emerald-50 to-white pb-24">
      <header className="sticky top-0 z-10 bg-white/90 border-b px-4 py-3 flex items-center gap-2 backdrop-blur">
        <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Button>
        <h1 className="text-lg font-bold flex items-center gap-2 text-emerald-600">
          <Trophy className="w-5 h-5" />
          Weekly Contest
        </h1>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        <div className="text-center text-lg font-bold text-emerald-700">
          {contestEnded ? (
            <div className="text-red-600 text-xl font-semibold">The contest has ended</div>
          ) : (
            <div className="flex justify-center gap-4 text-sm sm:text-base mt-2">
              {time && (
                <>
                  <div className="flex flex-col items-center">
                    <span className="text-emerald-600 text-xl font-mono">{time.days}</span>
                    <span className="text-gray-500 text-xs">D</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-emerald-600 text-xl font-mono">{time.hours}</span>
                    <span className="text-gray-500 text-xs">H</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-emerald-600 text-xl font-mono">{time.minutes}</span>
                    <span className="text-gray-500 text-xs">M</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-emerald-600 text-xl font-mono">{time.seconds}</span>
                    <span className="text-gray-500 text-xs">S</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="bg-white border border-emerald-200 rounded-xl shadow-sm p-4 text-center">
          <h2 className="text-lg sm:text-xl font-bold text-emerald-700 leading-snug">
            Your Mission:
            <br />
            Pull as many Cards from the Anime <span className="text-amber-500">Naruto</span> as possible!
          </h2>
        </div>

        <div className="bg-white border border-emerald-200 rounded-xl shadow-sm p-4">
          <h2 className="text-sm font-semibold text-emerald-700 mb-1">Your Progress</h2>
          {loading ? (
            <p className="text-sm text-gray-500">Loading your stats...</p>
          ) : userStats ? (
            <div className="space-y-1">
              <p className="text-sm text-gray-700">
                You pulled <span className="font-bold text-emerald-600">{userStats.legendary_count}</span> card{userStats.legendary_count !== 1 && "s"} from the Anime <b>Naruto</b> this week.
                 
              </p>
              {userStats.rank && (
                <p className="text-xs text-gray-600">
                  Current rank: <span className="font-semibold">#{userStats.rank}</span>
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No legendary cards pulled yet this week.</p>
          )}
        </div>

        <div className="bg-white border border-emerald-200 rounded-xl shadow-sm p-4 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-emerald-700 mb-2">🏆 Prize Pool</h2>
            <ul className="text-sm text-gray-800 space-y-1">
              {WEEKLY_PRIZE_POOL.map((prize) => (
                <li key={prize.rank} className="flex items-center gap-2">
                  <span className="text-xl">{prize.icon}</span>
                  <span className="flex-1">{prize.rank}</span>
                  <span className="font-semibold">{prize.reward}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 1st Place Reward Card (with next/image) */}
          {firstPlaceRewardCard}

</div>
        <div>
          <h2 className="text-sm font-semibold text-emerald-700 mb-2">Top 20 Players</h2>
          {loading ? (
            <p className="text-center text-gray-500">Loading leaderboard...</p>
          ) : leaderboard.length === 0 ? (
            <p className="text-center text-gray-500">No entries yet this week.</p>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry, index) => (
                <div
                  key={entry.user_id}
                  className={`flex justify-between items-center px-4 py-2 rounded-lg ${
                    user?.username === entry.user_id
                      ? "bg-emerald-100 border border-emerald-400"
                      : "bg-white border border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold w-6 text-gray-600">{index + 1}</span>
                    <span className="text-sm text-gray-800 truncate max-w-[120px]">
                      {entry.user_id.length > 14 ? `${entry.user_id.slice(0, 14)}…` : entry.user_id}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600">{entry.legendary_count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
