"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import { updateScoreForCards, updateScoreForLevelUp } from "@/app/actions/update-score"
import ProtectedRoute from "@/components/protected-route"
import MobileNav from "@/components/mobile-nav"
import { Button } from "@/components/ui/button"
import { Ticket, Crown, Star, Sword, X, Zap, Globe } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { motion, AnimatePresence, useAnimation, useMotionValue, useTransform } from "framer-motion"
import Image from "next/image"
import { incrementMission } from "@/app/actions/missions"
import { incrementLegendaryDraw } from "@/app/actions/weekly-contest"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { incrementClanMission } from "@/app/actions/clan-missions"
import { MiniKit, tokenToDecimals, Tokens, type PayCommandInput } from "@worldcoin/minikit-js"

type GodPackUsage = {
  user_id: string
  packs_opened: number | null
}

// Rarität definieren - UPDATED: Added "godlike"
type CardRarity = "common" | "rare" | "epic" | "legendary" | "godlike"

const FALLBACK_CARDS = [
  {
    id: "fallback-1",
    name: "Placeholder",
    character: "Unknown",
    image_url: "/placeholder.png",
    rarity: "common" as CardRarity,
    type: "normal",
  },
  {
    id: "fallback-2",
    name: "Placeholder",
    character: "Unknown",
    image_url: "/placeholder.png",
    rarity: "rare" as CardRarity,
    type: "normal",
  },
  {
    id: "fallback-3",
    name: "Placeholder",
    character: "Unknown",
    image_url: "/placeholder.png",
    rarity: "epic" as CardRarity,
    type: "normal",
  },
]

// Rarity color mapping - UPDATED: Added godlike colors
const RARITY_COLORS = {
  common: {
    border: "card-border-common",
    glow: "shadow-gray-300",
    text: "text-gray-600",
    gradient: "from-gray-300/30 to-gray-100/30",
    bg: "bg-gray-100",
  },
  rare: {
    border: "card-border-rare",
    glow: "shadow-blue-300",
    text: "text-blue-600",
    gradient: "from-blue-300/30 to-blue-100/30",
    bg: "bg-blue-100",
  },
  epic: {
    border: "card-border-epic",
    glow: "shadow-purple-300",
    text: "text-purple-600",
    gradient: "from-purple-300/30 to-purple-100/30",
    bg: "bg-purple-100",
  },
  legendary: {
    border: "card-border-legendary",
    glow: "shadow-yellow-300",
    text: "text-yellow-600",
    gradient: "from-yellow-300/30 to-yellow-100/30",
    bg: "bg-yellow-100",
  },
  godlike: {
    border: "border-4 border-gradient-to-r from-pink-500 via-red-500 to-yellow-500",
    glow: "shadow-pink-500",
    text: "text-pink-600",
    gradient: "from-pink-300/30 to-red-100/30",
    bg: "bg-gradient-to-br from-pink-100 to-red-100",
  },
}

export default function DrawPage() {
  const { user, updateUserTickets, updateUserExp, refreshUserData, updateUserScore } = useAuth()
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawnCards, setDrawnCards] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<"regular" | "legendary" | "god">("regular") // UPDATED: Added "god"
  const [legendaryTickets, setLegendaryTickets] = useState(2)
  const [tickets, setTickets] = useState(0)
  const [hasPremiumPass, setHasPremiumPass] = useState(false)
  const [hasXpPass, setHasXpPass] = useState(false)
  const [userClanRole, setUserClanRole] = useState<string | null>(null)
  const [isUpdatingScore, setIsUpdatingScore] = useState(false)
  const [isMultiDraw, setIsMultiDraw] = useState(false)
  const [isBulkDraw, setIsBulkDraw] = useState(false)
  const [showBulkLoading, setShowBulkLoading] = useState(false)
  const [isGodPack, setIsGodPack] = useState(false) // NEW: God pack state

  // Animation states
  const [showPackSelection, setShowPackSelection] = useState(true)
  const [showPackAnimation, setShowPackAnimation] = useState(false)
  const [showGodPackAnimation, setShowGodPackAnimation] = useState(false) // NEW: God pack animation
  const [packOpened, setPackOpened] = useState(false)
  const [showRarityText, setShowRarityText] = useState(false)
  const [showCards, setShowCards] = useState(false)
  const [showBulkResults, setShowBulkResults] = useState(false)
  const [cardRevealed, setCardRevealed] = useState(false)
  const [showXpAnimation, setShowXpAnimation] = useState(false)
  const [xpGained, setXpGained] = useState(0)
  const [showLevelUpAnimation, setShowLevelUpAnimation] = useState(false)
  const [newLevel, setNewLevel] = useState(1)
  const [scoreGained, setScoreGained] = useState(0)
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null)
  const [selectedEpoch, setSelectedEpoch] = useState<number>(1)
  const [availableEpochs, setAvailableEpochs] = useState<number[]>([1])
  const [price, setPrice] = useState<number | null>(null)

  // Bulk opening states
  const [selectedBulkCard, setSelectedBulkCard] = useState<any | null>(null)

  // Hydration safety
  const [isClient, setIsClient] = useState(false)

  // Card states
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const controls = useAnimation()

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
    if (price !== null) {
      console.log("WLD Preis:", price)
    }
  }, [price])

  // Card tilt effect
  const cardRef = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotateX = useTransform(y, [-100, 100], [15, -15])
  const rotateY = useTransform(x, [-100, 100], [-15, 15])
  const reflectionX = useTransform(x, [-100, 100], ["30%", "70%"])
  const reflectionY = useTransform(y, [-100, 100], ["30%", "70%"])
  const reflectionOpacity = useTransform(x, [-100, 0, 100], [0.7, 0.3, 0.7])

  const preventNavigation = useRef(false)

  // God Pack states - UPDATED: Now global limits
  const [godPackStats, setGodPackStats] = useState({
    totalOpened: 0,
    globalLimit: 50,
    remaining: 50,
  })

  const getSelectedCard = () => {
    if (selectedCardIndex === null) return null
    return drawnCards[selectedCardIndex]
  }
  const wldPriceDisplay = price ? (0.6 / price).toFixed(3) : "0.600"


  // Fetch available epochs
  useEffect(() => {
    const fetchAvailableEpochs = async () => {
      const supabase = getSupabaseBrowserClient()
      if (!supabase) return

      try {
        const { data: epochs, error } = await supabase.from("cards").select("epoch").not("epoch", "is", null)
        if (!error && epochs) {
          const uniqueEpochs = [...new Set(epochs.map((e) => e.epoch as number))].sort((a, b) => b - a)
          setAvailableEpochs(uniqueEpochs as number[])
        }
      } catch (error) {
        console.error("Error fetching epochs:", error)
      }
    }

    fetchAvailableEpochs()
  }, [])

  // Check user's clan role for XP bonuses
  useEffect(() => {
    const fetchUserClanRole = async () => {
      if (!user?.username) return

      const supabase = getSupabaseBrowserClient()
      if (!supabase) return

      try {
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("clan_id")
          .eq("username", user.username)
          .single()

        if (userError || !userData?.clan_id) {
          setUserClanRole(null)
          return
        }

        const { data: memberData, error: memberError } = await supabase
          .from("clan_members")
          .select("role")
          .eq("clan_id", userData.clan_id)
          .eq("user_id", user.username)
          .single()

        if (!memberError && memberData) {
          setUserClanRole(memberData.role as string)
        }
      } catch (error) {
        console.error("Error fetching clan role:", error)
      }
    }

    fetchUserClanRole()
  }, [user?.username])

  useEffect(() => {
    setIsClient(true)
    refreshUserData?.()

    const fetchXpPass = async () => {
      if (!user?.username) return

      const supabase = getSupabaseBrowserClient()
      if (!supabase) return

      const { data, error } = await supabase
        .from("xp_passes")
        .select("active")
        .eq("user_id", user.username)
        .eq("active", true)
        .single()

      if (data?.active) {
        setHasXpPass(true)
      } else {
        setHasXpPass(false)
      }
    }

    fetchXpPass()
  }, [refreshUserData, user?.username])

  // Update tickets and legendary tickets when user changes
  useEffect(() => {
    if (user) {
      if (typeof user.tickets === "number") {
        setTickets(user.tickets)
      }
      if (typeof user.legendary_tickets === "number") {
        setLegendaryTickets(user.legendary_tickets)
      }
      if (typeof user.has_premium === "boolean") {
        setHasPremiumPass(user.has_premium)
      }
    }
  }, [user])

  // Handle card tilt effect
  const handleCardMove = (event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!cardRef.current || !cardRevealed) return

    event.preventDefault()

    const rect = cardRef.current.getBoundingClientRect()
    let clientX, clientY

    if ("touches" in event) {
      clientX = event.touches[0].clientX
      clientY = event.touches[0].clientY
    } else {
      clientX = event.clientX
      clientY = event.clientY
    }

    const xPos = ((clientX - rect.left) / rect.width - 0.5) * 200
    const yPos = ((clientY - rect.top) / rect.height - 0.5) * 200

    x.set(xPos)
    y.set(yPos)
  }

  const handleCardLeave = () => {
    x.set(0, true)
    y.set(0, true)
  }

  const sendPayment = async () => {
  const dollarAmount = 0.6
  const fallbackWldAmount = 0.6
  const wldAmount = price ? dollarAmount / price : fallbackWldAmount
  const wldAmountRounded = Number(wldAmount.toFixed(3))


  const res = await fetch("/api/initiate-payment", {
    method: "POST",
  })
  const { id } = await res.json()

  const payload: PayCommandInput = {
    reference: id,
    to: "0x4bb270ef6dcb052a083bd5cff518e2e019c0f4ee",
    tokens: [
      {
        symbol: Tokens.WLD,
        token_amount: tokenToDecimals(wldAmountRounded, Tokens.WLD).toString(),
      },
    ],
    description: "Premium Pass",
  }

  const { finalPayload } = await MiniKit.commandsAsync.pay(payload)

  if (finalPayload.status == "success") {
    console.log("success sending payment")
    handleSelectPack("god")
  }
}


  // Fetch God Pack global stats - UPDATED: Now fetches global data
  const fetchGodPackData = async () => {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) return

    const today = new Date().toISOString().split("T")[0]

    const { data: allUsageRaw, error: globalError } = await supabase
      .from("god_pack_daily_usage")
      .select("user_id, packs_opened")
      .eq("usage_date", today)

    if (globalError) {
      console.error("Fehler beim Laden der globalen God Pack-Nutzung:", globalError)
      return
    }

    const allUsage = (allUsageRaw as GodPackUsage[]) || []
    const totalOpened = allUsage.reduce((sum, record) => sum + (record.packs_opened ?? 0), 0)
    const globalLimit = 50
    const remaining = Math.max(0, globalLimit - totalOpened)

    setGodPackStats({
      totalOpened,
      globalLimit,
      remaining,
    })
  }

  // Load God Pack data when tab changes or component mounts
  useEffect(() => {
    fetchGodPackData()
  }, [])

  const handleSelectPack = useCallback(
    async (cardType: string, count = 1) => {
      if (isDrawing) {
        return
      }

      if (!user) {
        toast({ title: "Error", description: "You must be logged in.", variant: "destructive" })
        return
      }

      // NEW: God pack doesn't require tickets
      if (cardType !== "god") {
        const requiredTickets = count
        const availableTickets = cardType === "legendary" ? legendaryTickets : tickets

        if (availableTickets < requiredTickets) {
          toast({
            title: "Not enough tickets",
            description: `You need ${requiredTickets} ${cardType === "legendary" ? "legendary " : ""}tickets but only have ${availableTickets}.`,
            variant: "destructive",
          })
          return
        }
      }

      // NEW: Check God pack GLOBAL daily limit before making the API call
      if (cardType === "god") {
        if (godPackStats.remaining <= 0) {
          toast({
            title: "Global Daily Limit Reached",
            description: `Only ${godPackStats.globalLimit} God Packs can be opened per day by all users combined. Try again tomorrow!`,
            variant: "destructive",
          })
          return
        }
      }

      preventNavigation.current = true
      setIsDrawing(true)
      setIsMultiDraw(count > 1 && count <= 5)
      setIsBulkDraw(count > 5)
      setIsGodPack(cardType === "god") // NEW: Set god pack state
      setShowPackSelection(false)

      // NEW: Special animation for God Pack
      if (cardType === "god") {
        setShowGodPackAnimation(true)
      } else if (count > 5) {
        setShowBulkResults(false)
        setShowBulkLoading(true)
      } else {
        setShowPackAnimation(true)
      }

      setCurrentCardIndex(0)
      setCardRevealed(false)

      try {
        const response = await fetch("/api/draw", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: user.username,
            cardType,
            count,
          }),
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()

        // Mission tracking für legendary cards
        const legendaryCards = result.drawnCards?.filter((card: any) => card.rarity === "legendary") || []
        if (legendaryCards.length > 0) {
          await incrementMission(user.username, "draw_legendary_card", legendaryCards.length)
        }

        // NEW: Mission tracking for godlike cards
        const godlikeCards = result.drawnCards?.filter((card: any) => card.rarity === "godlike") || []
        if (godlikeCards.length > 0) {
          await incrementMission(user.username, "draw_godlike_card", godlikeCards.length)
        }

        if (cardType === "legendary") {
          await incrementMission(user.username, "open_legendary_pack", count)
          await incrementMission(user.username, "open_3_legendary_packs", count)
          if (user.clan_id !== undefined) {
            await incrementClanMission(user.clan_id, "legendary_packs", count)
          }
        } else if (cardType === "god") {
          await incrementMission(user.username, "open_god_pack", count)
          if (user.clan_id !== undefined) {
            await incrementClanMission(user.clan_id, "god_packs", count)
          }
        } else {
          await incrementMission(user.username, "open_regular_pack", count)
          if (user.clan_id !== undefined) {
            await incrementClanMission(user.clan_id, "regular_packs", count)
          }
        }

        const legendary_cards = result.drawnCards?.filter((card: any) => card.rarity === "legendary") || []
        if (legendary_cards.length > 0) {
          if (user.clan_id !== undefined) {
            await incrementClanMission(user.clan_id, "legendary_cards", legendary_cards.length)
            await incrementLegendaryDraw(user.username, legendary_cards.length)
          }
        }

        if (result.success && result.drawnCards?.length > 0) {
          setDrawnCards(result.drawnCards)

          // NEW: God pack doesn't update tickets
          if (cardType !== "god") {
            const newTicketCount = result.newTicketCount ?? tickets
            const newLegendaryTicketCount = result.newLegendaryTicketCount ?? legendaryTickets
            setTickets(newTicketCount)
            setLegendaryTickets(newLegendaryTicketCount)
            await updateUserTickets?.(newTicketCount, newLegendaryTicketCount)
          }

          // NEW: God pack gives more XP
          let xpAmount = cardType === "god" ? 200 * count : cardType === "legendary" ? 100 * count : 50 * count

          if (userClanRole === "xp_hunter") {
            xpAmount = Math.floor(xpAmount * 1.05)
          }

          if (userClanRole === "leader") {
            xpAmount = Math.floor(xpAmount * 1.05)
          }

          if (hasXpPass) {
            xpAmount = Math.floor(xpAmount * 1.2)
          }

          setXpGained(xpAmount)

          const { leveledUp, newLevel: updatedLevel } = (await updateUserExp?.(xpAmount)) || {}

          if (leveledUp && updatedLevel) {
            setNewLevel(updatedLevel)
          }

          if (count > 5) {
            setShowBulkLoading(false)
            setShowBulkResults(true)
          }

          // Refresh God pack data after successful opening
          if (result.success && cardType === "god") {
            fetchGodPackData()
          }
        } else {
          console.error("Draw failed:", result.error)
          toast({ title: "Error", description: result.error || "Draw failed", variant: "destructive" })
          setDrawnCards(FALLBACK_CARDS.slice(0, count))
        }
      } catch (err) {
        console.error("Draw error:", err)
        toast({ title: "Error", description: "Something went wrong.", variant: "destructive" })
        setDrawnCards(FALLBACK_CARDS.slice(0, count))
      } finally {
        setTimeout(() => {
          setIsDrawing(false)
        }, 100)
      }
    },
    [
      isDrawing,
      user,
      legendaryTickets,
      tickets,
      updateUserTickets,
      updateUserExp,
      userClanRole,
      hasXpPass,
      selectedEpoch,
      godPackStats,
    ],
  )

  const handleOpenPack = () => {
    setPackOpened(true)
    if (isMultiDraw) {
      setTimeout(() => {
        setShowRarityText(true)
        setTimeout(() => {
          setShowRarityText(false)
          setShowCards(true)
          setCardRevealed(true)
          setShowPackAnimation(false)
        }, 1500)
      }, 1500)
    } else {
      setTimeout(() => {
        setShowRarityText(true)
        setTimeout(() => {
          setShowRarityText(false)
          setShowCards(true)
          setCardRevealed(false)
          setTimeout(() => {
            setShowPackAnimation(false)
          }, 50)
          setTimeout(() => {
            setCardRevealed(true)
          }, 300)
        }, 1200)
      }, 1500)
    }
  }

  // NEW: God pack opening handler
  const handleOpenGodPack = () => {
    setPackOpened(true)
    setTimeout(() => {
      setShowRarityText(true)
      setTimeout(() => {
        setShowRarityText(false)
        setShowCards(true)
        setCardRevealed(false)
        setTimeout(() => {
          setShowGodPackAnimation(false)
        }, 50)
        setTimeout(() => {
          setCardRevealed(true)
        }, 300)
      }, 1500) // Shorter animation for god pack
    }, 1500)
  }

  const finishCardReview = async () => {
    if (!user || drawnCards.length === 0 || isUpdatingScore) return

    setIsUpdatingScore(true)

    try {
      const scoreResult = await updateScoreForCards(user.username, drawnCards)
      if (scoreResult.success) {
        setScoreGained(scoreResult.addedScore)
        if (updateUserScore) {
          updateUserScore(scoreResult.addedScore)
        }
      } else {
        console.error("Failed to update score:", scoreResult.error)
        toast({
          title: "Error",
          description: "Failed to update score. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating score:", error)
    } finally {
      setIsUpdatingScore(false)
    }

    if (isBulkDraw) {
      setShowBulkResults(false)
    } else {
      setShowCards(false)
    }

    if (isMultiDraw || isBulkDraw) {
      setShowXpAnimation(true)
      setTimeout(() => {
        setShowXpAnimation(false)
        if (newLevel > 1) {
          setShowLevelUpAnimation(true)
          if (user) {
            updateScoreForLevelUp(user.username)
              .then((result) => {
                if (result.success && updateUserScore) {
                  updateUserScore(result.addedScore || 0)
                }
              })
              .catch(console.error)
          }
        } else {
          resetStates()
        }
      }, 800)
    } else {
      setShowXpAnimation(true)
      setTimeout(() => {
        setShowXpAnimation(false)
        if (newLevel > 1) {
          setShowLevelUpAnimation(true)
          if (user) {
            updateScoreForLevelUp(user.username)
              .then((result) => {
                if (result.success && updateUserScore) {
                  updateUserScore(result.addedScore || 0)
                } else {
                  console.error("Failed to update level-up score:", result.error)
                }
              })
              .catch((error) => {
                console.error("Error updating level-up score:", error)
              })
          }
        } else {
          resetStates()
        }
      }, 800)
    }
  }

  const resetStates = () => {
    setPackOpened(false)
    setShowPackSelection(true)
    setDrawnCards([])
    setCardRevealed(false)
    setXpGained(0)
    setScoreGained(0)
    setNewLevel(1)
    setIsMultiDraw(false)
    setIsBulkDraw(false)
    setShowBulkResults(false)
    setShowBulkLoading(false)
    setSelectedBulkCard(null)
    setIsGodPack(false) // NEW: Reset god pack state
    setShowGodPackAnimation(false) // NEW: Reset god pack animation
    refreshUserData?.()
    preventNavigation.current = false

    toast({
      title: "Cards Added",
      description: `${isBulkDraw ? "All cards have" : isMultiDraw ? "The cards have" : "The card has"} been added to your collection!`,
      variant: "default",
    })
  }

  const getCurrentCard = () => {
    return drawnCards[currentCardIndex] || null
  }

  const getRarityStyles = (rarity: CardRarity) => {
    return RARITY_COLORS[rarity] || RARITY_COLORS.common
  }

  const calculateXpWithBonuses = (baseXp: number) => {
    let finalXp = baseXp

    if (userClanRole === "xp_hunter") {
      finalXp = Math.floor(finalXp * 1.05)
    }

    if (userClanRole === "leader") {
      finalXp = Math.floor(finalXp * 1.05)
    }

    if (hasXpPass) {
      finalXp = Math.floor(finalXp * 1.2)
    }

    return finalXp
  }

  const getRarityStats = () => {
    const stats = {
      common: 0,
      rare: 0,
      epic: 0,
      legendary: 0,
      godlike: 0, // NEW: Added godlike to stats
    }

    drawnCards.forEach((card) => {
      if (stats.hasOwnProperty(card.rarity)) {
        stats[card.rarity as keyof typeof stats]++
      }
    })

    return stats
  }

  if (!isClient) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-[#f8f9ff] pb-20">
          <header className="sticky top-0 z-10 backdrop-blur-md bg-white/80 border-b border-gray-100">
            <div className="max-w-lg mx-auto px-4 py-3">
              <div className="flex justify-between items-center">
                <h1 className="text-lg font-medium">Card Packs</h1>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
                    <Ticket className="h-3.5 w-3.5 text-violet-500" />
                    <span className="font-medium text-sm">0</span>
                  </div>
                  <div className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
                    <Crown className="h-3.5 w-3.5 text-amber-500" />
                    <span className="font-medium text-sm">0</span>
                  </div>
                </div>
              </div>
            </div>
          </header>
          <div className="p-4 max-w-lg mx-auto">
            <div className="animate-pulse space-y-4">
              <div className="h-10 bg-gray-200 rounded-xl w-full"></div>
              <div className="h-64 bg-gray-200 rounded-xl w-full"></div>
              <div className="h-12 bg-gray-200 rounded-xl w-1/2 mx-auto"></div>
            </div>
          </div>
          <MobileNav />
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#f8f9ff] pb-20">
        {/* Header with tickets */}
        <header className="sticky top-0 z-10 backdrop-blur-md bg-white/80 border-b border-gray-100">
          <div className="max-w-lg mx-auto px-4 py-3">
            <div className="flex justify-between items-center">
              <h1 className="text-lg font-medium">Card Packs</h1>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
                  <Ticket className="h-3.5 w-3.5 text-orange-500" />
                  <span className="font-medium text-sm">{tickets}</span>
                </div>
                <div className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
                  <Ticket className="h-3.5 w-3.5 text-blue-500" />
                  <span className="font-medium text-sm">{legendaryTickets}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 max-w-lg mx-auto">
          {/* Pack Selection Screen */}
          <AnimatePresence>
            {showPackSelection && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* Tabs - UPDATED: Added God tab */}
                <div className="flex rounded-xl overflow-hidden mb-6 border border-gray-200 bg-white">
                  <button
                    onClick={() => setActiveTab("regular")}
                    className={`flex-1 py-3 px-4 text-center font-medium transition-all ${
                      activeTab === "regular"
                        ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white"
                        : "bg-white text-gray-500"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Ticket className="h-4 w-4" />
                      <span>Regular</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab("legendary")}
                    className={`flex-1 py-3 px-4 text-center font-medium transition-all ${
                      activeTab === "legendary"
                        ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
                        : "bg-white text-gray-500"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Ticket className="h-4 w-4" />
                      <span>Legendary</span>
                    </div>
                  </button>
                  {/* NEW: God Pack Tab */}
                  <button
                    onClick={() => setActiveTab("god")}
                    className={`flex-1 py-3 px-4 text-center font-medium transition-all ${
                      activeTab === "god"
                        ? "bg-gradient-to-r from-pink-500 to-red-500 text-white"
                        : "bg-white text-gray-500"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Zap className="h-4 w-4" />
                      <span>God</span>
                    </div>
                  </button>
                </div>

                {/* God Pack Global Stats - UPDATED: Smaller and simpler */}
                {activeTab === "god" && (
                  <div className="mb-4">
                    {/* Global Limit Display - Smaller */}
                    <div className="bg-gradient-to-r from-red-100 to-pink-100 border border-red-200 rounded-lg p-3">
                      <div className="text-xs font-medium text-red-800 mb-2 flex items-center gap-2">
                        <Globe className="h-3 w-3" />
                        Global Daily Limit
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-lg font-bold text-red-700">
                          {godPackStats.totalOpened} / {godPackStats.globalLimit}
                        </div>
                        <div className="text-xs text-red-600">{godPackStats.remaining} left</div>
                      </div>
                      <div className="w-full bg-red-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-red-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(godPackStats.totalOpened / godPackStats.globalLimit) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Pack UI */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm"
                >
                  <div className="p-4">
                    <div className="flex flex-col items-center">
                      <motion.div
                        className="relative w-48 h-64 mb-4"
                        animate={{
                          rotateY: [0, 2, 0, -2, 0],
                          ...(activeTab === "god" && {
                            scale: [1, 1.02, 1],
                          }),
                        }}
                        transition={{
                          duration: activeTab === "god" ? 4 : 6,
                          repeat: Number.POSITIVE_INFINITY,
                          repeatType: "loop",
                        }}
                      >
                        <Image
                          src={
                            activeTab === "god"
                              ? "/god_pack.png" // NEW: God pack image
                              : activeTab === "legendary"
                                ? "/anime-world-legendary-pack.jpg"
                                : "/vibrant-purple-card-pack.jpg"
                          }
                          alt="Card Pack"
                          fill
                          className="object-contain"
                        />
                        {/* NEW: Subtle god pack glow effect */}
                        {activeTab === "god" && (
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-pink-500/10 via-red-500/10 to-yellow-500/10 rounded-lg"
                            animate={{
                              opacity: [0.2, 0.4, 0.2],
                            }}
                            transition={{
                              duration: 3,
                              repeat: Number.POSITIVE_INFINITY,
                              repeatType: "reverse",
                            }}
                          />
                        )}
                      </motion.div>

                      <div className="text-center mb-4">
                        <h3 className="text-lg font-medium">
                          {activeTab === "god" ? "God" : activeTab === "legendary" ? "Legendary" : "Regular"} Card Pack
                        </h3>
                        <p className="text-sm text-gray-500">Contains 1 random card</p>
                        <div className="flex items-center justify-center gap-1 mt-1 text-xs text-violet-600">
                          <Star className="h-3 w-3" />
                          {userClanRole === "xp_hunter" || userClanRole === "leader" || hasXpPass ? (
                            <span className="flex items-center gap-1">
                              <span className="line-through text-gray-400">
                                +{activeTab === "god" ? "200" : activeTab === "legendary" ? "100" : "50"} XP
                              </span>
                              <span className="text-violet-600 font-semibold">
                                +
                                {calculateXpWithBonuses(
                                  activeTab === "god" ? 200 : activeTab === "legendary" ? 100 : 50,
                                )}{" "}
                                XP
                              </span>
                              {userClanRole === "xp_hunter" && <Sword className="h-3 w-3 text-orange-500" />}
                            </span>
                          ) : (
                            <span>+{activeTab === "god" ? "200" : activeTab === "legendary" ? "100" : "50"} XP</span>
                          )}
                        </div>
                      </div>

                      <div className="w-full space-y-2 mb-4">
                        {/* NEW: God pack rarity display */}
                        {activeTab === "god" ? (
                          <div className="border border-pink-200 rounded-lg p-3 relative bg-gradient-to-r from-pink-50 to-red-50">
                            <div className="absolute -top-3 right-3 bg-gradient-to-r from-pink-500 to-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                              LIMITED DAILY
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center text-sm">
                                <span className="font-semibold text-pink-600">Godlike</span>
                                <span className="text-pink-600 font-bold">1%</span>
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                <span>Legendary</span>
                                <span className="text-amber-500">49%</span>
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                <span>Epic</span>
                                <span className="text-purple-500">50%</span>
                              </div>
                            </div>
                          </div>
                        ) : activeTab === "legendary" ? (
                          <div className="border border-gray-200 rounded-lg p-3 relative">
                            <div className="space-y-2">
                              <div className="flex justify-between items-center text-sm">
                                <span>Common</span>
                                <span className="text-gray-500">10%</span>
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                <span>Rare</span>
                                <span className="text-blue-500">35%</span>
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                <span>Epic</span>
                                <span className="text-purple-500">45%</span>
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                <span>Legendary</span>
                                <div className="flex items-center gap-1">
                                  <span className="text-amber-500">
                                    {userClanRole === "lucky_star" || userClanRole === "leader" ? "12%" : "10%"}
                                  </span>
                                  {(userClanRole === "lucky_star" || userClanRole === "leader") && (
                                    <Star className="h-3 w-3 text-yellow-500" />
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="border border-gray-200 rounded-lg p-3 relative">
                            {hasPremiumPass && (
                              <div className="absolute -top-3 right-3 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                                PREMIUM BONUS
                              </div>
                            )}
                            <div className="space-y-2">
                              <div className="flex justify-between items-center text-sm">
                                <span>Common</span>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`text-gray-500 ${hasPremiumPass ? "line-through text-gray-400" : ""}`}
                                  >
                                    50%
                                  </span>
                                  {hasPremiumPass && <span className="text-gray-500 font-medium">40%</span>}
                                </div>
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                <span>Rare</span>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`text-blue-500 ${hasPremiumPass ? "line-through text-blue-400/70" : ""}`}
                                  >
                                    34%
                                  </span>
                                  {hasPremiumPass && <span className="text-blue-500 font-medium">36%</span>}
                                </div>
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                <span>Epic</span>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`text-purple-500 ${hasPremiumPass ? "line-through text-purple-400/70" : ""}`}
                                  >
                                    14%
                                  </span>
                                  {hasPremiumPass && <span className="text-purple-500 font-medium">18%</span>}
                                </div>
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                <span>Legendary</span>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`text-amber-500 ${hasPremiumPass ? "line-through text-amber-400/70" : ""}`}
                                  >
                                    {userClanRole === "lucky_star" || userClanRole === "leader" ? "4%" : "2%"}
                                  </span>
                                  {hasPremiumPass && (
                                    <span className="text-amber-500 font-medium flex items-center gap-1">
                                      {userClanRole === "lucky_star" || userClanRole === "leader" ? "8%" : "6%"}
                                      {(userClanRole === "lucky_star" || userClanRole === "leader") && (
                                        <Star className="h-3 w-3 text-yellow-500" />
                                      )}
                                    </span>
                                  )}
                                  {!hasPremiumPass && (userClanRole === "lucky_star" || userClanRole === "leader") && (
                                    <Star className="h-3 w-3 text-yellow-500" />
                                  )}
                                </div>
                              </div>
                            </div>
                            {hasPremiumPass && (
                              <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                                <Crown className="h-3 w-3" />
                                <span>Premium Pass activated</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Pack Buttons */}
                      <div className="w-full space-y-3">
                        {/* NEW: God pack only has single pack option */}
                        {activeTab === "god" ? (
                          <Button
                            onClick={() => !isDrawing && sendPayment()}
                            disabled={isDrawing || godPackStats.remaining <= 0}
                            className={`w-full ${
                              godPackStats.remaining <= 0
                                ? "bg-gray-400 cursor-not-allowed opacity-60"
                                : "bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 hover:from-pink-600 hover:via-red-600 hover:to-yellow-600"
                            } text-white rounded-xl py-4 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {isDrawing ? (
                              <div className="flex items-center justify-center">
                                <div className="h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
                                <span className="text-sm font-medium">Opening...</span>
                              </div>
                            ) : godPackStats.remaining <= 0 ? (
                              <div className="flex items-center gap-2">
                                <Zap className="h-5 w-5" />
                                <span className="font-bold text-base">All Packs Claimed Today!</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-base">
                                  Claim God Pack – {wldPriceDisplay} WLD (~$0.60)
                                </span>

                              </div>
                            )}
                          </Button>
                        ) : (
                          <>
                            {/* First row: 1 Pack and 5 Packs */}
                            <div className="flex gap-4">
                              <Button
                                onClick={() =>
                                  !isDrawing && handleSelectPack(activeTab === "legendary" ? "legendary" : "common")
                                }
                                disabled={isDrawing || (activeTab === "legendary" ? legendaryTickets < 1 : tickets < 1)}
                                className={
                                  activeTab === "legendary"
                                    ? "flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-xl py-4 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    : "flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl py-4 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                }
                              >
                                {isDrawing ? (
                                  <div className="flex items-center justify-center">
                                    <div className="h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
                                    <span className="text-sm font-medium">Opening...</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <Ticket className="h-5 w-5" />
                                    <span className="font-bold text-base">1 Pack</span>
                                  </div>
                                )}
                              </Button>

                              <Button
                                onClick={() =>
                                  !isDrawing && handleSelectPack(activeTab === "legendary" ? "legendary" : "common", 5)
                                }
                                disabled={isDrawing || (activeTab === "legendary" ? legendaryTickets < 5 : tickets < 5)}
                                className={
                                  isDrawing || (activeTab === "legendary" ? legendaryTickets < 5 : tickets < 5)
                                    ? "flex-1 bg-gray-300 text-gray-500 rounded-xl py-4 shadow-sm cursor-not-allowed opacity-60"
                                    : activeTab === "legendary"
                                      ? "flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl py-4 shadow-lg hover:shadow-xl transition-all duration-200 border-2 border-blue-400"
                                      : "flex-1 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-xl py-4 shadow-lg hover:shadow-xl transition-all duration-200 border-2 border-orange-400"
                                }
                              >
                                {isDrawing ? (
                                  <div className="flex items-center justify-center">
                                    <div className="h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
                                    <span className="text-sm font-medium">Opening...</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <Ticket className="h-5 w-5" />
                                    <span className="font-bold text-base">5 Packs</span>
                                  </div>
                                )}
                              </Button>
                            </div>

                            {/* Second row: 20 Packs Bulk Opening */}
                            <Button
                              onClick={() =>
                                !isDrawing && handleSelectPack(activeTab === "legendary" ? "legendary" : "common", 20)
                              }
                              disabled={isDrawing || (activeTab === "legendary" ? legendaryTickets < 20 : tickets < 20)}
                              className={
                                isDrawing || (activeTab === "legendary" ? legendaryTickets < 20 : tickets < 20)
                                  ? "w-full bg-gray-300 text-gray-500 rounded-xl py-4 shadow-sm cursor-not-allowed opacity-60"
                                  : activeTab === "legendary"
                                    ? "w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-xl py-4 shadow-lg hover:shadow-xl transition-all duration-200 border-2 border-purple-400"
                                    : "w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl py-4 shadow-lg hover:shadow-xl transition-all duration-200 border-2 border-red-400"
                              }
                            >
                              {isDrawing ? (
                                <div className="flex items-center justify-center">
                                  <div className="h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
                                  <span className="text-sm font-medium">Opening...</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <Ticket className="h-5 w-5" />
                                  <span className="font-bold text-base">20 Packs (Bulk)</span>
                                </div>
                              )}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {showPackSelection && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="mt-4 text-center"
            >
              {activeTab !== "god" && (
                <Button
                  variant="outline"
                  onClick={() => (window.location.href = "/shop")}
                  className="w-full border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <Ticket className="h-4 w-4 mr-2 text-orange-500" />
                  Need more tickets? Visit the Shop
                </Button>
              )}
            </motion.div>
          )}

          {/* NEW: Simplified God Pack Animation Screen */}
          <AnimatePresence>
            {showGodPackAnimation && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 flex flex-col items-center justify-center z-50"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-pink-900/60 via-red-900/60 to-yellow-900/60" />

                {/* Reduced background particles */}
                <div className="absolute inset-0">
                  {Array.from({ length: 15 }).map((_, i) => (
                    <motion.div
                      key={`god-particle-${i}`}
                      className="absolute w-1 h-1 bg-gradient-to-r from-pink-400 to-yellow-400 rounded-full"
                      animate={{
                        x: [Math.random() * window.innerWidth, Math.random() * window.innerWidth],
                        y: [Math.random() * window.innerHeight, Math.random() * window.innerHeight],
                        scale: [0, 1, 0],
                        opacity: [0, 0.6, 0],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Number.POSITIVE_INFINITY,
                        delay: i * 0.2,
                        ease: "easeInOut",
                      }}
                    />
                  ))}
                </div>

                <div className="relative z-10 flex flex-col items-center">
                  <motion.div
                    className="relative w-64 h-96 mb-8"
                    animate={{
                      y: [0, -10, 0],
                      rotateZ: packOpened ? [0, -5, 5, 0] : 0,
                      scale: packOpened ? [1, 1.1, 0.9, 1] : [1, 1.05, 1],
                    }}
                    transition={{
                      y: {
                        duration: 2,
                        repeat: Number.POSITIVE_INFINITY,
                        repeatType: "reverse",
                      },
                      rotateZ: {
                        duration: 1,
                      },
                      scale: {
                        duration: 1.5,
                      },
                    }}
                  >
                    <Image src="/god_pack.png" alt="God Pack" fill className="object-contain" />

                    {/* Subtle god pack glow effects */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-pink-500/20 via-red-500/20 to-yellow-500/20 rounded-lg"
                      animate={{
                        opacity: [0.2, 0.5, 0.2],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Number.POSITIVE_INFINITY,
                        repeatType: "reverse",
                      }}
                    />
                  </motion.div>

                  {!packOpened && (
                    <Button
                      onClick={handleOpenGodPack}
                      className="bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 hover:from-pink-600 hover:via-red-600 hover:to-yellow-600 rounded-full w-48 py-3 text-lg font-bold shadow-2xl"
                    >
                      <Zap className="h-5 w-5 mr-2" />
                      Open God Pack
                    </Button>
                  )}
                </div>

                {packOpened && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 pointer-events-none"
                  >
                    {/* Reduced explosion effect */}
                    {Array.from({ length: 30 }).map((_, i) => (
                      <motion.div
                        key={`divine-explosion-${i}`}
                        className="absolute w-2 h-2 rounded-full bg-gradient-to-r from-pink-400 via-red-400 to-yellow-400"
                        initial={{
                          x: "50vw",
                          y: "50vh",
                          scale: 0,
                        }}
                        animate={{
                          x: `${Math.random() * 100}vw`,
                          y: `${Math.random() * 100}vh`,
                          scale: [0, 1, 0],
                          rotate: [0, 180],
                        }}
                        transition={{
                          duration: 2,
                          delay: Math.random() * 0.3,
                        }}
                      />
                    ))}
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Rest of the existing animations remain the same but with reduced timing... */}
          {/* Bulk Results Screen */}
          <AnimatePresence>
            {showBulkResults && drawnCards.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 flex flex-col z-50 bg-[#f8f9ff]"
              >
                <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Bulk Opening Results</h2>
                    <div className="text-sm text-gray-600">{drawnCards.length} cards</div>
                  </div>
                </div>

                <div className="bg-white border-b border-gray-200 px-4 py-3">
                  <div className="grid grid-cols-5 gap-2 text-center">
                    {Object.entries(getRarityStats()).map(([rarity, count]) => (
                      <div key={rarity} className={`p-2 rounded-lg ${getRarityStyles(rarity as CardRarity).bg}`}>
                        <div className={`text-xs font-medium ${getRarityStyles(rarity as CardRarity).text}`}>
                          {rarity.toUpperCase()}
                        </div>
                        <div className="text-lg font-bold">{count}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-2">
                  <div className="px-4 py-4">
                    <Button
                      onClick={() => finishCardReview()}
                      disabled={isUpdatingScore}
                      className={
                        activeTab === "god"
                          ? "w-full bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 hover:from-pink-600 hover:via-red-600 hover:to-yellow-600 text-white rounded-xl py-3 font-semibold text-lg"
                          : activeTab === "legendary"
                            ? "w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-xl py-3 font-semibold text-lg"
                            : "w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl py-3 font-semibold text-lg"
                      }
                    >
                      {isUpdatingScore ? (
                        <div className="flex items-center justify-center">
                          <div className="h-5 w-5 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
                          <span>Adding to Collection...</span>
                        </div>
                      ) : (
                        "Add to Collection"
                      )}
                    </Button>
                  </div>

                  <div className="space-y-5">
                    {drawnCards.map((card, index) => (
                      <motion.div
                        key={`bulk-card-${index}`}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.04, duration: 0.35 }}
                        onClick={() => setSelectedBulkCard(card)}
                        className={`group relative p-4 rounded-2xl border bg-white/10 backdrop-blur-md shadow-md hover:shadow-xl transition-all cursor-pointer flex items-center justify-between ${getRarityStyles(card.rarity).border}`}
                      >
                        <div className="absolute inset-0 rounded-2xl pointer-events-none border border-white/20 shadow-inner shadow-white/10" />
                        <div className="flex flex-col z-10">
                          <h3 className="text-base font-semibold drop-shadow-sm">{card.name}</h3>
                          <p className="text-sm">{card.character}</p>
                        </div>
                        <span
                          className={`z-10 px-3 py-1 rounded-full text-xs font-semibold uppercase shadow-sm backdrop-blur-sm bg-white/20 ${getRarityStyles(card.rarity).text}`}
                        >
                          {card.rarity}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-3">
                  <Button
                    onClick={() => finishCardReview()}
                    disabled={isUpdatingScore}
                    className={
                      activeTab === "god"
                        ? "w-full bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 hover:from-pink-600 hover:via-red-600 hover:to-yellow-600 text-white rounded-xl py-4"
                        : activeTab === "legendary"
                          ? "w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-xl py-4"
                          : "w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl py-4"
                    }
                  >
                    {isUpdatingScore ? (
                      <div className="flex items-center justify-center">
                        <div className="h-5 w-5 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
                        <span>Adding to Collection...</span>
                      </div>
                    ) : (
                      `Add All ${drawnCards.length} Cards to Collection`
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bulk Loading Animation - Reduced particles */}
          <AnimatePresence>
            {showBulkLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 flex flex-col items-center justify-center z-50 bg-[#f8f9ff]"
              >
                <div className="absolute inset-0">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <motion.div
                      key={`bg-particle-${i}`}
                      className={`absolute w-2 h-2 rounded-full ${
                        activeTab === "legendary" ? "bg-blue-400/30" : "bg-orange-400/30"
                      }`}
                      animate={{
                        x: [Math.random() * window.innerWidth, Math.random() * window.innerWidth],
                        y: [Math.random() * window.innerHeight, Math.random() * window.innerHeight],
                        scale: [0, 1, 0],
                        opacity: [0, 0.4, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Number.POSITIVE_INFINITY,
                        delay: i * 0.2,
                        ease: "easeInOut",
                      }}
                    />
                  ))}
                </div>

                <div className="relative z-10 flex flex-col items-center">
                  <div className="relative mb-16">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <motion.div
                        key={`pack-${i}`}
                        className="absolute w-16 h-20"
                        style={{
                          left: `${i * 20 - 20}px`,
                          top: `${Math.sin(i) * 5}px`,
                        }}
                        animate={{
                          y: [0, -10, 0],
                          rotateZ: [0, 3, -3, 0],
                          scale: [1, 1.05, 1],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Number.POSITIVE_INFINITY,
                          delay: i * 0.2,
                          ease: "easeInOut",
                        }}
                      >
                        <Image
                          src={
                            activeTab === "legendary"
                              ? "/anime-world-legendary-pack.jpg"
                              : "/vibrant-purple-card-pack.jpg"
                          }
                          alt="Card Pack"
                          fill
                          className="object-contain opacity-80"
                        />
                      </motion.div>
                    ))}
                  </div>

                  <motion.div
                    className="text-center mb-6"
                    animate={{
                      scale: [1, 1.02, 1],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "easeInOut",
                    }}
                  >
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Opening 20 Packs...</h2>
                    <p className="text-gray-600">Preparing your cards</p>
                  </motion.div>

                  <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden mb-4">
                    <motion.div
                      className={`h-full rounded-full ${
                        activeTab === "legendary"
                          ? "bg-gradient-to-r from-blue-500 to-cyan-500"
                          : "bg-gradient-to-r from-orange-500 to-amber-500"
                      }`}
                      animate={{
                        x: ["-100%", "100%"],
                      }}
                      transition={{
                        duration: 1.2,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "easeInOut",
                      }}
                    />
                  </div>
                </div>

                <motion.div
                  className="absolute bottom-8 text-center text-gray-500 text-sm"
                  animate={{
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                  }}
                >
                  <p>This may take a few moments...</p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bulk Card Detail Modal with Tilt Effect */}
          <AnimatePresence>
            {selectedBulkCard && (
              <motion.div
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedBulkCard(null)}
              >
                <div className="relative">
                  <button
                    onClick={() => setSelectedBulkCard(null)}
                    className="absolute -top-4 -right-4 z-20 bg-white/90 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>

                  <motion.div
                    className="w-80 h-[30rem] preserve-3d cursor-pointer touch-none"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 120 }}
                    onMouseMove={(event) => {
                      const rect = event.currentTarget.getBoundingClientRect()
                      const xPos = ((event.clientX - rect.left) / rect.width - 0.5) * 200
                      const yPos = ((event.clientY - rect.top) / rect.height - 0.5) * 200
                      x.set(xPos)
                      y.set(yPos)
                    }}
                    onMouseLeave={() => {
                      x.set(0, true)
                      y.set(0, true)
                    }}
                    onTouchMove={(event) => {
                      const rect = event.currentTarget.getBoundingClientRect()
                      const touch = event.touches[0]
                      const xPos = ((touch.clientX - rect.left) / rect.width - 0.5) * 200
                      const yPos = ((touch.clientY - rect.top) / rect.height - 0.5) * 200
                      x.set(xPos)
                      y.set(yPos)
                    }}
                    onTouchEnd={() => {
                      x.set(0, true)
                      y.set(0, true)
                    }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      transformStyle: "preserve-3d",
                    }}
                  >
                    <motion.div
                      className={`absolute w-full h-full rounded-xl overflow-hidden border-4 ${
                        getRarityStyles(selectedBulkCard.rarity).border
                      }`}
                      style={{
                        rotateX: rotateX,
                        rotateY: rotateY,
                        transformStyle: "preserve-3d",
                      }}
                    >
                      <div className="absolute inset-0 w-full h-full">
                        <Image
                          src={selectedBulkCard.image_url || "/placeholder.svg?height=480&width=320"}
                          alt={selectedBulkCard.name}
                          fill
                          className="object-cover"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).src = "/placeholder.svg?height=480&width=320"
                          }}
                        />
                      </div>

                      <motion.div
                        className="absolute inset-0 mix-blend-overlay"
                        style={{
                          background: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.8) 0%, transparent 50%)",
                          backgroundPosition: `${reflectionX}% ${reflectionY}%`,
                          opacity: Math.max(
                            0.1,
                            reflectionOpacity.get() * (Math.abs(rotateX.get() / 15) + Math.abs(rotateY.get() / 15)),
                          ),
                        }}
                      />

                      <motion.div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background:
                            "linear-gradient(45deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0.1) 100%)",
                          backgroundPosition: `${reflectionX.get()}% ${reflectionY.get()}%`,
                          backgroundSize: "200% 200%",
                          opacity: Math.abs(rotateX.get() / 30) + Math.abs(rotateY.get() / 30),
                        }}
                      />

                      <div className="absolute inset-0 flex flex-col justify-between">
                        <div className="pt-1 pl-1">
                          <div className="bg-gradient-to-r from-black/70 via-black/50 to-transparent px-2 py-1 rounded-lg max-w-[85%] backdrop-blur-sm inline-block">
                            <h3 className="font-bold text-white text-lg drop-shadow-md anime-text">
                              {selectedBulkCard.name}
                            </h3>
                          </div>
                        </div>

                        <div className="pb-1 pr-1 flex justify-end">
                          <div className="bg-gradient-to-l from-black/70 via-black/50 to-transparent px-2 py-1 rounded-lg flex items-center gap-1 backdrop-blur-sm">
                            <span className="text-white text-sm font-semibold anime-text">
                              {selectedBulkCard.rarity?.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {(selectedBulkCard.rarity === "legendary" ||
                        selectedBulkCard.rarity === "epic" ||
                        selectedBulkCard.rarity === "godlike") && (
                        <motion.div
                          className={`absolute inset-0 pointer-events-none mix-blend-overlay rounded-xl ${
                            selectedBulkCard.rarity === "godlike"
                              ? "bg-pink-300"
                              : selectedBulkCard.rarity === "legendary"
                                ? "bg-yellow-300"
                                : "bg-purple-300"
                          }`}
                          animate={{
                            opacity: [0.1, 0.2, 0.1],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Number.POSITIVE_INFINITY,
                            repeatType: "reverse",
                          }}
                        />
                      )}

                      {(selectedBulkCard.rarity === "legendary" || selectedBulkCard.rarity === "godlike") && (
                        <motion.div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            background:
                              "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.8) 50%, transparent 100%)",
                            backgroundSize: "200% 100%",
                            backgroundPosition: `${reflectionX.get()}% 0%`,
                            opacity: reflectionOpacity,
                          }}
                        />
                      )}
                    </motion.div>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pack Animation Screen */}
          <AnimatePresence>
            {showPackAnimation && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 flex flex-col items-center justify-center z-50"
              >
                <div className="absolute inset-0 bg-black opacity-80" />
                <div className="relative z-10 flex flex-col items-center">
                  <motion.div
                    className="relative w-64 h-96 mb-8"
                    animate={{
                      y: [0, -10, 0],
                      rotateZ: packOpened ? [0, -3, 3, 0] : 0,
                      scale: packOpened ? [1, 1.05, 0.95, 1] : 1,
                    }}
                    transition={{
                      y: {
                        duration: 2,
                        repeat: Number.POSITIVE_INFINITY,
                        repeatType: "reverse",
                      },
                      rotateZ: {
                        duration: 1,
                      },
                      scale: {
                        duration: 1.5,
                      },
                    }}
                  >
                    <Image
                      src={
                        activeTab === "legendary" ? "/anime-world-legendary-pack.jpg" : "/vibrant-purple-card-pack.jpg"
                      }
                      alt="Card Pack"
                      fill
                      className="object-contain"
                    />

                    {!packOpened && (
                      <motion.div
                        className="absolute inset-0 bg-white opacity-0 rounded-lg"
                        animate={{
                          opacity: [0, 0.1, 0],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Number.POSITIVE_INFINITY,
                        }}
                      />
                    )}
                  </motion.div>

                  {!packOpened && (
                    <Button
                      onClick={handleOpenPack}
                      className={
                        activeTab === "legendary"
                          ? "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 rounded-full w-40"
                          : "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-full w-40"
                      }
                    >
                      Open
                    </Button>
                  )}
                </div>

                {packOpened && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 pointer-events-none"
                  >
                    {Array.from({ length: 25 }).map((_, i) => (
                      <motion.div
                        key={i}
                        className={`absolute w-2 h-2 rounded-full ${
                          activeTab === "legendary" ? "bg-blue-400" : "bg-orange-400"
                        }`}
                        initial={{
                          x: "50vw",
                          y: "50vh",
                          scale: 0,
                        }}
                        animate={{
                          x: `${Math.random() * 100}vw`,
                          y: `${Math.random() * 100}vh`,
                          scale: [0, 1, 0],
                        }}
                        transition={{
                          duration: 2,
                          delay: Math.random() * 0.3,
                        }}
                      />
                    ))}
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Rarity Text Animation - Simplified */}
          <AnimatePresence>
            {showRarityText && drawnCards.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 flex flex-col items-center justify-center z-50"
              >
                <div className="absolute inset-0 bg-black opacity-80" />
                {isMultiDraw ? (
                  <div className="relative z-20 flex flex-col items-center justify-center gap-4 h-[60vh]">
                    {drawnCards.map((card, index) => {
                      const slideFromLeft = index % 2 === 0
                      return (
                        <motion.div
                          key={`rarity-${index}`}
                          className="pointer-events-none"
                          initial={{
                            x: slideFromLeft ? "-50vw" : "50vw",
                            opacity: 0,
                          }}
                          animate={{
                            x: 0,
                            opacity: 1,
                          }}
                          transition={{
                            type: "spring",
                            stiffness: 200,
                            damping: 20,
                            delay: index * 0.1,
                          }}
                        >
                          <div
                            className={`text-3xl font-bold anime-text ${
                              card?.rarity === "godlike"
                                ? "text-pink-400"
                                : card?.rarity === "legendary"
                                  ? "text-yellow-400"
                                  : card?.rarity === "epic"
                                    ? "text-purple-400"
                                    : card?.rarity === "rare"
                                      ? "text-blue-400"
                                      : "text-gray-400"
                            }`}
                          >
                            {card?.rarity?.toUpperCase()}
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                ) : (
                  <motion.div
                    className="relative z-20 pointer-events-none"
                    initial={{
                      scale: 0,
                      opacity: 0,
                    }}
                    animate={{
                      scale: [0, 2, 1.5, 1],
                      opacity: [0, 1, 1, 0],
                      y: [0, 0, -30, -60],
                    }}
                    transition={{
                      duration: 1.5,
                      times: [0, 0.3, 0.7, 1],
                    }}
                  >
                    <div
                      className={`text-4xl font-bold anime-text ${
                        drawnCards[0]?.rarity === "godlike"
                          ? "text-pink-400"
                          : drawnCards[0]?.rarity === "legendary"
                            ? "text-yellow-400"
                            : drawnCards[0]?.rarity === "epic"
                              ? "text-purple-400"
                              : drawnCards[0]?.rarity === "rare"
                                ? "text-blue-400"
                                : "text-gray-400"
                      }`}
                    >
                      {drawnCards[0]?.rarity?.toUpperCase()}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Card Display Screen - Only for single and 5-pack draws */}
          <AnimatePresence>
            {showCards && drawnCards.length > 0 && !isBulkDraw && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 flex flex-col items-center justify-center z-50"
              >
                <div className="absolute inset-0 bg-black opacity-80" />
                <div className="relative z-10 flex flex-col items-center">
                  {isMultiDraw ? (
                    <div className="flex gap-1 mb-8 overflow-x-auto max-w-full px-2 h-[60vh]">
                      {drawnCards.map((card, index) => {
                        const rarityStyles = getRarityStyles(card?.rarity)
                        return (
                          <motion.div
                            key={`multi-card-${index}`}
                            onClick={() => setSelectedCardIndex(index)}
                            className={`flex-shrink-0 w-16 h-full rounded-xl overflow-hidden border-4 relative ${rarityStyles.border}`}
                            initial={{ opacity: 0, y: -50 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              delay: index * 0.15,
                              duration: 0.4,
                              type: "spring",
                              stiffness: 200,
                              damping: 20,
                            }}
                          >
                            <div className="absolute inset-0 w-full h-full">
                              <Image
                                src={card?.image_url || "/placeholder.svg?height=400&width=80"}
                                alt={card?.name || "Card"}
                                fill
                                className="object-cover object-center"
                                onError={(e) => {
                                  ;(e.target as HTMLImageElement).src = "/placeholder.svg?height=400&width=80"
                                }}
                              />
                            </div>
                            <div className={`absolute inset-0 bg-gradient-to-t ${rarityStyles.gradient} opacity-60`} />
                            <div className="absolute inset-0 flex flex-col justify-end p-1">
                              <div className="bg-black/70 backdrop-blur-sm rounded px-1 py-0.5 flex items-center justify-center">
                                <span className={`text-xs font-bold anime-text ${rarityStyles.text}`}>
                                  {card?.rarity?.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            </div>
                            {(card?.rarity === "legendary" ||
                              card?.rarity === "epic" ||
                              card?.rarity === "godlike") && (
                              <motion.div
                                className={`absolute inset-0 pointer-events-none mix-blend-overlay rounded-xl ${
                                  card?.rarity === "godlike"
                                    ? "bg-pink-300"
                                    : card?.rarity === "legendary"
                                      ? "bg-yellow-300"
                                      : "bg-purple-300"
                                }`}
                                animate={{
                                  opacity: [0.1, 0.2, 0.1],
                                }}
                                transition={{
                                  duration: 2,
                                  repeat: Number.POSITIVE_INFINITY,
                                  repeatType: "reverse",
                                }}
                              />
                            )}
                            {(card?.rarity === "legendary" || card?.rarity === "godlike") && (
                              <motion.div
                                className="absolute inset-0 pointer-events-none"
                                style={{
                                  background:
                                    "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
                                  backgroundSize: "200% 100%",
                                }}
                                animate={{
                                  backgroundPosition: ["-200% 0%", "200% 0%"],
                                }}
                                transition={{
                                  duration: 2,
                                  repeat: Number.POSITIVE_INFINITY,
                                  repeatType: "loop",
                                  delay: index * 0.1,
                                }}
                              />
                            )}
                          </motion.div>
                        )
                      })}
                    </div>
                  ) : (
                    getCurrentCard() && (
                      <div className="perspective-1000 mb-8">
                        <motion.div
                          ref={cardRef}
                          className="w-80 h-[30rem] preserve-3d cursor-pointer touch-none"
                          initial={{ rotateY: 0 }}
                          animate={{ rotateY: cardRevealed ? 0 : 180 }}
                          transition={{
                            type: "spring",
                            stiffness: 70,
                            damping: 15,
                            duration: 1.2,
                          }}
                          onMouseMove={handleCardMove}
                          onMouseLeave={handleCardLeave}
                          onTouchMove={handleCardMove}
                          onTouchEnd={handleCardLeave}
                          style={{
                            transformStyle: "preserve-3d",
                          }}
                        >
                          <motion.div
                            className={`absolute w-full h-full backface-hidden rounded-xl overflow-hidden ${
                              getRarityStyles(getCurrentCard()?.rarity).border
                            }`}
                            style={{
                              rotateX: rotateX,
                              rotateY: rotateY,
                              transformStyle: "preserve-3d",
                            }}
                          >
                            <div className="absolute inset-0 w-full h-full">
                              <Image
                                src={getCurrentCard()?.image_url || "/placeholder.svg?height=300&width=200"}
                                alt={getCurrentCard()?.name}
                                fill
                                className="object-cover"
                                onError={(e) => {
                                  ;(e.target as HTMLImageElement).src = "/placeholder.svg?height=300&width=200"
                                }}
                              />
                            </div>
                            <motion.div
                              className="absolute inset-0 mix-blend-overlay"
                              style={{
                                background:
                                  "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.8) 0%, transparent 50%)",
                                backgroundPosition: `${reflectionX}% ${reflectionY}%`,
                                opacity: Math.max(
                                  0.1,
                                  reflectionOpacity.get() *
                                    (Math.abs(rotateX.get() / 15) + Math.abs(rotateY.get() / 15)),
                                ),
                              }}
                            />
                            <motion.div
                              className="absolute inset-0 pointer-events-none"
                              style={{
                                background:
                                  "linear-gradient(45deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0.1) 100%)",
                                backgroundPosition: `${reflectionX.get()}% ${reflectionY.get()}%`,
                                backgroundSize: "200% 200%",
                                opacity: Math.abs(rotateX.get() / 30) + Math.abs(rotateY.get() / 30),
                              }}
                            />
                            <div className="absolute inset-0 flex flex-col justify-between">
                              <div className="pt-1 pl-1">
                                <div className="bg-gradient-to-r from-black/70 via-black/50 to-transparent px-2 py-1 rounded-lg max-w-[85%] backdrop-blur-sm inline-block">
                                  <h3 className="font-bold text-white text-lg drop-shadow-md anime-text">
                                    {getCurrentCard()?.name}
                                  </h3>
                                </div>
                              </div>
                              <div className="pb-1 pr-1 flex justify-end">
                                <div className="bg-gradient-to-l from-black/70 via-black/50 to-transparent px-2 py-1 rounded-lg flex items-center gap-1 backdrop-blur-sm">
                                  <span className="text-white text-sm font-semibold anime-text">
                                    {getCurrentCard()?.rarity?.toUpperCase()}
                                  </span>
                                </div>
                              </div>
                            </div>
                            {(getCurrentCard()?.rarity === "legendary" ||
                              getCurrentCard()?.rarity === "epic" ||
                              getCurrentCard()?.rarity === "godlike") && (
                              <motion.div
                                className={`absolute inset-0 pointer-events-none mix-blend-overlay rounded-xl ${
                                  getCurrentCard()?.rarity === "godlike"
                                    ? "bg-pink-300"
                                    : getCurrentCard()?.rarity === "legendary"
                                      ? "bg-yellow-300"
                                      : "bg-purple-300"
                                }`}
                                animate={{
                                  opacity: [0.1, 0.2, 0.1],
                                }}
                                transition={{
                                  duration: 2,
                                  repeat: Number.POSITIVE_INFINITY,
                                  repeatType: "reverse",
                                }}
                              />
                            )}
                            {(getCurrentCard()?.rarity === "legendary" || getCurrentCard()?.rarity === "godlike") && (
                              <motion.div
                                className="absolute inset-0 pointer-events-none"
                                style={{
                                  background:
                                    "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.8) 50%, transparent 100%)",
                                  backgroundSize: "200% 100%",
                                  backgroundPosition: `${reflectionX.get()}% 0%`,
                                  opacity: reflectionOpacity,
                                }}
                              />
                            )}
                          </motion.div>
                          <div className="absolute w-full h-full backface-hidden rotateY-180 rounded-xl bg-gradient-to-b from-blue-800 to-purple-900 border-4 border-yellow-500 flex items-center justify-center">
                            <div className="text-white text-center">
                              <h3 className="font-bold text-2xl anime-text">ANIME WORLD</h3>
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    )
                  )}
                  <Button
                    onClick={() => finishCardReview()}
                    disabled={isUpdatingScore}
                    className={
                      activeTab === "god"
                        ? "bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 hover:from-pink-600 hover:via-red-600 hover:to-yellow-600 px-8 rounded-full"
                        : activeTab === "legendary"
                          ? "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 px-8 rounded-full"
                          : "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 px-8 rounded-full"
                    }
                    size="lg"
                  >
                    {isUpdatingScore ? (
                      <div className="flex items-center">
                        <div className="h-5 w-5 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
                        <span>Updating...</span>
                      </div>
                    ) : (
                      `Add ${isMultiDraw ? "Cards" : "Card"} to Collection`
                    )}
                  </Button>
                  {selectedCardIndex !== null && (
                    <motion.div
                      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <div className="relative w-full max-w-xs aspect-[9/16]">
                        <motion.div
                          className={`relative w-full h-full rounded-xl overflow-hidden border-4 ${
                            getRarityStyles(getSelectedCard()?.rarity).border
                          }`}
                          initial={{ scale: 0.9 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 120 }}
                        >
                          <Image
                            src={getSelectedCard()?.image_url || "/placeholder.svg?height=400&width=300"}
                            alt={getSelectedCard()?.name || "Card"}
                            fill
                            className="object-cover object-center rounded-xl"
                          />
                        </motion.div>
                        <button
                          onClick={() => setSelectedCardIndex(null)}
                          className="absolute top-2 right-2 bg-white/90 hover:bg-white text-gray-800 px-3 py-1 rounded-full text-sm font-medium shadow"
                        >
                          Close
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* XP Gain Animation - Simplified */}
          <AnimatePresence>
            {showXpAnimation && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
              >
                <motion.div
                  className="bg-white rounded-xl p-6 shadow-lg flex flex-col items-center gap-2 border-2 border-violet-300"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{
                    scale: [0, 1.1, 1],
                    opacity: [0, 1, 1, 0],
                  }}
                  transition={{
                    duration: 0.8,
                    times: [0, 0.3, 0.5, 1],
                  }}
                >
                  <div className="text-2xl font-bold text-violet-600">+{xpGained} XP</div>
                  <div className="flex items-center gap-2">
                    <Star className="h-8 w-8 text-violet-500" />
                  </div>
                </motion.div>
                {Array.from({ length: 10 }).map((_, i) => (
                  <motion.div
                    key={`particle-${i}`}
                    className="absolute rounded-full bg-violet-500"
                    style={{
                      width: Math.random() * 4 + 2,
                      height: Math.random() * 4 + 2,
                    }}
                    initial={{
                      x: "50%",
                      y: "50%",
                      opacity: 0,
                    }}
                    animate={{
                      x: `${Math.random() * 100}%`,
                      y: `${Math.random() * 100}%`,
                      opacity: [0, 0.6, 0],
                    }}
                    transition={{
                      duration: 0.6,
                      delay: Math.random() * 0.1,
                    }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Level Up Animation - Simplified */}
          <AnimatePresence>
            {showLevelUpAnimation && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center"
              >
                <div className="absolute inset-0 bg-black/70" />
                <motion.div
                  className="relative z-10 bg-white rounded-xl p-6 shadow-lg flex flex-col items-center gap-4 border-2 border-amber-400"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{
                    scale: [0, 1.1, 1],
                    opacity: 1,
                  }}
                  transition={{
                    duration: 0.4,
                    times: [0, 0.7, 1],
                  }}
                >
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                  >
                    <div className="w-20 h-20 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 flex items-center justify-center mb-2">
                      <Star className="h-10 w-10 text-white" />
                    </div>
                  </motion.div>
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.3 }}
                  >
                    <h2 className="text-2xl font-bold text-center">Level Up!</h2>
                    <p className="text-lg font-medium text-center text-amber-600">You reached Level {newLevel}!</p>
                    <p className="text-sm text-center text-gray-600 mt-1">+100 Leaderboard Points</p>
                  </motion.div>
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.3 }}
                    className="mt-4"
                  >
                    <Button
                      onClick={() => {
                        setShowLevelUpAnimation(false)
                        resetStates()
                      }}
                      className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-8"
                    >
                      Continue
                    </Button>
                  </motion.div>
                </motion.div>
                {Array.from({ length: 15 }).map((_, i) => (
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
                      duration: 1.5,
                      delay: Math.random() * 0.3,
                      ease: "easeOut",
                    }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
        <MobileNav />
      </div>
    </ProtectedRoute>
  )
}
