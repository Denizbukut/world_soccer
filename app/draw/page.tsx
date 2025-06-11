"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import { updateScoreForCards, updateScoreForLevelUp } from "@/app/actions/update-score"
import ProtectedRoute from "@/components/protected-route"
import MobileNav from "@/components/mobile-nav"
import { Button } from "@/components/ui/button"
import { Ticket, Crown, Star } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { motion, AnimatePresence, useAnimation, useMotionValue, useTransform } from "framer-motion"
import Image from "next/image"
import { incrementMission } from "@/app/actions/missions"
import { incrementLegendaryDraw } from "../actions/weekly-contest"

// Rarität definieren
type CardRarity = "common" | "rare" | "epic" | "legendary"

const FALLBACK_CARDS = [
  {
    id: "fallback-1",
    name: "Mystery Hero 1",
    character: "Unknown",
    image_url: "/naruto-card.png",
    rarity: "common" as CardRarity,
    type: "normal",
  },
  {
    id: "fallback-2",
    name: "Mystery Hero 2",
    character: "Unknown",
    image_url: "/naruto-card.png",
    rarity: "rare" as CardRarity,
    type: "normal",
  },
  {
    id: "fallback-3",
    name: "Mystery Hero 3",
    character: "Unknown",
    image_url: "/naruto-card.png",
    rarity: "epic" as CardRarity,
    type: "normal",
  },
]

// Rarity color mapping
const RARITY_COLORS = {
  common: {
    border: "card-border-common",
    glow: "shadow-gray-300",
    text: "text-gray-600",
    gradient: "from-gray-300/30 to-gray-100/30",
  },
  rare: {
    border: "card-border-rare",
    glow: "shadow-blue-300",
    text: "text-blue-600",
    gradient: "from-blue-300/30 to-blue-100/30",
  },
  epic: {
    border: "card-border-epic",
    glow: "shadow-purple-300",
    text: "text-purple-600",
    gradient: "from-purple-300/30 to-purple-100/30",
  },
  legendary: {
    border: "card-border-legendary",
    glow: "shadow-yellow-300",
    text: "text-yellow-600",
    gradient: "from-yellow-300/30 to-yellow-100/30",
  },
}

export default function DrawPage() {
  const { user, updateUserTickets, updateUserExp, refreshUserData, updateUserScore } = useAuth()
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawnCards, setDrawnCards] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<"regular" | "legendary">("regular")
  const [legendaryTickets, setLegendaryTickets] = useState(2)
  const [tickets, setTickets] = useState(0)
  const [hasPremiumPass, setHasPremiumPass] = useState(false)
  const [isUpdatingScore, setIsUpdatingScore] = useState(false)
  const [isMultiDraw, setIsMultiDraw] = useState(false) // Neu: für 5-Karten-Ziehen

  // Animation states
  const [showPackSelection, setShowPackSelection] = useState(true)
  const [showPackAnimation, setShowPackAnimation] = useState(false)
  const [packOpened, setPackOpened] = useState(false)
  const [showRarityText, setShowRarityText] = useState(false)
  const [showCards, setShowCards] = useState(false)
  const [cardRevealed, setCardRevealed] = useState(false)
  const [showXpAnimation, setShowXpAnimation] = useState(false)
  const [xpGained, setXpGained] = useState(0)
  const [showLevelUpAnimation, setShowLevelUpAnimation] = useState(false)
  const [newLevel, setNewLevel] = useState(1)
  const [scoreGained, setScoreGained] = useState(0)

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

  // Set isClient to true once component mounts
  useEffect(() => {
    setIsClient(true)

    // Refresh user data from database when component mounts
    refreshUserData?.()
  }, [refreshUserData])

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

  // Handle card tilt effect with improved sensitivity for reflections
  const handleCardMove = (event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!cardRef.current || !cardRevealed) return

    // Prevent default scrolling behavior
    event.preventDefault()

    const rect = cardRef.current.getBoundingClientRect()

    // Get coordinates
    let clientX, clientY

    if ("touches" in event) {
      // Touch event
      clientX = event.touches[0].clientX
      clientY = event.touches[0].clientY
    } else {
      // Mouse event
      clientX = event.clientX
      clientY = event.clientY
    }

    // Calculate position relative to card center with increased sensitivity
    const xPos = ((clientX - rect.left) / rect.width - 0.5) * 200
    const yPos = ((clientY - rect.top) / rect.height - 0.5) * 200

    // Update motion values with spring effect for smoother transitions
    x.set(xPos)
    y.set(yPos)
  }

  const handleCardLeave = () => {
    // Reset to center position with a smooth transition
    x.set(0, true)
    y.set(0, true)
  }

  const handleSelectPack = useCallback(
    async (cardType: string, count = 1) => {
      // Verhindere mehrfache Aufrufe wenn bereits ein Draw läuft
      if (isDrawing) {
        console.log("Draw already in progress, ignoring request")
        return
      }

      if (!user) {
        toast({ title: "Error", description: "You must be logged in.", variant: "destructive" })
        return
      }

      // Prüfen ob genug Tickets vorhanden sind
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

      // Setze Drawing State sofort um weitere Aufrufe zu verhindern
      setIsDrawing(true)
      setIsMultiDraw(count > 1)
      setShowPackSelection(false)
      setShowPackAnimation(true)
      setCurrentCardIndex(0)
      setCardRevealed(false)

      console.log(`Starting draw: ${count} ${cardType} pack(s)`)

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
        console.log("Draw result received:", result)

        // Mission tracking für legendary cards - zähle alle legendären Karten auf einmal
        const legendaryCards = result.drawnCards?.filter((card: any) => card.rarity === "legendary") || []
        if (legendaryCards.length > 0) {
          // Add legendary card mission update
          await incrementMission(user.username, "draw_legendary_card", legendaryCards.length)

          // Use the optimized batch update for weekly contest
          await incrementLegendaryDraw(user.username, legendaryCards.length)
        }

        if (cardType === "legendary") {
          await incrementMission(user.username, "open_legendary_pack", count)
          await incrementMission(user.username, "open_3_legendary_packs", count)
        } else {
          await incrementMission(user.username, "open_regular_pack", count)
        }

        if (result.success && result.drawnCards?.length > 0) {
          setDrawnCards(result.drawnCards)
          setTickets(result.newTicketCount ?? tickets)
          setLegendaryTickets(result.newLegendaryTicketCount ?? legendaryTickets)

          await updateUserTickets?.(
            result.newTicketCount ?? tickets,
            result.newLegendaryTicketCount ?? legendaryTickets,
          )

          let xpAmount = cardType === "legendary" ? 100 * count : 50 * count

          if (user?.username === "jiraiya") {
            xpAmount = 10 * count
          }
          setXpGained(xpAmount)

          const { leveledUp, newLevel: updatedLevel } = (await updateUserExp?.(xpAmount)) || {}
          if (leveledUp && updatedLevel) {
            setNewLevel(updatedLevel)
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
        // Stelle sicher, dass isDrawing zurückgesetzt wird, aber erst nach einer kurzen Verzögerung
        // um sicherzustellen, dass alle State-Updates abgeschlossen sind
        setTimeout(() => {
          setIsDrawing(false)
        }, 100)
      }
    },
    [isDrawing, user, legendaryTickets, tickets, updateUserTickets, updateUserExp],
  )

  const handleOpenPack = () => {
  setPackOpened(true)

  // Für Multi-Draw: Überspringe Rarity-Animation
  if (isMultiDraw) {
    setTimeout(() => {
      setShowCards(true)
      setCardRevealed(true)
      // Pack-Animation erst NACH dem Setzen der Card-States beenden
      setTimeout(() => {
        setShowPackAnimation(false)
      }, 50) // Kurze Verzögerung um sicherzustellen, dass Cards bereit sind
    }, 2500)
  } else {
    // Single-Draw Ablauf ohne White Flash
    setTimeout(() => {
      setShowRarityText(true)

      setTimeout(() => {
        setShowRarityText(false)
        setShowCards(true)
        setCardRevealed(true)
        
        // Pack-Animation erst NACH dem Setzen aller Card-States beenden
        setTimeout(() => {
          setShowPackAnimation(false)
        }, 50) // Kurze Verzögerung für nahtlosen Übergang
      }, 2000)
    }, 2500)
  }
}

  const finishCardReview = async () => {
    if (!user || drawnCards.length === 0 || isUpdatingScore) return

    setIsUpdatingScore(true)

    try {
      console.log("Updating score for drawn cards:", drawnCards)
      const scoreResult = await updateScoreForCards(user.username, drawnCards)

      if (scoreResult.success) {
        console.log("Score updated successfully:", scoreResult)
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

    setShowCards(false)

    // Für Multi-Draw: Überspringe XP-Animation
    if (isMultiDraw) {
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
      // Normale Single-Card Animation
      setShowXpAnimation(true)

      setTimeout(() => {
        setShowXpAnimation(false)

        if (newLevel > 1) {
          setShowLevelUpAnimation(true)

          if (user) {
            updateScoreForLevelUp(user.username)
              .then((result) => {
                if (result.success && updateUserScore) {
                  console.log("Level-up score updated successfully:", result)
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
    setIsMultiDraw(false) // Reset Multi-Draw Flag

    refreshUserData?.()

    toast({
      title: "Cards Added",
      description: `${isMultiDraw ? "The cards have" : "The card has"} been added to your collection!`,
      variant: "default",
    })
  }

  const getCurrentCard = () => {
    return drawnCards[currentCardIndex] || null
  }

  const getRarityStyles = (rarity: CardRarity) => {
    return RARITY_COLORS[rarity] || RARITY_COLORS.common
  }

  // Render a simple loading state until client-side hydration is complete
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
                {/* Tabs */}
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
                </div>

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
                            activeTab === "legendary"
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
                          {activeTab === "legendary" ? "Legendary" : "Regular"} Card Pack
                        </h3>
                        <p className="text-sm text-gray-500">Contains 1 random card</p>
                        <div className="flex items-center justify-center gap-1 mt-1 text-xs text-violet-600">
                          <Star className="h-3 w-3" />
                          <span>+{activeTab === "legendary" ? "100" : "50"} XP</span>
                        </div>
                      </div>

                      <div className="w-full space-y-2 mb-4">
                        {activeTab === "legendary" ? (
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
                                <span className="text-amber-500">10%</span>
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
                                    2%
                                  </span>
                                  {hasPremiumPass && <span className="text-amber-500 font-medium">6%</span>}
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

                      {/* Pack Buttons - Improved Horizontal Layout */}
                      <div className="w-full flex gap-4">
                        {/* Single Pack Button - Left */}
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

                        {/* 5 Pack Button - Right */}
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

          {/* Pack Animation Screen */}
          <AnimatePresence>
            {showPackAnimation && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 flex flex-col items-center justify-center z-50"
              >
                {/* Dark overlay */}
                <div className="absolute inset-0 bg-black opacity-80" />

                {/* Floating pack */}
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
                        activeTab === "legendary" ? "/anime-world-legendary-pack.jpg" : "/vibrant-purple-card-pack.jpg"
                      }
                      alt="Card Pack"
                      fill
                      className="object-contain"
                    />

                    {/* Light effect */}
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
                        activeTab === "legendary"
                          ? "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 rounded-full w-40"
                          : "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-full w-40"
                      }
                    >
                      Open
                    </Button>
                  )}
                </div>

                {/* Particles effect when pack opens */}
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

          {/* Rarity Text Animation - nur für Single Draw */}
          <AnimatePresence>
            {showRarityText && drawnCards.length > 0 && !isMultiDraw && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 flex flex-col items-center justify-center z-50"
              >
                {/* Dark overlay */}
                <div className="absolute inset-0 bg-black opacity-80" />

                {/* Flying Rarity Text */}
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
              </motion.div>
            )}
          </AnimatePresence>

          {/* Card Display Screen */}
          <AnimatePresence>
            {showCards && drawnCards.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 flex flex-col items-center justify-center z-50"
              >
                {/* Dark overlay */}
                <div className="absolute inset-0 bg-black opacity-80" />

                {/* Cards Container */}
                <div className="relative z-10 flex flex-col items-center">
                  {isMultiDraw ? (
                    // Multi-Card Display (5 große Karten nebeneinander)
                    <div className="flex gap-1 mb-8 overflow-x-auto max-w-full px-2 h-[60vh]">
                      {drawnCards.map((card, index) => {
                        const rarityStyles = getRarityStyles(card?.rarity)
                        return (
                          <motion.div
                            key={`multi-card-${index}`}
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
                            style={{
                              background: `linear-gradient(135deg, ${
                                card?.rarity === "legendary"
                                  ? "rgba(255, 215, 0, 0.3), rgba(255, 193, 7, 0.1)"
                                  : card?.rarity === "epic"
                                    ? "rgba(147, 51, 234, 0.3), rgba(139, 69, 193, 0.1)"
                                    : card?.rarity === "rare"
                                      ? "rgba(59, 130, 246, 0.3), rgba(96, 165, 250, 0.1)"
                                      : "rgba(107, 114, 128, 0.3), rgba(156, 163, 175, 0.1)"
                              })`,
                            }}
                          >
                            {/* Karten-Bild */}
                            <div className="absolute inset-0 w-full h-full">
                              <Image
                                src={card?.image_url || "/placeholder.svg?height=400&width=80"}
                                alt={card?.name || "Card"}
                                fill
                                className="object-cover object-center"
                                style={{ objectPosition: "center" }}
                                onError={(e) => {
                                  ;(e.target as HTMLImageElement).src = "/placeholder.svg?height=400&width=80"
                                }}
                              />
                            </div>

                            {/* Rarity Overlay Hintergrund */}
                            <div className={`absolute inset-0 bg-gradient-to-t ${rarityStyles.gradient} opacity-60`} />

                            {/* Rarity Glow Effect */}
                            <div
                              className={`absolute inset-0 ${rarityStyles.glow} opacity-40`}
                              style={{
                                boxShadow: `inset 0 0 20px ${
                                  card?.rarity === "legendary"
                                    ? "rgba(255, 215, 0, 0.5)"
                                    : card?.rarity === "epic"
                                      ? "rgba(147, 51, 234, 0.5)"
                                      : card?.rarity === "rare"
                                        ? "rgba(59, 130, 246, 0.5)"
                                        : "rgba(107, 114, 128, 0.5)"
                                }`,
                              }}
                            />

                            {/* Card Content Overlays */}
                            <div className="absolute inset-0 flex flex-col justify-end p-1">
                              {/* Bottom section mit Rarity */}
                              <div className="bg-black/70 backdrop-blur-sm rounded px-1 py-0.5 flex items-center justify-center">
                                <span className={`text-xs font-bold anime-text ${rarityStyles.text}`}>
                                  {card?.rarity?.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            </div>

                            {/* Special effects für legendary und epic cards */}
                            {(card?.rarity === "legendary" || card?.rarity === "epic") && (
                              <motion.div
                                className={`absolute inset-0 pointer-events-none mix-blend-overlay rounded-xl ${
                                  card?.rarity === "legendary" ? "bg-yellow-300" : "bg-purple-300"
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

                            {/* Shine effect - nur für legendary cards */}
                            {card?.rarity === "legendary" && (
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
                    // Single Card Display (Original)
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
                          {/* Card Front - This will show after flip */}
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
                            {/* Full art image takes up the entire card */}
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

                            {/* Dynamic light reflection effect - more responsive to tilt */}
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

                            {/* Card Content Overlays - Improved styling with smaller backgrounds and better positioning */}
                            <div className="absolute inset-0 flex flex-col justify-between">
                              {/* Top section with name - smaller background, closer to top edge */}
                              <div className="pt-1 pl-1">
                                <div className="bg-gradient-to-r from-black/70 via-black/50 to-transparent px-2 py-1 rounded-lg max-w-[85%] backdrop-blur-sm inline-block">
                                  <h3 className="font-bold text-white text-lg drop-shadow-md anime-text">
                                    {getCurrentCard()?.name}
                                  </h3>
                                </div>
                              </div>

                              {/* Bottom section with rarity - smaller background, closer to bottom edge */}
                              <div className="pb-1 pr-1 flex justify-end">
                                <div className="bg-gradient-to-l from-black/70 via-black/50 to-transparent px-2 py-1 rounded-lg flex items-center gap-1 backdrop-blur-sm">
                                  <span className="text-white text-sm font-semibold anime-text">
                                    {getCurrentCard()?.rarity?.toUpperCase()}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Special effects für legendary und epic cards */}
                            {(getCurrentCard()?.rarity === "legendary" || getCurrentCard()?.rarity === "epic") && (
                              <motion.div
                                className={`absolute inset-0 pointer-events-none mix-blend-overlay rounded-xl ${
                                  getCurrentCard()?.rarity === "legendary" ? "bg-yellow-300" : "bg-purple-300"
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

                            {/* Shine effect based on tilt - nur für legendary cards */}
                            {getCurrentCard()?.rarity === "legendary" && (
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

                          {/* Card Back - This will show first */}
                          <div className="absolute w-full h-full backface-hidden rotateY-180 rounded-xl bg-gradient-to-b from-blue-800 to-purple-900 border-4 border-yellow-500 flex items-center justify-center">
                            <div className="text-white text-center">
                              <h3 className="font-bold text-2xl anime-text">ANIME WORLD</h3>
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    )
                  )}

                  {/* Button to add card(s) to collection */}
                  <Button
                    onClick={() => finishCardReview()}
                    disabled={isUpdatingScore}
                    className={
                      activeTab === "legendary"
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
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* XP Gain Animation - nur für Single Draw */}
          <AnimatePresence>
            {showXpAnimation &&  (
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

                {/* Particles */}
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

                  {/* Added Continue button */}
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
        </main>

        <MobileNav />
      </div>
    </ProtectedRoute>
  )
}
