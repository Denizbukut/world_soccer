"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { claimMissionReward, claimBonusReward } from "../actions/missions"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import MobileNav from "@/components/mobile-nav"
import { Gift, CheckCircle, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import toast from "react-hot-toast"

export default function MissionsPage() {
  const { user, refreshUserData } = useAuth()
  const router = useRouter()
  const [missions, setMissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [bonusClaimed, setBonusClaimed] = useState(false)
  const [claimingBonus, setClaimingBonus] = useState(false)

  const loadMissions = async () => {
    if (!user) return
    const res = await fetch("/api/daily-missions", {
      method: "POST",
      body: JSON.stringify({ username: user.username }),
      headers: { "Content-Type": "application/json" },
    })
    const data = await res.json()
    if (data.success) {
      setMissions(data.missions)
      setBonusClaimed(data.bonusClaimed)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadMissions()
  }, [user])

  const handleClaim = async (key: string) => {
    if (!user) return
    const res = await claimMissionReward(user.username, key)
    if (res.success) {
      toast.success("Reward claimed!")
      await refreshUserData()
      loadMissions()
    }
  }

  const handleBonusClaim = async () => {
    if (!user) return
    setClaimingBonus(true)
    const res = await claimBonusReward(user.username)
    if (res.success) {
      toast.success("Bonus legendary ticket claimed!")
      await refreshUserData()
      setBonusClaimed(true)
      loadMissions()
    }
    setClaimingBonus(false)
  }

  const completed = missions.filter((m) => m.reward_claimed).length

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-purple-50 to-pink-50 pb-24">
      <header className="sticky top-0 z-10 bg-white/90 border-b px-4 py-3 flex items-center gap-2 backdrop-blur">
        <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Button>
        <h1 className="text-lg font-bold flex items-center gap-2 text-purple-600">
          Daily Missions
        </h1>
      </header>

      <main className="p-4 space-y-3 max-w-md mx-auto">
        {loading ? (
          <p className="text-center text-gray-500 mt-10">Loading missions...</p>
        ) : (
          <>
            {missions.map((mission) => (
              <div
                key={mission.key}
                className="bg-white border border-violet-200 rounded-lg p-3 shadow-sm flex flex-col gap-2"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{mission.label}</p>
                    <p className="text-xs text-gray-500">
                      {mission.progress} / {mission.goal} •{" "}
                      <span className="text-purple-600 font-semibold">
                        {mission.reward?.xp && `${mission.reward.xp} XP `}
                        {mission.reward?.tickets &&
                          `${mission.reward.tickets} Ticket${mission.reward.tickets > 1 ? "s" : ""}`}
                      </span>
                    </p>
                  </div>
                  <Gift className="h-5 w-5 text-violet-500" />
                </div>

                <Progress
                  value={Math.min((mission.progress / mission.goal) * 100, 100)}
                  className="h-1 bg-gray-100"
                  indicatorClassName="bg-gradient-to-r from-violet-500 to-fuchsia-500"
                />

                <Button
                  size="sm"
                  onClick={() => handleClaim(mission.key)}
                  disabled={mission.reward_claimed || mission.progress < mission.goal}
                  className={`w-full text-xs ${
                    mission.reward_claimed ? "bg-gray-100 text-gray-400" : ""
                  }`}
                >
                  {mission.reward_claimed ? (
                    <motion.span
                      className="flex items-center justify-center gap-1"
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1.1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <CheckCircle className="w-4 h-4" /> Claimed
                    </motion.span>
                  ) : (
                    "Claim Reward"
                  )}
                </Button>
              </div>
            ))}

            {/* Bonus Mission Card in Violet Style */}
            <div className="bg-white border border-violet-200 rounded-lg p-4 shadow-sm mt-6 space-y-3">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-semibold text-violet-700">Bonus Reward</h2>
                <Gift className="h-5 w-5 text-violet-500" />
              </div>
              <p className="text-xs text-gray-600">
                Complete <b>4 Missions</b> to earn{" "}
                <span className="font-semibold text-violet-600">+1 Legendary Ticket</span>
              </p>

              <Progress
                value={(completed / 4) * 100}
                className="h-2 bg-gray-100"
                indicatorClassName="bg-gradient-to-r from-violet-500 to-fuchsia-500"
              />

              <Button
                onClick={handleBonusClaim}
                disabled={bonusClaimed || claimingBonus || completed < 4}
                className={`w-full text-sm ${
                  bonusClaimed
                    ? "bg-gray-100 text-gray-400"
                    : "bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:brightness-105 text-white"
                }`}
              >
                {bonusClaimed ? "Bonus Claimed" : claimingBonus ? "Claiming..." : "Claim Bonus"}
              </Button>
            </div>
          </>
        )}
      </main>

      <MobileNav />
    </div>
  )
}
