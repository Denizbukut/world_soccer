"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import ProtectedRoute from "@/components/protected-route"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  Calendar,
  Search,
  Download,
  RefreshCw
} from "lucide-react"
import { getGlobalPvpPurchaseStats } from "@/app/actions/pvp-purchases"
import { toast } from "@/components/ui/use-toast"

interface PvpPurchase {
  id: string
  username: string
  amount: number
  price_usd: number
  price_wld: string | null
  discounted: boolean
  discount_percentage: number | null
  clan_role: string | null
  clan_member_count: number | null
  created_at: string
}

interface PvpStats {
  totalBattles: number
  totalRevenue: number
  totalPurchases: number
  discountedPurchases: number
  todayBattles: number
  todayRevenue: number
  averagePrice: number
}

export default function PvpPurchasesAdminPage() {
  const { user } = useAuth()
  const [purchases, setPurchases] = useState<PvpPurchase[]>([])
  const [stats, setStats] = useState<PvpStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredPurchases, setFilteredPurchases] = useState<PvpPurchase[]>([])

  useEffect(() => {
    if (user?.username) {
      loadPvpPurchases()
      loadStats()
    }
  }, [user?.username])

  useEffect(() => {
    // Filter purchases based on search term
    const filtered = purchases.filter(purchase =>
      purchase.username.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredPurchases(filtered)
  }, [purchases, searchTerm])

  const loadPvpPurchases = async () => {
    setLoading(true)
    try {
      // For now, we'll load from a simple API endpoint
      // You can extend this to use the server actions
      const response = await fetch('/api/admin/pvp-purchases')
      if (response.ok) {
        const data = await response.json()
        setPurchases(data.purchases || [])
      }
    } catch (error) {
      console.error("Error loading PvP purchases:", error)
      toast({
        title: "Error",
        description: "Failed to load PvP purchases",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const result = await getGlobalPvpPurchaseStats()
      if (result.success && result.data) {
        setStats(result.data)
      }
    } catch (error) {
      console.error("Error loading PvP stats:", error)
    }
  }

  const exportToCSV = () => {
    const headers = [
      "ID", "Username", "Amount", "Price USD", "Price WLD", 
      "Discounted", "Discount %", "Clan Role", "Clan Members", "Created At"
    ]
    
    const csvContent = [
      headers.join(","),
      ...filteredPurchases.map(purchase => [
        purchase.id,
        purchase.username,
        purchase.amount,
        purchase.price_usd,
        purchase.price_wld || "",
        purchase.discounted,
        purchase.discount_percentage || "",
        purchase.clan_role || "",
        purchase.clan_member_count || "",
        purchase.created_at
      ].join(","))
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `pvp-purchases-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const formatPrice = (price: number) => {
    return `$${price.toFixed(2)}`
  }

  if (!user?.username) {
    return <div>Loading...</div>
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">PvP Purchases Admin</h1>
              <p className="text-gray-400">Manage and monitor PvP battle purchases</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={loadPvpPurchases} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={exportToCSV} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card className="bg-gradient-to-br from-blue-900/40 to-black/60 border-blue-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-5 w-5 text-blue-400" />
                    <h3 className="text-sm font-bold">Total Revenue</h3>
                  </div>
                  <div className="text-2xl font-bold text-blue-400">
                    {formatPrice(stats.totalRevenue)}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-900/40 to-black/60 border-green-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-5 w-5 text-green-400" />
                    <h3 className="text-sm font-bold">Total Battles</h3>
                  </div>
                  <div className="text-2xl font-bold text-green-400">
                    {stats.totalBattles}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-900/40 to-black/60 border-purple-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-5 w-5 text-purple-400" />
                    <h3 className="text-sm font-bold">Total Purchases</h3>
                  </div>
                  <div className="text-2xl font-bold text-purple-400">
                    {stats.totalPurchases}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-900/40 to-black/60 border-orange-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-5 w-5 text-orange-400" />
                    <h3 className="text-sm font-bold">Today's Revenue</h3>
                  </div>
                  <div className="text-2xl font-bold text-orange-400">
                    {formatPrice(stats.todayRevenue)}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Search and Filters */}
          <Card className="mb-6 bg-gradient-to-br from-gray-900/40 to-black/60 border-gray-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label htmlFor="search" className="text-sm text-gray-300">Search by Username</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Enter username..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                </div>
                <div className="text-sm text-gray-400">
                  Showing {filteredPurchases.length} of {purchases.length} purchases
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Purchases Table */}
          <Card className="bg-gradient-to-br from-gray-900/40 to-black/60 border-gray-500/30">
            <CardHeader>
              <CardTitle>PvP Purchase History</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading purchases...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-700">
                        <TableHead className="text-gray-300">Username</TableHead>
                        <TableHead className="text-gray-300">Amount</TableHead>
                        <TableHead className="text-gray-300">Price USD</TableHead>
                        <TableHead className="text-gray-300">Price WLD</TableHead>
                        <TableHead className="text-gray-300">Discount</TableHead>
                        <TableHead className="text-gray-300">Clan Role</TableHead>
                        <TableHead className="text-gray-300">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPurchases.map((purchase) => (
                        <TableRow key={purchase.id} className="border-gray-800">
                          <TableCell className="font-medium text-white">
                            {purchase.username}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-blue-900/20 border-blue-500/30">
                              {purchase.amount} battles
                            </Badge>
                          </TableCell>
                          <TableCell className="text-green-400 font-medium">
                            {formatPrice(purchase.price_usd)}
                          </TableCell>
                          <TableCell className="text-yellow-400">
                            {purchase.price_wld ? `${purchase.price_wld} WLD` : "-"}
                          </TableCell>
                          <TableCell>
                            {purchase.discounted ? (
                              <Badge className="bg-green-900/20 border-green-500/30 text-green-400">
                                {purchase.discount_percentage?.toFixed(1)}% off
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-gray-900/20 border-gray-500/30">
                                No discount
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {purchase.clan_role ? (
                              <Badge variant="outline" className="bg-purple-900/20 border-purple-500/30">
                                {purchase.clan_role}
                              </Badge>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-gray-400 text-sm">
                            {formatDate(purchase.created_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  )
}
