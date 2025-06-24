"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DollarSign, Calendar, TrendingUp } from "lucide-react"
import { getClanDonations } from "@/app/actions/clan-expansion"

interface Donation {
  id: number
  user_id: string
  amount: number
  purpose: string
  created_at: string
}

interface ClanDonationHistoryProps {
  clanId: number
  userUsername: string
  isUserMember: boolean
}

export default function ClanDonationHistory({ clanId, userUsername, isUserMember }: ClanDonationHistoryProps) {
  const [donations, setDonations] = useState<Donation[]>([])
  const [loading, setLoading] = useState(true)
  const [totalDonated, setTotalDonated] = useState(0)

  useEffect(() => {
    if (isUserMember && userUsername) {
      fetchDonations()
    }
  }, [clanId, userUsername, isUserMember])

  const fetchDonations = async () => {
    try {
      const result = await getClanDonations(clanId, userUsername)

      if (result.success) {
        setDonations(result.donations || [])
        setTotalDonated(result.totalDonated)
      } else {
        console.error("Error fetching donations:", result.error)
      }
    } catch (error) {
      console.error("Error in fetchDonations:", error)
    } finally {
      setLoading(false)
    }
  }

  if (!isUserMember) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <DollarSign className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-600">You must be a member of this clan to view donation history.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-600" />
          Donation History
        </CardTitle>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <span className="text-sm text-gray-600">
              Total: <span className="font-semibold text-green-600">{totalDonated.toFixed(1)} WLD</span>
            </span>
          </div>
          <Badge variant="outline" className="text-xs">
            {donations.length} Donations
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <div className="h-6 w-6 border-4 border-t-transparent border-blue-500 rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-gray-600 text-sm">Loading donations...</p>
          </div>
        ) : donations.length > 0 ? (
          <div className="space-y-3">
            {donations.map((donation) => (
              <div
                key={donation.id}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <DollarSign className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 text-sm">{donation.user_id}</span>
                      <Badge variant="outline" className="text-xs">
                        {donation.amount} WLD
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600">{donation.purpose}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(donation.created_at).toLocaleDateString()} um{" "}
                      {new Date(donation.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 text-sm">No donations yet</p>
            <p className="text-gray-500 text-xs">Be the first to contribute to clan expansion!</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
