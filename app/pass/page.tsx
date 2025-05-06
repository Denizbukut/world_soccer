"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import MobileNav from "@/components/mobile-nav"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/components/ui/use-toast"
import { motion, AnimatePresence } from "framer-motion"
import { Crown, Ticket, Star, Gift, Check, Lock, Sparkles, Clock, Calendar, Bell, SendToBack } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { PremiumPass, ClaimedReward } from "@/types/database"
import { MiniKit, tokenToDecimals, Tokens, PayCommandInput } from '@worldcoin/minikit-js'

interface LevelReward {
  level: number
  standardClaimed: boolean
  premiumClaimed: boolean
  isSpecialLevel?: boolean
}

export default function PremiumPassPage() {
  const { user, updateUserTickets } = useAuth()
  const [hasPremium, setHasPremium] = useState(false)
  const [premiumExpiryDate, setPremiumExpiryDate] = useState<Date | null>(null)
  const [lastLegendaryClaim, setLastLegendaryClaim] = useState<Date | null>(null)
  const [canClaimLegendary, setCanClaimLegendary] = useState(false)
  const [timeUntilNextClaim, setTimeUntilNextClaim] = useState<number | null>(null)
  const [levelRewards, setLevelRewards] = useState<LevelReward[]>([])
  const [isClaimingLegendary, setIsClaimingLegendary] = useState(false)
  const [isClaimingReward, setIsClaimingReward] = useState(false)
  const [showXpAnimation, setShowXpAnimation] = useState(false)
  const [xpGained, setXpGained] = useState(0)
  const [showLevelUpAnimation, setShowLevelUpAnimation] = useState(false)
  const [newLevel, setNewLevel] = useState(1)
  const [tickets, setTickets] = useState(0)
  const [legendaryTickets, setLegendaryTickets] = useState(0)
  const [unclaimedRewards, setUnclaimedRewards] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [showClaimPopup, setShowClaimPopup] = useState(false)
  const [claimedRewardsInfo, setClaimedRewardsInfo] = useState<{
    standardTickets: number
    legendaryTickets: number
  }>({ standardTickets: 0, legendaryTickets: 0 })

  // Format time remaining as HH:MM:SS
  const formatTimeRemaining = (milliseconds: number) => {
    if (milliseconds <= 0) return "00:00:00"

    const hours = Math.floor(milliseconds / (1000 * 60 * 60))
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000)

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  // Format date as DD/MM/YYYY
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  // Calculate XP needed for a specific level
  const calculateXpForLevel = (level: number) => {
    if (level <= 1) return 100
    return 100 + (level - 1) * 50
  }

  // Fetch premium status and level rewards
  useEffect(() => {
    if (!user?.username) return

    const fetchPremiumStatus = async () => {
      const supabase = getSupabaseBrowserClient()
      if (!supabase) return

      try {
        // Get user data including tickets and legendary tickets
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("tickets, legendary_tickets")
          .eq("username", user.username)
          .single()

        if (userError) {
          console.error("Error fetching user data:", userError)
        } else if (userData) {
          // Update tickets and legendary tickets
          if (typeof userData.tickets === "number") {
            setTickets(userData.tickets)
          }
          if (typeof userData.legendary_tickets === "number") {
            setLegendaryTickets(userData.legendary_tickets)
          }
        }

        // Check if user has premium
        const { data: premiumData, error: premiumError } = (await supabase
          .from("premium_passes")
          .select("*")
          .eq("user_id", user.username)
          .eq("active", true)
          .single()) as { data: PremiumPass | null; error: any }

        if (premiumError && premiumError.code !== "PGRST116") {
          console.error("Error fetching premium status:", premiumError)
        }

        // Set premium status and last claim time
        if (premiumData) {
          // Check if premium pass has expired
          const now = new Date()
          const expiryDate = premiumData.expires_at ? new Date(premiumData.expires_at) : null

          if (expiryDate && now > expiryDate) {
            // Premium pass has expired, update database
            console.log("Premium pass expired, updating database...")

            // Update premium_passes table
            const { error: updatePassError } = await supabase
              .from("premium_passes")
              .update({ active: false })
              .eq("user_id", user.username)
              .eq("id", premiumData.id)

            if (updatePassError) {
              console.error("Error updating premium pass status:", updatePassError)
            }

            // Update users table
            const { error: updateUserError } = await supabase
              .from("users")
              .update({ has_premium: false })
              .eq("username", user.username)

            if (updateUserError) {
              console.error("Error updating user premium status:", updateUserError)
            }

            // Update local state
            setHasPremium(false)
            setPremiumExpiryDate(null)
            setLastLegendaryClaim(null)
            setCanClaimLegendary(false)

            toast({
              title: "Premium Pass Expired",
              description: "Your premium pass has expired. Renew to continue enjoying premium benefits!",
              variant: "destructive",
            })
          } else {
            // Premium pass is still active
            setHasPremium(true)

            // Set premium expiry date if available
            if (expiryDate) {
              setPremiumExpiryDate(expiryDate)
            }

            if (premiumData.last_legendary_claim) {
              const lastClaim = new Date(premiumData.last_legendary_claim as string)
              setLastLegendaryClaim(lastClaim)

              // Check if 24 hours have passed since last claim
              const timeSinceClaim = now.getTime() - lastClaim.getTime()
              const twentyFourHoursInMs = 24 * 60 * 60 * 1000

              if (timeSinceClaim >= twentyFourHoursInMs) {
                setCanClaimLegendary(true)
              } else {
                setCanClaimLegendary(false)
                setTimeUntilNextClaim(twentyFourHoursInMs - timeSinceClaim)
              }
            } else {
              // No previous claim, can claim immediately
              setCanClaimLegendary(true)
            }
          }
        } else {
          setHasPremium(false)
        }

        // Fetch claimed rewards
        const { data: claimedRewardsData, error: claimedRewardsError } = (await supabase
          .from("claimed_rewards")
          .select("*")
          .eq("user_id", user.username)) as { data: ClaimedReward[] | null; error: any }

        if (claimedRewardsError) {
          console.error("Error fetching claimed rewards:", claimedRewardsError)
        }

        // Create rewards array for all levels up to current level + 50 (to show future levels)
        const userLevel = user.level || 1
        const maxLevel = Math.max(userLevel + 50, 50) // Show at least up to level 50
        const rewards: LevelReward[] = []

        for (let i = 1; i <= maxLevel; i++) {
          const claimedReward = claimedRewardsData?.find((reward) => reward.level === i)

          // Double rewards for every 5 levels
          const isSpecialLevel = i % 5 === 0

          rewards.push({
            level: i,
            standardClaimed: Boolean(claimedReward?.standard_claimed),
            premiumClaimed: Boolean(claimedReward?.premium_claimed),
            isSpecialLevel: isSpecialLevel,
          })
        }

        setLevelRewards(rewards)

        // Calculate unclaimed rewards
        let unclaimed = 0
        rewards.forEach((reward) => {
          if (reward.level <= userLevel) {
            if (!reward.standardClaimed) unclaimed++
            if (hasPremium && !reward.premiumClaimed) unclaimed++
          }
        })
        setUnclaimedRewards(unclaimed)
      } catch (error) {
        console.error("Error in fetchPremiumStatus:", error)
      }
    }

    fetchPremiumStatus()

    // Set up interval to update countdown timer
    const interval = setInterval(() => {
      if (timeUntilNextClaim && timeUntilNextClaim > 1000) {
        setTimeUntilNextClaim((prevTime) => (prevTime ? prevTime - 1000 : null))
      } else if (timeUntilNextClaim && timeUntilNextClaim <= 1000) {
        setCanClaimLegendary(true)
        setTimeUntilNextClaim(null)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [user?.username, user?.level, timeUntilNextClaim, hasPremium])

  // Scroll to current level when component mounts
  useEffect(() => {
    if (scrollContainerRef.current && user?.level) {
      const levelElement = document.getElementById(`level-${user.level}`)
      if (levelElement) {
        // Scroll to center the current level
        const containerWidth = scrollContainerRef.current.offsetWidth
        const scrollPosition = levelElement.offsetLeft - containerWidth / 2 + levelElement.offsetWidth / 2

        scrollContainerRef.current.scrollTo({
          left: Math.max(0, scrollPosition),
          behavior: "smooth",
        })
      }
    }
  }, [levelRewards, user?.level])

  // Handle claiming legendary ticket
  const handleClaimLegendaryTicket = async () => {
    if (!user?.username || !hasPremium || !canClaimLegendary) return

    setIsClaimingLegendary(true)
    const supabase = getSupabaseBrowserClient()

    try {
      if (!supabase) return

      // Update last claim time
      const { error: updateError } = await supabase
        .from("premium_passes")
        .update({ last_legendary_claim: new Date().toISOString() })
        .eq("user_id", user.username)
        .eq("active", true)

      if (updateError) {
        console.error("Error updating last claim time:", updateError)
        toast({
          title: "Error",
          description: "Failed to claim legendary ticket",
          variant: "destructive",
        })
        return
      }

      // Update user's legendary tickets in the database
      const newLegendaryTicketCount = (legendaryTickets || 0) + 1

      const { error: ticketUpdateError } = await supabase
        .from("users")
        .update({ legendary_tickets: newLegendaryTicketCount })
        .eq("username", user.username)

      if (ticketUpdateError) {
        console.error("Error updating legendary tickets:", ticketUpdateError)
        toast({
          title: "Error",
          description: "Failed to update legendary tickets",
          variant: "destructive",
        })
        return
      }

      // Update local state
      setLegendaryTickets(newLegendaryTicketCount)

      // Update auth context
      await updateUserTickets?.(tickets || 0, newLegendaryTicketCount)

      toast({
        title: "Success!",
        description: "You've claimed your daily legendary ticket!",
      })

      // Reset claim status
      setCanClaimLegendary(false)
      setLastLegendaryClaim(new Date())
      setTimeUntilNextClaim(24 * 60 * 60 * 1000) // 24 hours in milliseconds
    } catch (error) {
      console.error("Error claiming legendary ticket:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsClaimingLegendary(false)
    }
  }

  // Handle claiming all level rewards
  const handleClaimAllRewards = async () => {
    if (!user?.username) return

    setIsClaimingReward(true)
    const supabase = getSupabaseBrowserClient()

    try {
      if (!supabase) return

      let standardTicketsToAdd = 0
      let legendaryTicketsToAdd = 0
      const updatedRewards = [...levelRewards]
      const userLevel = user.level || 1

      // Process all unclaimed rewards up to the user's current level
      for (let i = 0; i < updatedRewards.length; i++) {
        const reward = updatedRewards[i]
        if (reward.level <= userLevel) {
          // Standard rewards
          if (!reward.standardClaimed) {
            // Double rewards for every 5 levels
            standardTicketsToAdd += reward.isSpecialLevel ? 6 : 3
            updatedRewards[i] = { ...reward, standardClaimed: true }
          }

          // Premium rewards (if user has premium)
          if (hasPremium && !reward.premiumClaimed) {
            // Double rewards for every 5 levels
            legendaryTicketsToAdd += reward.isSpecialLevel ? 2 : 1
            updatedRewards[i] = { ...reward, premiumClaimed: true }
          }
        }
      }

      // If there are rewards to claim
      if (standardTicketsToAdd > 0 || legendaryTicketsToAdd > 0) {
        // Update claimed rewards in database
        for (let i = 0; i < updatedRewards.length; i++) {
          const reward = updatedRewards[i]
          if (reward.level <= userLevel) {
            // Check if reward for this level already exists
            const { data: existingReward, error: existingRewardError } = (await supabase
              .from("claimed_rewards")
              .select("*")
              .eq("user_id", user.username)
              .eq("level", reward.level)
              .single()) as { data: ClaimedReward | null; error: any }

            if (existingRewardError && existingRewardError.code !== "PGRST116") {
              console.error("Error checking existing reward:", existingRewardError)
              continue
            }

            if (existingReward) {
              // Update existing reward
              const updateData = {
                standard_claimed: true,
                premium_claimed: hasPremium ? true : existingReward.premium_claimed,
              }

              await supabase
                .from("claimed_rewards")
                .update(updateData)
                .eq("id", existingReward.id as string)
            } else {
              // Create new reward record
              const insertData = {
                user_id: user.username,
                level: reward.level,
                standard_claimed: true,
                premium_claimed: hasPremium,
              }

              await supabase.from("claimed_rewards").insert(insertData)
            }
          }
        }

        // Calculate new ticket counts
        const newTicketCount = (tickets || 0) + standardTicketsToAdd
        const newLegendaryTicketCount = (legendaryTickets || 0) + legendaryTicketsToAdd

        // Update user's tickets in the database
        const { error: ticketUpdateError } = await supabase
          .from("users")
          .update({
            tickets: newTicketCount,
            legendary_tickets: newLegendaryTicketCount,
          })
          .eq("username", user.username)

        if (ticketUpdateError) {
          console.error("Error updating tickets:", ticketUpdateError)
          toast({
            title: "Error",
            description: "Failed to update tickets",
            variant: "destructive",
          })
          return
        }

        // Update local state
        setTickets(newTicketCount)
        setLegendaryTickets(newLegendaryTicketCount)

        // Update auth context
        await updateUserTickets?.(newTicketCount, newLegendaryTicketCount)

        // Update local state
        setLevelRewards(updatedRewards)
        setUnclaimedRewards(0)

        // Show claim popup
        setClaimedRewardsInfo({
          standardTickets: standardTicketsToAdd,
          legendaryTickets: legendaryTicketsToAdd,
        })
        setShowClaimPopup(true)
      } else {
        toast({
          title: "No rewards to claim",
          description: "You have already claimed all available rewards.",
        })
      }
    } catch (error) {
      console.error("Error claiming all rewards:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsClaimingReward(false)
    }
  }

  const sendPayment = async () => {

    const wldAmount = 7;
    const res = await fetch('/api/initiate-payment', {
      method: 'POST',
    })
    const { id } = await res.json()
  
    const payload: PayCommandInput = {
      reference: id,
      to: '0x4bb270ef6dcb052a083bd5cff518e2e019c0f4ee', // my wallet
      tokens: [
        {
          symbol: Tokens.WLD,
          token_amount: tokenToDecimals(wldAmount, Tokens.WLD).toString(),
        },
      ],
      description: 'Premium Pass',
    }
  
    const { finalPayload } = await MiniKit.commandsAsync.pay(payload)
  
    if (finalPayload.status == 'success') {
      console.log("success sending payment")
      handlePurchasePremium();
    }
  }

  // Handle purchasing premium pass
  const handlePurchasePremium = async () => {
    const supabase = getSupabaseBrowserClient()
    if (!supabase || !user?.username) return

    try {
      // Calculate expiry date (1 month from now)
      const expiryDate = new Date()
      expiryDate.setMonth(expiryDate.getMonth() + 1)

      // Check if user already has a premium pass record
      const { data: existingPass, error: checkError } = await supabase
        .from("premium_passes")
        .select("*")
        .eq("user_id", user.username)
        .single()

      if (checkError && checkError.code !== "PGRST116") {
        console.error("Error checking existing premium pass:", checkError)
        toast({
          title: "Error",
          description: "Failed to check premium pass status",
          variant: "destructive",
        })
        return
      }

      let error

      if (existingPass) {
        // Update existing premium pass
        const { error: updateError } = await supabase
          .from("premium_passes")
          .update({
            active: true,
            purchased_at: new Date().toISOString(),
            expires_at: expiryDate.toISOString(),
          })
          .eq("user_id", user.username)

        error = updateError
      } else {
        // Create new premium pass record
        const { error: insertError } = await supabase.from("premium_passes").insert({
          user_id: user.username,
          active: true,
          purchased_at: new Date().toISOString(),
          expires_at: expiryDate.toISOString(),
        })

        error = insertError
      }

      if (error) {
        console.error("Error purchasing premium pass:", error)
        toast({
          title: "Error",
          description: "Failed to purchase premium pass",
          variant: "destructive",
        })
        return
      }

      // Always update user's premium status to true
      const { error: updateError } = await supabase
        .from("users")
        .update({ has_premium: true })
        .eq("username", user.username)

      if (updateError) {
        console.error("Error updating user premium status:", updateError)
        toast({
          title: "Warning",
          description: "Premium pass activated but user status update failed",
          variant: "destructive",
        })
      }

      // Update local state
      setHasPremium(true)
      setPremiumExpiryDate(expiryDate)

      toast({
        title: "Success!",
        description: existingPass
          ? "You've renewed your Premium Pass for 1 month!"
          : "You've purchased the Premium Pass for 1 month!",
      })
    } catch (error) {
      console.error("Error in handlePurchasePremium:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    }
  }

  // Calculate how many legendary tickets the user would get if they purchased premium
  const calculatePotentialLegendaryTickets = () => {
    if (!user) return 0

    const userLevel = user.level || 1
    let count = 0

    // Count unclaimed premium rewards
    levelRewards.forEach((reward) => {
      if (reward.level <= userLevel && !reward.premiumClaimed) {
        count++
      }
    })

    return count
  }

  return (
    <div className="min-h-screen bg-[#f8f9ff] pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur-md bg-white/80 border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <h1 className="text-lg font-medium">Game Pass</h1>
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
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto space-y-5">
        {/* User Level */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-2xl p-4 shadow-sm"
        >
          <div className="flex flex-col">
            <div className="flex justify-between items-center mb-1">
              <h2 className="font-semibold text-base">Level {user?.level || 1}</h2>
              <div className="flex items-center">
                
              </div>
            </div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-500">
                {user?.experience || 0} / {user?.nextLevelExp || 100} XP
              </span>
              <span className="text-xs font-medium">
                {Math.floor(((user?.experience || 0) / (user?.nextLevelExp || 100)) * 100)}%
              </span>
            </div>
            <Progress
              value={user?.experience ? (user.experience / user.nextLevelExp) * 100 : 0}
              className="h-1.5 bg-gray-100"
              indicatorClassName="bg-gradient-to-r from-violet-500 to-fuchsia-500"
            />
          </div>
        </motion.div>

        {/* Premium Pass Status */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="bg-white rounded-2xl shadow-sm overflow-hidden"
        >
          <div className="relative">
            {/* Premium background pattern */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -right-16 -top-16 w-32 h-32 rounded-full bg-gradient-to-br from-amber-400/20 to-amber-600/20"></div>
              <div className="absolute -left-16 -bottom-16 w-32 h-32 rounded-full bg-gradient-to-tr from-amber-400/20 to-amber-600/20"></div>
            </div>

            <div className="relative p-4">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 flex items-center justify-center relative">
                    <Crown className="h-6 w-6 text-white" />
                    {(canClaimLegendary || unclaimedRewards > 0) && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                        <Bell className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-lg">Premium Pass</h3>
                      {hasPremium && (
                        <Badge className="bg-gradient-to-r from-amber-400 to-amber-600 text-white">Active</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {hasPremium ? "Enjoy exclusive rewards and benefits!" : "Unlock exclusive rewards and benefits!"}
                    </p>
                    {hasPremium && premiumExpiryDate && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-amber-600">
                        <Calendar className="h-3 w-3" />
                        <span>Valid until {formatDate(premiumExpiryDate)}</span>
                      </div>
                    )}
                  </div>
                </div>
                {!hasPremium && (
                  <Button
                    onClick={sendPayment}
                    className="bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-white rounded-full"
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Get Premium
                  </Button>
                )}
              </div>

              {/* Premium benefits */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-3 bg-amber-50 p-3 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                    <Ticket className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">Daily Legend. Ticket</h4>
                    <p className="text-xs text-gray-500">Claim 1 legendary ticket every 24 hours</p>
                  </div>
                  {hasPremium && (
                    <Button
                      onClick={handleClaimLegendaryTicket}
                      disabled={!canClaimLegendary || isClaimingLegendary}
                      size="sm"
                      className={`rounded-full px-3 ${
                        canClaimLegendary
                          ? "bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-white"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-100"
                      }`}
                    >
                      {isClaimingLegendary ? (
                        <div className="flex items-center">
                          <div className="h-3 w-3 border-2 border-t-transparent border-current rounded-full animate-spin mr-2"></div>
                          <span className="text-xs">Claiming...</span>
                        </div>
                      ) : canClaimLegendary ? (
                        <span className="text-xs">Claim Now</span>
                      ) : (
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          <span className="text-xs">{formatTimeRemaining(timeUntilNextClaim || 0)}</span>
                        </div>
                      )}
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-3 bg-amber-50 p-3 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                    <Gift className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Premium Level Rewards</h4>
                    <p className="text-xs text-gray-500">Get 1 legendary ticket for each level up</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-amber-50 p-3 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">1 Month Duration</h4>
                    <p className="text-xs text-gray-500">Premium Pass is valid for 30 days</p>
                  </div>
                </div>
              </div>

              {!hasPremium && (
                <Alert className="bg-amber-50 border-amber-200 mb-2">
                  <AlertTitle className="text-amber-800 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    Get {calculatePotentialLegendaryTickets()} Legendary Tickets Now!
                  </AlertTitle>
                  <AlertDescription className="text-amber-700 text-sm">
                    Purchase Premium Pass now and claim legendary tickets for all your previous level ups!
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </motion.div>

        {/* Level Rewards Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="bg-white rounded-2xl shadow-sm p-4"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium text-lg">Pass Rewards</h3>
            {unclaimedRewards > 0 && (
              <Button
                onClick={handleClaimAllRewards}
                disabled={isClaimingReward}
                size="sm"
                className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white rounded-full"
              >
                {isClaimingReward ? (
                  <div className="flex items-center">
                    <div className="h-3 w-3 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
                    <span>Claiming...</span>
                  </div>
                ) : (
                  <>
                    <Gift className="h-3.5 w-3.5 mr-1.5" />
                    Claim All ({unclaimedRewards})
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Scrollable timeline */}
          <div
            ref={scrollContainerRef}
            className="overflow-x-auto pb-4 hide-scrollbar"
            style={{ scrollbarWidth: "none", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" }}
          >
            <div className="flex flex-col min-w-max">
              {/* Standard rewards (top) */}
              <div className="flex mb-2">
                {levelRewards.map((reward) => (
                  <div key={`standard-${reward.level}`} className="flex flex-col items-center w-24">
                    <div className="h-20 flex flex-col items-center justify-end pb-2">
                      <div
                        className={`
                        w-20 h-16 rounded-lg flex flex-col items-center justify-center relative
                        ${
                          reward.level <= (user?.level || 1)
                            ? reward.standardClaimed
                              ? "bg-gray-100"
                              : reward.isSpecialLevel
                                ? "bg-violet-200"
                                : "bg-violet-100"
                            : "bg-gray-100"
                        }
                      `}
                      >
                        <Ticket className="h-5 w-5 text-violet-500 mb-1" />
                        <span className="text-xs font-medium">{reward.isSpecialLevel ? "6" : "3"} Tickets</span>
                        {reward.isSpecialLevel && !reward.standardClaimed && reward.level <= (user?.level || 1) && (
                          <span className="absolute -top-2 -right-2 bg-violet-500 text-white text-[10px] px-1 rounded-full">
                            2x
                          </span>
                        )}

                        {reward.standardClaimed && (
                          <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Level markers (middle) */}
              <div className="flex items-center h-10 relative">
                <div className="absolute left-0 right-0 h-0.5 bg-gray-200"></div>

                {levelRewards.map((reward) => (
                  <div
                    id={`level-${reward.level}`}
                    key={`level-${reward.level}`}
                    className={`flex flex-col items-center justify-center w-24 z-10`}
                  >
                    <div
                      className={`
                      w-6 h-6 rounded-full flex items-center justify-center
                      ${
                        reward.level === (user?.level || 1)
                          ? "bg-violet-500 text-white"
                          : reward.level < (user?.level || 1)
                            ? "bg-violet-200"
                            : "bg-gray-200"
                      }
                    `}
                    >
                      <span className="text-xs font-medium">{reward.level}</span>
                    </div>
                    <span className="text-[10px] mt-0.5">Level {reward.level}</span>
                  </div>
                ))}
              </div>

              {/* Premium rewards (bottom) */}
              <div className="flex mt-2">
                {levelRewards.map((reward) => (
                  <div key={`premium-${reward.level}`} className="flex flex-col items-center w-24">
                    <div className="h-20 flex flex-col items-center justify-start pt-2 relative">
                      <div
                        className={`
                        w-20 h-16 rounded-lg flex flex-col items-center justify-center relative
                        ${
                          reward.level <= (user?.level || 1)
                            ? hasPremium
                              ? reward.premiumClaimed
                                ? "bg-gray-100"
                                : reward.isSpecialLevel
                                  ? "bg-amber-200"
                                  : "bg-amber-100"
                              : "bg-gray-100"
                            : "bg-gray-100"
                        }
                        ${!hasPremium ? "opacity-60" : ""}
                      `}
                      >
                        {!hasPremium && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-lg">
                            <Lock className="h-4 w-4 text-gray-600" />
                          </div>
                        )}

                        <Ticket className="h-5 w-5 text-amber-500 mb-1" />
                        <span className="text-xs font-medium">{reward.isSpecialLevel ? "2" : "1"} Legendary</span>
                        {reward.isSpecialLevel &&
                          !reward.premiumClaimed &&
                          hasPremium &&
                          reward.level <= (user?.level || 1) && (
                            <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-[10px] px-1 rounded-full">
                              2x
                            </span>
                          )}

                        {reward.premiumClaimed && (
                          <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-6 flex justify-center gap-4 text-xs text-gray-500">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-violet-200 mr-1"></div>
              <span>Standard Reward</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-amber-100 mr-1"></div>
              <span>Premium Reward</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
              <span>Claimed</span>
            </div>
          </div>

          
        </motion.div>
      </main>

      {/* XP Gain Animation */}
      <AnimatePresence>
        {showXpAnimation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
          >
            <motion.div
              className="bg-white rounded-xl p-4 shadow-lg flex flex-col items-center gap-2 border-2 border-violet-300"
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: [0, 1.2, 1],
                opacity: [0, 1, 1, 0],
              }}
              transition={{
                duration: 2,
                times: [0, 0.3, 0.5, 1],
              }}
            >
              <div className="text-xl font-bold text-violet-600">+{xpGained} XP</div>
              <div className="flex items-center gap-2">
                <Star className="h-6 w-6 text-violet-500" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Level Up Animation */}
      <AnimatePresence>
        {showLevelUpAnimation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-black/70" />
            <motion.div
              className="relative z-10 bg-white rounded-xl p-6 shadow-lg flex flex-col items-center gap-4 border-2 border-amber-400"
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: [0, 1.2, 1],
                opacity: 1,
              }}
              transition={{
                duration: 0.5,
                times: [0, 0.7, 1],
              }}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 flex items-center justify-center mb-2">
                  <Crown className="h-10 w-10 text-white" />
                </div>
              </motion.div>
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <h2 className="text-2xl font-bold text-center">Level Up!</h2>
                <p className="text-lg font-medium text-center text-amber-600">You reached Level {newLevel}!</p>
              </motion.div>
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.5 }}
                className="flex gap-4"
              >
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1 mb-1">
                    <Ticket className="h-4 w-4 text-violet-500" />
                    <span className="font-medium">x3</span>
                  </div>
                  <span className="text-xs text-gray-500">Regular Tickets</span>
                </div>
                {hasPremium && (
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1 mb-1">
                      <Ticket className="h-4 w-4 text-amber-500" />
                      <span className="font-medium">x1</span>
                    </div>
                    <span className="text-xs text-gray-500">Legendary Ticket</span>
                  </div>
                )}
              </motion.div>
            </motion.div>

            {/* Particles */}
            {Array.from({ length: 30 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-amber-400"
                initial={{
                  x: "50%",
                  y: "50%",
                  opacity: 0,
                }}
                animate={{
                  x: `${Math.random() * 100}%`,
                  y: `${Math.random() * 100}%`,
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 2,
                  delay: Math.random() * 0.5,
                  ease: "easeOut",
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Claim Rewards Popup */}
      <AnimatePresence>
        {showClaimPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowClaimPopup(false)} />
            <motion.div
              className="relative z-10 bg-white rounded-xl p-6 shadow-lg flex flex-col items-center gap-4 border-2 border-violet-300 max-w-xs w-full"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <h2 className="text-xl font-bold text-center">Rewards Claimed!</h2>

              {claimedRewardsInfo.standardTickets > 0 && (
                <div className="flex items-center gap-3 bg-violet-50 p-3 rounded-lg w-full">
                  <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
                    <Ticket className="h-5 w-5 text-violet-500" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">Regular Tickets</h4>
                    <p className="text-sm text-violet-600 font-bold">+{claimedRewardsInfo.standardTickets}</p>
                  </div>
                </div>
              )}

              {claimedRewardsInfo.legendaryTickets > 0 && (
                <div className="flex items-center gap-3 bg-amber-50 p-3 rounded-lg w-full">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <Ticket className="h-5 w-5 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">Legendary Tickets</h4>
                    <p className="text-sm text-amber-600 font-bold">+{claimedRewardsInfo.legendaryTickets}</p>
                  </div>
                </div>
              )}

              <Button
                onClick={() => setShowClaimPopup(false)}
                className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white w-full mt-2"
              >
                Continue
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <MobileNav />
    </div>
  )
}
