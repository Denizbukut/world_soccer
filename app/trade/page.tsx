"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import ProtectedRoute from "@/components/protected-route"
import MobileNav from "@/components/mobile-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { motion } from "framer-motion"
import {
  Clock,
  ShoppingCart,
  X,
  RefreshCw,
  Edit,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Wrench,
  Database,
  AlertTriangle,
  ArrowLeft,
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
  getRecentSales,
} from "@/app/actions/marketplace"
import { Badge } from "@/components/ui/badge"
import { renderStars } from "@/utils/card-stars"
import { MiniKit, tokenToDecimals, Tokens, type PayCommandInput } from "@worldcoin/minikit-js"
import { debounce } from "@/lib/utils"

// ABI für die transfer-Funktion des ERC20-Tokens
const ERC20_ABI = ["function transfer(address to, uint256 amount) public returns (bool)"]
// Typen für die Marketplace-Daten
type CardType = {
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
  card: CardType
  seller_username: string
  seller_world_id?: string
}

// Update the Transaction type to make seller_username optional
type Transaction = MarketListing & {
  transaction_type: "sold" | "purchased"
  other_party: string
  seller_username?: string // Make this optional
}

// Typ für kürzlich verkaufte Karten
type RecentSale = {
  id: string
  seller_id: string
  buyer_id: string
  card_id: string
  price: number
  sold_at: string
  card_level: number
  card: CardType
}

type PaginationInfo = {
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export default function TradePage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState("marketplace")
  const [historyType, setHistoryType] = useState<"my" | "all">("my")
  const [marketListings, setMarketListings] = useState<MarketListing[]>([])
  const [userListings, setUserListings] = useState<MarketListing[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [recentSales, setRecentSales] = useState<RecentSale[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [salesSearchTerm, setSalesSearchTerm] = useState("")
  const [rarityFilter, setRarityFilter] = useState<string>("all")
  const [sortOption, setSortOption] = useState<string>("newest")
  const [selectedListing, setSelectedListing] = useState<MarketListing | null>(null)
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false)
  const [showCardDetailsDialog, setShowCardDetailsDialog] = useState(false)
  const [showUpdatePriceDialog, setShowUpdatePriceDialog] = useState(false)
  const [purchaseLoading, setPurchaseLoading] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [showPurchaseSuccess, setShowPurchaseSuccess] = useState(false)
  const [listingCount, setListingCount] = useState(0)
  const [maxListings, setMaxListings] = useState(7)
  const [listingLimitReached, setListingLimitReached] = useState(false)

  // Pagination states
  const [marketPage, setMarketPage] = useState(1)
  const [userListingsPage, setUserListingsPage] = useState(1)
  const [transactionsPage, setTransactionsPage] = useState(1)
  const [recentSalesPage, setRecentSalesPage] = useState(1)
  const [marketPagination, setMarketPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
  })
  const [userListingsPagination, setUserListingsPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
  })
  const [transactionsPagination, setTransactionsPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
  })
  const [recentSalesPagination, setRecentSalesPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
  })

  // Debounced search function for marketplace
  const debouncedSearch = debounce(() => {
    setMarketPage(1) // Reset to page 1 when search changes
    loadMarketListings(1) // Load page 1 with the new search term
  }, 500)

  // Debounced search function for recent sales
  const debouncedSalesSearch = debounce(() => {
    setRecentSalesPage(1) // Reset to page 1 when search changes
    loadRecentSales(1) // Load page 1 with the new search term
  }, 500)

  // Effect for search term changes in marketplace
  useEffect(() => {
    if (activeTab === "marketplace") {
      setMarketPage(1) // Reset to page 1 when filters change
      debouncedSearch()
    }
  }, [searchTerm, rarityFilter])

  // Effect for search term changes in recent sales
  useEffect(() => {
    if (activeTab === "sales-history") {
      setRecentSalesPage(1) // Reset to page 1 when search changes
      debouncedSalesSearch()
    }
  }, [salesSearchTerm])

  // Effect for sort option changes
  useEffect(() => {
    if (activeTab === "marketplace") {
      setMarketPage(1) // Reset to page 1 when sort changes
      loadMarketListings(1)
    }
  }, [sortOption])

  // Effect for history type changes
  useEffect(() => {
    if (activeTab === "sales-history") {
      if (historyType === "my") {
        setTransactionsPage(1)
        loadTransactionHistory(1)
      } else {
        setRecentSalesPage(1)
        loadRecentSales(1)
      }
    }
  }, [historyType, activeTab])

  // Load data based on active tab
  useEffect(() => {
    if (!user?.username) return

    // Reset pagination when changing tabs
    if (activeTab === "marketplace") {
      setMarketPage(1)
      loadMarketListings(1)
    } else if (activeTab === "sell") {
      setUserListingsPage(1)
      loadUserListings(1)
    } else if (activeTab === "sales-history") {
      if (historyType === "my") {
        setTransactionsPage(1)
        loadTransactionHistory(1)
      } else {
        setRecentSalesPage(1)
        loadRecentSales(1)
      }
    }
  }, [activeTab, user?.username])

  // Load market listings with pagination
  const loadMarketListings = async (pageToLoad = marketPage) => {
    if (!user?.username) return

    setLoading(true)
    try {
      // Prepare filters
      const filters: any = {
        rarity: rarityFilter !== "all" ? rarityFilter : undefined,
        sort: sortOption, // Pass the sort option to the server
      }

      // Add search term to filters if present
      if (searchTerm) {
        filters.search = searchTerm
      }

      const result = await getMarketListings(pageToLoad, 20, filters)
      if (result.success) {
        setMarketListings(result.listings || [])
        if (result.pagination) {
          setMarketPagination(result.pagination)
        }
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error loading market listings:", error)
      toast({
        title: "Error",
        description: "Failed to load marketplace data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Load user listings with pagination
  const loadUserListings = async (pageToLoad = userListingsPage) => {
    if (!user?.username) return

    setLoading(true)
    try {
      const result = await getUserListings(user.username, pageToLoad, 20)
      if (result.success) {
        setUserListings(result.listings || [])
        setListingCount(result.listingCount || 0)
        setMaxListings(result.maxListings || 7)
        setListingLimitReached((result.listingCount || 0) >= (result.maxListings || 7))
        if (result.pagination) {
          setUserListingsPagination(result.pagination)
        }
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error loading user listings:", error)
      toast({
        title: "Error",
        description: "Failed to load your listings",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Load transaction history with pagination
  const loadTransactionHistory = async (pageToLoad = transactionsPage) => {
    if (!user?.username) return

    setLoading(true)
    try {
      const result = await getTransactionHistory(user.username, pageToLoad, 20)
      if (result.success) {
        // Explicitly cast the transactions to the Transaction type
        const transactionData = result.transactions || []
        setTransactions(transactionData as unknown as Transaction[])

        if (result.pagination) {
          setTransactionsPagination(result.pagination)
        }
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error loading transaction history:", error)
      toast({
        title: "Error",
        description: "Failed to load transaction history",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Load recent sales with pagination
  const loadRecentSales = async (pageToLoad = recentSalesPage) => {
    setLoading(true)
    try {
      console.log("Loading recent sales page:", pageToLoad, "with search term:", salesSearchTerm)
      const result = await getRecentSales(pageToLoad, 20, salesSearchTerm)
      if (result.success) {
        console.log("Recent sales loaded successfully:", result.sales?.length || 0, "items")
        setRecentSales(result.sales || [])
        if (result.pagination) {
          console.log("Pagination info:", result.pagination)
          setRecentSalesPagination(result.pagination)
        }
      } else {
        console.error("Error in result:", result.error)
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error loading recent sales:", error)
      toast({
        title: "Error",
        description: "Failed to load recent sales",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Handle page changes
  const handleMarketPageChange = (newPage: number) => {
    setMarketPage(newPage)
    loadMarketListings(newPage) // This will use the current filters and sort options
  }

  const handleUserListingsPageChange = (newPage: number) => {
    setUserListingsPage(newPage)
    loadUserListings(newPage)
  }

  const handleTransactionsPageChange = (newPage: number) => {
    setTransactionsPage(newPage)
    loadTransactionHistory(newPage)
  }

  const handleRecentSalesPageChange = (newPage: number) => {
    console.log("Changing recent sales page to:", newPage)
    setRecentSalesPage(newPage)
    loadRecentSales(newPage)
  }

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
      description: "Buy Card",
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
        loadMarketListings()
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
        loadUserListings()
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
    loadUserListings()
  }

  // Aktualisiere die Daten
  const handleRefresh = async () => {
    if (!user?.username) return

    if (activeTab === "marketplace") {
      loadMarketListings()
    } else if (activeTab === "sell") {
      loadUserListings()
    } else if (activeTab === "sales-history") {
      if (historyType === "my") {
        loadTransactionHistory()
      } else {
        loadRecentSales()
      }
    }
  }

  const handleSuccessAnimationComplete = () => {
    setShowPurchaseSuccess(false)
  }

  // Pagination component
  const Pagination = ({
    pagination,
    onPageChange,
  }: {
    pagination: PaginationInfo
    onPageChange: (page: number) => void
  }) => {
    const { page, totalPages } = pagination

    if (totalPages <= 1) return null

    return (
      <div className="flex justify-center items-center gap-2 mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1 || loading}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="text-sm">
          Page {page} of {totalPages}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages || loading}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  // Calculate time remaining (example - you can make this dynamic)
  const maintenanceEndTime = new Date()
  maintenanceEndTime.setHours(maintenanceEndTime.getHours() + 18) // 18 hours remaining example

  const formatTimeRemaining = () => {
    const now = new Date()
    const diff = maintenanceEndTime.getTime() - now.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`
    }
    return `${minutes}m remaining`
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#f8f9ff] pb-20">
        {/* Header */}
        <header className="sticky top-0 z-10 backdrop-blur-md bg-white/80 border-b border-gray-100">
          <div className="max-w-lg mx-auto px-4 py-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm" className="text-gray-500">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
                <h1 className="text-lg font-medium">Trade Center</h1>
              </div>
              <Badge variant="destructive" className="animate-pulse">
                Maintenance
              </Badge>
            </div>
          </div>
        </header>

        <main className="p-4 max-w-lg mx-auto">
          <div className="space-y-6">
            {/* Main Maintenance Notice */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                    <Wrench className="h-8 w-8 text-amber-600" />
                  </div>
                  <CardTitle className="text-xl text-amber-800">Scheduled Maintenance</CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                  <div className="bg-white/60 rounded-lg p-4">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                      <span className="font-semibold text-amber-800">Trading Temporarily Unavailable</span>
                    </div>
                    <p className="text-amber-700 text-sm leading-relaxed">
                      We're performing essential database maintenance to improve your trading experience. The Trade
                      Center will be temporarily closed for up to 24 hours.
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-amber-700">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm font-medium">Estimated time: ~ 24 hours</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* What's Being Updated */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Database className="h-5 w-5 text-blue-600" />
                    What We're Improving
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <p className="font-medium text-sm">Database Optimization</p>
                      <p className="text-xs text-gray-600">Improving trading speed and reliability</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <p className="font-medium text-sm">Security Updates</p>
                      <p className="text-xs text-gray-600">Enhanced protection for your transactions</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <p className="font-medium text-sm">Performance Improvements</p>
                      <p className="text-xs text-gray-600">Faster loading and smoother experience</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* What You Can Do */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
            </motion.div>

            {/* Status Updates */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <Card className="bg-gray-50">
                <CardContent className="pt-6">
                  <div className="text-center space-y-3">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 text-gray-500 animate-spin" />
                      <span className="text-sm font-medium text-gray-700">Maintenance in Progress</span>
                    </div>
                    <p className="text-xs text-gray-500">We'll notify you as soon as trading is available again</p>
                    
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            
          </div>
        </main>

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
              <span>
                Seller:{" "}
                {listing.seller_username.length > 15
                  ? `${listing.seller_username.substring(0, 15)}...`
                  : listing.seller_username}
              </span>
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

// Recent Sale Card Component
function RecentSaleCard({ sale }: { sale: RecentSale }) {
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

  const rarityStyle = rarityStyles[sale.card.rarity as keyof typeof rarityStyles] || rarityStyles.common

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

  // Calculate time ago
  const getTimeAgo = (dateString: string) => {
    if (!dateString) return "Unknown"
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHour / 24)

    if (diffDay > 0) {
      return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`
    } else if (diffHour > 0) {
      return `${diffHour} hour${diffHour > 1 ? "s" : ""} ago`
    } else if (diffMin > 0) {
      return `${diffMin} minute${diffMin > 1 ? "s" : ""} ago`
    } else {
      return "Just now"
    }
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
                sale.card.image_url ||
                `/placeholder.svg?height=400&width=300&query=${encodeURIComponent(sale.card.character) || "/placeholder.svg"}`
              }
              alt={sale.card.name}
              fill
              className="object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 flex justify-center">
              {renderStars(sale.card_level, "xs")}
            </div>
          </div>

          {/* Card Details */}
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium text-sm">{sale.card.name}</h3>
                <p className="text-xs text-gray-500">{sale.card.character}</p>
              </div>
              <div className="flex flex-col items-end">
                <Badge className={rarityStyle.badge}>{sale.card.rarity}</Badge>
                <Badge variant="outline" className="mt-1 text-xs">
                  Level {sale.card_level}
                </Badge>
              </div>
            </div>

            <div className="flex items-center mt-1 text-xs text-gray-500">
              <span>
                Seller: {sale.seller_id.length > 15 ? `${sale.seller_id.substring(0, 12)}..` : sale.seller_id}
              </span>
              <span className="mx-1">•</span>
              <span>Buyer: {sale.buyer_id.length > 15 ? `${sale.buyer_id.substring(0, 12)}..` : sale.buyer_id}</span>
            </div>

            <div className="flex justify-between items-center mt-2">
              <div className="flex items-center">
                <span className="font-bold">{sale.price} WLD</span>
                <Badge variant="outline" className="ml-2 bg-green-50 text-green-600 border-green-200">
                  <DollarSign className="h-3 w-3 mr-1" />
                  Sold
                </Badge>
              </div>
              <div className="text-xs text-gray-400">
                <span title={formatDate(sale.sold_at)}>{getTimeAgo(sale.sold_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
