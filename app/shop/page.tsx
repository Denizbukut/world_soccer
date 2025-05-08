"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import ProtectedRoute from "@/components/protected-route"
import MobileNav from "@/components/mobile-nav"
import { Button } from "@/components/ui/button"
import { Ticket, Info, Check } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { motion } from "framer-motion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { MiniKit, tokenToDecimals, Tokens, type PayCommandInput } from "@worldcoin/minikit-js"

export default function ShopPage() {
  const { user, updateUserTickets } = useAuth()
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({})
  const [tickets, setTickets] = useState<number>(user?.tickets ? Number(user.tickets) : 0)
  const [legendaryTickets, setLegendaryTickets] = useState<number>(
    user?.legendary_tickets ? Number(user.legendary_tickets) : 0,
  )

  // Send payment function
  const sendPayment = async (
    amount: number,
    packageId: string,
    ticketAmount: number,
    ticketType: "regular" | "legendary",
  ) => {
    setIsLoading({ ...isLoading, [packageId]: true })

    try {
      const res = await fetch("/api/initiate-payment", {
        method: "POST",
      })
      const { id } = await res.json()

      const payload: PayCommandInput = {
        reference: id,
        to: "0x4bb270ef6dcb052a083bd5cff518e2e019c0f4ee", // wallet address
        tokens: [
          {
            symbol: Tokens.WLD,
            token_amount: tokenToDecimals(amount, Tokens.WLD).toString(),
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
  const handleBuyTickets = async (packageId: string, ticketAmount: number, ticketType: "regular" | "legendary") => {
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
        .select("tickets, legendary_tickets")
        .eq("username", user.username)
        .single()

      if (fetchError) {
        throw new Error("Could not fetch user data")
      }

      // Calculate new ticket counts - ensure we're working with numbers
      let newTicketCount = typeof userData.tickets === "number" ? userData.tickets : Number(userData.tickets) || 0
      let newLegendaryTicketCount =
        typeof userData.legendary_tickets === "number"
          ? userData.legendary_tickets
          : Number(userData.legendary_tickets) || 0

      if (ticketType === "regular") {
        newTicketCount += ticketAmount
      } else {
        newLegendaryTicketCount += ticketAmount
      }

      // Update tickets in database
      const { error: updateError } = await supabase
        .from("users")
        .update({
          tickets: newTicketCount,
          legendary_tickets: newLegendaryTicketCount,
        })
        .eq("username", user.username)

      if (updateError) {
        throw new Error("Failed to update tickets")
      }

      // Update local state with explicit number types
      setTickets(newTicketCount)
      setLegendaryTickets(newLegendaryTicketCount)

      // Update auth context
      await updateUserTickets?.(newTicketCount, newLegendaryTicketCount)

      toast({
        title: "Purchase Successful!",
        description: `You've purchased ${ticketAmount} ${ticketType === "legendary" ? "legendary" : "regular"} tickets!`,
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
    { id: "reg-1", amount: 1, price: 0.2 },
    { id: "reg-3", amount: 3, price: 0.5 },
    { id: "reg-5", amount: 5, price: 0.8 },
    { id: "reg-10", amount: 10, price: 1.4 },
  ]

  // Legendary ticket packages
  const legendaryPackages = [
    { id: "leg-1", amount: 1, price: 0.6 },
    { id: "leg-3", amount: 3, price: 1.5 },
    { id: "leg-5", amount: 5, price: 2.4 },
    { id: "leg-10", amount: 10, price: 4.2 },
  ]

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#f8f9ff] pb-20 text-black">
        {/* Header with glass effect */}
        <header className="sticky top-0 z-10 backdrop-blur-md bg-white/80 border-b border-gray-100">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center">
              <h1 className="text-lg font-medium">Shop</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
                <Ticket className="h-3.5 w-3.5 text-violet-500" />
                <span className="font-medium text-sm">{tickets}</span>
              </div>
              <div className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
                <Ticket className="h-3.5 w-3.5 text-amber-500" />
                <span className="font-medium text-sm">{legendaryTickets}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 space-y-6 max-w-lg mx-auto">
          {/* Tabs for different ticket types */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <Tabs defaultValue="regular" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-11 rounded-xl p-1 bg-gray-100 mb-6">
                <TabsTrigger
                  value="regular"
                  className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-violet-600 data-[state=active]:shadow-sm transition-all"
                >
                  <Ticket className="h-4 w-4 mr-2 text-violet-500" />
                  Regular Tickets
                </TabsTrigger>
                <TabsTrigger
                  value="legendary"
                  className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-amber-600 data-[state=active]:shadow-sm transition-all"
                >
                  <Ticket className="h-4 w-4 mr-2 text-amber-500" />
                  Legendary Tickets
                </TabsTrigger>
              </TabsList>

              {/* Regular Tickets Content */}
              <TabsContent value="regular" className="mt-0 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  {regularPackages.map((pkg) => (
                    <Card
                      key={pkg.id}
                      className="relative overflow-hidden border bg-white/70 backdrop-blur-sm hover:shadow-md transition-all"
                    >
                      <CardHeader className="p-4 pb-2 space-y-1">
                        <CardTitle className="text-lg font-medium flex items-center">
                          <span className="mr-1">{pkg.amount}</span>
                          <Ticket className="h-4 w-4 text-violet-500 mx-1" />
                          {pkg.amount === 1 ? "Ticket" : "Tickets"}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 pb-3">
                        <Separator className="my-3" />
                        <div className="flex items-center justify-between">
                          <span className="text-base font-semibold">{pkg.price} WLD</span>
                        </div>
                      </CardContent>
                      <CardFooter className="p-4 pt-0">
                        <Button
                          className="w-full bg-white text-violet-600 border border-violet-200 hover:bg-violet-50 shadow-sm"
                          variant="outline"
                          onClick={() => sendPayment(pkg.price, pkg.id, pkg.amount, "regular")}
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
                  ))}
                </div>

              </TabsContent>

              {/* Legendary Tickets Content */}
              <TabsContent value="legendary" className="mt-0 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  {legendaryPackages.map((pkg) => (
                    <Card
                      key={pkg.id}
                      className="relative overflow-hidden border bg-white/70 backdrop-blur-sm hover:shadow-md transition-all"
                    >
                      <CardHeader className="p-4 pb-2 space-y-1">
                        <CardTitle className="text-lg font-medium flex items-center">
                          <span className="mr-1">{pkg.amount}</span>
                          <Ticket className="h-4 w-4 text-amber-500 mx-1" />
                          {pkg.amount === 1 ? "L. Ticket" : "L. Tickets"}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 pb-3">
                        <Separator className="my-3" />
                        <div className="flex items-center justify-between">
                          <span className="text-base font-semibold">{pkg.price} WLD</span>
                        </div>
                      </CardContent>
                      <CardFooter className="p-4 pt-0">
                        <Button
                          className="w-full bg-white text-amber-600 border border-amber-200 hover:bg-amber-50 shadow-sm"
                          variant="outline"
                          onClick={() => sendPayment(pkg.price, pkg.id, pkg.amount, "legendary")}
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
                  ))}
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
