"use client"

import { useState, useEffect, useRef } from "react"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

import { useAuth } from "@/contexts/auth-context"
import { claimDailyBonus } from "@/app/actions"
import { claimReferralRewardForUser, getReferredUsers } from "@/app/actions/referrals"
import { getDailyDeal } from "@/app/actions/deals"
import ProtectedRoute from "@/components/protected-route"
import MobileNav from "@/components/mobile-nav"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import {
  Ticket,
  Gift,
  CreditCard,
  Repeat,
  Clock,
  ChevronRight,
  Crown,
  ShoppingCart,
  BookOpen,
  Send,
  Trophy,
  Coins,
  Sparkles,
  Users,
  CheckCircle,
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { Progress } from "@/components/ui/progress"
import DealOfTheDayDialog from "@/components/deal-of-the-day-dialog"
import { useTokenBalance } from "@/components/getTokenBalance"
import { MiniKit, tokenToDecimals, Tokens, type PayCommandInput } from "@worldcoin/minikit-js"

interface LevelReward {
  level: number
  standardClaimed: boolean
  premiumClaimed: boolean
  isSpecialLevel?: boolean
}

interface DailyDeal {
  id: number
  card_id: string
  card_level: number
  regular_tickets: number
  legendary_tickets: number
  price: number
  description: string
  discount_percentage: number
  card_name: string
  card_image_url: string
  card_rarity: string
  card_character: string
}

interface DealInteraction {
  seen: boolean
  dismissed: boolean
  purchased: boolean
}

// Define the clan info interface
/* 
interface ClanInfo {
  id: string
  name: string
  level: number
  member_count: number
}
*/

export default function Home() {
  const { user, updateUserTickets, refreshUserData } = useAuth()
  const [claimLoading, setClaimLoading] = useState(false)
  const [referralLoading, setReferralLoading] = useState(false)
  const [alreadyClaimed, setAlreadyClaimed] = useState(false)
  const [timeUntilNextClaim, setTimeUntilNextClaim] = useState<number | null>(null)
  const [legendaryTickets, setLegendaryTickets] = useState(0)
  const [tickets, setTickets] = useState(0)
  const [tokens, setTokens] = useState<string | null>(null)
  const [showClaimAnimation, setShowClaimAnimation] = useState(false)
  const [hasPremium, setHasPremium] = useState(false)
  const [canClaimLegendary, setCanClaimLegendary] = useState(false)
  const [unclaimedRewards, setUnclaimedRewards] = useState(0)
  const [levelRewards, setLevelRewards] = useState<LevelReward[]>([])
  const [lastLegendaryClaim, setLastLegendaryClaim] = useState<Date | null>(null)
  // const [userClanInfo, setUserClanInfo] = useState<ClanInfo | null>(null)
  const [referredUsers, setReferredUsers] = useState<{
      id: number
      username: string
      level: number
      reward_claimed: boolean
    }[]>([])

    


  // Timer display state
  const [ticketTimerDisplay, setTicketTimerDisplay] = useState("00:00:00")
  const [tokenTimerDisplay, setTokenTimerDisplay] = useState("00:00:00")

  // Token minting state
  const [tokenAlreadyClaimed, setTokenAlreadyClaimed] = useState(false)
  const [timeUntilNextTokenClaim, setTimeUntilNextTokenClaim] = useState<number | null>(null)

  // Deal of the Day state
  const [dailyDeal, setDailyDeal] = useState<DailyDeal | null>(null)
  const [dealInteraction, setDealInteraction] = useState<DealInteraction | null>(null)
  const [showDealDialog, setShowDealDialog] = useState(false)
  const [dealLoading, setDealLoading] = useState(false)
  const [showReferralDialog, setShowReferralDialog] = useState(false)
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({})
  const [buyingBigPack, setBuyingBigPack] = useState(false)


  // Refs to track if effects have run
  const hasCheckedDeal = useRef(false)
  const hasCheckedClaims = useRef(false)
  const hasCheckedRewards = useRef(false)
  const hasCheckedTokens = useRef(false)
  const hasCheckedClan = useRef(false)
const [copied, setCopied] = useState(false)


  const handleCopy = () => {
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  // Interval refs
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const tokenTimerIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const rewardsIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [transactionId, setTransactionId] = useState<string>("")
  const [walletAddress, setWalletAddress] = useState<string>("")

  const [price, setPrice] = useState<number | null>(null)

  const [tokenBalance, setTokenBalance] = useState<string | null>(null)
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await fetch("/api/wld-price")
        const json = await res.json()

        if (json.price) {
          setPrice(json.price)
        } else {
          console.warn("Preis nicht gefunden in JSON:", json)
        }
      } catch (err) {
        console.error("Client error:", err)
      }
    }

    fetchPrice()
  }, [])

  useEffect(() => {
    if (user?.username === "llegaraa2kwdd" || user?.username === "nadapersonal") {
      router.push("/login")
    }
  }, [user?.username])

  const sendPayment = async (
    dollarPrice: number,
    ticketAmount: number,
    ticketType: "regular" | "legendary",
  ) => {
  
    try {
      // WLD-Betrag berechnen (fallback = 1:1)
      const roundedWldAmount = parseFloat((price ? dollarPrice / price : dollarPrice).toFixed(3))
  
  
      const res = await fetch("/api/initiate-payment", { method: "POST" })
      const { id } = await res.json()
  
      const payload: PayCommandInput = {
        reference: id,
        to: "0x4bb270ef6dcb052a083bd5cff518e2e019c0f4ee",
        tokens: [
          {
            symbol: Tokens.WLD,
            token_amount: tokenToDecimals(roundedWldAmount, Tokens.WLD).toString(),
          },
        ],
        description: `${ticketAmount} ${ticketType === "legendary" ? "Legendary" : "Regular"} Tickets`,
      }
  
      const { finalPayload } = await MiniKit.commandsAsync.pay(payload)
  
      if (finalPayload.status === "success") {
        console.log("success sending payment")
        await handleBuyTickets(ticketAmount, ticketType)
      } else {
        toast({
          title: "Payment Failed",
          description: "Your payment could not be processed. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Payment error:", error)
      toast({
        title: "Payment Error",
        description: "An error occurred during payment. Please try again.",
        variant: "destructive",
      })
    }
  }
  // Handle buying tickets
    const handleBuyTickets = async (ticketAmount: number, ticketType: "regular" | "legendary") => {
      if (!user?.username) {
        toast({
          title: "Error",
          description: "You must be logged in to purchase tickets",
          variant: "destructive",
        })
        return
      }
  
      try {
        const supabase = getSupabaseBrowserClient()
        if (!supabase) {
          throw new Error("Could not connect to database")
        }
  
        // Get current ticket counts
        const { data: userData, error: fetchError } = await supabase
          .from("users")
          .select("tickets, legendary_tickets")
          .eq("username", user.username)
          .single()
  
        if (fetchError) {
          throw new Error("Could not fetch user data")
        }
  
        // Calculate new ticket counts - ensure we're working with numbers
        let newTicketCount = typeof userData.tickets === "number" ? userData.tickets : Number(userData.tickets) || 0
        let newLegendaryTicketCount =
          typeof userData.legendary_tickets === "number"
            ? userData.legendary_tickets
            : Number(userData.legendary_tickets) || 0
  
        if (ticketType === "regular") {
          newTicketCount += ticketAmount
        } else {
          newLegendaryTicketCount += ticketAmount
        }
  
        // Update tickets in database
        const { error: updateError } = await supabase
          .from("users")
          .update({
            tickets: newTicketCount,
            legendary_tickets: newLegendaryTicketCount,
          })
          .eq("username", user.username)
  
        if (updateError) {
          throw new Error("Failed to update tickets")
        }
  
        // Update local state with explicit number types
        setTickets(newTicketCount)
        setLegendaryTickets(newLegendaryTicketCount)
  
        // Update auth context
        await updateUserTickets?.(newTicketCount, newLegendaryTicketCount)
  
        toast({
          title: "Purchase Successful!",
          description: `You've purchased ${ticketAmount} ${ticketType === "legendary" ? "legendary" : "regular"} tickets!`,
        })
      } catch (error) {
        console.error("Error buying tickets:", error)
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "An unexpected error occurred",
          variant: "destructive",
        })
      } 
    }
  


  const tokenAbi = [
    {
      inputs: [
        { internalType: "address", name: "to", type: "address" },
        { internalType: "uint256", name: "amount", type: "uint256" },
      ],
      name: "mintToken",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
  ]

  // Add the router constant inside the component:
  const router = useRouter()

  const fetchTokenBalance = async (address: string) => {
    return await useTokenBalance(address)
  }

  // Fetch user's clan info
  /*
  useEffect(() => {
    if (user?.username && !hasCheckedClan.current) {
      hasCheckedClan.current = true

      const fetchClanInfo = async () => {
        const supabase = getSupabaseBrowserClient()
        if (!supabase) return

        try {
          // First check if user has a clan_id
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("clan_id")
            .eq("username", user.username)
            .single()

          if (userError || !userData || !userData.clan_id) {
            // User is not in a clan
            setUserClanInfo(null)
            return
          }

          // Get clan details using the clan_id
          const { data: clanData, error: clanError } = await supabase
            .from("clans")
            .select("id, name, level, member_count")
            .eq("id", userData.clan_id)
            .single()

          if (clanError || !clanData) {
            console.error("Error fetching clan data:", clanError)
            setUserClanInfo(null)
            return
          }

          setUserClanInfo({
            id: String(clanData.id),
            name: String(clanData.name),
            level: typeof clanData.level === "number" ? clanData.level : 1,
            member_count: typeof clanData.member_count === "number" ? clanData.member_count : 1,
          })
        } catch (error) {
          console.error("Error in fetchClanInfo:", error)
          setUserClanInfo(null)
        }
      }

      fetchClanInfo()
    }
  }, [user?.username])
  */
 useEffect(() => {
  if (user?.username) {
    getReferredUsers(user.username).then(setReferredUsers)
    }
  }, [user?.username])


  const updateTicketTimerDisplay = (duration: number | null) => {
    if (duration === null) {
      setTicketTimerDisplay("00:00:00")
      return
    }

    const hours = Math.floor(duration / (1000 * 60 * 60))
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((duration % (1000 * 60)) / 1000)

    const formattedHours = String(hours).padStart(2, "0")
    const formattedMinutes = String(minutes).padStart(2, "0")
    const formattedSeconds = String(seconds).padStart(2, "0")

    setTicketTimerDisplay(`${formattedHours}:${formattedMinutes}:${formattedSeconds}`)
  }

  const updateTokenTimerDisplay = (duration: number | null) => {
    if (duration === null) {
      setTokenTimerDisplay("00:00:00")
      return
    }

    const hours = Math.floor(duration / (1000 * 60 * 60))
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((duration % (1000 * 60)) / 1000)

    const formattedHours = String(hours).padStart(2, "0")
    const formattedMinutes = String(minutes).padStart(2, "0")
    const formattedSeconds = String(seconds).padStart(2, "0")

    setTokenTimerDisplay(`${formattedHours}:${formattedMinutes}:${formattedSeconds}`)
  }



  

  // Hilfsfunktion, um zu überprüfen, ob der Benutzer einen Token beanspruchen kann

  // Lade die Wallet-Adresse des Benutzers
  useEffect(() => {
    if (user?.username) {
      const fetchWalletAddress = async () => {
        const supabase = getSupabaseBrowserClient()
        if (!supabase) return

        try {
          const { data, error } = await supabase.from("users").select("world_id").eq("username", user.username).single()

          if (error) {
            console.error("Error fetching wallet address:", error)
            return
          }

          if (data && data.world_id && typeof data.world_id === "string") {
            setWalletAddress(data.world_id)
          } else {
            // Fallback auf einen leeren String, wenn keine gültige Adresse gefunden wurde
            setWalletAddress("")
          }
        } catch (error) {
          console.error("Error in fetchWalletAddress:", error)
        }
      }

      fetchWalletAddress()
    }
  }, [user?.username])

  useEffect(() => {
    if (walletAddress) {
      const getTokenBalance = async () => {
        const balance = await fetchTokenBalance(walletAddress)
        setTokenBalance(balance)
        setTokens(balance)
      }
      getTokenBalance()
    }
  }, [walletAddress])

  // Check for daily deal - only once when user data is available
  useEffect(() => {
    if (user?.username && !hasCheckedDeal.current) {
      hasCheckedDeal.current = true
      checkDailyDeal()
    }
  }, [user?.username])

  // Check for daily deal
  const checkDailyDeal = async () => {
    if (!user?.username) return

    setDealLoading(true)
    try {
      const result = await getDailyDeal(user.username)

      console.log("Daily deal result:", result) // Debug log

      if (result.success && result.deal) {
        setDailyDeal(result.deal)
        setDealInteraction(result.interaction)

        // Show the deal dialog automatically if it hasn't been seen or dismissed
        if (!result.interaction.seen && !result.interaction.dismissed && !result.interaction.purchased) {
          setShowDealDialog(true)
        }
      }
    } catch (error) {
      console.error("Error checking daily deal:", error)
    } finally {
      setDealLoading(false)
    }
  }

  // Check if user can claim tickets and tokens and update countdown timers
  useEffect(() => {
    if (!user?.username || hasCheckedClaims.current) return

    hasCheckedClaims.current = true

    const checkClaimStatus = async () => {
      const supabase = getSupabaseBrowserClient()
      if (!supabase) return

      try {
        // Get user data including ticket_last_claimed, token_last_claimed, legendary_tickets, tickets, tokens, has_premium
        const { data, error } = await supabase
          .from("users")
          .select("ticket_last_claimed, token_last_claimed, legendary_tickets, tickets, tokens, has_premium")
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
          const twelveHoursInMs = 24 * 60 * 60 * 1000
          const timeSinceClaim = now.getTime() - lastClaimedDate.getTime()

          if (timeSinceClaim < twelveHoursInMs) {
            setAlreadyClaimed(true)
            const newTimeUntilNextClaim = twelveHoursInMs - timeSinceClaim
            setTimeUntilNextClaim(newTimeUntilNextClaim)
            updateTicketTimerDisplay(newTimeUntilNextClaim)
          } else {
            setAlreadyClaimed(false)
            setTimeUntilNextClaim(null)
            updateTicketTimerDisplay(null)
          }
        }

        // Check if user has claimed token in the last 24 hours
        if (data?.token_last_claimed && typeof data.token_last_claimed === "string") {
          const lastTokenClaimedDate = new Date(data.token_last_claimed)
          const now = new Date()
          const twentyFourHoursInMs = 24 * 60 * 60 * 1000
          const timeSinceTokenClaim = now.getTime() - lastTokenClaimedDate.getTime()

          if (timeSinceTokenClaim < twentyFourHoursInMs) {
            setTokenAlreadyClaimed(true)
            const newTimeUntilNextTokenClaim = twentyFourHoursInMs - timeSinceTokenClaim
            setTimeUntilNextTokenClaim(newTimeUntilNextTokenClaim)
            updateTokenTimerDisplay(newTimeUntilNextTokenClaim)
          } else {
            setTokenAlreadyClaimed(false)
            setTimeUntilNextTokenClaim(null)
            updateTokenTimerDisplay(null)
          }
        }

        // Check premium status and legendary ticket claim
        if (data.has_premium) {
          const { data: premiumData, error: premiumError } = await supabase
            .from("premium_passes")
            .select("*")
            .eq("user_id", user.username)
            .eq("active", true)
            .single()

          if (!premiumError && premiumData) {
            if (premiumData.last_legendary_claim) {
              const lastClaim = new Date(premiumData.last_legendary_claim as string)
              setLastLegendaryClaim(lastClaim)

              // Check if 24 hours have passed since last claim
              const now = new Date()
              const timeSinceClaim = now.getTime() - lastClaim.getTime()
              const twentyFourHoursInMs = 24 * 60 * 60 * 1000

              if (timeSinceClaim >= twentyFourHoursInMs) {
                setCanClaimLegendary(true)
              } else {
                setCanClaimLegendary(false)
              }
            } else {
              // No previous claim, can claim immediately
              setCanClaimLegendary(true)
            }
          }
        }
      } catch (error) {
        console.error("Error checking claim status:", error)
      }
    }

    checkClaimStatus()
  }, [user?.username])

  // Set up timer countdown
  useEffect(() => {
  if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)

  const interval = setInterval(() => {
    if (timeUntilNextClaim && timeUntilNextClaim > 0) {
      const newTime = timeUntilNextClaim - 1000
      if (newTime <= 0) {
        setAlreadyClaimed(false)
        setTimeUntilNextClaim(null)
        updateTicketTimerDisplay(null)
      } else {
        setTimeUntilNextClaim(newTime)
        updateTicketTimerDisplay(newTime)
      }
    }

    if (timeUntilNextTokenClaim && timeUntilNextTokenClaim > 0) {
      const newTime = timeUntilNextTokenClaim - 1000
      if (newTime <= 0) {
        setTokenAlreadyClaimed(false)
        setTimeUntilNextTokenClaim(null)
        updateTokenTimerDisplay(null)
      } else {
        setTimeUntilNextTokenClaim(newTime)
        updateTokenTimerDisplay(newTime)
      }
    }
  }, 1000)

  timerIntervalRef.current = interval

  return () => clearInterval(interval)
}, [timeUntilNextClaim, timeUntilNextTokenClaim]) // ✅ Dependencies hinzugefügt


  // Check for unclaimed rewards
  useEffect(() => {
    if (!user?.username || hasCheckedRewards.current) return

    hasCheckedRewards.current = true

    const checkUnclaimedRewards = async () => {
      const supabase = getSupabaseBrowserClient()
      if (!supabase) return

      try {
        // Fetch claimed rewards
        const { data: claimedRewardsData, error: claimedRewardsError } = await supabase
          .from("claimed_rewards")
          .select("*")
          .eq("user_id", user.username)

        if (claimedRewardsError) {
          console.error("Error fetching claimed rewards:", claimedRewardsError)
          return
        }

        // Create rewards array for all levels up to current level
        const userLevel = user.level || 1
        const rewards: LevelReward[] = []

        for (let i = 1; i <= userLevel; i++) {
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
          if (!reward.standardClaimed) unclaimed++
          if (hasPremium && !reward.premiumClaimed) unclaimed++
        })

        setUnclaimedRewards(unclaimed)
      } catch (error) {
        console.error("Error checking unclaimed rewards:", error)
      }
    }

    checkUnclaimedRewards()

    // Check for new rewards much less frequently (every 5 minutes)
    // This is a background task that doesn't need to run constantly
    rewardsIntervalRef.current = setInterval(checkUnclaimedRewards, 5 * 60 * 1000)

    return () => {
      if (rewardsIntervalRef.current) clearInterval(rewardsIntervalRef.current)
    }
  }, [user?.username, user?.level, hasPremium])

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
            const newTimeUntilNextClaim = nextClaimDate.getTime() - now.getTime()
            setTimeUntilNextClaim(newTimeUntilNextClaim)
            updateTicketTimerDisplay(newTimeUntilNextClaim)
          } else {
            const newTimeUntilNextClaim = 24 * 60 * 60 * 1000 // 12 hours in milliseconds
            setTimeUntilNextClaim(newTimeUntilNextClaim)
            updateTicketTimerDisplay(newTimeUntilNextClaim)
          }

          // Hide animation after it completes
          setTimeout(() => {
            setShowClaimAnimation(false)
          }, 1000)
        }, 0)
      } else if (result.alreadyClaimed) {
        setAlreadyClaimed(true)
        if (result.timeUntilNextClaim) {
          setTimeUntilNextClaim(result.timeUntilNextClaim)
          updateTicketTimerDisplay(result.timeUntilNextClaim)
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

  // Handle deal purchase success
  const handleDealPurchaseSuccess = (newTickets: number, newLegendaryTickets: number) => {
    setTickets(newTickets)
    setLegendaryTickets(newLegendaryTickets)

    // Update deal interaction state
    if (dealInteraction) {
      setDealInteraction({
        ...dealInteraction,
        purchased: true,
      })
    }

    toast({
      title: "Purchase Successful!",
      description: "You've claimed today's special deal",
    })
  }

  

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-20 text-black">
        {/* Header with glass effect */}
        <header className="sticky top-0 z-10 backdrop-blur-md bg-white/90 border-b border-gray-100 shadow-sm">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center">
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                Anime World
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
                <Ticket className="h-3.5 w-3.5 text-amber-500" />
                <span className="font-medium text-sm">{tickets}</span>
              </div>
              <div className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
                <Ticket className="h-3.5 w-3.5 text-blue-500" />
                <span className="font-medium text-sm">{legendaryTickets}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="p-3 space-y-4 max-w-lg mx-auto">
          {/* Community Banner */}
          <motion.div
            className="px-2"
            animate={{ y: [0, -3, 0, 3, 0] }}
            transition={{
              duration: 6,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "loop",
              ease: "easeInOut",
            }}
          >
            <div className="relative rounded-xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-2 shadow-xl border border-gray-700/60 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <div className="text-white text-sm font-semibold tracking-wide flex items-center gap-2">
                  <span>Join the Community</span>
                  <span className="text-violet-400 text-xs animate-pulse">💬</span>
                </div>

                <div className="flex gap-3">
                  <a
                    href="https://x.com/ani_labs_world"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative group w-9 h-9 rounded-full bg-black hover:bg-gray-800 flex items-center justify-center shadow-[0_0_8px_rgba(255,255,255,0.2)] transition"
                  >
                    <span className="text-white font-bold text-[13px] group-hover:scale-110 transition-transform">
                      𝕏
                    </span>
                    <span className="absolute inset-0 rounded-full animate-ping bg-white opacity-5 group-hover:opacity-10" />
                  </a>

                  <a
                    href="https://t.me/+Dx-fEykc-BY5ZmQy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative group w-9 h-9 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center shadow-[0_0_10px_rgba(59,130,246,0.5)] transition"
                  >
                    <Send className="h-4 w-4 text-white group-hover:scale-110 transition-transform" />
                    <span className="absolute inset-0 rounded-full animate-ping bg-white opacity-5 group-hover:opacity-10" />
                  </a>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Compact User Info Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-white rounded-xl p-2.5 shadow-md border border-gray-100"
          >
            {/* Top row with username, level and tokens */}
            <div className="flex items-center justify-between mb-2">
  <div className="flex items-center gap-2">
    <h2 className="font-semibold text-sm">@{user?.username}</h2>
    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs">{tokens} $ANIME</span>
  </div>
  <span className="bg-violet-100 text-violet-700 text-xs px-2 py-0.5 rounded-full">Lvl {user?.level}</span>
</div>


            {/* Progress bar */}
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] text-gray-500">
                {user?.experience || 0} / {user?.nextLevelExp || 100} XP
              </span>
            </div>
            <Progress
              value={user?.experience ? (user.experience / user.nextLevelExp) * 100 : 0}
              className="h-1.5 bg-gray-100 mb-2"
              indicatorClassName="bg-gradient-to-r from-violet-500 to-fuchsia-500"
            />

            {/* Bottom row with clan and game pass */}
            <div className="grid grid-cols-1 gap-2">
              {/* Clan Button - Commented out
              <div
                onClick={() => (userClanInfo ? router.push(`/clan/${userClanInfo.id}`) : router.push("/clan"))}
                className="block cursor-pointer"
              >
                <div className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 transition-colors rounded-lg p-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center ${
                      userClanInfo
                        ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white"
                        : "bg-gray-200 text-gray-400"
                    }`}
                  >
                    {userClanInfo ? <Shield className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
                  </div>
                  <div>
                    <p className="text-xs font-medium">{userClanInfo ? userClanInfo.name : "Join a Clan"}</p>
                    {userClanInfo && (
                      <p className="text-[10px] text-gray-500">
                        <span className="bg-violet-100 text-violet-600 px-1 rounded text-[9px] mr-1">
                          Lvl {userClanInfo.level}
                        </span>
                        {userClanInfo.member_count} members
                      </p>
                    )}
                  </div>
                </div>
              </div>
              */}

              {/* Game Pass */}
              <Link href="/pass" className="block">
                <div
                  className={`flex items-center gap-2 rounded-lg p-2 ${
                    canClaimLegendary || unclaimedRewards > 0
                      ? "bg-amber-50 hover:bg-amber-100"
                      : "bg-gray-50 hover:bg-gray-100"
                  } transition-colors`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center relative ${
                      canClaimLegendary || unclaimedRewards > 0
                        ? "bg-gradient-to-r from-amber-400 to-amber-600 text-white"
                        : "bg-gray-200 text-gray-400"
                    }`}
                  >
                    <Crown className="h-3.5 w-3.5" />
                    {(canClaimLegendary || unclaimedRewards > 0) && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-[8px] font-bold text-white">
                          {unclaimedRewards > 9 ? "9+" : unclaimedRewards || "!"}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium">Game Pass</p>
                    <p className="text-[10px] text-gray-500">
                      {canClaimLegendary || unclaimedRewards > 0 ? "Claim rewards!" : "Level up rewards"}
                    </p>
                  </div>
                </div>
              </Link>
            </div>
          </motion.div>
        <motion.div
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  <div className="relative w-full rounded-2xl bg-white/70 backdrop-blur-xl border border-gray-200 p-4 shadow-lg hover:shadow-xl transition group flex justify-between items-center">
  {/* Left Section */}
    <div className="flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-orange-100 shadow-inner">
        <Ticket className="w-5 h-5 text-orange-500" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-gray-900">500 Regular Tickets</h3>
        <p className="text-xs text-gray-500 group-hover:text-gray-700 transition">
          <span className="font-semibold text-gray-800">Only $17</span>
          {price && (
            <span className="ml-1 text-xs text-gray-400">
              (~{(17 / price).toFixed(3)} WLD)
            </span>
          )}
        </p>
      </div>
    </div>

    {/* Right Section */}
    <Button
  size="sm"
  className="rounded-full px-4 py-1.5 text-xs flex items-center gap-1 transition bg-orange-500 text-white hover:bg-orange-600"
  onClick={() => {
    sendPayment(17, 500, "regular")
  }}
>
  Buy <ChevronRight className="w-3.5 h-3.5" />
</Button>

    {/* 🔖 Contest Special Badge */}
  <div className="absolute -top-2 -left-2 bg-emerald-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full shadow z-10">
    Contest Special Offer
  </div>
  </div>
</motion.div>




                {/* Weekly Contest Banner */}
<motion.div
  initial={{ opacity: 0, y: 20, scale: 0.95 }}
  animate={{ opacity: 1, y: 0, scale: 1 }}
  transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
  whileHover={{ scale: 1.02 }}
  className="relative"
>
  {/* Shine Effekt */}
  <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
    <div className="shine animate-shine"></div>
  </div>

  <Link href="/weekly-contest">
    <div className="relative w-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400 text-white rounded-xl p-4 shadow-xl hover:brightness-110 transition flex items-center justify-between border-2 border-emerald-400">
      <div className="flex items-center gap-3">
        <Trophy className="w-6 h-6 text-white animate-bounce-slow" />
        <div>
          <h3 className="text-base font-bold">Weekly Contest - WIN 100 WLD</h3>
          <p className="text-xs text-white/90">
            Compete for legendary pulls and win WLD!
          </p>
        </div>
      </div>

      {/* Animierter Kreis um Chevron */}
      <motion.div
        className="bg-white/20 rounded-full p-2 backdrop-blur-sm"
        animate={{ x: [0, 5, 0] }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      >
        <ChevronRight className="w-4 h-4 text-white" />
      </motion.div>
    </div>
  </Link>
</motion.div>



          {/* Deal of the Day Card - Enhanced */}
          {dailyDeal && dealInteraction && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="relative z-0 rounded-2xl shadow-lg overflow-hidden border border-violet-200"
            >
              <button onClick={() => setShowDealDialog(true)} className="w-full block relative">
                {/* Background with animated gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-violet-600 to-fuchsia-600 opacity-90">
                  <motion.div
                    className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.1),transparent_70%)]"
                    animate={{
                      backgroundPosition: ["0% 0%", "100% 100%"],
                    }}
                    transition={{
                      duration: 10,
                      repeat: Number.POSITIVE_INFINITY,
                      repeatType: "reverse",
                    }}
                  />
                </div>

                {/* Floating particles */}
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={`particle-${i}`}
                    className="absolute rounded-full bg-white/20"
                    style={{
                      width: Math.random() * 6 + 3,
                      height: Math.random() * 6 + 3,
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                    }}
                    animate={{
                      y: [0, -15, 0],
                      opacity: [0.4, 0.8, 0.4],
                    }}
                    transition={{
                      duration: 2 + Math.random() * 3,
                      repeat: Number.POSITIVE_INFINITY,
                      delay: Math.random() * 2,
                    }}
                  />
                ))}

                <div className="relative p-4 flex items-center justify-between z-10">
                  <div className="flex items-center gap-3">
                    {/* Card preview */}
                    <motion.div
                      className="relative"
                      animate={{
                        y: [0, -4, 0],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Number.POSITIVE_INFINITY,
                        repeatType: "reverse",
                      }}
                    >
                      <div className="w-12 h-16 rounded-lg border-2 border-white/30 overflow-hidden shadow-lg">
                        {dailyDeal.card_image_url && (
                          <Image
                            src={dailyDeal.card_image_url || "/placeholder.svg"}
                            alt={dailyDeal.card_name || "Card"}
                            fill
                            className="object-cover"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>

                        {/* Level indicator */}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 py-0.5 flex items-center justify-center">
                          <span className="text-xs font-bold text-white">★{dailyDeal.card_level}</span>
                        </div>
                      </div>
                    </motion.div>

                    <motion.div
                      animate={{
                        y: [0, -3, 0],
                      }}
                      transition={{
                        duration: 2.5,
                        repeat: Number.POSITIVE_INFINITY,
                        repeatType: "reverse",
                        delay: 0.5,
                      }}
                    >
                      <h3 className="font-bold text-base text-white">Deal of the Day</h3>
                      <div className="flex items-center gap-1 mt-1">
                        <p className="text-xs text-white/80">
                          {dailyDeal.card_name} • {dailyDeal.card_rarity}
                        </p>
                      </div>
                    </motion.div>
                  </div>

                  <motion.div
                    className="bg-white/20 rounded-full p-2 backdrop-blur-sm"
                    animate={{
                      x: [0, 5, 0],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Number.POSITIVE_INFINITY,
                      repeatType: "reverse",
                    }}
                  >
                    <ChevronRight className="h-5 w-5 text-white" />
                  </motion.div>
                </div>

                {/* Bottom info bar */}
                <div className="relative bg-black/30 backdrop-blur-sm px-4 py-2 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {dailyDeal.regular_tickets > 0 && (
                      <div className="flex items-center">
                        <Ticket className="h-3.5 w-3.5 text-amber-300 mr-1" />
                        <span className="text-xs font-medium text-white">+{dailyDeal.regular_tickets}</span>
                      </div>
                    )}

                    {dailyDeal.legendary_tickets > 0 && (
                      <div className="flex items-center ml-2">
                        <Ticket className="h-3.5 w-3.5 text-blue-300 mr-1" />
                        <span className="text-xs font-medium text-white">+{dailyDeal.legendary_tickets}</span>
                      </div>
                    )}
                    <span className="text-xs font-medium text-white">Card Level: {dailyDeal.card_level}</span>
                  </div>

                  <div className="text-xs font-bold text-white">
                    {price ? `${(dailyDeal.price / price).toFixed(2)} WLD` : `$${dailyDeal.price.toFixed(2)} USD`}
                  </div>
                </div>

                {/* Shine effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg]"
                  initial={{ left: "-100%" }}
                  animate={{ left: "100%" }}
                  transition={{
                    repeat: Number.POSITIVE_INFINITY,
                    repeatDelay: 5,
                    duration: 1.5,
                  }}
                />
              </button>
            </motion.div>
          )}

          {/* Referrals */}
<motion.div
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  <button
    onClick={() => setShowReferralDialog(true)}
    className="w-full relative rounded-xl bg-gradient-to-r from-yellow-200 to-amber-300 text-amber-900 font-semibold py-3 px-4 shadow-md hover:brightness-105 transition flex items-center justify-center gap-2 border border-amber-300"
  >
    <Gift className="w-4 h-4 text-amber-700" />
    <span>Referrals</span>

    {/* Optional: Badge für neue Belohnung */}
    {referredUsers.some(u => u.level >= 5 && !u.reward_claimed) && (
      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow">
        NEW
      </span>
    )}
  </button>
</motion.div>





          {/* Quick actions */}
         <section className="space-y-3">
  <h2 className="text-sm font-semibold text-gray-800">Quick Access</h2>

  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
    {[
      { href: "/collection", label: "Collection", icon: CreditCard, color: "text-violet-600", bg: "bg-violet-100" },
      { href: "/catalog", label: "Gallery", icon: BookOpen, color: "text-indigo-600", bg: "bg-indigo-100" },
      { href: "/shop", label: "Ticket Shop", icon: ShoppingCart, color: "text-pink-600", bg: "bg-pink-100" },
      { href: "/trade", label: "Trade", icon: Repeat, color: "text-emerald-600", bg: "bg-emerald-100" },
      { href: "/friends", label: "Friends", icon: Users, color: "text-rose-600", bg: "bg-rose-100" },
      { href: "/missions", label: "Missions", icon: Trophy, color: "text-amber-600", bg: "bg-amber-100" },
    ].map(({ href, label, icon: Icon, color, bg }, i) => (
      <Link key={i} href={href} className="group block">
        <div className="rounded-lg bg-white border border-gray-100 p-3 flex flex-col items-center hover:bg-gray-50 transition">
          <div className={`w-9 h-9 rounded-full ${bg} flex items-center justify-center`}>
            <Icon className={`h-4.5 w-4.5 ${color}`} />
          </div>
          <span className="mt-2 text-[11px] text-gray-700 font-medium text-center leading-tight">{label}</span>
        </div>
      </Link>
    ))}
  </div>

  {/* Full-width Leaderboard Card */}
  <Link href="/leaderboard" className="block">
    <div className="w-full rounded-lg bg-white border border-gray-100 p-3 flex items-center gap-3 hover:bg-gray-50 transition">
      <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center">
        <Crown className="h-5 w-5 text-purple-600" />
      </div>
      <span className="text-sm font-medium text-gray-800">View Leaderboard</span>
    </div>
  </Link>
</section>

    


          {/* Daily bonus */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden"
          >
            <div className="relative">
              <div className="relative p-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
                      <Gift className="h-4 w-4 text-violet-500" />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">Ticket Claim</h3>
                      <p className="text-xs text-gray-500">Get 3 tickets every 24 hours</p>
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
                    ) : alreadyClaimed ? (
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        <span className="text-xs">{ticketTimerDisplay}</span>
                      </div>
                    ) : (
                      <span className="text-xs">Claim Now</span>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>


         
        </main>
       {showClaimAnimation && (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
  >
    <div className="relative">
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          initial={{ x: 0, y: 0, scale: 0 }}
          animate={{
            x: [0, (i - 1) * 30],
            y: [0, -60],
            scale: [0, 1.2, 1],
            opacity: [1, 0],
          }}
          transition={{ duration: 1.5, delay: i * 0.2 }}
        >
          <div className="bg-white rounded-lg p-2 shadow-lg flex items-center gap-2 border-2 border-blue-300">
            <Ticket className="h-5 w-5 text-blue-500" />
            <span className="font-bold text-blue-600">+1</span>
          </div>
        </motion.div>
      ))}
    </div>
  </motion.div>
)}



<Dialog open={showReferralDialog} onOpenChange={setShowReferralDialog}>
  <DialogContent>
    <DialogTitle className="text-lg font-bold">🎁 Invite Friends & Earn Rewards</DialogTitle>
    <DialogDescription className="text-sm text-gray-600">
      Share your referral link and earn bonus tickets when they reach level 5!
    </DialogDescription>

    {/* Your referral link */}
    <div className="mt-4">
      <div className="text-sm font-semibold text-gray-800 mb-1">Your Code:</div>
      <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded px-3 py-2">
        <span className="truncate text-sm font-mono text-gray-700">
          {user?.username}
        </span>
        <Button
      size="sm"
      onClick={() => {
        const link = `https://worldcoin.org/mini-app?app_id=app_976ccdfba5aa4d5b3b31d628d74ea936&ref=${user?.username}`
        navigator.clipboard.writeText(link)
        handleCopy()
      }}
    >
      {copied ? "Copied!" : "Copy link"}
    </Button>

      </div>
      
    </div>
    {/* Rewards overview */}
    <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-3">
      <h4 className="text-sm font-semibold text-amber-700 mb-1">What you get:</h4>
      <ul className="text-sm text-amber-800 list-disc list-inside space-y-1">
        <li><strong>+5</strong> Regular Tickets</li>
        <li><strong>+3</strong> Legendary Tickets</li>
        <li>Once your friend reaches <strong>Level 5</strong></li>
      </ul>
    </div>

    {/* Referred users list */}
    <div className="mt-6">
      <h4 className="text-sm font-semibold text-gray-800 mb-2">Your Referrals</h4>
      {referredUsers.length === 0 ? (
        <p className="text-xs text-gray-500">No referrals yet.</p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {referredUsers.map((ref) => (
            <div key={ref.username} className="flex justify-between items-center border-b pb-1">
              <span className="text-sm">
                @{ref.username} <span className="text-gray-500 text-xs">(Lvl {ref.level})</span>
              </span>
              {ref.reward_claimed ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : ref.level >= 5 ? (
                <Button
  size="sm"
  className="text-xs"
  onClick={async () => {
  if (!user?.username) return
  const res = await claimReferralRewardForUser(user.username, ref.username)

  if (res.success) {
    setShowClaimAnimation(true)

    if (typeof res.newTicketCount === "number" || typeof res.newLegendaryTicketCount === "number") {
      await updateUserTickets(res.newTicketCount, res.newLegendaryTicketCount)
      setTickets(res.newTicketCount)
      setLegendaryTickets(res.newLegendaryTicketCount)
    }

    setReferredUsers((prev) =>
      prev.map((r) =>
        r.username === ref.username ? { ...r, reward_claimed: true } : r
      )
    )

    setTimeout(() => setShowClaimAnimation(false), 1500)
  } else {
    toast({ title: "Error", description: res.error, variant: "destructive" })
  }
}}

>
  Claim
</Button>


              ) : (
                <span className="text-xs text-gray-400">Waiting...</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  </DialogContent>
</Dialog>

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

  



        {/* Deal of the Day Dialog */}
        {dailyDeal && dailyDeal.card_name && (
          <DealOfTheDayDialog
            isOpen={showDealDialog}
            onClose={() => setShowDealDialog(false)}
            deal={dailyDeal}
            username={user?.username || ""}
            onPurchaseSuccess={handleDealPurchaseSuccess}
          />
        )}

        <MobileNav />
      </div>
    </ProtectedRoute>
    
  
  )
  
}