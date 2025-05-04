"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { drawCards } from "@/app/actions"
import ProtectedRoute from "@/components/protected-route"
import MobileNav from "@/components/mobile-nav"
import { Button } from "@/components/ui/button"
import { Ticket, Crown, Sparkles } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { motion, AnimatePresence, useAnimation, useMotionValue, useTransform } from "framer-motion"
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
  }, [])

  // Update legendary tickets when user changes
  useEffect(() => {
    if (user?.legendary_tickets !== undefined) {
      setLegendaryTickets(user.legendary_tickets)
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
                  <Ticket className="h-3.5 w-3.5 text-violet-500" />
                  <span className="font-medium text-sm">{user?.tickets || 0}</span>
                </div>
                <div className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
                  <Crown className="h-3.5 w-3.5 text-amber-500" />
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
                        ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white"
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
                        ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
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
                              ? "/anime-world-legendary-pack.png"
                              : "/vibrant-purple-card-pack.png"
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
                              <span className="text-amber-500">5%</span>
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
                              <span className="text-amber-500">0.5%</span>
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
                            ? "w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-full"
                            : "w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 rounded-full"
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
                          ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-full w-40"
                          : "bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 rounded-full w-40"
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

                {/* Card */}
                <div className="relative z-10 flex flex-col items-center">
                  {getCurrentCard() && (
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
                                {getCurrentCard()?.rarity === "legendary" && (
                                  <Sparkles className="h-4 w-4 text-yellow-400" />
                                )}
                              </div>
                            </div>
                          </div>

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

                          {/* Shine effect based on tilt */}
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
                        </motion.div>

                        {/* Card Back - This will show first */}
                        <div className="absolute w-full h-full backface-hidden rotateY-180 rounded-xl bg-gradient-to-b from-blue-800 to-purple-900 border-4 border-yellow-500 flex items-center justify-center">
                          <div className="text-white text-center">
                            <h3 className="font-bold text-2xl anime-text">ANIME WORLD</h3>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  )}

                  {/* Button to add card to collection */}
                  <Button
                    onClick={() => finishCardReview()}
                    className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 px-8 rounded-full"
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
