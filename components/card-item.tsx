import Link from "next/link"
import type { Card } from "@/types/card"
import { cn } from "@/lib/utils"
import Image from "next/image"

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
}: CardItemProps) {
  // Ensure we have a valid card with all required properties
  if (!id) {
    return null
  }

  // Map rarity to color and display name
  const rarityInfo = {
    common: { color: "bg-gray-700 text-gray-200", display: "C" },
    rare: { color: "bg-blue-700 text-blue-100", display: "R" },
    epic: { color: "bg-purple-700 text-purple-100", display: "E" },
    legendary: { color: "bg-amber-700 text-amber-100", display: "L" },
  }

  const rarityData = rarityInfo[rarity as keyof typeof rarityInfo] || rarityInfo.common
  const rarityColor = rarityData.color
  const rarityDisplay = rarityData.display

  // Generate a descriptive query for the character
  const query = `${character} from anime, high quality, detailed, vibrant colors`
  const placeholderUrl = `/placeholder.svg?height=400&width=300&query=${encodeURIComponent(query)}`

  // Use the provided imageUrl, or generate a placeholder
  const cardImageUrl = imageUrl || placeholderUrl

  return (
    <Link href={`/cards/${id}`} className="block h-full">
      <div
        className={cn(
          "h-full rounded-lg overflow-hidden border border-gray-200",
          "hover:shadow-lg transition-shadow duration-300",
          owned ? "" : "opacity-60 grayscale",
        )}
      >
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-gray-100">
          <Image
            src={cardImageUrl || "/placeholder.svg"}
            alt={`${name} - ${character}`}
            fill
            sizes="(max-width: 640px) 20vw, (max-width: 768px) 16vw, (max-width: 1024px) 20vw, 33vw"
            className="object-cover"
            priority={false}
          />

          {/* Rarity label */}
          <div className={`absolute top-1 right-1 px-1.5 py-0.5 rounded-full text-xs font-bold ${rarityColor}`}>
            {rarityDisplay}
          </div>

          {/* Card name overlay */}
          {showDetails && !compact && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6">
              <h3 className="font-bold text-xs truncate text-white">{name}</h3>
              <p className="text-[10px] text-gray-300 truncate">{character}</p>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}

export default CardItem
