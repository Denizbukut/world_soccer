"use client"

import type React from "react"

import Link from "next/link"
import type { Card } from "@/types/card"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { motion } from "framer-motion"
import { renderStars } from "@/utils/card-stars"
import { Badge } from "@/components/ui/badge"

interface CardItemProps {
  id: string
  name: string
  character: string
  imageUrl?: string
  rarity: string
  type?: string
  owned?: boolean
  compact?: boolean
  card?: Card
  showDetails?: boolean
  level?: number
  quantity?: number
  selected?: boolean
  onClick?: () => void
  selectable?: boolean
  isCollection?: boolean
  hideOverlay?: boolean
}

export function CardItem({
  id,
  name,
  character,
  imageUrl,
  rarity,
  type,
  owned = false,
  compact = false,
  card,
  showDetails = true,
  level = 1,
  quantity = 1,
  selected = false,
  onClick,
  selectable = false,
  isCollection = false,
  hideOverlay = false,
}: CardItemProps) {
  // Ensure we have a valid card with all required properties
  if (!id) {
    return null
  }

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

  // Create card wrapper based on whether it's clickable or selectable
  const CardWrapper = ({ children }: { children: React.ReactNode }) => {
    if (selectable) {
      return (
        <div
          onClick={onClick}
          className={cn(
            "cursor-pointer h-full transition-all duration-300",
            selected ? "ring-4 ring-blue-500 scale-105" : "",
          )}
        >
          {children}
        </div>
      )
    }

    if (onClick) {
      return (
        <div onClick={onClick} className="cursor-pointer h-full">
          {children}
        </div>
      )
    }

    return (
      <Link href={`/cards/${id}`} className="block h-full">
        {children}
      </Link>
    )
  }

  const rarityColors = {
    common: "bg-gray-400 text-gray-800",
    rare: "bg-blue-500 text-white",
    epic: "bg-purple-500 text-white",
    legendary: "bg-yellow-500 text-black",
  }

  return (
    <CardWrapper>
      <div
        className={cn(
          "h-full rounded-xl overflow-hidden",
          "hover:shadow-lg transition-shadow duration-300",
          owned ? "" : "opacity-60 grayscale",
        )}
      >
        <div className="relative aspect-[3/4] w-full overflow-hidden">
          {/* Card with rarity-based styling */}
          <div className={`w-full h-full relative rounded-xl ${isCollection || hideOverlay ? "" : rarityStyle.border}`}>
            {/* Card image */}
            <Image
              src={cardImageUrl || "/placeholder.svg"}
              alt={`${name} - ${character}`}
              fill
              sizes="(max-width: 640px) 20vw, (max-width: 768px) 16vw, (max-width: 1024px) 20vw, 33vw"
              className="object-cover"
              priority={false}
            />



            {/* Quantity badge (if more than 1) */}
            {quantity > 1 && (
              <div className="absolute top-1 right-1 bg-black/70 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                x{quantity}
              </div>
            )}

            {/* Card name overlay - only show if not in collection view and not hidden */}
            {!isCollection && !hideOverlay && (
              <div className="absolute top-1 left-1 right-1">
                <div className="bg-gradient-to-r from-black/70 via-black/50 to-transparent px-2 py-1 rounded-lg backdrop-blur-sm inline-block">
                  <h3 className="font-bold text-white text-xs sm:text-sm drop-shadow-md anime-text truncate">{name}</h3>
                </div>
              </div>
            )}

            {/* Level stars - only show in collection view */}
            {isCollection && (
              <div className="absolute bottom-1 left-0 right-0 flex justify-center">{renderStars(level, "xs")}</div>
            )}

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
          </div>
        </div>
      </div>
    </CardWrapper>
  )
}

export default CardItem
