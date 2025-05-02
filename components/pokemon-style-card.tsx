"use client"

import type React from "react"
import { useState } from "react"
import { motion } from "framer-motion"
import Image from "next/image"

interface PokemonStyleCardProps {
  id: string
  name: string
  character: string
  imageUrl?: string
  rarity: string
  type?: string
  owned?: boolean
  compact?: boolean
  onClick?: () => void
}

export function PokemonStyleCard({
  id,
  name,
  character,
  imageUrl,
  rarity,
  type,
  owned = false,
  compact = false,
  onClick,
}: PokemonStyleCardProps) {
  const [rotation, setRotation] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)
  const [imageError, setImageError] = useState(false)

  // Map rarity to color and display name
  const rarityInfo = {
    common: { color: "bg-gray-700 text-gray-200", display: "Common" },
    rare: { color: "bg-blue-700 text-blue-100", display: "Rare" },
    epic: { color: "bg-purple-700 text-purple-100", display: "Epic" },
    legendary: { color: "bg-amber-700 text-amber-100", display: "Legendary" },
  }

  const rarityData = rarityInfo[rarity as keyof typeof rarityInfo] || rarityInfo.common
  const rarityColor = rarityData.color
  const rarityDisplay = rarityData.display

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!compact) {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width - 0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5
      setRotation({ x: y * 10, y: x * -10 })
      setIsHovered(true)
    }
  }

  const handleMouseLeave = () => {
    setRotation({ x: 0, y: 0 })
    setIsHovered(false)
  }

  // Generate a descriptive query for the character
  const query = `${character} from anime, high quality, detailed, vibrant colors`
  const placeholderUrl = `/placeholder.svg?height=400&width=300&query=${encodeURIComponent(query)}`

  // Use placeholder if image URL is missing or had an error
  const cardImageUrl = imageUrl && !imageError ? imageUrl : placeholderUrl

  return (
    <motion.div
      className="relative cursor-pointer"
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{ perspective: 1000 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        className="relative rounded-lg overflow-hidden border border-gray-200 bg-white"
        style={{
          transformStyle: "preserve-3d",
          transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {/* Card content */}
        <div className="relative bg-white rounded-lg overflow-hidden">
          {/* Card image */}
          <div className="relative aspect-[3/4] w-full overflow-hidden">
            <Image
              src={cardImageUrl || "/placeholder.svg"}
              alt={`${name} - ${character}`}
              fill
              className="object-cover"
              priority={false}
              onError={() => setImageError(true)}
            />

            {/* Rarity label */}
            <div className={`absolute top-1 right-1 px-1.5 py-0.5 rounded-full text-xs font-bold ${rarityColor}`}>
              {rarityDisplay}
            </div>

            {/* Card name overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6">
              <h3 className="font-bold text-xs text-white text-center">{name}</h3>
              <p className="text-[10px] text-gray-300 text-center">{character}</p>
            </div>
          </div>
        </div>

        {/* Card shine effect */}
        <div
          className={`absolute inset-0 bg-gradient-to-br from-white to-transparent opacity-0 pointer-events-none transition-opacity duration-300 ${
            isHovered ? "opacity-10" : ""
          }`}
          style={{
            backgroundSize: "200% 200%",
            backgroundPosition: `${50 + rotation.y * 5}% ${50 + rotation.x * 5}%`,
          }}
        />
      </motion.div>
    </motion.div>
  )
}
