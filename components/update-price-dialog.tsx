"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Edit, X } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { updateListingPrice } from "@/app/actions/marketplace"

interface UpdatePriceDialogProps {
  isOpen: boolean
  onClose: () => void
  listingId: string
  currentPrice: number
  username: string
  onSuccess?: () => void
  cardRarity: string
}

export default function UpdatePriceDialog({
  isOpen,
  onClose,
  listingId,
  currentPrice,
  username,
  onSuccess,
  cardRarity,
}: UpdatePriceDialogProps) {
  const [price, setPrice] = useState<string>(currentPrice.toString())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Validiere den Preis
  const parsedPrice = Number.parseFloat(price.replace(",", "."))
  const isValidPrice =
    !isNaN(parsedPrice) &&
    ((cardRarity === "legendary" && parsedPrice >= 1 && parsedPrice <= 500) ||
      (cardRarity !== "legendary" && parsedPrice >= 0.3 && parsedPrice <= 500))

  // Aktualisiere den Preis
  const handleUpdatePrice = async () => {
    if (!isValidPrice || !username || !listingId) return

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await updateListingPrice(username, listingId, Number.parseFloat(parsedPrice.toFixed(2)))
      if (result.success) {
        toast({
          title: "Success",
          description: "Price updated successfully!",
        })
        onSuccess?.()
        onClose()
      } else {
        setError(result.error || "Failed to update price")
        toast({
          title: "Error",
          description: result.error || "Failed to update price",
          variant: "destructive",
        })
      }
    } catch (error) {
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

  // Formatiere den Preis für die Anzeige
  const formatPrice = (value: string) => {
    const num = Number.parseFloat(value.replace(",", "."))
    return !isNaN(num) ? num.toFixed(2) : "0.00"
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!isSubmitting) {
          onClose()
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Price</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Price Input */}
          <div className="space-y-2">
            <Label htmlFor="price">New Price (WLD)</Label>
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
                <p className="text-red-500 text-sm">
                  {cardRarity === "legendary"
                    ? "Please enter a valid price between 1 and 500 WLD"
                    : "Please enter a valid price between 0.3 and 500 WLD"}
                </p>
              )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 p-3 rounded-lg text-sm">
              <p className="text-red-600 font-medium">Error: {error}</p>
            </div>
          )}

          {/* Current Price Info */}
          <div className="bg-gray-50 p-3 rounded-lg text-sm">
            <p className="text-gray-700">
              <span className="font-medium">Current Price:</span> {currentPrice.toFixed(2)} WLD
            </p>
            <p className="text-gray-700 mt-1">
              <span className="font-medium">New Price:</span> {formatPrice(price)} WLD
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button
              onClick={handleUpdatePrice}
              disabled={!isValidPrice || isSubmitting || parsedPrice === currentPrice}
              className="bg-gradient-to-r from-violet-500 to-fuchsia-500"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  Update Price
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
