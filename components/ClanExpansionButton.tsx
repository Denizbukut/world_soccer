"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DollarSign, Users, TrendingUp } from "lucide-react"
import ClanExpansionCard from "./ClanExpansionCard"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface ClanExpansionButtonProps {
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

export default function ClanExpansionButton({
  clan,
  userUsername,
  isUserMember,
  onExpansionSuccess,
}: ClanExpansionButtonProps) {
  const [showExpansionDialog, setShowExpansionDialog] = useState(false)

  // Expansion tiers
  const expansionTiers = [
    { members: 30, cost: 0, label: "Base" },
    { members: 40, cost: 50, label: "Tier 1" },
    { members: 50, cost: 70, label: "Tier 2" },
    { members: 60, cost: 90, label: "Tier 3" },
    { members: 70, cost: 110, label: "Tier 4" },
  ]

  const nextTier = expansionTiers.find((tier) => tier.members > clan.max_members)
  const isMaxTier = !nextTier
  const progressToNextTier = nextTier ? (clan.total_donated / nextTier.cost) * 100 : 100

  return (
    <>
      <Button
        onClick={() => setShowExpansionDialog(true)}
        variant="outline"
        size="sm"
        className="flex-1 justify-between bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 hover:from-blue-100 hover:to-purple-100 h-8"
      >
        <div className="flex items-center gap-1">
          <DollarSign className="h-3 w-3 text-blue-600" />
          <span className="text-xs font-medium text-blue-800">Expansion</span>
        </div>
        <div className="flex items-center gap-1">
          {isMaxTier ? (
            <Badge className="bg-green-500 text-white text-xs h-4 px-1">
              <TrendingUp className="h-2 w-2 mr-0.5" />
              Max
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-blue-700 border-blue-300 h-4 px-1">
              {progressToNextTier.toFixed(0)}%
            </Badge>
          )}
        </div>
      </Button>

      <Dialog open={showExpansionDialog} onOpenChange={setShowExpansionDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Clan Expansion System
            </DialogTitle>
          </DialogHeader>
          <ClanExpansionCard
            clan={clan}
            userUsername={userUsername}
            isUserMember={isUserMember}
            onExpansionSuccess={() => {
              onExpansionSuccess()
              setShowExpansionDialog(false)
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
