"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { drawCards } from "@/app/actions"
import ProtectedRoute from "@/components/protected-route"
import MobileNav from "@/components/mobile-nav"
import { Button } from "@/components/ui/button"
import { Ticket, Crown, Sparkles } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { motion, AnimatePresence, useAnimation } from "framer-motion"
import Image from "next/image"

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
    border: "border-gray-400",
    bg: "from-gray-200 to-gray-50",
    text: "text-gray-600",
    glow: "bg-gray-300",
    accent: "bg-gray-400",
  },
  rare: {
    border: "border-blue-500",
    bg: "from-blue-200 to-blue-50",
    text: "text-blue-600",
    glow: "bg-blue-300",
    accent: "bg-blue-400",
  },
  epic: {
    border: "border-purple-500",
    bg: "from-purple-200 to-purple-50",
    text: "text-purple-600",
    glow: "bg-purple-300",
    accent: "bg-purple-400",
  },
  legendary: {
    border: "border-yellow-400",
    bg: "from-yellow-200 to-yellow-50",
    text: "text-yellow-600",
    glow: "bg-yellow-300",
    accent: "bg-yellow-400",
  },
}

export default function DrawPage() {
  const { user, updateUserTickets } = useAuth()
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawnCards, setDrawnCards] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<"regular" | "legendary">("regular")
  const [legendaryTickets, setLegendaryTickets] = useState(2)

  // Animation states
  const [showPackSelection, setShowPackSelection] = useState(true)
  const [showPackAnimation, setShowPackAnimation] = useState(false)
  const [packOpened, setPackOpened] = useState(false)
  const [showRarityText, setShowRarityText] = useState(false)
  const [showCards, setShowCards] = useState(false)
  const [cardRevealed, setCardRevealed] = useState(false)

  // Hydration safety
  const [isClient, setIsClient] = useState(false)

  // Card states
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const controls = useAnimation()

  // Set isClient to true once component mounts
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Update legendary tickets when user changes
  useEffect(() => {
    if (user?.tickets !== undefined) {
      setLegendaryTickets(user.tickets)
    }
  }, [user])

  // Update the error handling in handleSelectPack to provide more information
  const handleSelectPack = async (cardType: string) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in.", variant: "destructive" })
      return
    }

    setIsDrawing(true)
    setShowPackSelection(false)
    setShowPackAnimation(true)
    setCurrentCardIndex(0)
    setCardRevealed(false)

    try {
      const result = await drawCards(user.username, cardType, 1)
      console.log("Draw result:", result)

      if (result.success && result.drawnCards && result.drawnCards.length > 0) {
        await updateUserTickets?.(result.newTicketCount)
        if (result.newLegendaryTicketCount !== undefined) {
          setLegendaryTickets(result.newLegendaryTicketCount)
        }
        setDrawnCards(result.drawnCards)
        console.log("Drawn cards set:", result.drawnCards)
      } else {
        console.error("Draw failed or no cards returned:", result.error)
        toast({
          title: "Error",
          description: result.error || "Failed to draw cards",
          variant: "destructive",
        })
        setDrawnCards(FALLBACK_CARDS.slice(0, 1))
      }
    } catch (error) {
      console.error("Error drawing cards:", error)
      toast({
        title: "Error",
        description: "Something went wrong while drawing cards.",
        variant: "destructive",
      })
      setDrawnCards(FALLBACK_CARDS.slice(0, 1))
    } finally {
      setIsDrawing(false)
    }
  }

  const handleOpenPack = () => {
    setPackOpened(true)

    // After a delay, show the rarity text of the first card
    setTimeout(() => {
      setShowPackAnimation(false)
      setShowRarityText(true)

      // After the rarity animation completes, show the cards
      setTimeout(() => {
        setShowRarityText(false)
        setShowCards(true)

        // Reveal card after a short delay
        setTimeout(() => {
          setCardRevealed(true)
        }, 500)
      }, 2000) // Wait for rarity animation to complete
    }, 2500) // Increased from 1000ms to 2500ms for pack opening
  }

  const finishCardReview = () => {
    // Reset all states to go back to pack selection
    setShowCards(false)
    setPackOpened(false)
    setShowPackSelection(true)
    setDrawnCards([])
    setCardRevealed(false)

    toast({
      title: "Card Added",
      description: "The card has been added to your collection!",
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
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 pb-20">
          <header className="bg-white border-b border-gray-200 p-4 relative z-10">
            <div className="flex justify-between items-center">
              <h1 className="text-xl font-bold">Card Packs</h1>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-gray-100 px-3 py-1.5 rounded-full">
                  <Ticket className="h-4 w-4 text-blue-500" />
                  <span className="font-bold">0</span>
                </div>
                <div className="flex items-center gap-1 bg-gray-100 px-3 py-1.5 rounded-full">
                  <Crown className="h-4 w-4 text-yellow-500" />
                  <span className="font-bold">0</span>
                </div>
              </div>
            </div>
          </header>
          <main className="p-4 space-y-6">
            <div className="flex rounded-xl overflow-hidden mb-6 border border-gray-200">
              <button className="flex-1 py-3 px-4 text-center font-medium transition-all bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                <div className="flex items-center justify-center gap-2">
                  <Ticket className="h-4 w-4" />
                  <span>Regular Pack</span>
                </div>
              </button>
              <button className="flex-1 py-3 px-4 text-center font-medium transition-all bg-white text-gray-500">
                <div className="flex items-center justify-center gap-2">
                  <Crown className="h-4 w-4" />
                  <span>Legendary Pack</span>
                </div>
              </button>
            </div>
            <div className="bg-white rounded-xl overflow-hidden shadow-md p-4">
              <div className="flex flex-col items-center">
                <div className="relative w-48 h-64 mb-4">
                  <div className="w-full h-full bg-gray-200 animate-pulse rounded-lg"></div>
                </div>
                <div className="text-center mb-4">
                  <h3 className="text-lg font-bold">Loading...</h3>
                </div>
              </div>
            </div>
          </main>
          <MobileNav />
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 pb-20">
        {/* Header with tickets */}
        <header className="bg-white border-b border-gray-200 p-4 relative z-10">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold">Card Packs</h1>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-gray-100 px-3 py-1.5 rounded-full">
                <Ticket className="h-4 w-4 text-blue-500" />
                <span className="font-bold">{user?.tickets || 0}</span>
              </div>
              <div className="flex items-center gap-1 bg-gray-100 px-3 py-1.5 rounded-full">
                <Crown className="h-4 w-4 text-yellow-500" />
                <span className="font-bold">{legendaryTickets}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 space-y-6">
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
                <div className="flex rounded-xl overflow-hidden mb-6 border border-gray-200">
                  <button
                    onClick={() => setActiveTab("regular")}
                    className={`flex-1 py-3 px-4 text-center font-medium transition-all ${
                      activeTab === "regular"
                        ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                        : "bg-white text-gray-500"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Ticket className="h-4 w-4" />
                      <span>Regular Pack</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab("legendary")}
                    className={`flex-1 py-3 px-4 text-center font-medium transition-all ${
                      activeTab === "legendary"
                        ? "bg-gradient-to-r from-yellow-500 to-amber-500 text-white"
                        : "bg-white text-gray-500"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Crown className="h-4 w-4" />
                      <span>Legendary Pack</span>
                    </div>
                  </button>
                </div>

                {/* Pack UI */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white rounded-xl overflow-hidden shadow-md"
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
                              ? "/anime-world-legendary-pack.png"
                              : "/vibrant-purple-card-pack.png"
                          }
                          alt="Card Pack"
                          fill
                          className="object-contain"
                        />
                      </motion.div>

                      <div className="text-center mb-4">
                        <h3 className="text-lg font-bold">
                          {activeTab === "legendary" ? "Legendary" : "Regular"} Card Pack
                        </h3>
                        <p className="text-sm text-gray-500">Contains 1 random card</p>
                      </div>

                      <div className="w-full space-y-2 mb-4">
                        {activeTab === "legendary" ? (
                          <>
                            <div className="flex justify-between items-center text-sm">
                              <span>Common</span>
                              <span className="text-gray-500">30%</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <span>Rare</span>
                              <span className="text-blue-500">40%</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <span>Epic</span>
                              <span className="text-purple-500">25%</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <span>Legendary</span>
                              <span className="text-yellow-500">5%</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between items-center text-sm">
                              <span>Common</span>
                              <span className="text-gray-500">59%</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <span>Rare</span>
                              <span className="text-blue-500">35.5%</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <span>Epic</span>
                              <span className="text-purple-500">5%</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <span>Legendary</span>
                              <span className="text-yellow-500">0.5%</span>
                            </div>
                          </>
                        )}
                      </div>

                      <Button
                        onClick={() => handleSelectPack(activeTab === "legendary" ? "legendary" : "common")}
                        disabled={
                          isDrawing || (activeTab === "legendary" ? legendaryTickets < 1 : (user?.tickets || 0) < 1)
                        }
                        className={
                          activeTab === "legendary"
                            ? "w-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600"
                            : "w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                        }
                      >
                        {isDrawing ? (
                          <div className="flex items-center justify-center">
                            <div className="h-5 w-5 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
                            <span>Opening...</span>
                          </div>
                        ) : (
                          <>
                            {activeTab === "legendary" ? (
                              <>
                                <Crown className="h-4 w-4 mr-2" />
                                Open Pack (1 Legendary Ticket)
                              </>
                            ) : (
                              <>
                                <Ticket className="h-4 w-4 mr-2" />
                                Open Pack (1 Ticket)
                              </>
                            )}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </motion.div>
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
                        activeTab === "legendary" ? "/anime-world-legendary-pack.png" : "/vibrant-purple-card-pack.png"
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
                          ? "bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 w-40"
                          : "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 w-40"
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
                          activeTab === "legendary" ? "bg-yellow-400" : "bg-purple-400"
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
                    className={`text-5xl font-bold ${
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

                {/* Instructions */}
                <div className="absolute top-16 left-0 right-0 flex justify-center z-20">
                  <div className="bg-white/10 px-4 py-2 rounded-lg text-white text-sm text-center">
                    Click the button below to add card to your collection
                  </div>
                </div>

                {/* Card */}
                <div className="relative z-10 flex flex-col items-center">
                  {getCurrentCard() && (
                    <div className="perspective-1000 mb-8">
                      <motion.div
                        className="relative w-72 h-96 preserve-3d"
                        initial={{ rotateY: 180 }}
                        animate={{ rotateY: cardRevealed ? 0 : 180 }}
                        transition={{
                          type: "spring",
                          stiffness: 70,
                          damping: 15,
                          duration: 1.5,
                        }}
                      >
                        {/* Card Back */}
                        <div className="absolute w-full h-full backface-hidden rounded-xl bg-gradient-to-b from-blue-800 to-purple-900 border-4 border-yellow-500 flex items-center justify-center">
                          <div className="text-white text-center">
                            <h3 className="font-bold text-2xl">ANIME WORLD</h3>
                          </div>
                        </div>

                        {/* Card Front */}
                        <div className="absolute w-full h-full backface-hidden rounded-xl overflow-hidden rotateY-180">
                          {/* Card Container with Rarity-based styling */}
                          <div
                            className={`w-full h-full relative ${
                              getRarityStyles(getCurrentCard()?.rarity).border
                            } border-4 shadow-xl`}
                          >
                            {/* Background gradient */}
                            <div
                              className={`absolute inset-0 bg-gradient-to-b ${getRarityStyles(getCurrentCard()?.rarity).bg}`}
                            ></div>

                            {/* Card Content */}
                            <div className="relative z-10 h-full flex flex-col">
                              {/* Card Header with Name and Rarity Indicator */}
                              <div className="p-3 flex justify-between items-center">
                                <div className="bg-white/90 px-2 py-1 rounded-md shadow-sm">
                                  <h3 className="font-bold text-gray-800 text-sm">{getCurrentCard()?.name}</h3>
                                </div>
                                <div
                                  className={`h-5 w-5 rounded-full ${getRarityStyles(getCurrentCard()?.rarity).accent} shadow-md flex items-center justify-center`}
                                >
                                  {getCurrentCard()?.rarity === "legendary" && (
                                    <Sparkles className="h-3 w-3 text-white" />
                                  )}
                                </div>
                              </div>

                              {/* Card Image with Frame */}
                              <div className="px-3">
                                <div className="bg-gradient-to-b from-white to-gray-100 p-1 rounded-lg shadow-md">
                                  <div className="aspect-[3/4] relative rounded-md overflow-hidden">
                                    <Image
                                      src={getCurrentCard()?.image_url || "/placeholder.svg?height=300&width=200"}
                                      alt={getCurrentCard()?.name}
                                      fill
                                      className="object-cover"
                                      onError={(e) => {
                                        ;(e.target as HTMLImageElement).src = "/placeholder.svg?height=300&width=200"
                                      }}
                                    />

                                    {/* Overlay gradient for better text contrast */}
                                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/60 to-transparent"></div>

                                    {/* Character name overlay */}
                                    <div className="absolute bottom-2 left-2 right-2 text-white">
                                      <div className="text-sm font-bold drop-shadow-md">
                                        {getCurrentCard()?.character}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Card Info */}
                              <div className="p-3 mt-auto">
                                <div className="bg-white/90 p-2 rounded-lg shadow-md border border-gray-200">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs font-semibold">Type</span>
                                    <span className="text-xs">{getCurrentCard()?.type || "Standard"}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs font-semibold">Rarity</span>
                                    <span
                                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${getRarityStyles(getCurrentCard()?.rarity).text} bg-opacity-20 ${getRarityStyles(getCurrentCard()?.rarity).accent}`}
                                    >
                                      {getCurrentCard()?.rarity?.toUpperCase()}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Card Footer */}
                              <div className="p-3 pt-0">
                                <div className="flex justify-between items-center">
                                  <div className="text-[10px] text-gray-600 bg-white/70 px-1 py-0.5 rounded">
                                    #{getCurrentCard()?.id}
                                  </div>
                                  <div className="text-[10px] font-semibold text-gray-600 bg-white/70 px-1 py-0.5 rounded">
                                    ANIME WORLD
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Shine effect */}
                            <motion.div
                              className="absolute inset-0 pointer-events-none"
                              initial={{ backgroundPosition: "200% 0%" }}
                              animate={{ backgroundPosition: ["-100% 0%", "200% 0%"] }}
                              transition={{
                                repeat: Number.POSITIVE_INFINITY,
                                repeatDelay: 3,
                                duration: 1.5,
                              }}
                              style={{
                                background:
                                  "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.8) 50%, transparent 100%)",
                                backgroundSize: "200% 100%",
                              }}
                            />

                            {/* Special effects for legendary and epic cards */}
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
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  )}

                  {/* Button to add card to collection */}
                  <Button
                    onClick={() => finishCardReview()}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 px-8"
                    size="lg"
                  >
                    Add to Collection
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <MobileNav />
      </div>
    </ProtectedRoute>
  )
}
