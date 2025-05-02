"use client"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { useState, useEffect } from "react"
import confetti from "canvas-confetti"
import type { Card } from "@/types/card"

export default function EpicCardReveal({
  card,
  onFinish,
  isOpen,
  onClose,
}: {
  card: Card
  onFinish?: () => void
  isOpen: boolean
  onClose: () => void
}) {
  const [revealed, setRevealed] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(false)

  // Map our rarity to the expected format
  const rarityMap: Record<string, "SSR" | "SR" | "S" | "A" | "B"> = {
    legendary: "SSR",
    "ultra-rare": "SR",
    rare: "S",
    uncommon: "A",
    common: "B",
  }

  const rarity = rarityMap[card.rarity] || "B"

  const glowColor = {
    SSR: "from-red-500 to-yellow-400",
    SR: "from-blue-500 to-cyan-400",
    S: "from-yellow-400 to-white",
    A: "from-blue-400 to-indigo-500",
    B: "from-purple-500 to-pink-400",
  }[rarity]

  // Reset state when the component opens
  useEffect(() => {
    if (isOpen) {
      setRevealed(false)

      // Set a timer to reveal the card
      const timer = setTimeout(() => {
        setRevealed(true)

        // Play sound if enabled
        if (audioEnabled) {
          const audio = new Audio("/sounds/card-reveal.mp3")
          audio.volume = 0.5
          audio.play().catch((e) => console.error("Error playing sound:", e))
        }

        // Trigger rarity-specific effects
        triggerRarityEffect(card.rarity)
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [isOpen, card.rarity, audioEnabled])

  // Trigger rarity-specific effects
  const triggerRarityEffect = (rarity: string) => {
    const colors = getRarityColors(rarity)

    switch (rarity) {
      case "legendary":
        // Gold confetti explosion
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.6, x: 0.5 },
          colors,
          ticks: 300,
          gravity: 0.8,
          scalar: 2,
          shapes: ["circle", "square"],
        })

        // Side confetti
        setTimeout(() => {
          confetti({
            particleCount: 50,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.65 },
            colors,
          })
          confetti({
            particleCount: 50,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.65 },
            colors,
          })
        }, 300)
        break

      case "ultra-rare":
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors,
          ticks: 200,
        })
        break

      case "rare":
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors,
          ticks: 150,
        })
        break
    }
  }

  // Get colors based on card rarity
  const getRarityColors = (rarity: string): string[] => {
    switch (rarity) {
      case "legendary":
        return ["#FFD700", "#FFC800", "#FFAF00", "#FFD700", "#FFEC00"]
      case "ultra-rare":
        return ["#9C27B0", "#673AB7", "#BA68C8", "#7B1FA2", "#6A1B9A"]
      case "rare":
        return ["#2196F3", "#1976D2", "#64B5F6", "#0D47A1", "#42A5F5"]
      case "uncommon":
        return ["#4CAF50", "#388E3C", "#81C784", "#2E7D32", "#66BB6A"]
      default:
        return ["#9E9E9E", "#757575", "#BDBDBD", "#616161", "#E0E0E0"]
    }
  }

  // Handle animation complete
  const handleAnimationComplete = () => {
    // Call onFinish callback if provided
    setTimeout(() => {
      onFinish?.()
    }, 1000)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-90" onClick={revealed ? onClose : undefined} />

      {/* Sound toggle button */}
      <button
        onClick={() => setAudioEnabled(!audioEnabled)}
        className="absolute top-4 left-4 z-30 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
      >
        {audioEnabled ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
        )}
      </button>

      {/* Close button (only visible after animation completes) */}
      {revealed && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}

      <div className="w-full h-screen flex items-center justify-center relative overflow-hidden">
        {/* Energy Swirl Background */}
        <motion.div className="absolute w-[150vw] h-[150vw] rounded-full bg-gradient-radial from-purple-900 via-transparent to-transparent opacity-30 blur-3xl animate-spin-slow" />

        {/* Light Beam Entrance */}
        <AnimatePresence>
          {!revealed && (
            <motion.div
              className="absolute w-2 h-full bg-white opacity-60 blur-2xl z-20"
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
            />
          )}
        </AnimatePresence>

        {/* Card Entrance with Epic Flip */}
        <motion.div
          initial={{ scale: 0.4, rotateY: 180, opacity: 0 }}
          animate={{
            scale: revealed ? 1 : 0.4,
            rotateY: revealed ? 0 : 180,
            opacity: revealed ? 1 : 0,
          }}
          transition={{ duration: 1, ease: "easeOut" }}
          onAnimationComplete={handleAnimationComplete}
          className="z-30"
        >
          <div
            className={`p-1 bg-gradient-to-br ${glowColor} rounded-2xl shadow-[0_0_40px_10px_rgba(255,255,255,0.2)]`}
          >
            <Image
              src={card.image_url || "/placeholder.svg"}
              alt={card.name}
              width={320}
              height={480}
              className="rounded-xl shadow-2xl"
              onError={(e) => {
                // Fallback to placeholder on error
                ;(e.target as HTMLImageElement).src = "/vibrant-city-explorer.png"
              }}
            />
          </div>
        </motion.div>

        {/* Sparkle / Particles after reveal */}
        {revealed && (
          <>
            <motion.div
              className="absolute w-32 h-32 bg-white rounded-full opacity-20 blur-3xl top-1/3 left-1/2 -translate-x-1/2 animate-ping"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            />
            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div className="absolute w-full h-full bg-gradient-to-br from-white/10 to-transparent animate-fadeIn" />
            </motion.div>
          </>
        )}

        {/* Continue button (only shown when animation completes) */}
        {revealed && (
          <motion.button
            className="absolute bottom-20 px-10 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full text-white font-bold shadow-lg hover:shadow-xl transition-all z-40"
            onClick={onClose}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Add to Collection
          </motion.button>
        )}
      </div>
    </div>
  )
}
