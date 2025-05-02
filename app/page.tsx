"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { claimDailyBonus } from "@/app/actions"
import ProtectedRoute from "@/components/protected-route"
import MobileNav from "@/components/mobile-nav"
import { Button } from "@/components/ui/button"
import { Ticket, Gift, Sparkles, Coins, Swords, Crown, Clock } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import Link from "next/link"
import { motion } from "framer-motion"
import Image from "next/image"

export default function Home() {
  const { user, updateUserTickets } = useAuth()
  const [claimLoading, setClaimLoading] = useState(false)
  const [alreadyClaimed, setAlreadyClaimed] = useState(false)

  const handleClaimBonus = async () => {
    if (!user) return

    setClaimLoading(true)
    try {
      const result = await claimDailyBonus(user.username)

      if (result.success) {
        await updateUserTickets(result.newTicketCount)
        toast({
          title: "Success!",
          description: "You've claimed 3 tickets as your daily bonus!",
        })
      } else if (result.alreadyClaimed) {
        setAlreadyClaimed(true)
        toast({
          title: "Already Claimed",
          description: "You've already claimed your daily bonus today.",
        })
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error claiming bonus:", error)
      toast({
        title: "Error",
        description: "Failed to claim daily bonus",
        variant: "destructive",
      })
    } finally {
      setClaimLoading(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 pb-20 text-black">
        <header className="bg-white p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-black">Anime World TCG</h1>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-gray-100 px-3 py-1.5 rounded-full">
                <Ticket className="h-4 w-4 text-blue-500" />
                <span className="font-bold text-black">{user?.tickets || 0}</span>
              </div>
              <div className="flex items-center gap-1 bg-gray-100 px-3 py-1.5 rounded-full">
                <Coins className="h-4 w-4 text-yellow-500" />
                <span className="font-bold text-black">{user?.coins || 0}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 space-y-6">
          {/* User profile */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-xl p-4 shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xl">
                {user?.username?.charAt(0).toUpperCase() || "A"}
              </div>
              <div>
                <h2 className="font-bold text-lg text-black">{user?.username || "Trainer"}</h2>
                <div className="flex items-center text-sm text-gray-700">
                  <span>Lv. {user?.level || 1}</span>
                  <span className="mx-2">•</span>
                  <span>
                    {user?.experience || 0} / {user?.nextLevelExp || 100} XP
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full mt-1 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                    style={{ width: `${user?.experience ? (user.experience / user.nextLevelExp) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Daily bonus */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="bg-white rounded-xl p-4 shadow-sm"
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Gift className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-bold text-black">Daily Bonus</h3>
                  <p className="text-sm text-gray-700">Claim 3 tickets every day</p>
                </div>
              </div>
              <Button
                onClick={handleClaimBonus}
                disabled={claimLoading || alreadyClaimed}
                className={`${
                  alreadyClaimed
                    ? "bg-gray-100 text-gray-700"
                    : "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
                }`}
              >
                {claimLoading ? "Claiming..." : alreadyClaimed ? "Claimed" : "Claim"}
              </Button>
            </div>
          </motion.div>

          {/* Card packs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="bg-white rounded-xl p-4 shadow-sm"
          >
            <h3 className="font-bold mb-3 text-black">Card Packs</h3>
            <div className="grid grid-cols-3 gap-3">
              <Link href="/draw" className="block">
                <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-gradient-to-br from-blue-500 to-purple-500">
                  <Image
                    src="/vibrant-purple-card-pack.png"
                    alt="Regular Pack"
                    fill
                    className="object-cover opacity-90"
                  />
                  <div className="absolute inset-0 flex items-end p-2">
                    <div className="bg-white/80 backdrop-blur-sm w-full rounded-md p-1 text-center">
                      <span className="text-xs font-bold text-black">Regular</span>
                    </div>
                  </div>
                </div>
              </Link>
              <Link href="/draw" className="block">
                <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-gradient-to-br from-yellow-500 to-amber-500">
                  <Image
                    src="/anime-world-legendary-pack.png"
                    alt="Legendary Pack"
                    fill
                    className="object-cover opacity-90"
                  />
                  <div className="absolute inset-0 flex items-end p-2">
                    <div className="bg-white/80 backdrop-blur-sm w-full rounded-md p-1 text-center">
                      <span className="text-xs font-bold text-black">Legendary</span>
                    </div>
                  </div>
                </div>
              </Link>
              <Link href="/draw" className="block">
                <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-500">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Clock className="h-12 w-12 text-white opacity-50" />
                  </div>
                  <div className="absolute inset-0 flex items-end p-2">
                    <div className="bg-white/80 backdrop-blur-sm w-full rounded-md p-1 text-center">
                      <span className="text-xs font-bold text-black">Coming Soon</span>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </motion.div>

          {/* Quick actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="grid grid-cols-2 gap-4"
          >
            <Link href="/collection" className="block">
              <div className="bg-white rounded-xl p-4 shadow-sm h-full">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mb-2">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                </div>
                <h3 className="font-bold text-black">Collection</h3>
                <p className="text-sm text-gray-700">View your cards</p>
              </div>
            </Link>
            <Link href="/battle" className="block">
              <div className="bg-white rounded-xl p-4 shadow-sm h-full">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mb-2">
                  <Swords className="h-5 w-5 text-red-500" />
                </div>
                <h3 className="font-bold text-black">Battle</h3>
                <p className="text-sm text-gray-700">Fight opponents</p>
              </div>
            </Link>
          </motion.div>

          {/* Recent news */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="bg-white rounded-xl p-4 shadow-sm"
          >
            <h3 className="font-bold mb-3 text-black">News</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-2 rounded-lg bg-blue-50">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <Crown className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <h4 className="font-medium text-sm text-black">New Legendary Cards</h4>
                  <p className="text-xs text-gray-700">Check out the new legendary cards!</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2 rounded-lg bg-purple-50">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <Ticket className="h-4 w-4 text-purple-500" />
                </div>
                <div>
                  <h4 className="font-medium text-sm text-black">Special Event</h4>
                  <p className="text-xs text-gray-700">Earn double tickets this weekend!</p>
                </div>
              </div>
            </div>
          </motion.div>
        </main>

        <MobileNav />
      </div>
    </ProtectedRoute>
  )
}
