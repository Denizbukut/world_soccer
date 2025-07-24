"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import ProtectedRoute from "@/components/protected-route"
import MobileNav from "@/components/mobile-nav"
import { Button } from "@/components/ui/button"
import { Ticket, Info, Check, Crown } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { motion } from "framer-motion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { MiniKit, tokenToDecimals, Tokens, type PayCommandInput } from "@worldcoin/minikit-js"
import { useEffect } from "react"
import { useWldPrice } from "@/contexts/WldPriceContext"


export default function ShopPage() {
  const { user, updateUserTickets } = useAuth()
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({})
  const [tickets, setTickets] = useState<number>(user?.tickets ? Number(user.tickets) : 0)
  const [legendaryTickets, setLegendaryTickets] = useState<number>(
    user?.legendary_tickets ? Number(user.legendary_tickets) : 0,
  )
  const [iconTickets, setIconTickets] = useState<number>(user?.icon_tickets ? Number(user.icon_tickets) : 0)
  const [userClanRole, setUserClanRole] = useState<string | null>(null)
  const [clanMemberCount, setClanMemberCount] = useState<number>(0)

  const { price } = useWldPrice()

   useEffect(() => {
  const fetchUserClanRole = async () => {
    if (!user?.username) return

    const supabase = getSupabaseBrowserClient()
    if (!supabase) return

    try {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("clan_id")
        .eq("username", user.username)
        .single()

      if (userError || !userData?.clan_id) {
        setUserClanRole(null)
        return
      }

      const clanId = userData.clan_id

      // Fetch user role in clan
      const { data: memberData, error: memberError } = await supabase
        .from("clan_members")
        .select("role")
        .eq("clan_id", clanId)
        .eq("user_id", user.username)
        .single()

      if (memberError || !memberData) {
        setUserClanRole(null)
        return
      }

      setUserClanRole(memberData.role as string)

      // Fetch member count
      const { count, error: countError } = await supabase
        .from("clan_members")
        .select("*", { count: "exact", head: true })
        .eq("clan_id", clanId)

      if (!countError) {
        setClanMemberCount(count ?? 0)
      }
    } catch (error) {
      console.error("Error fetching clan role or member count:", error)
    }
  }

  fetchUserClanRole()
}, [user?.username])

  // Synchronisiere Ticket-States mit User-Objekt
  useEffect(() => {
    if (user) {
      if (typeof user.tickets === "number") setTickets(user.tickets)
      if (typeof user.legendary_tickets === "number") setLegendaryTickets(user.legendary_tickets)
      if (typeof user.icon_tickets === "number") setIconTickets(user.icon_tickets)
    }
  }, [user])


 const getDiscountedPrice = (originalPrice: number) => {
  // Rabatt, wenn:
  // - cheap_hustler oder
  // - leader + mindestens 30 Clan-Member
  const qualifiesForDiscount =
    userClanRole === "cheap_hustler" ||
    (userClanRole === "leader" && clanMemberCount >= 30)

  return qualifiesForDiscount ? originalPrice * 0.9 : originalPrice
}

  const sendPayment = async (
  dollarPrice: number,
  packageId: string,
  ticketAmount: number,
  ticketType: "regular" | "legendary" | "icon",
) => {
  setIsLoading({ ...isLoading, [packageId]: true })

  try {
    const discountedPrice = getDiscountedPrice(dollarPrice)
    // WLD-Betrag berechnen (fallback = 1:1)
    const roundedWldAmount = Number.parseFloat((price ? discountedPrice / price : discountedPrice).toFixed(3))

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
      description: `${ticketAmount} ${ticketType === "legendary" ? "Legendary" : "Regular"} Tickets`,
    }

    const { finalPayload } = await MiniKit.commandsAsync.pay(payload)

    if (finalPayload.status === "success") {
      console.log("success sending payment")
      await handleBuyTickets(packageId, ticketAmount, ticketType)
    } else {
      toast({
        title: "Payment Failed",
        description: "Your payment could not be processed. Please try again.",
        variant: "destructive",
      })
      setIsLoading({ ...isLoading, [packageId]: false })
    }
  } catch (error) {
    console.error("Payment error:", error)
    toast({
      title: "Payment Error",
      description: "An error occurred during payment. Please try again.",
      variant: "destructive",
    })
    setIsLoading({ ...isLoading, [packageId]: false })
  }
}


  // Handle buying tickets
 // Handle buying tickets
  const handleBuyTickets = async (packageId: string, ticketAmount: number, ticketType: "regular" | "legendary" | "icon") => {
    if (!user?.username) {
      toast({
        title: "Error",
        description: "You must be logged in to purchase tickets",
        variant: "destructive",
      })
      setIsLoading({ ...isLoading, [packageId]: false })
      return
    }

    try {
      const supabase = getSupabaseBrowserClient()
      if (!supabase) {
        throw new Error("Could not connect to database")
      }

      // Get current ticket counts
      const { data: userData, error: fetchError } = await supabase
        .from("users")
        .select("tickets, legendary_tickets, icon_tickets")
        .eq("username", user.username)
        .single()

      if (fetchError) {
        throw new Error("Could not fetch user data")
      }

      // Calculate new ticket counts
      let newTicketCount = typeof userData.tickets === "number" ? userData.tickets : Number(userData.tickets) || 0
      let newLegendaryTicketCount =
        typeof userData.legendary_tickets === "number"
          ? userData.legendary_tickets
          : Number(userData.legendary_tickets) || 0
      let newIconTicketCount =
        typeof userData.icon_tickets === "number"
          ? userData.icon_tickets
          : Number(userData.icon_tickets) || 0

      if (ticketType === "regular") {
        newTicketCount += ticketAmount
      } else if (ticketType === "legendary") {
        newLegendaryTicketCount += ticketAmount
      } else if (ticketType === "icon") {
        newIconTicketCount += ticketAmount
      }

      // Update tickets in database
      const { error: updateError } = await supabase
        .from("users")
        .update({
          tickets: newTicketCount,
          legendary_tickets: newLegendaryTicketCount,
          icon_tickets: newIconTicketCount,
        })
        .eq("username", user.username)

      if (updateError) {
        throw new Error("Failed to update tickets")
      }

      // Update local state
      setTickets(newTicketCount)
      setLegendaryTickets(newLegendaryTicketCount)
      setIconTickets(newIconTicketCount)

      // Update auth context
      await updateUserTickets?.(newTicketCount, newLegendaryTicketCount)

      const qualifiesForCheapHustler = userClanRole === "cheap_hustler"
      const qualifiesForLeaderDiscount = userClanRole === "leader" && clanMemberCount >= 30

      const discountMessage = qualifiesForCheapHustler
        ? " (10% Cheap Hustler discount applied!)"
        : qualifiesForLeaderDiscount
        ? " (10% Leader discount applied!)"
        : ""
      
        // Log the purchase
await supabase.from("ticket_purchases").insert({
  username: user.username,
  ticket_type: ticketType,
  amount: ticketAmount,
  price_usd: getDiscountedPrice(packageId.startsWith("reg") ? regularPackages.find(p => p.id === packageId)?.price ?? 0 : legendaryPackages.find(p => p.id === packageId)?.price ?? 0),
  price_wld: price ? (getDiscountedPrice(packageId.startsWith("reg") ? regularPackages.find(p => p.id === packageId)?.price ?? 0 : legendaryPackages.find(p => p.id === packageId)?.price ?? 0) / price).toFixed(3) : null,
  discounted: getDiscountedPrice(packageId.startsWith("reg") ? regularPackages.find(p => p.id === packageId)?.price ?? 0 : legendaryPackages.find(p => p.id === packageId)?.price ?? 0) < (packageId.startsWith("reg") ? regularPackages.find(p => p.id === packageId)?.price ?? 0 : legendaryPackages.find(p => p.id === packageId)?.price ?? 0),
})

      toast({
        title: "Purchase Successful!",
        description: `You've purchased ${ticketAmount} ${ticketType === "legendary" ? "legendary" : "regular"} tickets!${discountMessage}`,
      })
    } catch (error) {
      console.error("Error buying tickets:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading({ ...isLoading, [packageId]: false })
    }
  }


  // Regular ticket packages
  const regularPackages = [
    { id: "reg-1", amount: 1, price: 0.11 },
    { id: "reg-5", amount: 5, price: 0.35 },
    { id: "reg-10", amount: 10, price: 0.6 },
    { id: "reg-20", amount: 20, price: 1.05 },
    { id: "reg-50", amount: 50, price: 2.2 },
    { id: "reg-500", amount: 500, price: 15 },
    
  ]

  // Legendary ticket packages
  const legendaryPackages = [
    { id: "leg-1", amount: 1, price: 0.15 },
    { id: "leg-5", amount: 5, price: 0.6 },
    { id: "leg-10", amount: 10, price: 1 },
    { id: "leg-20", amount: 20, price: 1.8 },
    { id: "leg-50", amount: 50, price: 4 },
    { id: "leg-500", amount: 500, price: 32 },
  ]

  // Icon Ticket Packages (20% teurer als Legendary)
  const iconPackages = legendaryPackages.map(pkg => ({
    id: `icon-${pkg.amount}`,
    amount: pkg.amount,
    price: +(pkg.price * 1.2).toFixed(2),
  }))

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-20 text-black">
        {/* Shop Header mit Ticket-Anzeige oben rechts */}
        <div className="flex items-center justify-between max-w-lg mx-auto px-4 py-3">
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
            Ticket Shop
          </h1>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
              <Ticket className="h-3.5 w-3.5 text-amber-500" />
              <span className="font-medium text-sm">{tickets}</span>
            </div>
            <div className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
              <Ticket className="h-3.5 w-3.5 text-blue-500" />
              <span className="font-medium text-sm">{legendaryTickets}</span>
            </div>
            <div className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
              <Crown className="h-3.5 w-3.5 text-indigo-500" />
              <span className="font-medium text-sm">{iconTickets}</span>
            </div>
          </div>
        </div>

        <main className="p-4 space-y-6 max-w-lg mx-auto">
          {/* Discount Banner */}
          {(userClanRole === "cheap_hustler" || (userClanRole === "leader" && clanMemberCount >= 30)) && (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl p-3 text-center"
  >
    <p className="font-semibold text-sm">🎉 Discount Active!</p>
    <p className="text-xs opacity-90">
      {userClanRole === "cheap_hustler"
        ? "You get 10% off all ticket purchases as a Cheap Hustler!"
        : "You get 10% off all ticket purchases as a Leader of a 30+ member clan!"}
    </p>
  </motion.div>
)}

          {/* Tabs for different ticket types */}
<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
  <Tabs defaultValue="regular" className="w-full">
    <TabsList className="grid w-full grid-cols-3 h-12 rounded-2xl p-1 bg-gradient-to-r from-yellow-100 via-pink-100 to-blue-100 mb-6 shadow">
      <TabsTrigger
        value="regular"
        className="rounded-lg data-[state=active]:bg-white data-[state=active]:border-2 data-[state=active]:border-orange-400 data-[state=active]:text-orange-700 data-[state=active]:shadow transition-all"
      >
        <Ticket className="h-4 w-4 mr-2 text-orange-500" />
        Classic Tickets
      </TabsTrigger>
      <TabsTrigger
        value="legendary"
        className="rounded-lg data-[state=active]:bg-white data-[state=active]:border-2 data-[state=active]:border-blue-400 data-[state=active]:text-blue-700 data-[state=active]:shadow transition-all"
      >
        <Ticket className="h-4 w-4 mr-2 text-blue-500" />
        Elite Tickets
      </TabsTrigger>
      <TabsTrigger
        value="icon"
        className="rounded-lg data-[state=active]:bg-white data-[state=active]:border-2 data-[state=active]:border-indigo-400 data-[state=active]:text-indigo-700 data-[state=active]:shadow transition-all"
      >
        <span className="font-extrabold text-indigo-500 mr-2">★</span>
        Icon Tickets
      </TabsTrigger>
    </TabsList>

    {/* Classic Tickets Content */}
    <TabsContent value="regular" className="mt-0 space-y-6">
      <div className="grid grid-cols-2 gap-3">
        {regularPackages.map((pkg) => {
          const originalPrice = pkg.price
          const discountedPrice = getDiscountedPrice(originalPrice)
          const hasDiscount = discountedPrice < originalPrice
          return (
            <motion.div
              key={pkg.id}
              whileHover={{ scale: 1.03, boxShadow: '0 0 32px 0 rgba(168,85,247,0.18)' }}
              className="relative"
            >
              <Card
                className="overflow-hidden border-2 border-orange-400 bg-gradient-to-br from-orange-200 to-orange-400 rounded-2xl shadow-[0_0_24px_0_rgba(251,191,36,0.10)] transition-all"
              >
                {/* Shine Effekt */}
                <motion.div
                  className="absolute left-[-40%] top-0 w-1/2 h-full bg-gradient-to-r from-transparent via-orange-100/60 to-transparent skew-x-[-20deg] pointer-events-none"
                  animate={{ left: ['-40%', '120%'] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                />
                {hasDiscount && (
                  <div className="absolute top-2 right-2 bg-gradient-to-r from-green-400 to-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow">
                    -10%
                  </div>
                )}
                <CardHeader className="p-4 pb-2 space-y-1">
                  <CardTitle className="text-lg font-extrabold flex items-center text-orange-700 drop-shadow">
                    <span className="mr-2">{pkg.amount}</span>
                    <Ticket className="h-6 w-6 text-orange-500 drop-shadow-lg mx-1" />
                    <span className="ml-1">{pkg.amount === 1 ? "Classic Ticket" : "Classic Tickets"}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 pb-2">
                  <Separator className="my-2" />
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col items-start">
                      {hasDiscount && (
                        <span className="text-xs text-gray-400 line-through">
                          {price ? `${(originalPrice / price).toFixed(3)} WLD` : `${originalPrice.toFixed(3)} WLD`}
                        </span>
                      )}
                      <span className="text-lg font-bold text-orange-700">
                        {price
                          ? `${(discountedPrice / price).toFixed(3)} WLD`
                          : `${discountedPrice.toFixed(3)} WLD`}
                      </span>
                      <span className="text-xs text-gray-500">
                        (~${discountedPrice.toFixed(2)})
                      </span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="p-4 pt-0">
                  <Button
                    className="w-full bg-gradient-to-r from-orange-300 to-orange-500 text-orange-900 font-bold border-0 hover:scale-105 hover:shadow-lg transition"
                    onClick={() => sendPayment(originalPrice, pkg.id, pkg.amount, 'regular')}
                    disabled={isLoading[pkg.id]}
                  >
                    {isLoading[pkg.id] ? (
                      <>
                        <div className="h-4 w-4 border-2 border-t-transparent border-violet-600 rounded-full animate-spin mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      "Purchase"
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </TabsContent>

    {/* Elite Tickets Content */}
    <TabsContent value="legendary" className="mt-0 space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {legendaryPackages.map((pkg) => {
          const originalPrice = pkg.price
          const discountedPrice = getDiscountedPrice(originalPrice)
          const hasDiscount = discountedPrice < originalPrice
          return (
            <motion.div
              key={pkg.id}
              whileHover={{ scale: 1.03, boxShadow: '0 0 32px 0 rgba(251,191,36,0.18)' }}
              className="relative"
            >
              <Card
                className="overflow-hidden border-2 border-blue-400 bg-gradient-to-br from-blue-200 to-blue-500 rounded-2xl shadow-[0_0_24px_0_rgba(59,130,246,0.10)] transition-all"
              >
                <motion.div
                  className="absolute left-[-40%] top-0 w-1/2 h-full bg-gradient-to-r from-transparent via-blue-100/60 to-transparent skew-x-[-20deg] pointer-events-none"
                  animate={{ left: ['-40%', '120%'] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                />
                {hasDiscount && (
                  <div className="absolute top-2 right-2 bg-gradient-to-r from-green-400 to-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow">
                    -10%
                  </div>
                )}
                <CardHeader className="p-4 pb-2 space-y-1">
                  <CardTitle className="text-lg font-extrabold flex items-center text-blue-700 drop-shadow">
                    <span className="mr-2">{pkg.amount}</span>
                    <Ticket className="h-6 w-6 text-blue-500 drop-shadow-lg mx-1" />
                    <span className="ml-1">{pkg.amount === 1 ? "Elite Ticket" : "Elite Tickets"}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 pb-3">
                  <Separator className="my-2" />
                  <div className="flex flex-col items-start">
                    {hasDiscount && (
                      <span className="text-xs text-gray-400 line-through">
                        {price ? `${(originalPrice / price).toFixed(3)} WLD` : `${originalPrice.toFixed(3)} WLD`}
                      </span>
                    )}
                    <span className="text-lg font-bold text-blue-700">
                      {price
                        ? `${(discountedPrice / price).toFixed(3)} WLD`
                        : `${discountedPrice.toFixed(3)} WLD`}
                    </span>
                    <span className="text-xs text-gray-500">
                      (~${discountedPrice.toFixed(2)})
                    </span>
                  </div>
                </CardContent>
                <CardFooter className="p-4 pt-0">
                  <Button
                    className="w-full bg-gradient-to-r from-blue-300 to-blue-700 text-blue-900 font-bold border-0 hover:scale-105 hover:shadow-lg transition"
                    onClick={() => sendPayment(originalPrice, pkg.id, pkg.amount, 'legendary')}
                    disabled={isLoading[pkg.id]}
                  >
                    {isLoading[pkg.id] ? (
                      <>
                        <div className="h-4 w-4 border-2 border-t-transparent border-amber-600 rounded-full animate-spin mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      "Purchase"
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </TabsContent>

    {/* Icon Tickets Content */}
    <TabsContent value="icon" className="mt-0 space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {iconPackages.map((pkg) => {
          const originalPrice = pkg.price
          const discountedPrice = getDiscountedPrice(originalPrice)
          const hasDiscount = discountedPrice < originalPrice
          return (
            <motion.div
              key={pkg.id}
              whileHover={{ scale: 1.03, boxShadow: '0 0 32px 0 rgba(99,102,241,0.18)' }}
              className="relative"
            >
              <Card
                className="overflow-hidden border-2 border-indigo-400 bg-gradient-to-br from-indigo-100 via-indigo-200 to-indigo-400 rounded-2xl shadow-[0_0_24px_0_rgba(99,102,241,0.10)] transition-all"
              >
                <motion.div
                  className="absolute left-[-40%] top-0 w-1/2 h-full bg-gradient-to-r from-transparent via-indigo-200/60 to-transparent skew-x-[-20deg] pointer-events-none"
                  animate={{ left: ['-40%', '120%'] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                />
                {hasDiscount && (
                  <div className="absolute top-2 right-2 bg-gradient-to-r from-green-400 to-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow">
                    -10%
                  </div>
                )}
                <CardHeader className="p-4 pb-2 space-y-1">
                  <CardTitle className="text-lg font-extrabold flex items-center text-indigo-700 drop-shadow">
                    <span className="font-extrabold text-indigo-500 mx-1 text-2xl">★</span>
                    <span className="ml-1">{pkg.amount === 1 ? "Icon Ticket" : "Icon Tickets"}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 pb-3">
                  <Separator className="my-2" />
                  <div className="flex flex-col items-start">
                    {hasDiscount && (
                      <span className="text-xs text-gray-400 line-through">
                        {price ? `${(originalPrice / price).toFixed(3)} WLD` : `${originalPrice.toFixed(3)} WLD`}
                      </span>
                    )}
                    <span className="text-lg font-bold text-indigo-700">
                      {price ? `${(discountedPrice / price).toFixed(3)} WLD` : `${discountedPrice.toFixed(3)} WLD`}
                    </span>
                    <span className="text-xs text-gray-500">(~${discountedPrice.toFixed(2)})</span>
                  </div>
                </CardContent>
                <CardFooter className="p-4 pt-0">
                  <Button
                    className="w-full bg-gradient-to-r from-indigo-200 via-indigo-400 to-blue-400 text-indigo-900 font-bold border-0 hover:scale-105 hover:shadow-lg transition"
                    onClick={() => sendPayment(originalPrice, pkg.id, pkg.amount, 'icon')}
                    disabled={isLoading[pkg.id]}
                  >
                    {isLoading[pkg.id] ? (
                      <>
                        <div className="h-4 w-4 border-2 border-t-transparent border-indigo-600 rounded-full animate-spin mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      "Purchase"
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </TabsContent>
  </Tabs>
</motion.div>


          {/* Payment info section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="bg-white rounded-xl p-5 shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Payment Information</h3>
              <Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-100">
                Secure
              </Badge>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-500">
                  <Check className="h-4 w-4 text-green-500 mr-2" />
                  Instant delivery
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Check className="h-4 w-4 text-green-500 mr-2" />
                  Secure transactions
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-500">
                  <Check className="h-4 w-4 text-green-500 mr-2" />
                  No hidden fees
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Check className="h-4 w-4 text-green-500 mr-2" />
                  24/7 support
                </div>
              </div>
            </div>

            <div className="pt-2">
              <p className="text-xs text-gray-500">
                WLD is the Worldcoin token used for payments in this app. All transactions are processed securely and
                tickets are added instantly to your account.
              </p>
            </div>
          </motion.div>
        </main>

        <MobileNav />
      </div>
    </ProtectedRoute>
  )
}
