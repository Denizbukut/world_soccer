"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import { updateScoreForCards, updateScoreForLevelUp } from "@/app/actions/update-score"
import ProtectedRoute from "@/components/protected-route"
import MobileNav from "@/components/mobile-nav"
import { Button } from "@/components/ui/button"
import { Ticket, Crown, Star, Sword, Zap, X } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { motion, AnimatePresence, useAnimation, useMotionValue, useTransform } from "framer-motion"
import Image from "next/image"
import { incrementMission } from "@/app/actions/missions"
import { incrementLegendaryDraw } from "@/app/actions/weekly-contest"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { incrementClanMission } from "@/app/actions/clan-missions"
import { MiniKit, Tokens, type PayCommandInput, tokenToDecimals } from "@worldcoin/minikit-js"
import { useWldPrice } from "@/contexts/WldPriceContext"


// Rarität definieren - UPDATED: Added godlike
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
  // UPDATED: Changed godlike fallback to red theme
  {
    id: "fallback-4",
    name: "Godlike Placeholder",
    character: "Divine",
    image_url: "/placeholder.png",
    rarity: "godlike" as CardRarity,
    type: "special",
  },
]

// Rarity color mapping - UPDATED: Changed godlike to red colors
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
  // UPDATED: Changed godlike to red colors
  godlike: {
    border: "card-border-godlike",
    glow: "shadow-red-300",
    text: "text-red-600",
    gradient: "from-red-300/30 to-red-100/30",
    bg: "bg-red-100",
  },
}

export default function DrawPage() {
  const { user, updateUserTickets, updateUserExp, refreshUserData, updateUserScore } = useAuth()
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawnCards, setDrawnCards] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<"regular" | "legendary" | "god">("regular")
  const [legendaryTickets, setLegendaryTickets] = useState(2)
  const [tickets, setTickets] = useState(0)
  const [hasPremiumPass, setHasPremiumPass] = useState(false)
  const [hasXpPass, setHasXpPass] = useState(false)
  const [userClanRole, setUserClanRole] = useState<string | null>(null)
  const [isUpdatingScore, setIsUpdatingScore] = useState(false)
  const [isMultiDraw, setIsMultiDraw] = useState(false)
  const [isBulkDraw, setIsBulkDraw] = useState(false)
  const [showBulkLoading, setShowBulkLoading] = useState(false)
  const [wldPriceEstimate, setWldPriceEstimate] = useState<string>("–")

  // Animation states
  const [showPackSelection, setShowPackSelection] = useState(true)
  const [showPackAnimation, setShowPackAnimation] = useState(false)
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
  const [godPacksLeft, setGodPacksLeft] = useState<number | null>(null)
  const max_godpacks_daily = 100;

  const fetchGodPacksLeft = async () => {
  const supabase = getSupabaseBrowserClient()
  const today = new Date().toISOString().split("T")[0]
  if (!supabase) return
  const { data, error } = await supabase
    .from("god_pack_daily_usage")
    .select("packs_opened")
    .eq("usage_date", today)

  if (!error && data) {
    const totalOpened = (data as { packs_opened: number }[]).reduce(
  (sum, row) => sum + row.packs_opened,
  0,
)

    setGodPacksLeft(totalOpened) // ✅ HIER: NICHT 50 - totalOpened
  } else {
    console.error("Error fetching god pack usage:", error)
    setGodPacksLeft(null)
  }
}

  // Bulk opening states
  const [selectedBulkCard, setSelectedBulkCard] = useState<any | null>(null)

  // Hydration safety
  const [isClient, setIsClient] = useState(false)

  // Card states
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const controls = useAnimation()

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
  const { price } = useWldPrice()
  useEffect(() => {
  fetchGodPacksLeft()
}, [])


  // Payment function for God Pack
  const sendPayment = async () => {
    const dollarAmount = 0.8
    const fallbackWldAmount = 0.8
    const wldAmount = price ? dollarAmount / price : fallbackWldAmount
    const wldAmountRounded = Number(wldAmount.toFixed(3))
    setWldPriceEstimate(wldAmountRounded.toFixed(3))

    try {
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
        description: "God Pack",
      }

      const { finalPayload } = await MiniKit.commandsAsync.pay(payload)

      if (finalPayload.status == "success") {
        console.log("success sending payment")
        handleSelectPack("god")
      } else {
        toast({
          title: "Payment Failed",
          description: "Payment was not completed successfully.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Payment error:", error)
      toast({
        title: "Payment Error",
        description: "An error occurred during payment.",
        variant: "destructive",
      })
    }
  }

  const getSelectedCard = () => {
    if (selectedCardIndex === null) return null
    return drawnCards[selectedCardIndex]
  }

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
    const dollarAmount = 0.8
    if (price) {
      const wld = dollarAmount / price
      setWldPriceEstimate(wld.toFixed(3))
    }
  }, [price])

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

  const handleSelectPack = useCallback(
    async (cardType: string, count = 1) => {
      if (isDrawing) {
        return
      }

      if (!user) {
        toast({ title: "Error", description: "You must be logged in.", variant: "destructive" })
        return
      }
      console.log("looking for pack")

      // God pack doesn't require tickets, only payment
      if (cardType !== "god") {
        console.log("not god")
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

      preventNavigation.current = true
      setIsDrawing(true)
      setIsMultiDraw(count > 1 && count <= 5)
      setIsBulkDraw(count > 5)
      setShowPackSelection(false)

      if (count > 5) {
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

        // Mission tracking for godlike cards
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

          // God pack doesn't affect ticket counts
          if (cardType !== "god") {
            const newTicketCount = result.newTicketCount ?? tickets
            const newLegendaryTicketCount = result.newLegendaryTicketCount ?? legendaryTickets

            setTickets(newTicketCount)
            setLegendaryTickets(newLegendaryTicketCount)
            await updateUserTickets?.(newTicketCount, newLegendaryTicketCount)
          } else{
            fetchGodPacksLeft()
          }

          // God pack gives more XP
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
        }, 2500)
      }, 2500)
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
        }, 2000)
      }, 2500)
    }
  }

  const finishCardReview = async () => {
    if (!user || drawnCards.length === 0 || isUpdatingScore) return

    setIsUpdatingScore(true)
    fetchGodPacksLeft()

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
      }, 1000)
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
      }, 1000)
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
    refreshUserData?.()
    setIsBulkDraw(false)
    setShowBulkResults(false)
    setShowBulkLoading(false)
    setSelectedBulkCard(null)
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
      godlike: 0,
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
                {/* Tabs - UPDATED: Changed God tab to red gradient */}
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
                      <Ticket className="h-4 w-4 " />
                      <span>Legendary</span>
                    </div>
                  </button>
                  {/* UPDATED: Changed God Pack Tab to red gradient */}
                  <button
  onClick={() => godPacksLeft !== null && godPacksLeft < max_godpacks_daily && setActiveTab("god")}
  disabled={godPacksLeft === null || godPacksLeft >= max_godpacks_daily}
  className={`flex-1 py-3 px-4 text-center font-medium transition-all ${
    godPacksLeft !== null && godPacksLeft >= max_godpacks_daily
      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
      : activeTab === "god"
        ? "bg-gradient-to-r from-red-500 to-red-600 text-white"
        : "bg-white text-gray-500"
  }`}
>
  <div className="flex items-center justify-center gap-2">
    <Zap className="h-4 w-4" />
    <span>God</span>
  </div>
</button>

                </div>
                {godPacksLeft !== null && (
  <div className={`mb-4 text-center text-sm font-medium px-4 py-2 rounded-xl ${
    godPacksLeft === 0
      ? "bg-gray-100 text-gray-600 border border-gray-300"
      : "bg-red-50 text-red-600 border border-red-200"
  }`}>
    ⚡ God Packs opened today:{" "}
    <span className="font-bold">{godPacksLeft}</span> / {max_godpacks_daily}
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
                          rotateY: [0, 5, 0, -5, 0],
                        }}
                        transition={{
                          duration: 5,
                          repeat: Number.POSITIVE_INFINITY,
                          repeatType: "loop",
                        }}
                      >
                        <Image
                          src={
                            activeTab === "god"
                              ? "/god_pack.png"
                              : activeTab === "legendary"
                                ? "/anime-world-legendary-pack.jpg"
                                : "/vibrant-purple-card-pack.jpg"
                          }
                          alt="Card Pack"
                          fill
                          className="object-contain"
                        />
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
                        {/* God Pack Rarity Display - UPDATED: Changed godlike text to red */}
                        {activeTab === "god" ? (
                          <div className="border border-gray-200 rounded-lg p-3 relative">
                            <div className="space-y-2">
                              <div className="flex justify-between items-center text-sm">
                                <span>Epic</span>
                                <span className="text-purple-500">49%</span>
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                <span>Legendary</span>
                                <div className="flex items-center gap-1">
                                  <span className="text-amber-500">
                                    {userClanRole === "lucky_star" || userClanRole === "leader" ? "52%" : "50%"}
                                  </span>
                                  {(userClanRole === "lucky_star" || userClanRole === "leader") && (
                                    <Star className="h-3 w-3 text-yellow-500" />
                                  )}
                                </div>
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                <span className="font-bold text-red-600">Godlike</span>
                                <span className="text-red-500 font-bold">1%</span>
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

                      {/* Pack Buttons - UPDATED: God pack button to red gradient */}
                      <div className="w-full space-y-3">
                        {activeTab === "god" ? (
                          // UPDATED: God Pack Payment Button to red gradient
                          <Button
                            onClick={sendPayment}
                            disabled={godPacksLeft === null || godPacksLeft >= max_godpacks_daily}
                            className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl py-4 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isDrawing ? (
                              <div className="flex items-center justify-center">
                                <div className="h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
                                <span className="text-sm font-medium">Opening...</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Zap className="h-5 w-5" />
                                <span className="font-bold text-base">Open God Pack ({wldPriceEstimate} WLD)</span>
                              </div>
                            )}
                          </Button>
                        ) : (
                          <>
                            {/* Regular/Legendary Pack Buttons */}
                            <div className="flex gap-4">
                              <Button
                                onClick={() =>
                                  !isDrawing && handleSelectPack(activeTab === "legendary" ? "legendary" : "regular")
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
                                  !isDrawing && handleSelectPack(activeTab === "legendary" ? "legendary" : "regular", 5)
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
                                    <div className="h-4 w-4 border-2 border-t-transparent border-current rounded-full animate-spin mr-2"></div>
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

                            <Button
                              onClick={() =>
                                !isDrawing && handleSelectPack(activeTab === "legendary" ? "legendary" : "regular", 20)
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

          {showPackSelection && activeTab !== "god" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="mt-4 text-center"
            >
              <Button
                variant="outline"
                onClick={() => (window.location.href = "/shop")}
                className="w-full border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <Ticket className="h-4 w-4 mr-2 text-orange-500" />
                Need more tickets? Visit the Shop
              </Button>
            </motion.div>
          )}

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
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {Object.entries(getRarityStats())
  .filter(([rarity]) => !(isBulkDraw && rarity === "godlike"))
  .map(([rarity, count]) => (
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
                          ? "w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl py-3 font-semibold text-lg"
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
                        ? "w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl py-4"
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

          {/* Bulk Loading Animation */}
          <AnimatePresence>
            {showBulkLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 flex flex-col items-center justify-center z-50 bg-[#f8f9ff]"
              >
                {/* Animated Background */}
                <div className="absolute inset-0">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <motion.div
                      key={`bg-particle-${i}`}
                      className={`absolute w-2 h-2 rounded-full ${
                        activeTab === "god"
                          ? "bg-red-400/30"
                          : activeTab === "legendary"
                            ? "bg-blue-400/30"
                            : "bg-orange-400/30"
                      }`}
                      animate={{
                        x: [
                          Math.random() * window.innerWidth,
                          Math.random() * window.innerWidth,
                          Math.random() * window.innerWidth,
                        ],
                        y: [
                          Math.random() * window.innerHeight,
                          Math.random() * window.innerHeight,
                          Math.random() * window.innerHeight,
                        ],
                        scale: [0, 1, 0],
                        opacity: [0, 0.6, 0],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Number.POSITIVE_INFINITY,
                        delay: i * 0.1,
                        ease: "easeInOut",
                      }}
                    />
                  ))}
                </div>

                {/* Main Loading Content */}
                <div className="relative z-10 flex flex-col items-center">
                  {/* Animated Pack Icons */}
                  <div className="relative mb-16">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <motion.div
                        key={`pack-${i}`}
                        className="absolute w-16 h-20"
                        style={{
                          left: `${i * 20 - 40}px`,
                          top: `${Math.sin(i) * 10}px`,
                        }}
                        animate={{
                          y: [0, -20, 0],
                          rotateZ: [0, 5, -5, 0],
                          scale: [1, 1.1, 1],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Number.POSITIVE_INFINITY,
                          delay: i * 0.2,
                          ease: "easeInOut",
                        }}
                      >
                        <Image
                          src={
                            activeTab === "god"
                              ? "/god_pack.png"
                              : activeTab === "legendary"
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

                  {/* Loading Text */}
                  <motion.div
                    className="text-center mb-6"
                    animate={{
                      scale: [1, 1.05, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "easeInOut",
                    }}
                  >
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Opening 20 Packs...</h2>
                    <p className="text-gray-600">Preparing your cards</p>
                  </motion.div>

                  {/* Animated Progress Indicator */}
                  <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden mb-4">
                    <motion.div
                      className={`h-full rounded-full ${
                        activeTab === "god"
                          ? "bg-gradient-to-r from-red-500 to-red-600"
                          : activeTab === "legendary"
                            ? "bg-gradient-to-r from-blue-500 to-cyan-500"
                            : "bg-gradient-to-r from-orange-500 to-amber-500"
                      }`}
                      animate={{
                        x: ["-100%", "100%"],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "easeInOut",
                      }}
                    />
                  </div>

                  {/* Spinning Cards Animation */}
                  <div className="relative">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <motion.div
                        key={`spinning-card-${i}`}
                        className={`absolute w-8 h-12 rounded border-2 ${
                          getRarityStyles(["common", "rare", "epic", "legendary", "godlike"][i % 5] as CardRarity)
                            .border
                        } ${getRarityStyles(["common", "rare", "epic", "legendary", "godlike"][i % 5] as CardRarity).bg}`}
                        style={{
                          left: `${Math.cos((i * Math.PI * 2) / 8) * 40}px`,
                          top: `${Math.sin((i * Math.PI * 2) / 8) * 40}px`,
                        }}
                        animate={{
                          rotateY: [0, 360],
                          scale: [0.8, 1.2, 0.8],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Number.POSITIVE_INFINITY,
                          delay: i * 0.1,
                          ease: "linear",
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Bottom Hint */}
                <motion.div
                  className="absolute bottom-8 text-center text-gray-500 text-sm"
                  animate={{
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 2,
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
                  {/* Close Button */}
                  <button
                    onClick={() => setSelectedBulkCard(null)}
                    className="absolute -top-4 -right-4 z-20 bg-white/90 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>

                  {/* Tiltable Card */}
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
                      {/* Full art image takes up the entire card */}
                      <div className="absolute inset-0 w-full h-full">
                        {selectedBulkCard.image_url?.endsWith(".mp4") ? (
                          <video
                            autoPlay
                            muted
                            loop
                            playsInline
                            className="absolute inset-0 w-full h-full object-cover rounded-xl"
                            src={selectedBulkCard.image_url}
                          />
                        ) : (
                          <Image
                            src={selectedBulkCard.image_url || "/placeholder.svg"}
                            alt={selectedBulkCard.name}
                            fill
                            className="object-cover"
                            onError={(e) => {
                              ;(e.target as HTMLImageElement).src = "/placeholder.svg"
                            }}
                          />
                        )}
                      </div>

                      {/* Dynamic light reflection effect */}
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

                      {/* Holographic overlay effect based on tilt */}
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

                      {/* Card Content Overlays */}
                      <div className="absolute inset-0 flex flex-col justify-between">
                        {/* Top section with name */}
                        <div className="pt-1 pl-1">
                          <div className="bg-gradient-to-r from-black/70 via-black/50 to-transparent px-2 py-1 rounded-lg max-w-[85%] backdrop-blur-sm inline-block">
                            <h3 className="font-bold text-white text-lg drop-shadow-md anime-text">
                              {selectedBulkCard.name}
                            </h3>
                          </div>
                        </div>

                        {/* Bottom section with rarity */}
                        <div className="pb-1 pr-1 flex justify-end">
                          <div className="bg-gradient-to-l from-black/70 via-black/50 to-transparent px-2 py-1 rounded-lg flex items-center gap-1 backdrop-blur-sm">
                            <span className="text-white text-sm font-semibold anime-text">
                              {selectedBulkCard.rarity?.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Special effects für legendary, epic und godlike cards */}
                      {(selectedBulkCard.rarity === "legendary" ||
                        selectedBulkCard.rarity === "epic" ||
                        selectedBulkCard.rarity === "godlike") && (
                        <motion.div
                          className={`absolute inset-0 pointer-events-none mix-blend-overlay rounded-xl ${
                            selectedBulkCard.rarity === "legendary"
                              ? "bg-yellow-300"
                              : selectedBulkCard.rarity === "godlike"
                                ? "bg-red-300"
                                : "bg-purple-300"
                          }`}
                          animate={{
                            opacity: [0.1, 0.3, 0.1],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Number.POSITIVE_INFINITY,
                            repeatType: "reverse",
                          }}
                        />
                      )}

                      {/* Shine effect - für legendary und godlike cards */}
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
                      y: [0, -15, 0, -15, 0],
                      rotateZ: packOpened ? [0, -5, 5, -3, 0] : 0,
                      scale: packOpened ? [1, 1.1, 0.9, 1.05, 0] : 1,
                    }}
                    transition={{
                      y: {
                        duration: 3,
                        repeat: Number.POSITIVE_INFINITY,
                        repeatType: "reverse",
                      },
                      rotateZ: {
                        duration: 1.2,
                      },
                      scale: {
                        duration: 2,
                      },
                    }}
                  >
                    <Image
                      src={
                        activeTab === "god"
                          ? "/god_pack.png"
                          : activeTab === "legendary"
                            ? "/anime-world-legendary-pack.jpg"
                            : "/vibrant-purple-card-pack.jpg"
                      }
                      alt="Card Pack"
                      fill
                      className="object-contain"
                    />

                    {!packOpened && (
                      <motion.div
                        className="absolute inset-0 bg-white opacity-0 rounded-lg"
                        animate={{
                          opacity: [0, 0.2, 0],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Number.POSITIVE_INFINITY,
                        }}
                      />
                    )}
                  </motion.div>

                  {!packOpened && (
                    <Button
                      onClick={handleOpenPack}
                      className={
                        activeTab === "god"
                          ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-full w-40"
                          : activeTab === "legendary"
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
                    {Array.from({ length: 50 }).map((_, i) => (
                      <motion.div
                        key={i}
                        className={`absolute w-2 h-2 rounded-full ${
                          activeTab === "god"
                            ? "bg-red-400"
                            : activeTab === "legendary"
                              ? "bg-blue-400"
                              : "bg-orange-400"
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
                          duration: 2.5,
                          delay: Math.random() * 0.5,
                        }}
                      />
                    ))}
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Rarity Text Animation */}
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
                            x: slideFromLeft ? "-100vw" : "100vw",
                            opacity: 0,
                          }}
                          animate={{
                            x: 0,
                            opacity: 1,
                          }}
                          transition={{
                            type: "spring",
                            stiffness: 260,
                            damping: 20,
                            mass: 0.8,
                            delay: index * 0.15,
                          }}
                        >
                          <div
                            className={`text-4xl font-bold anime-text ${
                              card?.rarity === "legendary"
                                ? "text-yellow-400"
                                : card?.rarity === "godlike"
                                  ? "text-red-400"
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
                      scale: [0, 3, 2, 1],
                      opacity: [0, 1, 1, 0],
                      y: [0, 0, -50, -100],
                    }}
                    transition={{
                      duration: 2,
                      times: [0, 0.3, 0.7, 1],
                    }}
                  >
                    <div
                      className={`text-5xl font-bold anime-text ${
                        drawnCards[0]?.rarity === "legendary"
                          ? "text-yellow-400"
                          : drawnCards[0]?.rarity === "godlike"
                            ? "text-red-400"
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
                            initial={{ opacity: 0, y: -100 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              delay: index * 0.2,
                              duration: 0.5,
                              type: "spring",
                              stiffness: 260,
                              damping: 20,
                            }}
                          >
                            <div className="absolute inset-0 w-full h-full">
                              {card?.image_url.endsWith(".mp4") ? (
                                <video
                                  autoPlay
                                  muted
                                  loop
                                  playsInline
                                  className="absolute inset-0 w-full h-full object-cover rounded-xl"
                                  src={card.image_url}
                                />
                              ) : (
                                <Image
                                  src={card?.image_url || "/placeholder.svg?height=400&width=80"}
                                  alt={card?.name || "Card"}
                                  fill
                                  className="object-cover object-center"
                                  onError={(e) => {
                                    ;(e.target as HTMLImageElement).src = "/placeholder.svg?height=400&width=80"
                                  }}
                                />
                              )}
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
                                  card?.rarity === "legendary"
                                    ? "bg-yellow-300"
                                    : card?.rarity === "godlike"
                                      ? "bg-red-300"
                                      : "bg-purple-300"
                                }`}
                                animate={{
                                  opacity: [0.1, 0.3, 0.1],
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
                                    "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)",
                                  backgroundSize: "200% 100%",
                                }}
                                animate={{
                                  backgroundPosition: ["-200% 0%", "200% 0%"],
                                }}
                                transition={{
                                  duration: 3,
                                  repeat: Number.POSITIVE_INFINITY,
                                  repeatType: "loop",
                                  delay: index * 0.2,
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
                            duration: 1.5,
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
                              {getCurrentCard()?.image_url.endsWith(".mp4") ? (
                                <video
                                  autoPlay
                                  muted
                                  loop
                                  playsInline
                                  className="absolute inset-0 w-full h-full object-cover rounded-xl"
                                  src={getCurrentCard()?.image_url}
                                />
                              ) : (
                                <Image
                                  src={getCurrentCard()?.image_url || "/placeholder.svg?height=300&width=200"}
                                  alt={getCurrentCard()?.name}
                                  fill
                                  className="object-cover"
                                  onError={(e) => {
                                    ;(e.target as HTMLImageElement).src = "/placeholder.svg?height=300&width=200"
                                  }}
                                />
                              )}
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
                                  getCurrentCard()?.rarity === "legendary"
                                    ? "bg-yellow-300"
                                    : getCurrentCard()?.rarity === "godlike"
                                      ? "bg-red-300"
                                      : "bg-purple-300"
                                }`}
                                animate={{
                                  opacity: [0.1, 0.3, 0.1],
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
                        ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 px-8 rounded-full"
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
                          {getSelectedCard()?.image_url.endsWith(".mp4") ? (
                            <video
                              autoPlay
                              muted
                              loop
                              playsInline
                              className="absolute inset-0 w-full h-full object-cover rounded-xl"
                              src={getSelectedCard()?.image_url}
                            />
                          ) : (
                            <Image
                              src={getSelectedCard()?.image_url || "/placeholder.svg?height=400&width=300"}
                              alt={getSelectedCard()?.name || "Card"}
                              fill
                              className="object-cover object-center rounded-xl"
                            />
                          )}
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
                  className="bg-white rounded-xl p-6 shadow-lg flex flex-col items-center gap-2 border-2 border-violet-300"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{
                    scale: [0, 1.2, 1],
                    opacity: [0, 1, 1, 0],
                  }}
                  transition={{
                    duration: 1,
                    times: [0, 0.3, 0.5, 1],
                  }}
                >
                  <div className="text-2xl font-bold text-violet-600">+{xpGained} XP</div>
                  <div className="flex items-center gap-2">
                    <Star className="h-8 w-8 text-violet-500" />
                  </div>
                </motion.div>

                {Array.from({ length: 20 }).map((_, i) => (
                  <motion.div
                    key={`particle-${i}`}
                    className="absolute rounded-full bg-violet-500"
                    style={{
                      width: Math.random() * 6 + 2,
                      height: Math.random() * 6 + 2,
                    }}
                    initial={{
                      x: "50%",
                      y: "50%",
                      opacity: 0,
                    }}
                    animate={{
                      x: `${Math.random() * 100}%`,
                      y: `${Math.random() * 100}%`,
                      opacity: [0, 0.8, 0],
                    }}
                    transition={{
                      duration: 0.8,
                      delay: Math.random() * 0.2,
                    }}
                  />
                ))}
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
                className="fixed inset-0 z-50 flex items-center justify-center"
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
                      <Star className="h-10 w-10 text-white" />
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                  >
                    <h2 className="text-2xl font-bold text-center">Level Up!</h2>
                    <p className="text-lg font-medium text-center text-amber-600">You reached Level {newLevel}!</p>
                    <p className="text-sm text-center text-gray-600 mt-1">+100 Leaderboard Points</p>
                  </motion.div>

                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.9, duration: 0.5 }}
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
        </main>

        <MobileNav />
      </div>
    </ProtectedRoute>
  )
}
