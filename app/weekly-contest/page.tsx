"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { ArrowLeft, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"

const WEEKLY_PRIZE_POOL = [
  { rank: "1st Place", reward: "40 WLD", icon: "🥇" },
  { rank: "2nd Place", reward: "20 WLD", icon: "🥈" },
  { rank: "3rd–5th", reward: "10 WLD each", icon: "🥉" },
  { rank: "6th–10th", reward: "5 WLD each", icon: "🎖️" },
]

const CONTEST_END_TIMESTAMP = new Date("2025-06-15T23:59:59Z").getTime()

type Entry = {
  user_id: string
  legendary_count: number
}

export default function WeeklyContestPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [countdown, setCountdown] = useState(CONTEST_END_TIMESTAMP - Date.now())

  useEffect(() => {
    const fetchEntries = async () => {
      const res = await fetch("/api/weekly-contest")
      const data = await res.json()
      if (data.success) {
        setEntries(data.data)
      }
      setLoading(false)
    }

    fetchEntries()
  }, [])

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
  const userEntry = entries.find((e) => e.user_id === user?.username)
  const top20 = entries.slice(0, 20)

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

        {/* Contest Mission Headline Box */}
        <div className="bg-white border border-emerald-200 rounded-xl shadow-sm p-4 text-center">
          <h2 className="text-lg sm:text-xl font-bold text-emerald-700 leading-snug">
            Your Mission:<br />
            Pull as many <span className="text-amber-500">Legendary Cards</span> from Packs as possible!
          </h2>
        </div>

        {/* User Progress */}
        <div className="bg-white border border-emerald-200 rounded-xl shadow-sm p-4">
          <h2 className="text-sm font-semibold text-emerald-700 mb-1">Your Progress</h2>
          {userEntry ? (
            <p className="text-sm text-gray-700">
              You pulled{" "}
              <span className="font-bold text-emerald-600">
                {userEntry.legendary_count}
              </span>{" "}
              legendary card{userEntry.legendary_count !== 1 && "s"} this week.
            </p>
          ) : (
            <p className="text-sm text-gray-500">No legendary cards pulled yet this week.</p>
          )}
        </div>

        {/* Prize Pool */}
        <div className="bg-white border border-emerald-200 rounded-xl shadow-sm p-4">
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

        {/* Leaderboard */}
        <div>
          <h2 className="text-sm font-semibold text-emerald-700 mb-2">Top 20 Players</h2>
          {loading ? (
            <p className="text-center text-gray-500">Loading leaderboard...</p>
          ) : top20.length === 0 ? (
            <p className="text-center text-gray-500">No entries yet this week.</p>
          ) : (
            <div className="space-y-2">
              {top20.map((entry, index) => (
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
                  <span className="text-sm font-semibold text-emerald-600">
                    {entry.legendary_count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
