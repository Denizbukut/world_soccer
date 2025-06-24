"use client"

import React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { ArrowLeft, Shield, Users, Trophy, Crown, Lock, CheckCircle, AlertCircle } from "lucide-react"
import Link from "next/link"
import { MiniKit, tokenToDecimals, Tokens, type PayCommandInput } from "@worldcoin/minikit-js"
import { useWldPrice } from "@/contexts/WldPriceContext"

export default function CreateClanPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [clanName, setClanName] = useState("")
  const [clanDescription, setClanDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [userHasClan, setUserHasClan] = useState(false)
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({})
  const [nameError, setNameError] = useState("")
  const [checkingName, setCheckingName] = useState(false)
  const [nameAvailable, setNameAvailable] = useState<boolean | null>(null)

  const { price } = useWldPrice()

  const checkClanNameAvailability = async (name: string) => {
    if (!name.trim()) {
      setNameAvailable(null)
      return false
    }

    setCheckingName(true)
    setNameError("")
    setNameAvailable(null)

    const supabase = getSupabaseBrowserClient()
    if (!supabase) return false

    try {
      const { data: existingClan, error } = await supabase.from("clans").select("id").eq("name", name.trim()).single()

      if (existingClan) {
        setNameError("This clan name is already taken")
        setNameAvailable(false)
        return false
      }

      setNameAvailable(true)
      return true
    } catch (error) {
      console.error("Error checking clan name:", error)
      setNameAvailable(true) // Allow if check fails
      return true
    } finally {
      setCheckingName(false)
    }
  }

  const sendPayment = async (dollarPrice: number) => {
    // Validate clan name before payment
    const isNameAvailable = await checkClanNameAvailability(clanName)
    if (!isNameAvailable) {
      toast({
        title: "Invalid Clan Name",
        description: "Please choose a different clan name",
        variant: "destructive",
      })
      return
    }

    setIsLoading({ ...isLoading })

    try {
      // WLD-Betrag berechnen (fallback = 1:1)
      const roundedWldAmount = Number.parseFloat((price ? dollarPrice / price : dollarPrice).toFixed(3))

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
        description: `Create Clan`,
      }

      const { finalPayload } = await MiniKit.commandsAsync.pay(payload)

      if (finalPayload.status === "success") {
        console.log("success sending payment")
        await handleCreateClan()
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
    }
  }

  // Check if user already has a clan
  React.useEffect(() => {
    const checkUserClanStatus = async () => {
      if (!user?.username) return

      const supabase = getSupabaseBrowserClient()
      if (!supabase) return

      try {
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("clan_id")
          .eq("username", user.username)
          .single()

        if (!userError && userData) {
          setUserHasClan(!!userData.clan_id)
        }
      } catch (error) {
        console.error("Error checking user clan status:", error)
      }
    }

    checkUserClanStatus()
  }, [user?.username])

  if (user && user.level < 15) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex flex-col items-center justify-center text-center px-4">
        <div className="max-w-md">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center mx-auto mb-6">
            <Crown className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
            Create Clan
          </h1>
          <p className="text-gray-600 text-lg mb-6">You must reach level 15 to create a clan.</p>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-purple-200">
            <p className="text-sm text-gray-500">Current Level: {user.level}</p>
            <p className="text-sm text-purple-600 font-medium">Required Level: 15</p>
          </div>
        </div>
      </div>
    )
  }

  if (userHasClan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex flex-col items-center justify-center text-center px-4">
        <div className="max-w-md">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center mx-auto mb-6">
            <Lock className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
            Already in a Clan
          </h1>
          <p className="text-gray-600 text-lg mb-6">
            You are already a member of a clan and cannot create another one.
          </p>
          <div className="space-y-3">
            <Button
              onClick={() => router.push("/clan")}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
              Go to My Clan
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/clan/browse")}
              className="w-full bg-white/80 backdrop-blur-sm"
            >
              Browse Clans
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const handleCreateClan = async () => {
    if (!user?.username) {
      toast({
        title: "Error",
        description: "You must be logged in to create a clan",
        variant: "destructive",
      })
      return
    }

    if (!clanName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a clan name",
        variant: "destructive",
      })
      return
    }

    const supabase = getSupabaseBrowserClient()
    if (!supabase) return

    try {
      // Check if user is already in a clan
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("clan_id")
        .eq("username", user.username)
        .single()

      if (userError) {
        console.error("Error checking user clan:", userError)
        toast({
          title: "Error",
          description: "Error checking your account",
          variant: "destructive",
        })
        return
      }

      if (userData.clan_id) {
        toast({
          title: "Error",
          description: "You are already in a clan",
          variant: "destructive",
        })
        return
      }

      // Double-check clan name availability
      const { data: existingClan } = await supabase.from("clans").select("id").eq("name", clanName.trim()).single()

      if (existingClan) {
        toast({
          title: "Error",
          description: "This clan name is already taken",
          variant: "destructive",
        })
        return
      }

      // Create new clan
      const { data: clanData, error: clanError } = await supabase
        .from("clans")
        .insert({
          name: clanName.trim(),
          description: clanDescription.trim() || null,
          level: 1,
          xp: 0,
          xp_needed: 1000,
          founder_id: user.username,
          member_count: 1,
        })
        .select("id")
        .single()

      if (clanError) {
        console.error("Error creating clan:", clanError)
        toast({
          title: "Error",
          description: "Error creating clan",
          variant: "destructive",
        })
        return
      }

      // Update user's clan_id
      const { error: updateError } = await supabase
        .from("users")
        .update({ clan_id: clanData.id })
        .eq("username", user.username)

      // Add founder to clan_members table
      const { error: memberInsertError } = await supabase.from("clan_members").insert({
        clan_id: clanData.id,
        user_id: user.username,
        role: "leader",
      })

      if (memberInsertError) {
        console.error("Error adding to clan_members:", memberInsertError)
        toast({
          title: "Warning",
          description: "Clan created but you were not added as a member",
          variant: "destructive",
        })
      }

      if (updateError) {
        console.error("Error updating user clan:", updateError)
        toast({
          title: "Warning",
          description: "Clan created but your membership could not be updated",
          variant: "destructive",
        })
      }

      // Add clan creation activity
      await supabase.from("clan_activities").insert({
        clan_id: clanData.id,
        activity_type: "create",
        description: `Clan was founded by ${user.username}`,
        user_id: user.username,
        created_at: new Date().toISOString(),
      })

      toast({
        title: "Success! 🎉",
        description: "Your clan has been successfully created",
      })

      // Redirect to clan page
      router.push(`/clan/${clanData.id}`)
    } catch (error) {
      console.error("Error in handleCreateClan:", error)
      toast({
        title: "Error",
        description: "Error creating clan",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="flex items-center mb-8">
          <Link href="/clan">
            <Button variant="ghost" size="sm" className="mr-3 hover:bg-white/50 backdrop-blur-sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Create Your Clan
            </h1>
            <p className="text-gray-600 mt-1">Build your own community and lead others to victory</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Form Card */}
          <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                Create New Clan
              </CardTitle>
              <p className="text-gray-600 text-sm">Set up your clan with a unique name and description</p>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  sendPayment(3) // 3 USD als Beispielpreis für Clan-Erstellung
                }}
                className="space-y-6"
              >
                <div>
                  <label htmlFor="clanName" className="block text-sm font-semibold mb-3 text-gray-700">
                    Clan Name
                  </label>
                  <div className="relative">
                    <Input
                      id="clanName"
                      value={clanName}
                      onChange={(e) => {
                        setClanName(e.target.value)
                        if (nameError) setNameError("") // Clear error when typing
                        setNameAvailable(null)
                      }}
                      onBlur={() => {
                        if (clanName.trim()) {
                          checkClanNameAvailability(clanName)
                        }
                      }}
                      placeholder="Give your clan a unique name"
                      maxLength={12}
                      required
                      className={`border-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 pr-10 ${
                        nameError
                          ? "border-red-300 focus:ring-red-500"
                          : nameAvailable === true
                            ? "border-green-300 focus:ring-green-500"
                            : "border-gray-200"
                      }`}
                    />
                    {/* Status Icon */}
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {checkingName && (
                        <div className="h-4 w-4 border-2 border-t-transparent border-blue-500 rounded-full animate-spin"></div>
                      )}
                      {!checkingName && nameAvailable === true && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {!checkingName && nameAvailable === false && <AlertCircle className="h-4 w-4 text-red-500" />}
                    </div>
                  </div>

                  {/* Status Messages */}
                  {checkingName && (
                    <p className="text-xs text-blue-600 mt-2 flex items-center gap-2">
                      <div className="h-3 w-3 border-2 border-t-transparent border-current rounded-full animate-spin"></div>
                      Checking availability...
                    </p>
                  )}
                  {nameError && (
                    <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {nameError}
                    </p>
                  )}
                  {nameAvailable === true && !checkingName && (
                    <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Great! This name is available
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">{clanName.length}/12 characters</p>
                </div>

                <div>
                  <label htmlFor="clanDescription" className="block text-sm font-semibold mb-3 text-gray-700">
                    Description (optional)
                  </label>
                  <Textarea
                    id="clanDescription"
                    value={clanDescription}
                    onChange={(e) => setClanDescription(e.target.value)}
                    placeholder="Describe your clan's goals and values..."
                    maxLength={20}
                    rows={4}
                    className="border-2 border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none transition-all duration-200"
                  />
                  <p className="text-xs text-gray-500 mt-1">{clanDescription.length}/20 characters</p>
                </div>

                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-200">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center">
                      <Crown className="h-4 w-4 text-white" />
                    </div>
                    <h3 className="font-semibold text-purple-900">Creation Fee</h3>
                  </div>
                  <p className="text-sm text-purple-700 mb-3">
                    Creating a clan requires a one-time fee of <span className="font-bold">$3 USD</span> to ensure
                    serious commitment and prevent spam.
                  </p>
                  <div className="text-xs text-purple-600">
                    ≈ {price ? (3 / price).toFixed(2) : "3.00"} WLD at current rates
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
                  disabled={loading || checkingName || nameAvailable === false || !clanName.trim()}
                >
                  {loading ? (
                    <>
                      <div className="h-5 w-5 border-2 border-t-transparent border-current rounded-full animate-spin mr-3"></div>
                      Creating Clan...
                    </>
                  ) : (
                    <>
                      <Shield className="h-5 w-5 mr-3" />
                      Create Clan - $3 USD
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Benefits Cards */}
          <div className="space-y-6">
            <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                    <Crown className="h-5 w-5 text-white" />
                  </div>
                  Founder Benefits
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Trophy className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Leadership Authority</p>
                    <p className="text-sm text-gray-600">
                      Manage members, assign roles, and guide your clan's direction
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Shield className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">+5% XP Bonus</p>
                    <p className="text-sm text-gray-600">Earn extra experience from all pack openings</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <Crown className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">+2% Legendary Bonus</p>
                    <p className="text-sm text-gray-600">Increased chance for legendary cards from packs</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Users className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Ticket Discounts</p>
                    <p className="text-sm text-gray-600">10% off all purchases when clan reaches 30+ members</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl">Clan Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-500 to-emerald-500"></div>
                  <span className="text-gray-700">Level up together and unlock exclusive rewards</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500"></div>
                  <span className="text-gray-700">Private chat system for clan coordination</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"></div>
                  <span className="text-gray-700">Assign special roles with unique bonuses</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500"></div>
                  <span className="text-gray-700">Participate in clan missions and competitions</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-red-500 to-pink-500"></div>
                  <span className="text-gray-700">Expand clan capacity through donations</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
