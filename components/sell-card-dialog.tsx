"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tag, X } from "lucide-react"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { createListing } from "@/app/actions/marketplace"
import { renderStars } from "@/utils/card-stars"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"

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
  const [price, setPrice] = useState<string>(getDefaultPrice(card.rarity, card.level).toString())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const router = useRouter()

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
    const calculatedPrice = Math.round(basePrice * (1 + (level - 1) * 0.5))

    // Stelle sicher, dass der Preis nicht über 500 liegt
    return Math.min(calculatedPrice, 500)
  }

  // Validiere den Preis
  const parsedPrice = Number.parseFloat(price.replace(",", "."))
  const isValidPrice = !isNaN(parsedPrice) && parsedPrice >= 0.1 && parsedPrice <= 500

  // Formatiere den Preis für die Anzeige
  const formatPrice = (value: string) => {
    const num = Number.parseFloat(value.replace(",", "."))
    return !isNaN(num) ? num.toFixed(2) : "0.00"
  }

  // Karte zum Verkauf anbieten
  const handleSell = async () => {
    if (!isValidPrice || !username || !card) return

    setIsSubmitting(true)
    setError(null)

    try {
      console.log("Selling card:", {
        username,
        cardId: card.id,
        cardUuid: card.card_id,
        price: Number.parseFloat(parsedPrice.toFixed(2)),
        level: card.level,
      })

      // Verwende die ID aus der user_cards-Tabelle
      const result = await createListing(
        username,
        card.id,
        card.card_id,
        Number.parseFloat(parsedPrice.toFixed(2)),
        card.level,
      )

      if (result.success) {
        setShowSuccess(true)

        // Zeige die Erfolgsmeldung für 1.5 Sekunden an, dann leite weiter
        setTimeout(() => {
          onSuccess?.()
          onClose()
          // Leite zur Trade-Seite weiter
          router.push("/trade")
        }, 1500)
      } else {
        console.error("Error from createListing:", result.error)
        setError(result.error || "Failed to list your card")
        toast({
          title: "Error",
          description: result.error || "Failed to list your card",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Exception in handleSell:", error)
      setError("An unexpected error occurred")
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
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!isSubmitting && !showSuccess) {
          onClose()
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sell Card</DialogTitle>
        </DialogHeader>

        <AnimatePresence>
          {showSuccess ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-col items-center justify-center p-6 text-center"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1, rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4"
              >
                <Tag className="h-10 w-10 text-green-500" />
              </motion.div>
              <motion.h3
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-xl font-bold mb-2"
              >
                Card Listed!
              </motion.h3>
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-gray-500"
              >
                Your card has been listed for {formatPrice(price)} WLD
              </motion.p>
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-2 text-sm text-blue-500"
              >
                Redirecting to marketplace...
              </motion.div>
            </motion.div>
          ) : (
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
                <Label htmlFor="price">Set Price (WLD)</Label>
                <div className="relative">
                  <Input
                    id="price"
                    type="text"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className=""
                  />
                </div>
                {!isValidPrice && (
                  <p className="text-red-500 text-sm">Please enter a valid price between 0.1 and 500 WLD</p>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 p-3 rounded-lg text-sm">
                  <p className="text-red-600 font-medium">Error: {error}</p>
                </div>
              )}

              {/* Market Fee Info */}
              <div className="bg-gray-50 p-3 rounded-lg text-sm">
                <p className="text-gray-700">
                  <span className="font-medium">Market Fee:</span> 0 WLD (0%)
                </p>
                <p className="text-gray-700 mt-1">
                  <span className="font-medium">You'll Receive:</span> {formatPrice(price)} WLD
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
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
