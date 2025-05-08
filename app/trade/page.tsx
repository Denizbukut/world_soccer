"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import ProtectedRoute from "@/components/protected-route"
import MobileNav from "@/components/mobile-nav"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { motion } from "framer-motion"
import {
  Users,
  ArrowLeftRight,
  Clock,
  Search,
  Plus,
  Tag,
  ShoppingCart,
  X,
  ArrowUpDown,
  Filter,
  RefreshCw,
  Edit,
  AlertCircle,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { toast } from "@/components/ui/use-toast"
import {
  getMarketListings,
  getUserListings,
  getTransactionHistory,
  purchaseCard,
  cancelListing,
} from "@/app/actions/marketplace"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { renderStars } from "@/utils/card-stars"
import UpdatePriceDialog from "@/components/update-price-dialog"
import TiltableCard from "@/components/tiltable-card"
import { MiniKit, tokenToDecimals, Tokens, type PayCommandInput } from "@worldcoin/minikit-js"
import PurchaseSuccessAnimation from "@/components/purchase-success-animation"
import { Progress } from "@/components/ui/progress"

// Typen für die Marketplace-Daten
type Card = {
  id: string
  name: string
  character: string
  image_url?: string
  rarity: "common" | "rare" | "epic" | "legendary"
}

type MarketListing = {
  id: string
  seller_id: string
  card_id: string
  price: number
  created_at: string
  status: "active" | "sold" | "cancelled"
  buyer_id?: string
  sold_at?: string
  user_card_id: number | string
  card_level: number
  card: Card
  seller_username: string
  seller_world_id?: string
}

type Transaction = MarketListing & {
  transaction_type: "sold" | "purchased"
  other_party: string
}

export default function TradePage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState("marketplace")
  const [marketListings, setMarketListings] = useState<MarketListing[]>([])
  const [userListings, setUserListings] = useState<MarketListing[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [rarityFilter, setRarityFilter] = useState<string>("all")
  const [sortOption, setSortOption] = useState<string>("newest")
  const [selectedListing, setSelectedListing] = useState<MarketListing | null>(null)
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false)
  const [showCardDetailsDialog, setShowCardDetailsDialog] = useState(false) // Neuer State für das Kartendetails-Dialog
  const [showUpdatePriceDialog, setShowUpdatePriceDialog] = useState(false)
  const [purchaseLoading, setPurchaseLoading] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [showPurchaseSuccess, setShowPurchaseSuccess] = useState(false)
  const [listingCount, setListingCount] = useState(0)
  const [maxListings, setMaxListings] = useState(7)
  const [listingLimitReached, setListingLimitReached] = useState(false)

  // Lade Daten basierend auf dem aktiven Tab
  useEffect(() => {
    if (!user?.username) return

    const loadData = async () => {
      setLoading(true)
      try {
        if (activeTab === "marketplace") {
          const result = await getMarketListings()
          if (result.success) {
            setMarketListings(result.listings || [])
          } else {
            toast({
              title: "Error",
              description: result.error,
              variant: "destructive",
            })
          }
        } else if (activeTab === "my-trades") {
          const result = await getUserListings(user.username)
          if (result.success) {
            setUserListings(result.listings || [])
            setListingCount(result.listingCount || 0)
            setMaxListings(result.maxListings || 7)
            setListingLimitReached((result.listingCount || 0) >= (result.maxListings || 7))
          } else {
            toast({
              title: "Error",
              description: result.error,
              variant: "destructive",
            })
          }
        } else if (activeTab === "history") {
          const result = await getTransactionHistory(user.username)
          if (result.success) {
            // Explizite Typumwandlung mit einer sicheren Fallback-Option
            const transactionData = result.transactions || []
            setTransactions(transactionData as Transaction[])
          } else {
            toast({
              title: "Error",
              description: result.error,
              variant: "destructive",
            })
          }
        }
      } catch (error) {
        console.error("Error loading data:", error)
        toast({
          title: "Error",
          description: "Failed to load data",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [activeTab, user?.username])

  // Filtere und sortiere Listings
  const filteredListings = marketListings
    .filter((listing) => {
      // Suche nach Name oder Charakter
      const matchesSearch =
        searchTerm === "" ||
        listing.card.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        listing.card.character.toLowerCase().includes(searchTerm.toLowerCase()) ||
        listing.seller_username.toLowerCase().includes(searchTerm.toLowerCase())

      // Filtere nach Seltenheit
      const matchesRarity = rarityFilter === "all" || listing.card.rarity === rarityFilter

      return matchesSearch && matchesRarity
    })
    .sort((a, b) => {
      // Sortiere nach ausgewählter Option
      if (sortOption === "newest") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      } else if (sortOption === "oldest") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      } else if (sortOption === "price_low") {
        return a.price - b.price
      } else if (sortOption === "price_high") {
        return b.price - a.price
      } else if (sortOption === "rarity") {
        const rarityOrder = { common: 0, rare: 1, epic: 2, legendary: 3 }
        return (
          rarityOrder[b.card.rarity as keyof typeof rarityOrder] -
          rarityOrder[a.card.rarity as keyof typeof rarityOrder]
        )
      } else if (sortOption === "level_high") {
        return b.card_level - a.card_level
      } else if (sortOption === "level_low") {
        return a.card_level - b.card_level
      }
      return 0
    })

  const sendPayment = async () => {
    const wldAmount = selectedListing?.price || 1
    const res = await fetch("/api/initiate-payment", {
      method: "POST",
    })
    const { id } = await res.json()

    const payload: PayCommandInput = {
      reference: id,
      to: selectedListing?.seller_world_id || "", // my wallet
      tokens: [
        {
          symbol: Tokens.WLD,
          token_amount: tokenToDecimals(wldAmount, Tokens.WLD).toString(),
        },
      ],
      description: "Premium Pass",
    }

    const { finalPayload } = await MiniKit.commandsAsync.pay(payload)

    if (finalPayload.status == "success") {
      console.log("success sending payment")
      handlePurchase()
    }
  }

  // Kaufe eine Karte
  const handlePurchase = async () => {
    if (!user?.username || !selectedListing) return

    setPurchaseLoading(true)
    try {
      const result = await purchaseCard(user.username, selectedListing.id)
      if (result.success) {
        setShowPurchaseDialog(false)
        setShowPurchaseSuccess(true)
        // Aktualisiere die Listings
        const updatedListings = await getMarketListings()
        if (updatedListings.success) {
          setMarketListings(updatedListings.listings || [])
        }
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error purchasing card:", error)
      toast({
        title: "Error",
        description: "Failed to purchase card",
        variant: "destructive",
      })
    } finally {
      setPurchaseLoading(false)
    }
  }

  // Storniere ein Listing
  const handleCancelListing = async (listingId: string) => {
    if (!user?.username) return

    setCancelLoading(true)
    try {
      const result = await cancelListing(user.username, listingId)
      if (result.success) {
        toast({
          title: "Success",
          description: "Listing cancelled successfully!",
        })
        // Aktualisiere die Listings
        const updatedListings = await getUserListings(user.username)
        if (updatedListings.success) {
          setUserListings(updatedListings.listings || [])
          setListingCount(updatedListings.listingCount || 0)
          setListingLimitReached((updatedListings.listingCount || 0) >= maxListings)
        }
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error cancelling listing:", error)
      toast({
        title: "Error",
        description: "Failed to cancel listing",
        variant: "destructive",
      })
    } finally {
      setCancelLoading(false)
    }
  }

  // Aktualisiere den Preis eines Listings
  const handleUpdatePrice = (listing: MarketListing) => {
    setSelectedListing(listing)
    setShowUpdatePriceDialog(true)
  }

  // Zeige Kartendetails an
  const handleShowCardDetails = (listing: MarketListing) => {
    setSelectedListing(listing)
    setShowCardDetailsDialog(true)
  }

  // Aktualisiere die Daten nach erfolgreicher Preisänderung
  const handlePriceUpdateSuccess = async () => {
    if (!user?.username) return

    // Aktualisiere die Listings
    const updatedListings = await getUserListings(user.username)
    if (updatedListings.success) {
      setUserListings(updatedListings.listings || [])
    }
  }

  // Aktualisiere die Daten
  const handleRefresh = async () => {
    if (!user?.username) return

    setLoading(true)
    try {
      if (activeTab === "marketplace") {
        const result = await getMarketListings()
        if (result.success) {
          setMarketListings(result.listings || [])
        }
      } else if (activeTab === "my-trades") {
        const result = await getUserListings(user.username)
        if (result.success) {
          setUserListings(result.listings || [])
          setListingCount(result.listingCount || 0)
          setMaxListings(result.maxListings || 7)
          setListingLimitReached((result.listingCount || 0) >= (result.maxListings || 7))
        }
      } else if (activeTab === "history") {
        const result = await getTransactionHistory(user.username)
        if (result.success) {
          const transactionData = result.transactions || []
          setTransactions(transactionData as Transaction[])
        }
      }
    } catch (error) {
      console.error("Error refreshing data:", error)
      toast({
        title: "Error",
        description: "Failed to refresh data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSuccessAnimationComplete = () => {
    setShowPurchaseSuccess(false)
    // Optional: Wechsle zum Collection-Tab oder führe andere Aktionen aus
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#f8f9ff] pb-20">
        {/* Header */}
        <header className="sticky top-0 z-10 backdrop-blur-md bg-white/80 border-b border-gray-100">
          <div className="max-w-lg mx-auto px-4 py-3">
            <div className="flex justify-between items-center">
              <h1 className="text-lg font-medium">Trade Center</h1>
              <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={loading} className="text-gray-500">
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </header>

        <main className="p-4 max-w-lg mx-auto">
          <Tabs defaultValue="marketplace" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 bg-white h-12 p-1 mb-4">
              <TabsTrigger value="marketplace" className="h-10">
                <div className="flex items-center justify-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>Marketplace</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="my-trades" className="h-10">
                <div className="flex items-center justify-center gap-2">
                  <ArrowLeftRight className="h-4 w-4" />
                  <span>My Listings</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="history" className="h-10">
                <div className="flex items-center justify-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>History</span>
                </div>
              </TabsTrigger>
            </TabsList>

            {/* Marketplace Tab */}
            <TabsContent value="marketplace">
              <div className="space-y-4">
                {/* Search and Filter */}
                <div className="bg-white rounded-xl p-3 shadow-sm">
                  <div className="flex gap-2 mb-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search cards or sellers..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <Select value={rarityFilter} onValueChange={setRarityFilter}>
                      <SelectTrigger className="w-[130px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Rarity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Rarities</SelectItem>
                        <SelectItem value="common">Common</SelectItem>
                        <SelectItem value="rare">Rare</SelectItem>
                        <SelectItem value="epic">Epic</SelectItem>
                        <SelectItem value="legendary">Legendary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                      {filteredListings.length} {filteredListings.length === 1 ? "card" : "cards"} available
                    </div>
                    <Select value={sortOption} onValueChange={setSortOption}>
                      <SelectTrigger className="w-[130px] h-8 text-xs">
                        <ArrowUpDown className="h-3 w-3 mr-1" />
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Newest First</SelectItem>
                        <SelectItem value="oldest">Oldest First</SelectItem>
                        <SelectItem value="price_low">Price: Low to High</SelectItem>
                        <SelectItem value="price_high">Price: High to Low</SelectItem>
                        <SelectItem value="rarity">Rarity</SelectItem>
                        <SelectItem value="level_high">Level: High to Low</SelectItem>
                        <SelectItem value="level_low">Level: Low to High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Listings */}
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="bg-white rounded-xl p-4 shadow-sm">
                        <div className="flex gap-3">
                          <Skeleton className="h-24 w-16 rounded-lg" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                            <Skeleton className="h-6 w-1/3 mt-2" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredListings.length > 0 ? (
                  <div className="space-y-3">
                    {filteredListings.map((listing) => (
                      <MarketplaceCard
                        key={listing.id}
                        listing={listing}
                        onPurchase={() => {
                          setSelectedListing(listing)
                          setShowPurchaseDialog(true)
                        }}
                        onShowDetails={() => handleShowCardDetails(listing)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-xl p-6 shadow-sm text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                        <Tag className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium mb-1">No Cards Found</h3>
                      <p className="text-gray-500 text-sm mb-4">
                        {searchTerm || rarityFilter !== "all"
                          ? "Try adjusting your search or filters"
                          : "There are no cards available for purchase right now"}
                      </p>
                      <Link href="/collection">
                        <Button variant="outline" size="sm" className="rounded-full">
                          <Plus className="h-4 w-4 mr-1" />
                          Sell Your Cards
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* My Listings Tab */}
            <TabsContent value="my-trades">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-medium">My Listed Cards</h2>
                  <Link href={listingLimitReached ? "#" : "/collection"}>
                    <Button
                      size="sm"
                      className={`rounded-full ${
                        listingLimitReached
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-gradient-to-r from-violet-500 to-fuchsia-500"
                      }`}
                      disabled={listingLimitReached}
                      onClick={(e) => {
                        if (listingLimitReached) {
                          e.preventDefault()
                          toast({
                            title: "Listing Limit Reached",
                            description: `You can only list a maximum of ${maxListings} cards at a time. Please remove some listings before adding more.`,
                            variant: "destructive",
                          })
                        }
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Sell Card
                    </Button>
                  </Link>
                </div>

                {/* Listing Limit Indicator */}
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center">
                      <span className="font-medium">Listing Limit</span>
                      {listingLimitReached && (
                        <div className="ml-2 flex items-center text-red-500">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          <span className="text-sm">Limit reached</span>
                        </div>
                      )}
                    </div>
                    <span className={`font-medium ${listingLimitReached ? "text-red-500" : "text-gray-700"}`}>
                      {listingCount}/{maxListings}
                    </span>
                  </div>
                  <Progress
                    value={(listingCount / maxListings) * 100}
                    className={`h-2 ${listingLimitReached ? "bg-red-100" : "bg-gray-100"}`}
                    indicatorClassName={listingLimitReached ? "bg-red-500" : "bg-violet-500"}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    {listingLimitReached
                      ? "You've reached the maximum number of cards you can list. Cancel some listings to add more."
                      : `You can list ${maxListings - listingCount} more card${maxListings - listingCount !== 1 ? "s" : ""}.`}
                  </p>
                </div>

                {loading ? (
                  <div className="space-y-3">
                    {[...Array(2)].map((_, i) => (
                      <div key={i} className="bg-white rounded-xl p-4 shadow-sm">
                        <div className="flex gap-3">
                          <Skeleton className="h-24 w-16 rounded-lg" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                            <Skeleton className="h-6 w-1/3 mt-2" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : userListings.length > 0 ? (
                  <div className="space-y-3">
                    {userListings.map((listing) => (
                      <MyListingCard
                        key={listing.id}
                        listing={listing}
                        onCancel={() => handleCancelListing(listing.id)}
                        onUpdatePrice={() => handleUpdatePrice(listing)}
                        cancelLoading={cancelLoading}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-xl p-6 shadow-sm text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                        <Tag className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium mb-1">No Listed Cards</h3>
                      <p className="text-gray-500 text-sm mb-4">You haven't listed any cards for sale yet</p>
                      <Link href="/collection">
                        <Button className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500">
                          <Plus className="h-4 w-4 mr-1" />
                          Sell Your First Card
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history">
              <div className="space-y-4">
                <h2 className="text-lg font-medium">Transaction History</h2>

                {loading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="bg-white rounded-xl p-4 shadow-sm">
                        <div className="flex gap-3">
                          <Skeleton className="h-24 w-16 rounded-lg" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                            <Skeleton className="h-6 w-1/3 mt-2" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : transactions.length > 0 ? (
                  <div className="space-y-3">
                    {transactions.map((transaction) => (
                      <TransactionCard key={transaction.id} transaction={transaction} />
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-xl p-6 shadow-sm text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                        <Clock className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium mb-1">No Transaction History</h3>
                      <p className="text-gray-500 text-sm mb-4">You haven't bought or sold any cards yet</p>
                      <Link href="/collection">
                        <Button variant="outline" size="sm" className="rounded-full">
                          <Tag className="h-4 w-4 mr-1" />
                          Browse Marketplace
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </main>

        {/* Card Details Dialog */}
        <Dialog open={showCardDetailsDialog} onOpenChange={setShowCardDetailsDialog}>
          <DialogContent className="sm:max-w-md bg-black/80 border-none">
            <DialogHeader>
              <DialogTitle className="text-white">Card Details</DialogTitle>
            </DialogHeader>
            {selectedListing && (
              <div className="space-y-6">
                <div className="flex flex-col items-center">
                  {/* TiltableCard */}
                  <div className="w-64 mx-auto mb-6">
                    <TiltableCard
                      id={selectedListing.card_id}
                      name={selectedListing.card.name}
                      character={selectedListing.card.character}
                      imageUrl={selectedListing.card.image_url}
                      rarity={selectedListing.card.rarity}
                      level={selectedListing.card_level}
                    />
                  </div>

                  {/* Verkäufer und Preis */}
                  <div className="bg-white/10 backdrop-blur-md p-4 rounded-lg w-full text-white">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-300">Seller:</span>
                      <span className="font-medium">{selectedListing.seller_username}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Price:</span>
                      <div className="flex items-center">
                        <span className="font-bold text-lg">{selectedListing.price} WLD</span>
                      </div>
                    </div>
                  </div>

                  {/* Kaufen-Button */}
                  {selectedListing.seller_id !== user?.username && (
                    <Button
                      onClick={() => {
                        setShowCardDetailsDialog(false)
                        setShowPurchaseDialog(true)
                      }}
                      className="w-full mt-4 bg-gradient-to-r from-violet-500 to-fuchsia-500"
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Buy Now
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Purchase Dialog */}
        <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm Purchase</DialogTitle>
              <DialogDescription>You are about to purchase this card. This action cannot be undone.</DialogDescription>
            </DialogHeader>
            {selectedListing && (
              <div className="space-y-4">
                <div className="flex gap-4 items-center">
                  <div className="relative w-20 h-28 overflow-hidden rounded-lg">
                    <Image
                      src={
                        selectedListing.card.image_url ||
                        `/placeholder.svg?height=400&width=300&query=${
                          encodeURIComponent(selectedListing.card.character) || "/placeholder.svg"
                        }`
                      }
                      alt={selectedListing.card.name}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 flex justify-center">
                      {renderStars(selectedListing.card_level, "xs")}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{selectedListing.card.name}</h3>
                    <p className="text-sm text-gray-500">{selectedListing.card.character}</p>
                    <div className="flex items-center mt-1">
                      <Badge
                        className={`
                        ${selectedListing.card.rarity === "common" ? "bg-gray-500" : ""}
                        ${selectedListing.card.rarity === "rare" ? "bg-blue-500" : ""}
                        ${selectedListing.card.rarity === "epic" ? "bg-purple-500" : ""}
                        ${selectedListing.card.rarity === "legendary" ? "bg-amber-500" : ""}
                      `}
                      >
                        {selectedListing.card.rarity}
                      </Badge>
                      <div className="ml-2 flex items-center">
                        <span className="text-xs mr-1">Level {selectedListing.card_level}</span>
                        {renderStars(selectedListing.card_level, "xs")}
                      </div>
                    </div>
                    <div className="flex items-center mt-2">
                      <span className="font-bold text-lg">{selectedListing.price} WLD</span>
                    </div>
                  </div>
                </div>
                <div className="bg-amber-50 p-3 rounded-lg text-sm">
                  <p className="text-amber-800">
                    <span className="font-medium">Seller:</span> {selectedListing.seller_username}
                  </p>

                  {(user?.coins || 0) < selectedListing.price && (
                    <p className="text-red-500 mt-1 font-medium">You don't have enough WLD for this purchase!</p>
                  )}
                  {selectedListing.seller_id === user?.username && (
                    <p className="text-red-500 mt-1 font-medium">You cannot buy your own card!</p>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowPurchaseDialog(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={sendPayment}
                    disabled={
                      purchaseLoading ||
                      (user?.coins || 0) < selectedListing.price ||
                      selectedListing.seller_id === user?.username
                    }
                    className="bg-gradient-to-r from-violet-500 to-fuchsia-500"
                  >
                    {purchaseLoading ? (
                      <>
                        <div className="h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Buy Now
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Update Price Dialog */}
        {selectedListing && (
          <UpdatePriceDialog
            isOpen={showUpdatePriceDialog}
            onClose={() => setShowUpdatePriceDialog(false)}
            listingId={selectedListing.id}
            currentPrice={selectedListing.price}
            username={user?.username || ""}
            onSuccess={handlePriceUpdateSuccess}
          />
        )}

        {/* Purchase Success Animation */}
        {selectedListing && (
          <PurchaseSuccessAnimation
            show={showPurchaseSuccess}
            onComplete={handleSuccessAnimationComplete}
            cardImageUrl={selectedListing.card.image_url}
            cardName={selectedListing.card.name}
          />
        )}

        <MobileNav />
      </div>
    </ProtectedRoute>
  )
}

// Marketplace Card Component
function MarketplaceCard({
  listing,
  onPurchase,
  onShowDetails,
}: {
  listing: MarketListing
  onPurchase: () => void
  onShowDetails: () => void
}) {
  const { user } = useAuth()
  const isOwnListing = listing.seller_id === user?.username

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

  const rarityStyle = rarityStyles[listing.card.rarity as keyof typeof rarityStyles] || rarityStyles.common

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-xl overflow-hidden shadow-sm relative"
    >
      <div className="p-3">
        <div className="flex gap-3">
          {/* Card Image */}
          <div
            className={`relative w-16 h-24 rounded-lg overflow-hidden border-2 ${rarityStyle.border} cursor-pointer`}
            onClick={onShowDetails}
          >
            <Image
              src={
                listing.card.image_url ||
                `/placeholder.svg?height=400&width=300&query=${
                  encodeURIComponent(listing.card.character) || "/placeholder.svg"
                }`
              }
              alt={listing.card.name}
              fill
              className="object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 flex justify-center">
              {renderStars(listing.card_level, "xs")}
            </div>
          </div>

          {/* Card Details */}
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium text-sm">{listing.card.name}</h3>
                <p className="text-xs text-gray-500">{listing.card.character}</p>
              </div>
              <div className="flex flex-col items-end">
                <Badge className={rarityStyle.badge}>{listing.card.rarity}</Badge>
                <Badge variant="outline" className="mt-1 text-xs">
                  Level {listing.card_level}
                </Badge>
              </div>
            </div>

            <div className="flex items-center mt-1 text-xs text-gray-500">
              <span>Seller: {listing.seller_username}</span>
              {isOwnListing && <Badge className="ml-1 bg-red-500 text-[10px] h-4 px-1">My Listing</Badge>}
            </div>

            <div className="flex justify-between items-center mt-2">
              <div className="flex items-center">
                <span className="font-bold">{listing.price} WLD</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{formatDate(listing.created_at)}</span>
                {!isOwnListing && (
                  <Button
                    size="sm"
                    onClick={onPurchase}
                    className="h-8 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                  >
                    <ShoppingCart className="h-3 w-3 mr-1" />
                    Buy
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// My Listing Card Component
function MyListingCard({
  listing,
  onCancel,
  onUpdatePrice,
  cancelLoading,
}: {
  listing: MarketListing
  onCancel: () => void
  onUpdatePrice: () => void
  cancelLoading: boolean
}) {
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

  const rarityStyle = rarityStyles[listing.card.rarity as keyof typeof rarityStyles] || rarityStyles.common

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-xl overflow-hidden shadow-sm"
    >
      <div className="p-3">
        <div className="flex gap-3">
          {/* Card Image */}
          <div className={`relative w-16 h-24 rounded-lg overflow-hidden border-2 ${rarityStyle.border}`}>
            <Image
              src={
                listing.card.image_url ||
                `/placeholder.svg?height=400&width=300&query=${encodeURIComponent(listing.card.character) || "/placeholder.svg"}`
              }
              alt={listing.card.name}
              fill
              className="object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 flex justify-center">
              {renderStars(listing.card_level, "xs")}
            </div>
          </div>

          {/* Card Details */}
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium text-sm">{listing.card.name}</h3>
                <p className="text-xs text-gray-500">{listing.card.character}</p>
              </div>
              <div className="flex flex-col items-end">
                <Badge className={rarityStyle.badge}>{listing.card.rarity}</Badge>
                <Badge variant="outline" className="mt-1 text-xs">
                  Level {listing.card_level}
                </Badge>
              </div>
            </div>

            <div className="flex items-center mt-1 text-xs text-gray-500">
              <span>Listed: {formatDate(listing.created_at)}</span>
            </div>

            <div className="flex justify-between items-center mt-2">
              <div className="flex items-center">
                <span className="font-bold">{listing.price} WLD</span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onUpdatePrice}
                  className="h-8 rounded-full border-blue-300 text-blue-500 hover:bg-blue-50"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onCancel}
                  disabled={cancelLoading}
                  className="h-8 rounded-full border-red-300 text-red-500 hover:bg-red-50"
                >
                  {cancelLoading ? (
                    <div className="h-3 w-3 border-2 border-t-transparent border-red-500 rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <X className="h-3 w-3 mr-1" />
                      Cancel
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// Transaction Card Component
function TransactionCard({ transaction }: { transaction: Transaction }) {
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

  const rarityStyle = rarityStyles[transaction.card.rarity as keyof typeof rarityStyles] || rarityStyles.common

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return "Unknown"
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-xl overflow-hidden shadow-sm"
    >
      <div className="p-3">
        <div className="flex gap-3">
          {/* Card Image */}
          <div className={`relative w-16 h-24 rounded-lg overflow-hidden border-2 ${rarityStyle.border}`}>
            <Image
              src={
                transaction.card.image_url ||
                `/placeholder.svg?height=400&width=300&query=${encodeURIComponent(transaction.card.character) || "/placeholder.svg"}`
              }
              alt={transaction.card.name}
              fill
              className="object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 flex justify-center">
              {renderStars(transaction.card_level, "xs")}
            </div>
          </div>

          {/* Card Details */}
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium text-sm">{transaction.card.name}</h3>
                <p className="text-xs text-gray-500">{transaction.card.character}</p>
              </div>
              <div className="flex flex-col items-end">
                <Badge className={transaction.transaction_type === "purchased" ? "bg-blue-500" : "bg-green-500"}>
                  {transaction.transaction_type === "purchased" ? "Bought" : "Sold"}
                </Badge>
                <Badge variant="outline" className="mt-1 text-xs">
                  Level {transaction.card_level}
                </Badge>
              </div>
            </div>

            <div className="flex items-center mt-1 text-xs text-gray-500">
              <span>
                {transaction.transaction_type === "purchased" ? "From: " : "To: "}
                {transaction.other_party}
              </span>
            </div>

            <div className="flex justify-between items-center mt-2">
              <div className="flex items-center">
                <span className="font-bold">{transaction.price} WLD</span>
              </div>
              <div className="text-xs text-gray-400">{formatDate(transaction.sold_at || "")}</div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
