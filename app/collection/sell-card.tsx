"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Coins, Tag, X } from "lucide-react"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { createListing } from "@/app/actions/marketplace"
import { renderStars } from "@/utils/card-stars"

// Definiere den Typ für eine Karte
type UserCard = {
  id: number // Die eindeutige ID aus der user_cards-Tabelle
  card_id: string
  name: string
  character: string
  image_url?: string
  rarity: "common" | "rare" | "epic" | "legendary"
  level: number
  quantity: number
}

interface SellCardDialogProps {
  isOpen: boolean
  onClose: () => void
  card: UserCard
  username: string
  onSuccess?: () => void
}

export default function SellCardDialog({ isOpen, onClose, card, username, onSuccess }: SellCardDialogProps) {
  const [price, setPrice] = useState<number>(getDefaultPrice(card.rarity, card.level))
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Standardpreise basierend auf Seltenheit und Level
  function getDefaultPrice(rarity: string, level: number): number {
    const basePrice =
      {
        common: 50,
        rare: 150,
        epic: 500,
        legendary: 2000,
      }[rarity] || 50

    // Erhöhe den Preis basierend auf dem Level
    return Math.round(basePrice * (1 + (level - 1) * 0.5))
  }

  // Validiere den Preis
  const isValidPrice = price > 0 && price <= 100000 && !isNaN(price)

  // Karte zum Verkauf anbieten
  const handleSell = async () => {
    if (!isValidPrice || !username || !card) return

    setIsSubmitting(true)
    try {
      // Verwende die ID aus der user_cards-Tabelle
      const result = await createListing(username, card.id, card.card_id, price, card.level)

      if (result.success) {
        toast({
          title: "Success",
          description: "Your card has been listed for sale!",
        })
        onSuccess?.()
        onClose()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to list your card",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error listing card:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Map rarity to color styles
  const rarityStyles = {
    common: {
      border: "border-gray-400",
      text: "text-gray-600",
      badge: "bg-gray-500",
    },
    rare: {
      border: "border-blue-500",
      text: "text-blue-600",
      badge: "bg-blue-500",
    },
    epic: {
      border: "border-purple-500",
      text: "text-purple-600",
      badge: "bg-purple-500",
    },
    legendary: {
      border: "border-yellow-500",
      text: "text-yellow-600",
      badge: "bg-amber-500",
    },
  }

  const rarityStyle = rarityStyles[card?.rarity || "common"]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sell Card</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Card Preview */}
          <div className="flex gap-4 items-center">
            <div className={`relative w-20 h-28 overflow-hidden rounded-lg border-2 ${rarityStyle.border}`}>
              <Image
                src={
                  card?.image_url ||
                  `/placeholder.svg?height=400&width=300&query=${encodeURIComponent(card?.character || "anime character")}`
                }
                alt={card?.name || "Card"}
                fill
                className="object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 flex justify-center">
                {renderStars(card?.level || 1, "xs")}
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-medium">{card?.name}</h3>
              <p className="text-sm text-gray-500">{card?.character}</p>
              <div className="flex items-center mt-1">
                <Badge className={rarityStyle.badge}>{card?.rarity}</Badge>
                <span className="ml-2 text-sm text-gray-500">
                  Level {card?.level} • {card?.quantity > 1 ? `${card?.quantity} copies` : "1 copy"}
                </span>
              </div>
            </div>
          </div>

          {/* Price Input */}
          <div className="space-y-2">
            <Label htmlFor="price">Set Price (Coins)</Label>
            <div className="relative">
              <Coins className="absolute left-3 top-2.5 h-5 w-5 text-amber-500" />
              <Input
                id="price"
                type="number"
                min="1"
                max="100000"
                value={price}
                onChange={(e) => setPrice(Number.parseInt(e.target.value))}
                className="pl-10"
              />
            </div>
            {!isValidPrice && (
              <p className="text-red-500 text-sm">Please enter a valid price between 1 and 100,000 coins</p>
            )}
          </div>

          {/* Market Fee Info */}
          <div className="bg-gray-50 p-3 rounded-lg text-sm">
            <p className="text-gray-700">
              <span className="font-medium">Market Fee:</span> 0 coins (0%)
            </p>
            <p className="text-gray-700 mt-1">
              <span className="font-medium">You'll Receive:</span> {price} coins
            </p>
          </div>

          {/* Warning for last copy */}
          {card?.quantity === 1 && (
            <div className="bg-amber-50 p-3 rounded-lg text-sm">
              <p className="text-amber-800 font-medium">This is your last copy of this card!</p>
              <p className="text-amber-700 mt-1">
                If you sell it, you won't have this card in your collection until you get it again.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button
              onClick={handleSell}
              disabled={!isValidPrice || isSubmitting}
              className="bg-gradient-to-r from-violet-500 to-fuchsia-500"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Tag className="h-4 w-4 mr-2" />
                  List for Sale
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
