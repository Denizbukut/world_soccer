"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { drawCards } from "@/app/actions"
import ProtectedRoute from "@/components/protected-route"
import MobileNav from "@/components/mobile-nav"
import { Button } from "@/components/ui/button"
import { Ticket, Crown, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { motion, AnimatePresence, useAnimation, type PanInfo } from "framer-motion"
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

  // Hydration safety
  const [isClient, setIsClient] = useState(false)

  // Card swiping states
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [direction, setDirection] = useState<"left" | "right" | null>(null)
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
      }, 2000) // Wait for rarity animation to complete
    }, 2500) // Increased from 1000ms to 2500ms for pack opening
  }

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 100
    if (info.offset.x > threshold) {
      // Swiped right
      handleSwipe("right")
    } else if (info.offset.x < -threshold) {
      // Swiped left
      handleSwipe("left")
    } else {
      // Reset position if not swiped far enough
      controls.start({ x: 0, transition: { type: "spring", stiffness: 300, damping: 20 } })
    }
  }

  const handleSwipe = async (dir: "left" | "right") => {
    setDirection(dir)

    // Animate the card off screen
    await controls.start({
      x: dir === "left" ? -window.innerWidth : window.innerWidth,
      opacity: 0,
      transition: { duration: 0.5 },
    })

    // Move to next card or finish
    if (currentCardIndex < drawnCards.length - 1) {
      setCurrentCardIndex((prev) => prev + 1)
      controls.set({ x: 0, opacity: 1 }) // Reset position for next card
      setDirection(null)
    } else {
      // All cards have been viewed
      finishCardReview()
    }
  }

  const finishCardReview = () => {
    // Reset all states to go back to pack selection
    setShowCards(false)
    setPackOpened(false)
    setShowPackSelection(true)
    setDrawnCards([])
    setDirection(null)

    toast({
      title: "Card Added",
      description: "The card has been added to your collection!",
      variant: "default",
    })
  }

  const getCurrentCard = () => {
    return drawnCards[currentCardIndex] || null
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

          {/* Card Swipe Screen */}
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

                {/* Swipe Instructions */}
                <div className="absolute top-16 left-0 right-0 flex justify-center z-20">
                  <div className="bg-white/10 px-4 py-2 rounded-lg text-white text-sm text-center">
                    Click buttons below to add card to collection
                  </div>
                </div>

                {/* Card */}
                <div className="relative z-10 flex flex-col items-center">
                  {getCurrentCard() && (
                    <motion.div
                      className="relative w-64 h-96 mb-8"
                      animate={controls}
                      initial={{ rotateY: 180, scale: 0.8 }}
                      whileInView={{ rotateY: 0, scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 70,
                        damping: 12,
                        duration: 1.5,
                      }}
                    >
                      <div
                        className={`w-full h-full rounded-lg overflow-hidden shadow-xl ${
                          getCurrentCard()?.rarity === "legendary"
                            ? "border-4 border-yellow-400 bg-gradient-to-b from-yellow-100 to-yellow-50"
                            : getCurrentCard()?.rarity === "epic"
                              ? "border-4 border-purple-500 bg-gradient-to-b from-purple-100 to-purple-50"
                              : getCurrentCard()?.rarity === "rare"
                                ? "border-4 border-blue-500 bg-gradient-to-b from-blue-100 to-blue-50"
                                : "border-4 border-gray-400 bg-gradient-to-b from-gray-100 to-gray-50"
                        }`}
                      >
                        {/* Card Header */}
                        <div className="p-2 flex justify-between items-center">
                          <span className="font-bold text-gray-800 text-sm">{getCurrentCard()?.name}</span>
                          <div
                            className={`h-3 w-3 rounded-full ${
                              getCurrentCard()?.rarity === "legendary"
                                ? "bg-yellow-400"
                                : getCurrentCard()?.rarity === "epic"
                                  ? "bg-purple-400"
                                  : getCurrentCard()?.rarity === "rare"
                                    ? "bg-blue-400"
                                    : "bg-gray-400"
                            }`}
                          ></div>
                        </div>

                        {/* Card Image */}
                        <div className="mx-2 bg-white p-1 rounded-sm border border-gray-300">
                          <div className="aspect-[3/4] relative rounded-sm overflow-hidden">
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
                        </div>

                        {/* Card Info */}
                        <div className="p-2 mt-1">
                          <div className="bg-white/80 p-2 rounded-sm border border-gray-300">
                            <div className="flex justify-between mb-1">
                              <span className="text-xs font-semibold">Character</span>
                              <span className="text-xs">{getCurrentCard()?.character}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-xs font-semibold">Rarity</span>
                              <span
                                className={`text-xs font-bold ${
                                  getCurrentCard()?.rarity === "legendary"
                                    ? "text-yellow-600"
                                    : getCurrentCard()?.rarity === "epic"
                                      ? "text-purple-600"
                                      : getCurrentCard()?.rarity === "rare"
                                        ? "text-blue-600"
                                        : "text-gray-600"
                                }`}
                              >
                                {getCurrentCard()?.rarity?.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Glowing effect for legendary and epic cards */}
                        {(getCurrentCard()?.rarity === "legendary" || getCurrentCard()?.rarity === "epic") && (
                          <motion.div
                            className={`absolute inset-0 pointer-events-none mix-blend-overlay rounded-lg ${
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

                        {/* Swipe direction indicators */}
                        <div
                          className={`absolute inset-0 flex items-center justify-start pl-4 opacity-0 ${direction === "left" ? "opacity-100" : ""}`}
                        >
                          <ChevronLeft className="h-12 w-12 text-white drop-shadow-lg" />
                        </div>
                        <div
                          className={`absolute inset-0 flex items-center justify-end pr-4 opacity-0 ${direction === "right" ? "opacity-100" : ""}`}
                        >
                          <ChevronRight className="h-12 w-12 text-white drop-shadow-lg" />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Buttons for adding card to collection */}
                  <div className="flex gap-4">
                    <Button
                      onClick={() => finishCardReview()}
                      className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                    >
                      Add to Collection
                    </Button>
                  </div>
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
