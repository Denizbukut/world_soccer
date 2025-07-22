"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useAuth } from "@/contexts/auth-context"
import { claimDailyBonus } from "@/app/actions"
import { getReferredUsers } from "@/app/actions/referrals"
import { getDailyDeal } from "@/app/actions/deals" // Import getSpecialDeal
import ProtectedRoute from "@/components/protected-route"
import MobileNav from "@/components/mobile-nav"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

// Add ChatOverlay component at the bottom of the file
import { MessageCircle, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { formatDistanceToNow } from "date-fns"
import Image from "next/image"
import {
  Ticket,
  Gift,
  CreditCard,
  Clock,
  ChevronRight,
  Crown,
  ShoppingCart,
  Send,
  Trophy,
  Shield,
  Users,
  CheckCircle,
  ArrowRight,
  BookOpen,
  Repeat,
  Sparkles,
  ChevronLeft,
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import DealOfTheDayDialog from "@/components/deal-of-the-day-dialog"
import { MiniKit, Tokens, tokenToDecimals, type PayCommandInput } from "@worldcoin/minikit-js"
import { useWldPrice } from "@/contexts/WldPriceContext"
import { claimReferralRewardForUser } from "@/app/actions/referrals"
import { Progress } from "@/components/ui/progress" // Import Progress component

// Add the Cloudflare URL function
const getCloudflareImageUrl = (imageId?: string) => {
  if (!imageId) return "/placeholder.svg"

  // Remove leading slash and "anime-images/" prefix
  const cleaned = imageId.replace(/^\/?anime-images\//, "")

  return `https://fda1523f9dc7558ddc4fcf148e01a03a.r2.cloudflarestorage.com/world-soccer/${cleaned}`
}

// XP Color definitions
const XP_COLORS = {
  red: { start: "#ef4444", end: "#dc2626" },
  blue: { start: "#3b82f6", end: "#1d4ed8" },
  green: { start: "#10b981", end: "#059669" },
  purple: { start: "#8b5cf6", end: "#7c3aed" },
  orange: { start: "#f97316", end: "#ea580c" },
  pink: { start: "#ec4899", end: "#db2777" }
}

interface LevelReward {
  level: number
  standardClaimed: boolean
  premiumClaimed: boolean
  isSpecialLevel?: boolean
}

interface UserAvatarData {
  avatar_id: number
  avatars?: {
    image_url: string
  }
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

// New interface for Special Deal
interface SpecialDeal {
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
interface ClanInfo {
  id: string
  name: string
  level: number
  member_count: number
}

export default function Home() {
  const { user, updateUserTickets, refreshUserData } = useAuth()
  const [claimLoading, setClaimLoading] = useState(false)
  const [referralLoading, setReferralLoading] = useState(false)
  const [alreadyClaimed, setAlreadyClaimed] = useState(false)
  const [timeUntilNextClaim, setTimeUntilNextClaim] = useState<number | null>(null)
  const [legendaryTickets, setLegendaryTickets] = useState(0)
  const [tickets, setTickets] = useState(0)
  const [showClaimAnimation, setShowClaimAnimation] = useState(false)
  const [hasPremium, setHasPremium] = useState(false)
  const [canClaimLegendary, setCanClaimLegendary] = useState(0) // Changed to number for unclaimed count
  const [unclaimedRewards, setUnclaimedRewards] = useState(0)
  const [levelRewards, setLevelRewards] = useState<LevelReward[]>([])
  const [lastLegendaryClaim, setLastLegendaryClaim] = useState<Date | null>(null)
  const lastFetchedRef = useRef<number>(0)
  const [userClanInfo, setUserClanInfo] = useState<ClanInfo | null>(null)
  const [showAvatarDialog, setShowAvatarDialog] = useState(false)
  const [referredUsers, setReferredUsers] = useState<
    {
      id: number
      username: string
      level: number
      reward_claimed: boolean
    }[]
  >([])
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState("")
  const [currentAvatarId, setCurrentAvatarId] = useState(1)
  const [currentXpColor, setCurrentXpColor] = useState("pink")
  useEffect(() => {
    if (user?.username) {
      loadUserAvatar()
      loadUserXpColor()
    }
  }, [user?.username])

  const [keyboardVisible, setKeyboardVisible] = useState(false)

  useEffect(() => {
    const detectKeyboard = () => {
      const viewportHeight = window.visualViewport?.height || window.innerHeight
      const fullHeight = window.innerHeight
      const keyboardIsVisible = viewportHeight < fullHeight * 0.85
      setKeyboardVisible(keyboardIsVisible)
    }
    window.visualViewport?.addEventListener("resize", detectKeyboard)
    return () => {
      window.visualViewport?.removeEventListener("resize", detectKeyboard)
    }
  }, [])

  const loadUserAvatar = async () => {
    if (!user?.username) return

    const supabase = getSupabaseBrowserClient()
    if (!supabase) return

    // 1. User-Daten holen (inkl. avatar_id)
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("avatar_id")
      .eq("username", user.username)
      .single()

    if (userError || !userData?.avatar_id) return

    // 2. Avatar-Daten holen
    const { data: avatarData, error: avatarError } = await supabase
      .from("avatars")
      .select("image_url")
      .eq("id", userData.avatar_id)
      .single()

    if (!avatarError && avatarData?.image_url) {
      setCurrentAvatarId(Number(userData.avatar_id))
      setCurrentAvatarUrl(String(avatarData.image_url))
    }
  }

  const loadUserXpColor = async () => {
    if (!user?.username) return

    const supabase = getSupabaseBrowserClient()
    if (!supabase) return

    const { data, error } = await supabase
      .from("users")
      .select("xp_color")
      .eq("username", user.username)
      .single()

    if (!error && data?.xp_color) {
      setCurrentXpColor(String(data.xp_color))
    }
  }

  const [clanBonusActive, setClanBonusActive] = useState(false)

  // Timer display state
  const [ticketTimerDisplay, setTicketTimerDisplay] = useState("00:00:00")
  const [tokenTimerDisplay, setTokenTimerDisplay] = useState("00:00:00")

  // Token minting state
  const [tokenAlreadyClaimed, setTokenAlreadyClaimed] = useState(false)
  const [timeUntilNextTokenClaim, setTimeUntilNextTokenClaim] = useState<number | null>(null)

  // Deal of the Day state
  const [dailyDeal, setDailyDeal] = useState<DailyDeal | null>(null)
  const [dailyDealInteraction, setDailyDealInteraction] = useState<DealInteraction | null>(null) // Renamed for clarity
  const [showDailyDealDialog, setShowDailyDealDialog] = useState(false) // Renamed for clarity
  const [dailyDealLoading, setDailyDealLoading] = useState(false) // Renamed for clarity

  // Special Deal state - NEW
  const [specialDeal, setSpecialDeal] = useState<SpecialDeal | null>(null)
  const [specialDealInteraction, setSpecialDealInteraction] = useState<DealInteraction | null>(null) // New state for special deal interaction
  const [showSpecialDealDialog, setShowSpecialDealDialog] = useState(false) // New state for special deal dialog
  const [specialDealLoading, setSpecialDealLoading] = useState(false)
  const hasCheckedSpecialDeal = useRef(false) // New ref for special deal

  const [showReferralDialog, setShowReferralDialog] = useState(false)
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({})
  const [buyingBigPack, setBuyingBigPack] = useState(false)
  const [chatExpanded, setChatExpanded] = useState(false)

  // Refs to track if effects have run
  const hasCheckedDailyDeal = useRef(false) // Renamed for clarity
  const hasCheckedClaims = useRef(false)
  const hasCheckedRewards = useRef(false)
  const hasCheckedTokens = useRef(false)
  const hasCheckedClan = useRef(false)
  const [copied, setCopied] = useState(false)
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)

  // Discount timer state
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(
    null,
  )

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
  const [isChatOpen, setIsChatOpen] = useState(false)
  const { price } = useWldPrice()

  const ticketClaimAmount = user?.clan_id ? (userClanInfo?.level && userClanInfo.level >= 2 ? 4 : 3) : 3

  // Add the router constant inside the component:
  const router = useRouter()
  useEffect(() => {
    if (user?.username === "llegaraa2kwdd" || user?.username === "nadapersonal" || user?.username === "regresosss") {
      router.push("/login")
    }
  }, [user?.username, router])

  const sendPayment = async () => {
    const dollarPrice = 17
    const ticketAmount = 500
    const ticketType = "regular"

    try {
      // WLD-Betrag berechnen (fallback = 1:1)
      const roundedWldAmount = Number.parseFloat((price ? dollarPrice / price : dollarPrice).toFixed(3))

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
        description: " ",
      }
      const { finalPayload } = await MiniKit.commandsAsync.pay(payload)

      if (finalPayload.status === "success") {
        // Payment successful
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
        { internalType: "uint256", name: "amount", type: "uint250" },
      ],
      name: "mintToken",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
  ]
  // Fetch user's clan info
  useEffect(() => {
    if (user?.username && !hasCheckedClan.current) {
      // User data loaded
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
  }, [user?.username, user])

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

  // Lade die Wallet-Adresse des Benutzers (kept for potential future use, even if ANI balance display is removed)
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

  // Check for daily deal - only once when user data is available
  useEffect(() => {
    if (user?.username && !hasCheckedDailyDeal.current) {
      hasCheckedDailyDeal.current = true
      checkDailyDeal()
    }
  }, [user?.username])


  // Check for daily deal
  const checkDailyDeal = async () => {
    if (!user?.username) return

    setDailyDealLoading(true)
    try {
      const result = await getDailyDeal(user.username)

      // Daily deal result loaded

      if (result.success && result.deal) {
        setDailyDeal(result.deal)
        setDailyDealInteraction(result.interaction)

        // Show the deal dialog automatically if it hasn't been seen or dismissed
        if (!result.interaction.seen && !result.interaction.dismissed && !result.interaction.purchased) {
          setShowDailyDealDialog(true)
        }
      }
    } catch (error) {
      console.error("Error checking daily deal:", error)
    } finally {
      setDailyDealLoading(false)
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
                setCanClaimLegendary(1) // Can claim
              } else {
                setCanClaimLegendary(0) // Cannot claim
              }
            } else {
              // No previous claim, can claim immediately
              setCanClaimLegendary(1)
            }
          }
        }
      } catch (error) {
        console.error("Error checking claim status:", error)
      }
    }

    checkClaimStatus()
  }, [user?.username, user])

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

  // Handle daily deal purchase success
  const handleDailyDealPurchaseSuccess = (newTickets: number, newLegendaryTickets: number) => {
    setTickets(newTickets)
    setLegendaryTickets(newLegendaryTickets)

    // Update deal interaction state
    if (dailyDealInteraction) {
      setDailyDealInteraction({
        ...dailyDealInteraction,
        purchased: true,
      })
    }

    toast({
      title: "Purchase Successful!",
      description: "You've claimed today's daily deal",
    })
    refreshUserData?.();
  }

  // Handle special deal purchase success
  const handleSpecialDealPurchaseSuccess = (newTickets: number, newLegendaryTickets: number) => {
    setTickets(newTickets)
    setLegendaryTickets(newLegendaryTickets)

    // Update special deal interaction state
    if (specialDealInteraction) {
      setSpecialDealInteraction({
        ...specialDealInteraction,
        purchased: true,
      })
    }

    toast({
      title: "Purchase Successful!",
      description: "You've claimed today's special deal",
    })
  }

  const [passIndex, setPassIndex] = useState<number>(0)
  // Entferne das automatische Swipen
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     setPassIndex((prev) => (prev === 0 ? 1 : 0))
  //   }, 2000)
  //   return () => clearInterval(interval)
  // }, [])
  // Manuelles Swipen
  const handlePrev = () => setPassIndex((prev) => (prev === 0 ? 1 : 0))
  const handleNext = () => setPassIndex((prev) => (prev === 0 ? 1 : 0))

  useEffect(() => {
    if (!user?.username) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return; // Ensure supabase is not null
    // XP Pass expiry check
    supabase
      .from("xp_passes")
      .select("*")
      .eq("user_id", user.username)
      .eq("active", true)
      .single()
      .then(async ({ data }: { data: any }) => {
        if (
          data &&
          data.expires_at &&
          (typeof data.expires_at === "string" || typeof data.expires_at === "number" || data.expires_at instanceof Date) &&
          new Date() > new Date(data.expires_at)
        ) {
          await supabase.from("xp_passes").update({ active: false }).eq("user_id", user.username).eq("id", data.id);
          refreshUserData?.();
        }
      });
    // Premium Pass expiry check
    supabase
      .from("premium_passes")
      .select("*")
      .eq("user_id", user.username)
      .eq("active", true)
      .single()
      .then(async ({ data }: { data: any }) => {
        if (
          data &&
          data.expires_at &&
          (typeof data.expires_at === "string" || typeof data.expires_at === "number" || data.expires_at instanceof Date) &&
          new Date() > new Date(data.expires_at)
        ) {
          await supabase.from("premium_passes").update({ active: false }).eq("user_id", user.username).eq("id", data.id);
          await supabase.from("users").update({ has_premium: false }).eq("username", user.username);
          refreshUserData?.();
        }
      });
  }, [user?.username]);

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-screen bg-gradient-to-b from-gray-50 to-white text-black">
        {/* Header with glass effect */}
        <header className="sticky top-0 z-30 backdrop-blur-md bg-white/90 border-b border-gray-100 shadow-sm">
          <div className="w-full px-4 py-3 flex items-center justify-between">
            {" "}
            {/* Removed max-w-lg */}
            <div className="flex items-center">
              <h1 className="text-sm font-bold tracking-tight bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                Anime World
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-2">
                <a
                  href="https://x.com/ani_labs_world"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative group w-8 h-8 rounded-full bg-black hover:bg-gray-800 flex items-center justify-center shadow-sm transition"
                >
                  <span className="text-white font-bold text-[11px] group-hover:scale-110 transition-transform">𝕏</span>
                </a>
                <a
                  href="https://t.me/+Dx-fEykc-BY5ZmQy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative group w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center shadow-sm transition"
                >
                  <Send className="h-3.5 w-3.5 text-white group-hover:scale-110 transition-transform" />
                </a>
              </div>
              <div className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
                <Ticket className="h-3.5 w-3.5 text-amber-500" />
                <span className="font-medium text-sm">{user?.tickets ?? 0}</span>
              </div>
              <div className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
                <Ticket className="h-3.5 w-3.5 text-blue-500" />
                <span className="font-medium text-sm">{user?.legendary_tickets ?? 0}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="p-3 w-full mx-auto pb-20">
         
          <div className="grid grid-cols-6 gap-3">
            {/* Profile */}
            <div className="col-span-3">
              {/* ...Profile Card... */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="bg-white rounded-xl shadow-lg p-2 flex flex-col items-center justify-center min-h-[80px] h-full"
              >
                <button
                  onClick={() => setShowAvatarDialog(true)}
                  className="relative w-20 h-20 rounded-full overflow-visible hover:ring-2 hover:ring-blue-300 transition-all flex-shrink-0 mb-1 -mt-3 flex items-center justify-center"
                >
                  {/* XP Progress Ring - positioned as outer border */}
                  <div className="absolute inset-0 rounded-full pointer-events-none">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
                      {/* Background circle */}
                      <circle
                        cx="40"
                        cy="40"
                        r="36"
                        stroke="rgb(156 163 175)"
                        strokeWidth="3"
                        fill="none"
                        opacity="0.8"
                      />
                      {/* Progress circle */}
                      <circle
                        cx="40"
                        cy="40"
                        r="36"
                        stroke="url(#gradient)"
                        strokeWidth="3"
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 36}`}
                        strokeDashoffset={`${2 * Math.PI * 36 * (1 - ((user?.experience || 0) / (user?.nextLevelExp || 100)))}`}
                        className="transition-all duration-300"
                        style={{ filter: 'drop-shadow(0 0 2px rgba(239, 68, 68, 0.5))' }}
                      />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor={XP_COLORS[currentXpColor as keyof typeof XP_COLORS]?.start || XP_COLORS.pink.start} />
                          <stop offset="100%" stopColor={XP_COLORS[currentXpColor as keyof typeof XP_COLORS]?.end || XP_COLORS.pink.end} />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                  {/* Avatar Image - full size in center */}
                  <div className="w-16 h-16 rounded-full overflow-hidden relative z-10">
                    <img
                      src={currentAvatarUrl || 'https://ani-labs.xyz/pika.jpg'}
                      alt="Your avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </button>
                {/* Username und Lvl nebeneinander */}
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm font-semibold text-violet-700">{user?.username ? (user.username.length > 7 ? user.username.slice(0, 7) + '…' : user.username) : ''}</p>
                  <span className="bg-violet-100 text-violet-700 text-xs px-2 py-0.5 rounded-full whitespace-nowrap font-bold">Lvl {user?.level || 1}</span>
                </div>
                {/* Clan anzeigen, falls vorhanden, sonst Join-Button */}
                {userClanInfo?.name ? (
                  <button
                    className="flex items-center gap-2 mt-4 text-xs font-semibold text-violet-700 bg-violet-100 hover:bg-violet-200 rounded-full px-3 py-1 shadow-sm transition border border-violet-200"
                    onClick={() => router.push(`/clan/${userClanInfo.id}`)}
                    type="button"
                  >
                  
                    <span className="truncate max-w-[90px]">{userClanInfo.name}</span>
                  </button>
                ) : (
                  <button className="mt-4 px-3 py-1 text-xs rounded-full bg-violet-100 text-violet-700 font-semibold hover:bg-violet-200 transition border border-violet-200" onClick={() => router.push('/clan')} type="button">Join a Clan</button>
                )}
              </motion.div>
            </div>
            {/* Game Pass / XP Pass Carousel */}
            <div className="col-span-3">
              <div className="relative flex flex-col items-center">
                <div className="w-full relative">
                  {/* Left Arrow */}
                  <button
                    onClick={handlePrev}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-white/70 hover:bg-white shadow transition opacity-100"
                    style={{ pointerEvents: 'auto' }}
                    aria-label="Previous Pass"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-400" />
                  </button>
                  {/* Right Arrow */}
                  <button
                    onClick={handleNext}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-white/70 hover:bg-white shadow transition opacity-100"
                    style={{ pointerEvents: 'auto' }}
                    aria-label="Next Pass"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </button>
                  <AnimatePresence initial={false} mode="wait">
                    {passIndex === 0 ? (
                      <motion.div
                        key="gamepass"
                        initial={{ x: 100, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -100, opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="relative flex flex-col items-center justify-center rounded-xl p-3 min-h-[90px] shadow-lg font-bold text-gray-800 text-center bg-yellow-50 border border-yellow-100 cursor-pointer"
                        onClick={() => router.push('/pass')}
                        tabIndex={0}
                        role="button"
                        aria-label="Open Game Pass"
                      >
                        <div className="w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-b from-amber-400 to-amber-600 text-white text-2xl mb-2 relative">
                          <Crown className="h-8 w-8" />
                        </div>
                        <div className="text-lg font-bold">Game Pass</div>
                        <div className="text-xs text-gray-700 font-medium">Claim rewards!</div>
                        {/* Indikatorpunkte in der Karte */}
                        <div className="flex gap-2 mt-3 justify-center w-full">
                          <span className={`w-2 h-2 rounded-full ${passIndex === 0 ? 'bg-yellow-500' : 'bg-gray-300'}`}></span>
                          {/* @ts-expect-error: passIndex is always a number (0 or 1) */}
                          <span className={`w-2 h-2 rounded-full ${passIndex === 1 ? 'bg-violet-500' : 'bg-gray-300'}`}></span>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="xppass"
                        initial={{ x: 100, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -100, opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="relative flex flex-col items-center justify-center rounded-xl p-3 min-h-[90px] shadow-lg font-bold text-violet-700 text-center bg-violet-50 border border-violet-100 cursor-pointer"
                        onClick={() => router.push('/xp-pass')}
                        tabIndex={0}
                        role="button"
                        aria-label="Open XP Pass"
                      >
                        <div className="w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-b from-violet-400 to-violet-600 text-white text-2xl mb-2 relative">
                          <Sparkles className="h-8 w-8" />
                        </div>
                        <div className="text-lg font-bold">XP Pass</div>
                        <div className="text-xs text-violet-700 font-medium">Boost your XP gain!</div>
                        {/* Indikatorpunkte in der Karte */}
                        <div className="flex gap-2 mt-3 justify-center w-full">
                          <span className={`w-2 h-2 rounded-full ${passIndex === 0 ? 'bg-yellow-500' : 'bg-gray-300'}`}></span>
                           <span className={`w-2 h-2 rounded-full ${passIndex === 1 ? 'bg-violet-500' : 'bg-gray-300'}`}></span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
            {/* Weekly Contest (volle Breite) */}
            <div className="col-span-6">
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: 'easeOut', delay: 0.3 }}
                whileHover={{ scale: 1.03, boxShadow: '0 0 32px 0 rgba(16, 185, 129, 0.25)' }}
                className="relative w-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400 text-white rounded-xl p-4 shadow-lg flex items-center justify-between border-2 border-emerald-400 min-h-[70px] mt-3 overflow-hidden cursor-pointer"
                onClick={() => router.push('/weekly-contest')}
              >
                {/* Shine Effekt */}
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <motion.div
                    className="absolute left-[-40%] top-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-20deg]"
                    animate={{ left: ['-40%', '120%'] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </motion.div>
                <div className="flex items-center gap-3 z-10">
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 2, repeat: Infinity, repeatType: 'loop', ease: 'easeInOut' }}
                  >
                    <Trophy className="w-7 h-7 text-white" />
                  </motion.div>
                  <div>
                    <h3 className="text-base font-bold">Weekly Contest</h3>
                    <p className="text-xs text-white/90 font-medium">Win $200 in WLD!</p>
                  </div>
                </div>
                <motion.div
                  className="bg-white/20 rounded-full p-2 backdrop-blur-sm z-10"
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, repeatType: 'reverse' }}
                >
                  <ChevronRight className="w-5 h-5 text-white" />
                </motion.div>
                {/* Animierter Schatten */}
                <motion.div
                  className="absolute inset-0 rounded-xl pointer-events-none"
                  animate={{ boxShadow: [
                    '0 4px 24px 0 rgba(16, 185, 129, 0.10)',
                    '0 8px 32px 0 rgba(16, 185, 129, 0.18)',
                    '0 4px 24px 0 rgba(16, 185, 129, 0.10)'
                  ] }}
                  transition={{ duration: 2.5, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
                />
              </motion.div>
            </div>
            {/* $ANI Card (replaces Chat) */}
            <div className="col-span-2">
              <div
                className="bg-white rounded-xl p-4 shadow-lg flex flex-col items-center justify-center min-h-[90px] h-full text-center cursor-pointer hover:bg-gray-50 transition"
                onClick={() => router.push('/ani')}
                role="button"
                tabIndex={0}
                aria-label="Go to $ANI page"
              >
                <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center mb-2">
                  <img src={getCloudflareImageUrl("/anime-images/ani-labs-logo-white.png")} alt="$ANI Logo" className="w-10 h-10" />
                </div>
                <div className="text-base font-bold text-gray-900">$ANI</div>
              </div>
            </div>
            <div className="col-span-2">
              <Link href="/shop" className="block w-full h-full">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  className="bg-white rounded-xl p-4 shadow-lg flex flex-col items-center justify-center min-h-[90px] h-full text-center hover:bg-gray-50 transition"
                >
                  <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center mb-2">
                    <ShoppingCart className="h-5 w-5 text-pink-600" />
                  </div>
                  <div className="text-base font-bold text-gray-900">Shop</div>
                </motion.div>
              </Link>
            </div>
            <div className="col-span-2">
              <button
                onClick={() => {
                  // Referral Dialog Open
                  setShowReferralDialog(true);
                }}
                className="w-full h-full rounded-xl bg-white p-4 shadow-lg flex flex-col items-center justify-center min-h-[90px] text-center font-bold hover:bg-gray-50 transition border border-gray-100 relative"
                type="button"
              >
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mb-2">
                  <Gift className="h-5 w-5 text-amber-700" />
                </div>
                <div className="text-base font-bold text-gray-900">Referrals</div>
                {referredUsers.some((u) => u.level >= 5 && !u.reward_claimed) && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow">
                    NEW
                  </span>
                )}
              </button>
            </div>
            {/* Daily Deal & Special Deal nebeneinander */}
            <div className={specialDeal && specialDealInteraction ? "col-span-3" : "col-span-6"}>
              {dailyDeal && dailyDealInteraction && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                  className="rounded-xl shadow-lg overflow-hidden border border-violet-200 bg-gradient-to-br from-violet-500 to-fuchsia-500 flex flex-col items-center justify-center p-0 min-h-[160px] h-full text-center"
                >
                  <button onClick={() => setShowDailyDealDialog(true)} className="w-full h-full flex flex-col items-center justify-center p-4">
                    {/* Card Image mit Overlay */}
                    <motion.div
                      className="w-20 h-28 rounded-lg border-2 border-violet-200 overflow-hidden shadow mb-2 bg-gray-100 flex items-center justify-center relative"
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 2.5, repeat: Infinity, repeatType: 'loop', ease: 'easeInOut' }}
                    >
                      {dailyDeal.card_image_url ? (
                        dailyDeal.card_image_url.toLowerCase().endsWith('.mp4') ? (
                          <div className="w-full h-full relative">
                            <video
                              src={getCloudflareImageUrl(dailyDeal.card_image_url)}
                              className="w-full h-full object-cover"
                              autoPlay
                              muted
                              loop
                              playsInline
                              onError={(e) => console.error('Daily Deal video failed to load:', e)}
                              onLoadStart={() => {}}
                              onLoadedData={() => {}}
                            />
                          </div>
                        ) : (
                          <img
                            src={getCloudflareImageUrl(dailyDeal.card_image_url)}
                            alt={dailyDeal.card_name || 'Card'}
                            className="w-full h-full object-cover"
                          />
                        )
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
                      )}
                      {/* Level & Sterne Overlay */}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 py-1 flex items-center justify-center gap-1">
                        <span className="text-xs font-bold text-white">★{dailyDeal.card_level}</span>
                      </div>
                    </motion.div>
                    <div className="font-bold text-base mb-1 text-white">Deal of the Day</div>
                    <div className="text-sm mb-1 text-white/90">{dailyDeal.card_name} • {dailyDeal.card_rarity}</div>
                    <div className="flex gap-2 mb-2 justify-center">
                      {dailyDeal.regular_tickets > 0 && (
                        <span className="bg-amber-100 text-amber-700 rounded px-2 py-1 text-xs font-bold flex items-center gap-1">
                          <Ticket className="h-3 w-3 text-amber-500" />+{dailyDeal.regular_tickets}
                        </span>
                      )}
                      {dailyDeal.legendary_tickets > 0 && (
                        <span className="bg-blue-100 text-blue-700 rounded px-2 py-1 text-xs font-bold flex items-center gap-1">
                          <Ticket className="h-3 w-3 text-blue-500" />+{dailyDeal.legendary_tickets}
                        </span>
                      )}
                    </div>
                   <div className="font-bold text-base mb-1 text-white">{price ? `${(dailyDeal.price / price).toFixed(2)} WLD` : `$${dailyDeal.price.toFixed(2)} USD`}</div>
                  </button>
                </motion.div>
              )}
            </div>
            {specialDeal && specialDealInteraction && (
              <div className="col-span-3">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  className={`rounded-xl shadow-lg overflow-hidden border ${
                    specialDeal.card_rarity === 'godlike' 
                      ? 'border-red-300 bg-gradient-to-br from-red-400 to-red-600' 
                      : 'border-cyan-300 bg-gradient-to-br from-cyan-400 to-cyan-600'
                  } flex flex-col items-center justify-center p-0 min-h-[160px] h-full text-center`}
                >
                  <button onClick={() => setShowSpecialDealDialog(true)} className="w-full h-full flex flex-col items-center justify-center p-4">
                    {/* Card Image mit Overlay */}
                    <motion.div
                      className={`w-20 h-28 rounded-lg border-2 overflow-hidden shadow mb-2 bg-gray-100 flex items-center justify-center relative ${
                        specialDeal.card_rarity === 'godlike' ? 'border-red-200' : 'border-emerald-200'
                      }`}
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 2.5, repeat: Infinity, repeatType: 'loop', ease: 'easeInOut' }}
                    >
                      {specialDeal.card_image_url ? (
                        specialDeal.card_image_url.toLowerCase().endsWith('.mp4') ? (
                          <div className="w-full h-full relative">
                            <video
                              src={getCloudflareImageUrl(specialDeal.card_image_url)}
                              className="w-full h-full object-cover"
                              autoPlay
                              muted
                              loop
                              playsInline
                              onError={(e) => console.error('Special Deal video failed to load:', e)}
                              onLoadStart={() => {}}
                              onLoadedData={() => {}}
                            />
                          </div>
                        ) : (
                          <img
                            src={getCloudflareImageUrl(specialDeal.card_image_url)}
                            alt={specialDeal.card_name || 'Card'}
                            className="w-full h-full object-cover"
                          />
                        )
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
                      )}
                      {/* Level & Sterne Overlay */}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 py-1 flex items-center justify-center gap-1">
                        <span className="text-xs font-bold text-white">★{specialDeal.card_level}</span>
                      </div>
                    </motion.div>
                    <div className="font-bold text-base mb-1 text-white">Special Deal!</div>
                    <div className="text-sm mb-1 text-white/90">{specialDeal.card_name} • {specialDeal.card_rarity}</div>
                    <div className="flex gap-2 mb-2 justify-center">
                      {specialDeal.regular_tickets > 0 && (
                        <span className="bg-amber-100 text-amber-700 rounded px-2 py-1 text-xs font-bold flex items-center gap-1">
                          <Ticket className="h-3 w-3 text-amber-500" />+{specialDeal.regular_tickets}
                        </span>
                      )}
                      {specialDeal.legendary_tickets > 0 && (
                        <span className="bg-blue-100 text-blue-700 rounded px-2 py-1 text-xs font-bold flex items-center gap-1">
                          <Ticket className="h-3 w-3 text-blue-500" />+{specialDeal.legendary_tickets}
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-base mb-1 text-white">{price ? `${(specialDeal.price / price).toFixed(2)} WLD` : `$${specialDeal.price.toFixed(2)} USD`}</div>
                  </button>
                </motion.div>
              </div>
            )}
          </div>
          {/* Daily bonus (keep below the grid) */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden mt-6"
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
                      <p className="text-xs text-gray-500">
                        Get {ticketClaimAmount} tickets every 24 hours
                        {ticketClaimAmount === 4 && (
                          <span className="text-emerald-600 font-medium"> (+1 Clan Bonus)</span>
                        )}
                      </p>
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

          {/* Quick Actions: Friends & Missions */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Link href="/friends" className="block w-full h-full">
              <div className="bg-white rounded-xl p-4 shadow-lg flex flex-col items-center justify-center min-h-[90px] h-full text-center hover:bg-gray-50 transition">
                <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center mb-2">
                  <Users className="h-5 w-5 text-rose-600" />
                </div>
                <div className="text-base font-bold text-gray-900">Friends</div>
              </div>
            </Link>
            <Link href="/missions" className="block w-full h-full">
              <div className="bg-white rounded-xl p-4 shadow-lg flex flex-col items-center justify-center min-h-[90px] h-full text-center hover:bg-gray-50 transition">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mb-2">
                  <Trophy className="h-5 w-5 text-amber-600" />
                </div>
                <div className="text-base font-bold text-gray-900">Missions</div>
              </div>
            </Link>
          </div>
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

        {/* Deal of the Day Dialog */}
        {dailyDeal && dailyDeal.card_name && (
          <DealOfTheDayDialog
            isOpen={showDailyDealDialog}
            onClose={() => setShowDailyDealDialog(false)}
            deal={dailyDeal}
            username={user?.username || ""}
            onPurchaseSuccess={handleDailyDealPurchaseSuccess}
          />
        )}


        {/* Referrals Dialog */}
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
                <span className="truncate text-sm font-mono text-gray-700">{user?.username}</span>
                <Button
                  size="sm"
                  onClick={() => {
                    const link = `https://worldcoin.org/mini-app?app_id=app_976ccdfba5aa4d5b3b31d628d74ea936&ref=${user?.username}`
                    navigator.clipboard.writeText(link)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
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
                <li>
                  <strong>+5</strong> Regular Tickets
                </li>
                <li>
                  <strong>+3</strong> Legendary Tickets
                </li>
                <li>
                  Once your friend reaches <strong>Level 5</strong>
                </li>
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
                        @{ref.username.length > 10 ? ref.username.slice(0, 10) + "…" : ref.username} <span className="text-gray-500 text-xs">(Lvl {ref.level})</span>
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
                              if (
                                typeof res.newTicketCount === "number" ||
                                typeof res.newLegendaryTicketCount === "number"
                              ) {
                                await updateUserTickets(res.newTicketCount, res.newLegendaryTicketCount)
                                setTickets(res.newTicketCount)
                                setLegendaryTickets(res.newLegendaryTicketCount)
                              }
                              setReferredUsers((prev) =>
                                prev.map((r) => (r.username === ref.username ? { ...r, reward_claimed: true } : r)),
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
      </div>
      
      <MobileNav />
    </ProtectedRoute>
  )
}


function ChatOverlay({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState<number>(0)
  const [room, setRoom] = useState<"english" | "spanish">("english")
  const { user } = useAuth()
  const username = user?.username
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [lastSentAt, setLastSentAt] = useState<number>(0)
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    loadMessages()
    // Set up real-time subscription
    const channel = supabase
      ?.channel(`chat_${room}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "global_chat_messages",
          filter: `room=eq.${room}`,
        },
        (payload) => {
          loadMessages()
        }
      )
      .subscribe()
    return () => {
      channel?.unsubscribe()
    }
  }, [username, room])

  useEffect(() => {
    if (cooldown > 0) {
      const interval = setInterval(() => {
        setCooldown((prev) => Math.max(prev - 1, 0))
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [cooldown])

  useEffect(() => {
    if (inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 200)
    }
  }, [])

  async function loadMessages() {
    if (!supabase) return
    const { data, error } = await supabase
      .from("global_chat_messages")
      .select(`user_id, message, created_at, room, users!inner(avatar_id, avatars!inner(image_url))`)
      .eq("room", room)
      .order("created_at", { ascending: false })
      .limit(75)
    if (!error && data) {
      const typedData = data.map((msg: any) => ({
        user_id: String(msg.user_id),
        message: String(msg.message),
        created_at: String(msg.created_at),
        avatar_url: msg.users?.avatars?.image_url || "",
      })).reverse()
      setMessages(typedData)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50)
    }
  }

  async function sendMessage() {
    if (!newMessage.trim() || !username || !supabase || loading || cooldown > 0) return
    const now = Date.now()
    if (now - lastSentAt < 10000) {
      const remaining = 10 - Math.floor((now - lastSentAt) / 1000)
      setCooldown(remaining)
      return
    }
    setLoading(true)
    await supabase.from("global_chat_messages").insert({
      user_id: username,
      message: newMessage.trim(),
      room: room,
    })
    setNewMessage("")
    setLastSentAt(now)
    setCooldown(10)
    setLoading(false)
  }

  function truncateUsername(name: string): string {
    return name.length > 10 ? name.slice(0, 10) + "…" : name
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0, 0, 0, 0.4)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: 50 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] h-full flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative flex items-center justify-between text-white bg-gradient-to-r from-emerald-500 to-teal-500 rounded-t-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <MessageCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Global Chat</h3>
            </div>
            <div className="flex gap-2 ml-2 bg-white/20 p-1 rounded-full">
              <button
                className={`px-3 py-1 text-xs font-semibold rounded-full transition ${room === "english" ? "bg-white text-emerald-700 shadow" : "text-white hover:bg-white/10"}`}
                onClick={() => setRoom("english")}
              >
                🇬🇧 English
              </button>
              <button
                className={`px-3 py-1 text-xs font-semibold rounded-full transition ${room === "spanish" ? "bg-white text-emerald-700 shadow" : "text-white hover:bg-white/10"}`}
                onClick={() => setRoom("spanish")}
              >
                🇪🇸 Español
              </button>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </motion.button>
        </div>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-3 p-2 bg-gradient-to-b from-gray-50/50 to-white/50">
          <AnimatePresence initial={false}>
            {messages.map((msg, idx) => {
              const isOwn = msg.user_id === username
              return (
                <motion.div
                  key={`${msg.user_id}-${msg.created_at}-${idx}`}
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className={`flex gap-3 ${isOwn ? "flex-row-reverse" : "flex-row"}`}
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200">
                      <Image
                        src={msg.avatar_url || ""}
                        alt={`${msg.user_id} avatar`}
                        width={32}
                        height={32}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  {/* Message */}
                  <div className="flex-1">
                    <div className={`flex items-center gap-2 mb-1 ${isOwn ? "justify-end" : "justify-start"}`}>
                      <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">
                        {truncateUsername(msg.user_id)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <div
                      className={`p-3 rounded-2xl backdrop-blur-sm border shadow-sm ${isOwn ? "bg-gradient-to-r from-emerald-500/90 to-teal-600/90 text-white border-white/20" : "bg-white/90 text-gray-800 border-gray-200/50"}`}
                    >
                      <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.message}</div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>
      </motion.div>
    
    </motion.div>
    
  )
}
