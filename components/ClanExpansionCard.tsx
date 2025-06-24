"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Users, DollarSign, TrendingUp, Check } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { MiniKit, tokenToDecimals, Tokens, type PayCommandInput } from "@worldcoin/minikit-js"
import { useWldPrice } from "@/contexts/WldPriceContext"
import { processClanDonation } from "@/app/actions/clan-expansion"
import { Slider } from "@/components/ui/slider"

interface ClanExpansionCardProps {
  clan: {
    id: number
    name: string
    member_count: number
    max_members: number
    total_donated: number
    next_expansion_cost: number
  }
  userUsername: string
  isUserMember: boolean
  onExpansionSuccess: () => void
}

export default function ClanExpansionCard({
  clan,
  userUsername,
  isUserMember,
  onExpansionSuccess,
}: ClanExpansionCardProps) {
  const [showDonationDialog, setShowDonationDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { price } = useWldPrice()

  // Expansion tiers
  const expansionTiers = [
    { members: 30, cost: 0, label: "Base" },
    { members: 40, cost: 50, label: "Tier 1" },
    { members: 50, cost: 70, label: "Tier 2" },
    { members: 60, cost: 90, label: "Tier 3" },
    { members: 70, cost: 110, label: "Tier 4" },
  ]

  const currentTier = expansionTiers.find((tier) => tier.members === clan.max_members)
  const nextTier = expansionTiers.find((tier) => tier.members > clan.max_members)
  const isMaxTier = !nextTier

  const progressToNextTier = nextTier ? (clan.total_donated / nextTier.cost) * 100 : 100
  const remainingAmount = nextTier ? Math.max(0, nextTier.cost - clan.total_donated) : 0
  const minDonation = 0.1 // Minimum 0.1 WLD donation instead of 0.5
  const maxDonationAmount = Math.min(remainingAmount, 100) // Cap at 100 WLD max

  // Only show donation option if remaining amount is meaningful
  const canDonate = remainingAmount >= 0.1 // Lower minimum to 0.1 WLD

  const [donationAmount, setDonationAmount] = useState(Math.max(0.5, Math.min(1.0, remainingAmount)))

  const sendPayment = async (wldAmount: number) => {
    setIsLoading(true)

    try {
      // wldAmount is already in WLD, so we use it directly
      const roundedWldAmount = Number.parseFloat(wldAmount.toFixed(3))

      const res = await fetch("/api/initiate-payment", { method: "POST" })
      const { id } = await res.json()

      const payload: PayCommandInput = {
        reference: id,
        to: "0x4bb270ef6dcb052a083bd5cff518e2e019c0f4ee",
        tokens: [
          {
            symbol: Tokens.WLD,
            token_amount: tokenToDecimals(roundedWldAmount, Tokens.WLD).toString(),
          },
        ],
        description: `Clan Expansion Donation`,
      }

      const { finalPayload } = await MiniKit.commandsAsync.pay(payload)

      if (finalPayload.status === "success") {
        console.log("success sending payment")
        // Convert WLD to USD for the backend (since the backend expects USD amounts)
        const usdAmount = price ? wldAmount * price : wldAmount
        await handleDonationSuccess(usdAmount)
      } else {
        toast({
          title: "Payment Failed",
          description: "Your payment could not be processed. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Payment error:", error)
      toast({
        title: "Payment Error",
        description: "An error occurred during payment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDonationSuccess = async (usdAmount: number) => {
    try {
      const result = await processClanDonation(clan.id, userUsername, usdAmount)

      if (result.success) {
        toast({
          title: "Donation Successful! 🎉",
          description: result.expansionUnlocked
            ? `Clan expanded to ${result.newMaxMembers} members!`
            : `Thank you for your donation! ${result.remainingAmount} WLD needed for next expansion.`,
        })
        setShowDonationDialog(false)
        onExpansionSuccess()
      } else {
        toast({
          title: "Error",
          description: result.error || "Donation could not be processed",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error processing donation:", error)
      toast({
        title: "Error",
        description: "Donation could not be processed",
        variant: "destructive",
      })
    }
  }

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Clan Expansion
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Status */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Current Capacity</p>
              <p className="text-2xl font-bold text-blue-600">
                {clan.member_count}/{clan.max_members}
              </p>
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              {currentTier?.label || "Unknown"}
            </Badge>
          </div>

          {/* Progress to Next Tier */}
          {!isMaxTier && nextTier && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium text-gray-700">Progress to {nextTier.members} Members</p>
                <p className="text-sm text-gray-600">
                  {clan.total_donated}/{nextTier.cost} WLD
                </p>
              </div>
              <Progress value={progressToNextTier} className="h-2" />
              <p className="text-xs text-gray-500">{(nextTier.cost - clan.total_donated).toFixed(1)} WLD remaining</p>
            </div>
          )}

          {/* Expansion Tiers Overview */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Expansion Tiers</p>
            <div className="grid grid-cols-2 gap-2">
              {expansionTiers.slice(1).map((tier) => (
                <div
                  key={tier.members}
                  className={`p-2 rounded-lg border text-center ${
                    clan.max_members >= tier.members
                      ? "bg-green-50 border-green-200 text-green-700"
                      : clan.total_donated >= tier.cost
                        ? "bg-blue-50 border-blue-200 text-blue-700"
                        : "bg-gray-50 border-gray-200 text-gray-600"
                  }`}
                >
                  <p className="text-xs font-medium">{tier.members} Members</p>
                  <p className="text-xs">{tier.cost} WLD</p>
                </div>
              ))}
            </div>
          </div>

          {/* Donation Button */}
          {isUserMember && !isMaxTier && remainingAmount > 0 && (
            <Button
              onClick={() => setShowDonationDialog(true)}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              disabled={isLoading}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Donate for Expansion
            </Button>
          )}

          {isUserMember && !isMaxTier && remainingAmount > 0 && remainingAmount < 1 && (
            <div className="text-center p-2 bg-yellow-50 rounded-lg border border-yellow-200 mt-2">
              <p className="text-xs font-medium text-yellow-700">Almost complete!</p>
              <p className="text-xs text-yellow-600">Only {remainingAmount.toFixed(1)} WLD remaining</p>
            </div>
          )}

          {isMaxTier && (
            <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
              <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-green-700">Maximum Capacity Reached!</p>
              <p className="text-xs text-green-600">Your clan is fully expanded</p>
            </div>
          )}

          {!isUserMember && (
            <div className="text-center p-3 bg-gray-50 rounded-lg border">
              <p className="text-sm text-gray-600">Join the clan to contribute to expansions</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Donation Dialog */}
      <Dialog open={showDonationDialog} onOpenChange={setShowDonationDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              Donate for Clan Expansion
            </DialogTitle>
            <DialogDescription>
              Help expand your clan's member capacity by contributing to the expansion fund.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {nextTier && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-blue-900">Next Expansion</p>
                  <Badge className="bg-blue-600 text-white">{nextTier.members} Members</Badge>
                </div>
                <p className="text-sm text-blue-700 mb-3">Cost: {nextTier.cost} WLD</p>
                <Progress value={progressToNextTier} className="h-2 mb-2" />
                <p className="text-xs text-blue-600">
                  {clan.total_donated} / {nextTier.cost} WLD collected
                </p>
                <p className="text-xs text-blue-600 font-medium mt-1">{remainingAmount.toFixed(1)} WLD remaining</p>
              </div>
            )}

            {remainingAmount >= minDonation && (
              <div className="space-y-4">
                <div>
                  {(() => {
                    const usdValue = price ? (donationAmount * price).toFixed(2) : donationAmount.toFixed(2)

                    return (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-sm font-medium text-gray-700">Donation Amount</label>
                          <div className="text-right">
                            <span className="text-sm font-bold text-blue-600">{donationAmount.toFixed(1)} WLD</span>
                            <span className="text-xs text-gray-500 block">${usdValue} USD</span>
                          </div>
                        </div>
                        <Slider
                          value={[donationAmount]}
                          onValueChange={(value) => setDonationAmount(value[0])}
                          max={maxDonationAmount}
                          min={minDonation}
                          step={0.1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>{minDonation} WLD</span>
                          <span>{maxDonationAmount.toFixed(1)} WLD (Max)</span>
                        </div>
                      </div>
                    )
                  })()}
                </div>

                {(() => {
                  const usdValue = price ? (donationAmount * price).toFixed(2) : donationAmount.toFixed(2)

                  return (
                    <Button
                      onClick={() => sendPayment(donationAmount)}
                      disabled={isLoading || donationAmount <= 0}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      {isLoading ? "Processing..." : `Donate ${donationAmount.toFixed(1)} WLD ($${usdValue})`}
                    </Button>
                  )
                })()}
              </div>
            )}

            {remainingAmount > 0 && remainingAmount < minDonation && (
              <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <TrendingUp className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-yellow-700">Almost Complete!</p>
                <p className="text-xs text-yellow-600">
                  Only {remainingAmount.toFixed(1)} WLD remaining - expansion will unlock automatically with the next
                  donation from any member!
                </p>
              </div>
            )}

            {remainingAmount <= 0 && (
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <Check className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-green-700">Expansion Ready!</p>
                <p className="text-xs text-green-600">The next expansion will be unlocked automatically</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDonationDialog(false)} disabled={isLoading}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
