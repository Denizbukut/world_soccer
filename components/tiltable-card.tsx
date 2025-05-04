"use client"

import type React from "react"

import { useRef, useState } from "react"
import { motion, useMotionValue, useTransform } from "framer-motion"
import Image from "next/image"
import { Star } from "lucide-react"

interface TiltableCardProps {
  id: string
  name: string
  character: string
  imageUrl?: string
  rarity: string
  level?: number
}

export default function TiltableCard({ id, name, character, imageUrl, rarity, level = 1 }: TiltableCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)

  // Motion values for tilt effect
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotateX = useTransform(y, [-100, 100], [15, -15])
  const rotateY = useTransform(x, [-100, 100], [-15, 15])
  const reflectionX = useTransform(x, [-100, 100], ["30%", "70%"])
  const reflectionY = useTransform(y, [-100, 100], ["30%", "70%"])
  const reflectionOpacity = useTransform(x, [-100, 0, 100], [0.7, 0.3, 0.7])

  // Map rarity to color and border styles
  const rarityStyles = {
    common: {
      border: "border-4 border-gray-400",
      glow: "shadow-gray-300",
      text: "text-gray-600",
      gradient: "from-gray-300/30 to-gray-100/30",
    },
    rare: {
      border: "border-4 border-blue-500",
      glow: "shadow-blue-300",
      text: "text-blue-600",
      gradient: "from-blue-300/30 to-blue-100/30",
    },
    epic: {
      border: "border-4 border-purple-500",
      glow: "shadow-purple-300",
      text: "text-purple-600",
      gradient: "from-purple-300/30 to-purple-100/30",
    },
    legendary: {
      border: "border-4 border-yellow-500",
      glow: "shadow-yellow-300",
      text: "text-yellow-600",
      gradient: "from-yellow-300/30 to-yellow-100/30",
    },
  }

  const rarityStyle = rarityStyles[rarity as keyof typeof rarityStyles] || rarityStyles.common

  // Generate a descriptive query for the character
  const query = `${character} from anime, high quality, detailed, vibrant colors`
  const placeholderUrl = `/placeholder.svg?height=400&width=300&query=${encodeURIComponent(query)}`

  // Use the provided imageUrl, or generate a placeholder
  const cardImageUrl = imageUrl || placeholderUrl

  // Handle card tilt effect with improved sensitivity for reflections
  const handleCardMove = (event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!cardRef.current) return

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
    setIsHovered(false)
  }

  return (
    <div className="perspective-1000 w-full">
      <motion.div
        ref={cardRef}
        className="relative w-full aspect-[3/4] preserve-3d cursor-pointer touch-none"
        onMouseMove={handleCardMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleCardLeave}
        onTouchMove={handleCardMove}
        onTouchEnd={handleCardLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
      >
        {/* Card with rarity-based styling */}
        <div className={`w-full h-full relative rounded-xl overflow-hidden ${rarityStyle.border}`}>
          {/* Card image */}
          <Image
            src={cardImageUrl || "/placeholder.svg"}
            alt={`${name} - ${character}`}
            fill
            className="object-cover"
            priority
          />

          {/* Card name overlay - more compact */}
          <div className="absolute top-1 left-1">
            <div className="bg-gradient-to-r from-black/70 to-transparent px-2 py-1 rounded-lg backdrop-blur-sm inline-block">
              <h3 className="font-bold text-white text-sm sm:text-base drop-shadow-md anime-text truncate">{name}</h3>
            </div>
          </div>

          {/* Level stars */}
          <div className="absolute bottom-1 left-0 right-0 flex justify-center">
            {Array.from({ length: level }).map((_, i) => (
              <div key={i} className="relative mx-0.5">
                {/* Base star with white border */}
                <Star
                  className="h-5 w-5 text-red-600 fill-red-600 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
                  strokeWidth={1.5}
                  stroke="white"
                />

                {/* Light reflection overlay */}
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/60 to-transparent rounded-full transform -rotate-45 scale-75 opacity-80"></div>
                </div>
              </div>
            ))}
          </div>

          {/* Dynamic light reflection effect - more responsive to tilt */}
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

          {/* Special effects for legendary and epic cards */}
          {(rarity === "legendary" || rarity === "epic") && (
            <motion.div
              className={`absolute inset-0 pointer-events-none mix-blend-overlay rounded-xl ${
                rarity === "legendary" ? "bg-yellow-300" : "bg-purple-300"
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
              background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.8) 50%, transparent 100%)",
              backgroundSize: "200% 100%",
              backgroundPosition: `${reflectionX.get()}% 0%`,
              opacity: reflectionOpacity,
            }}
          />
        </div>
      </motion.div>
    </div>
  )
}
