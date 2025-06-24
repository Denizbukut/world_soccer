"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ClanExpansionCard from "./ClanExpansionCard"
import ClanDonationHistory from "./ClanDonationHistory"
import { DollarSign, History } from "lucide-react"

interface ClanExpansionTabProps {
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

export default function ClanExpansionTab({
  clan,
  userUsername,
  isUserMember,
  onExpansionSuccess,
}: ClanExpansionTabProps) {
  return (
    <Tabs defaultValue="expansion" className="space-y-4">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="expansion" className="flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Erweiterung
        </TabsTrigger>
        <TabsTrigger value="history" className="flex items-center gap-2">
          <History className="h-4 w-4" />
          Historie
        </TabsTrigger>
      </TabsList>

      <TabsContent value="expansion">
        <ClanExpansionCard
          clan={clan}
          userUsername={userUsername}
          isUserMember={isUserMember}
          onExpansionSuccess={onExpansionSuccess}
        />
      </TabsContent>

      <TabsContent value="history">
        <ClanDonationHistory clanId={clan.id} userUsername={userUsername} isUserMember={isUserMember} />
      </TabsContent>
    </Tabs>
  )
}
