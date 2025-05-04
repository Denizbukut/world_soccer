"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { claimDailyBonus } from "@/app/actions"
import ProtectedRoute from "@/components/protected-route"
import MobileNav from "@/components/mobile-nav"
import { Button } from "@/components/ui/button"
import { Ticket, Gift, CreditCard, Repeat, Crown, Clock, ChevronRight } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import Link from "next/link"
import { motion } from "framer-motion"
import Image from "next/image"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { Progress } from "@/components/ui/progress"

export default function Home() {
  const { user, updateUserTickets } = useAuth()
  const [claimLoading, setClaimLoading] = useState(false)
  const [alreadyClaimed, setAlreadyClaimed] = useState(false)
  const [timeUntilNextClaim, setTimeUntilNextClaim] = useState<number | null>(null)
  const [legendaryTickets, setLegendaryTickets] = useState(0)
  const [tickets, setTickets] = useState(0)

  // Format time remaining as HH:MM:SS
  const formatTimeRemaining = (milliseconds: number) => {
    if (milliseconds <= 0) return "00:00:00"

    const hours = Math.floor(milliseconds / (1000 * 60 * 60))
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000)

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  // Check if user can claim tickets and update countdown timer
  useEffect(() => {
    if (!user?.username) return

    const checkClaimStatus = async () => {
      const supabase = getSupabaseBrowserClient()
      if (!supabase) return

      try {
        // Get user data including ticket_last_claimed and tickets
        const { data, error } = await supabase
          .from("users")
          .select("ticket_last_claimed, legendary_tickets, tickets")
          .eq("username", user.username)
          .single()

        if (error) {
          console.error("Error fetching user data:", error)
          return
        }

        // Update tickets and legendary tickets
        if (data?.tickets !== undefined) {
          setTickets(data.tickets)
        }

        if (data?.legendary_tickets !== undefined) {
          setLegendaryTickets(data.legendary_tickets)
        }

        // Check if user has claimed tickets in the last 12 hours
        if (data?.ticket_last_claimed) {
          const lastClaimedDate = new Date(data.ticket_last_claimed)
          const now = new Date()
          const twelveHoursInMs = 12 * 60 * 60 * 1000
          const timeSinceClaim = now.getTime() - lastClaimedDate.getTime()

          if (timeSinceClaim < twelveHoursInMs) {
            setAlreadyClaimed(true)
            setTimeUntilNextClaim(twelveHoursInMs - timeSinceClaim)
          } else {
            setAlreadyClaimed(false)
            setTimeUntilNextClaim(null)
          }
        }
      } catch (error) {
        console.error("Error checking claim status:", error)
      }
    }

    checkClaimStatus()

    // Set up interval to update countdown timer
    const interval = setInterval(() => {
      if (timeUntilNextClaim && timeUntilNextClaim > 1000) {
        setTimeUntilNextClaim((prevTime) => (prevTime ? prevTime - 1000 : null))
      } else if (timeUntilNextClaim && timeUntilNextClaim <= 1000) {
        setAlreadyClaimed(false)
        setTimeUntilNextClaim(null)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [user?.username, timeUntilNextClaim])

  const handleClaimBonus = async () => {
    if (!user) return

    setClaimLoading(true)
    try {
      const result = await claimDailyBonus(user.username)

      if (result.success) {
        await updateUserTickets?.(result.newTicketCount)
        setTickets(result.newTicketCount)
        toast({
          title: "Success!",
          description: "You've claimed 3 tickets as your daily bonus!",
        })
        setAlreadyClaimed(true)
        setTimeUntilNextClaim(12 * 60 * 60 * 1000) // 12 hours in milliseconds
      } else if (result.alreadyClaimed) {
        setAlreadyClaimed(true)
        toast({
          title: "Already Claimed",
          description: "You've already claimed your tickets. Check back later!",
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
        description: "Failed to claim tickets",
        variant: "destructive",
      })
    } finally {
      setClaimLoading(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#f8f9ff] pb-20 text-black">
        {/* Header with glass effect */}
        <header className="sticky top-0 z-10 backdrop-blur-md bg-white/80 border-b border-gray-100">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-sm mr-3">
                {user?.username?.charAt(0).toUpperCase() || "A"}
              </div>
              <h1 className="text-lg font-medium bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                Anime World
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
                <Ticket className="h-3.5 w-3.5 text-violet-500" />
                <span className="font-medium text-sm">{tickets}</span>
              </div>
              <div className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
                <Crown className="h-3.5 w-3.5 text-amber-500" />
                <span className="font-medium text-sm">{legendaryTickets || 0}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 space-y-5 max-w-lg mx-auto">
          {/* User profile */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-white rounded-2xl p-4 shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-xl shadow-sm">
                  {user?.username?.charAt(0).toUpperCase() || "A"}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                    <span className="text-[10px] text-white font-bold">{user?.level || 1}</span>
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <h2 className="font-semibold text-base">{user?.username || "Trainer"}</h2>
                  <span className="text-xs text-gray-500">
                    {user?.experience || 0} / {user?.nextLevelExp || 100} XP
                  </span>
                </div>
                <Progress
                  value={user?.experience ? (user.experience / user.nextLevelExp) * 100 : 0}
                  className="h-1.5 bg-gray-100"
                  indicatorClassName="bg-gradient-to-r from-violet-500 to-fuchsia-500"
                />
              </div>
            </div>
          </motion.div>

          {/* Daily bonus */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="bg-white rounded-2xl shadow-sm overflow-hidden"
          >
            <div className="relative">
              {/* Background pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-violet-500"></div>
                <div className="absolute -left-4 -bottom-8 w-20 h-20 rounded-full bg-fuchsia-500"></div>
              </div>

              <div className="relative p-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
                      <Gift className="h-5 w-5 text-violet-500" />
                    </div>
                    <div>
                      <h3 className="font-medium text-base">Ticket Claim</h3>
                      <p className="text-xs text-gray-500">Get 3 tickets every 12 hours</p>
                    </div>
                  </div>
                  <Button
                    onClick={handleClaimBonus}
                    disabled={claimLoading || alreadyClaimed}
                    size="sm"
                    className={`rounded-full px-4 ${
                      alreadyClaimed
                        ? "bg-gray-100 text-gray-500 hover:bg-gray-100"
                        : "bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white"
                    }`}
                  >
                    {claimLoading ? (
                      <div className="flex items-center">
                        <div className="h-3 w-3 border-2 border-t-transparent border-current rounded-full animate-spin mr-2"></div>
                        <span className="text-xs">Claiming...</span>
                      </div>
                    ) : alreadyClaimed && timeUntilNextClaim ? (
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        <span className="text-xs">{formatTimeRemaining(timeUntilNextClaim)}</span>
                      </div>
                    ) : (
                      <span className="text-xs">Claim Now</span>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card packs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="bg-white rounded-2xl shadow-sm overflow-hidden"
          >
            <div className="p-4 pb-2">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-base">Card Packs</h3>
                <Link href="/draw" className="text-xs text-violet-500 font-medium flex items-center">
                  View all <ChevronRight className="h-3 w-3 ml-0.5" />
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Link href="/draw" className="block">
                  <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 p-3 transition-all duration-300 hover:shadow-md group">
                    {/* Animated background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-fuchsia-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>

                    <div className="flex items-center justify-center mb-2">
                      <div className="relative w-16 h-24 mx-auto transform group-hover:scale-105 transition-transform duration-300">
                        <Image src="/vibrant-purple-card-pack.png" alt="Regular Pack" fill className="object-contain" />
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-2 text-center shadow-sm">
                      <span className="font-medium text-sm">Regular Pack</span>
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <Ticket className="h-3 w-3 text-violet-500" />
                        <span className="text-xs text-gray-500">1 Ticket</span>
                      </div>
                    </div>
                  </div>
                </Link>
                <Link href="/draw" className="block">
                  <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-3 transition-all duration-300 hover:shadow-md group">
                    {/* Animated background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>

                    <div className="flex items-center justify-center mb-2">
                      <div className="relative w-16 h-24 mx-auto transform group-hover:scale-105 transition-transform duration-300">
                        <Image
                          src="/anime-world-legendary-pack.png"
                          alt="Legendary Pack"
                          fill
                          className="object-contain"
                        />
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-2 text-center shadow-sm">
                      <span className="font-medium text-sm">Legendary Pack</span>
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <Crown className="h-3 w-3 text-amber-500" />
                        <span className="text-xs text-gray-500">1 Legendary Ticket</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Quick actions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="grid grid-cols-2 gap-3"
          >
            <Link href="/collection" className="block">
              <div className="bg-white rounded-2xl p-4 shadow-sm h-full transition-all duration-300 hover:shadow-md group">
                <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center mb-3 group-hover:bg-violet-200 transition-colors duration-300">
                  <CreditCard className="h-5 w-5 text-violet-500" />
                </div>
                <h3 className="font-medium text-base mb-0.5">Collection</h3>
                <p className="text-xs text-gray-500">View your cards</p>
              </div>
            </Link>
            <Link href="/trade" className="block">
              <div className="bg-white rounded-2xl p-4 shadow-sm h-full transition-all duration-300 hover:shadow-md group">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mb-3 group-hover:bg-emerald-200 transition-colors duration-300">
                  <Repeat className="h-5 w-5 text-emerald-500" />
                </div>
                <h3 className="font-medium text-base mb-0.5">Trade</h3>
                <p className="text-xs text-gray-500">Exchange cards</p>
              </div>
            </Link>
          </motion.div>
        </main>

        <MobileNav />
      </div>
    </ProtectedRoute>
  )
}
