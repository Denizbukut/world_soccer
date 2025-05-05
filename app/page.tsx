"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { claimDailyBonus } from "@/app/actions"
import ProtectedRoute from "@/components/protected-route"
import MobileNav from "@/components/mobile-nav"
import { Button } from "@/components/ui/button"
import { Ticket, Gift, CreditCard, Repeat, Clock, ChevronRight, Crown, Bell, ShoppingCart } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { Progress } from "@/components/ui/progress"

export default function Home() {
  const { user, updateUserTickets, refreshUserData } = useAuth()
  const [claimLoading, setClaimLoading] = useState(false)
  const [alreadyClaimed, setAlreadyClaimed] = useState(false)
  const [timeUntilNextClaim, setTimeUntilNextClaim] = useState<number | null>(null)
  const [legendaryTickets, setLegendaryTickets] = useState(0)
  const [tickets, setTickets] = useState(0)
  const [showClaimAnimation, setShowClaimAnimation] = useState(false)
  const [hasPremium, setHasPremium] = useState(false)
  const [canClaimLegendary, setCanClaimLegendary] = useState(false)
  const [unclaimedRewards, setUnclaimedRewards] = useState(0)

  // Refresh user data when component mounts
  useEffect(() => {
    refreshUserData?.()
  }, [refreshUserData])

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
          .select("ticket_last_claimed, legendary_tickets, tickets, has_premium")
          .eq("username", user.username)
          .single()

        if (error) {
          console.error("Error fetching user data:", error)
          return
        }

        // Update premium status
        if (data && typeof data.has_premium === "boolean") {
          setHasPremium(data.has_premium)
        }

        // Update tickets and legendary tickets with proper type checking
        if (data && typeof data.tickets === "number") {
          setTickets(data.tickets)
        }

        if (data && typeof data.legendary_tickets === "number") {
          setLegendaryTickets(data.legendary_tickets)
        }

        // Check if user has claimed tickets in the last 12 hours
        if (data?.ticket_last_claimed && typeof data.ticket_last_claimed === "string") {
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
        // Show claim animation
        setShowClaimAnimation(true)

        // Update tickets after a short delay to allow animation to play
        setTimeout(async () => {
          if (typeof result.newTicketCount === "number") {
            await updateUserTickets?.(result.newTicketCount)
            setTickets(result.newTicketCount)
          }

          toast({
            title: "Success!",
            description: "You've claimed 3 tickets as your daily bonus!",
          })

          setAlreadyClaimed(true)
          if (result.nextClaimTime) {
            const nextClaimDate = new Date(result.nextClaimTime)
            const now = new Date()
            setTimeUntilNextClaim(nextClaimDate.getTime() - now.getTime())
          } else {
            setTimeUntilNextClaim(12 * 60 * 60 * 1000) // 12 hours in milliseconds
          }

          // Hide animation after it completes
          setTimeout(() => {
            setShowClaimAnimation(false)
          }, 1000)
        }, 1500)
      } else if (result.alreadyClaimed) {
        setAlreadyClaimed(true)
        if (result.timeUntilNextClaim) {
          setTimeUntilNextClaim(result.timeUntilNextClaim)
        }
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
      if (!showClaimAnimation) {
        setClaimLoading(false)
      }
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#f8f9ff] pb-20 text-black">
        {/* Header with glass effect */}
        <header className="sticky top-0 z-10 backdrop-blur-md bg-white/80 border-b border-gray-100">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center">
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
                <Ticket className="h-3.5 w-3.5 text-amber-500" />
                <span className="font-medium text-sm">{legendaryTickets}</span>
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
            <div className="flex flex-col">
              <div className="flex justify-between items-center mb-1">
                <h2 className="font-semibold text-base">{user?.username || "Trainer"}</h2>
                <div className="flex items-center">
                  <span className="text-sm text-black-500 mr-2">Level {user?.level || 1}</span>
                </div>
              </div>
              <div className="flex justify-between items-center mb-1">
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
          </motion.div>

          {/* Premium Pass Banner */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.4 }}
            className="bg-gradient-to-r from-amber-400/20 to-amber-600/20 rounded-2xl shadow-sm overflow-hidden"
          >
            <Link href="/pass" className="block">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 flex items-center justify-center relative">
                    <Crown className="h-5 w-5 text-white" />
                    {(canClaimLegendary || unclaimedRewards > 0) && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                        <Bell className="h-3.5 w-3.5 text-white" />
                        {unclaimedRewards > 0 && (
                          <span className="absolute -top-1 -right-1 bg-white text-red-500 text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                            {unclaimedRewards > 9 ? "9+" : unclaimedRewards}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-base">Premium Pass</h3>
                    <p className="text-xs text-gray-600">
                      {hasPremium ? "View your premium benefits" : "Unlock exclusive rewards"}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </Link>
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
                        <Ticket className="h-3 w-3 text-amber-500" />
                        <span className="text-xs text-gray-500">1 L. Ticket</span>
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
            className="grid grid-cols-3 gap-3"
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
            <Link href="/shop" className="block">
              <div className="bg-white rounded-2xl p-4 shadow-sm h-full transition-all duration-300 hover:shadow-md group">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mb-3 group-hover:bg-blue-200 transition-colors duration-300">
                  <ShoppingCart className="h-5 w-5 text-blue-500" />
                </div>
                <h3 className="font-medium text-base mb-0.5">Shop</h3>
                <p className="text-xs text-gray-500">Buy tickets</p>
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

        {/* Ticket claim animation */}
        <AnimatePresence>
          {showClaimAnimation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
            >
              <div className="relative">
                {/* Flying tickets animation */}
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute"
                    initial={{
                      x: 0,
                      y: 0,
                      scale: 0,
                      rotate: Math.random() * 20 - 10,
                    }}
                    animate={{
                      x: [0, (i - 1) * 30],
                      y: [0, -80 + i * 10],
                      scale: [0, 1.2, 1],
                      rotate: [Math.random() * 20 - 10, Math.random() * 40 - 20],
                    }}
                    transition={{
                      duration: 0.8,
                      delay: i * 0.15,
                      ease: "easeOut",
                    }}
                  >
                    <div className="bg-white rounded-lg p-2 shadow-lg flex items-center gap-2 border-2 border-violet-300">
                      <Ticket className="h-5 w-5 text-violet-500" />
                      <span className="font-bold text-violet-600">+1</span>
                    </div>
                  </motion.div>
                ))}

                {/* Central animation */}
                <motion.div
                  className="bg-white rounded-xl p-4 shadow-lg flex flex-col items-center gap-2 border-2 border-violet-300"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{
                    scale: [0, 1.2, 1],
                    opacity: [0, 1, 1, 0],
                  }}
                  transition={{
                    duration: 1.5,
                    times: [0, 0.3, 0.5, 1],
                  }}
                >
                  <div className="text-xl font-bold text-violet-600">+3 Tickets!</div>
                  <div className="flex items-center gap-2">
                    <Ticket className="h-6 w-6 text-violet-500" />
                    <Ticket className="h-6 w-6 text-violet-500" />
                    <Ticket className="h-6 w-6 text-violet-500" />
                  </div>
                </motion.div>

                {/* Particles */}
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={`particle-${i}`}
                    className="absolute rounded-full bg-violet-500"
                    style={{
                      width: Math.random() * 6 + 2,
                      height: Math.random() * 6 + 2,
                    }}
                    initial={{
                      x: 0,
                      y: 0,
                      opacity: 0,
                    }}
                    animate={{
                      x: (Math.random() - 0.5) * 200,
                      y: (Math.random() - 0.5) * 200,
                      opacity: [0, 0.8, 0],
                    }}
                    transition={{
                      duration: 1 + Math.random(),
                      delay: Math.random() * 0.3,
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <MobileNav />
      </div>
    </ProtectedRoute>
  )
}
