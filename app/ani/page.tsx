"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { claimDailyToken } from "@/app/actions/tokens"
import { Button } from "@/components/ui/button"
import { Coins, Clock, ArrowLeft, Sparkles, TimerReset, Hourglass } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { Progress } from "@/components/ui/progress"
import MobileNav from "@/components/mobile-nav"
import ProtectedRoute from "@/components/protected-route"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MiniKit } from "@worldcoin/minikit-js"
import { useTokenBalance } from "@/components/getTokenBalance"




const ClaimButton = ({ onClaim, disabled, loading }: { onClaim: () => void; disabled: boolean; loading: boolean }) => {
  if (disabled) {
    return (
      <div className="w-full bg-gray-100 rounded-xl p-5 flex items-center justify-center text-gray-500 font-medium">
        <Clock className="h-5 w-5 mr-2" />
        Already Claimed Today
      </div>
    )
  }

  return (
    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full relative">
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-indigo-600 opacity-80 overflow-hidden">
        {/* Animierter Hintergrund-Farbverlauf */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-violet-600 to-fuchsia-500"
          animate={{
            backgroundPosition: ["0% 0%", "100% 0%", "0% 0%"],
          }}
          transition={{
            duration: 8,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "loop",
          }}
          style={{
            backgroundSize: "200% 100%",
          }}
        />

        {/* Wandernder Lichteffekt */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 skew-x-[-20deg]"
          animate={{
            left: ["-100%", "100%"],
          }}
          transition={{
            duration: 2.5,
            repeat: Number.POSITIVE_INFINITY,
            repeatDelay: 1,
          }}
          style={{
            width: "50%",
          }}
        />

        {/* Subtile Lichtpunkte */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={`light-${i}`}
            className="absolute rounded-full bg-white"
            style={{
              width: Math.random() * 4 + 2,
              height: Math.random() * 4 + 2,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0, 0.8, 0],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Number.POSITIVE_INFINITY,
              repeatDelay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <Button
        onClick={onClaim}
        disabled={loading}
        className="w-full h-16 text-white text-lg font-bold bg-transparent hover:bg-transparent rounded-xl shadow-lg shadow-indigo-500/30 border-2 border-white/20 relative z-10"
      >
        {loading ? (
          <div className="flex items-center justify-center">
            <div className="h-5 w-5 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
            <span>Claiming...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <Coins className="h-6 w-6 mr-2" />
            Claim Daily Token
          </div>
        )}
      </Button>

      {/* Pulsierender Glow-Effekt */}
      <motion.div
        className="absolute inset-0 rounded-xl -z-10"
        animate={{
          boxShadow: [
            "0 0 0px rgba(139, 92, 246, 0.5)",
            "0 0 20px rgba(139, 92, 246, 0.7)",
            "0 0 0px rgba(139, 92, 246, 0.5)",
          ],
        }}
        transition={{
          duration: 2,
          repeat: Number.POSITIVE_INFINITY,
          repeatType: "reverse",
        }}
      />
    </motion.div>
  )
}

export default function ANIPage() {
  const { user, refreshUserData } = useAuth()
  const [tokens, setTokens] = useState<string | null>(null);
  const [tokenClaimLoading, setTokenClaimLoading] = useState(false)
  const [tokenAlreadyClaimed, setTokenAlreadyClaimed] = useState(false)
  const [timeUntilNextTokenClaim, setTimeUntilNextTokenClaim] = useState<number | null>(null)
  const [tokenTimerDisplay, setTokenTimerDisplay] = useState("00:00:00")
  const [showTokenAnimation, setShowTokenAnimation] = useState(false)
  const [walletAddress, setWalletAddress] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
const [lastSwapTime, setLastSwapTime] = useState<Date | null>(null)
  const [swapCooldown, setSwapCooldown] = useState<number | null>(null)
  const [swapTimerDisplay, setSwapTimerDisplay] = useState("00:00:00")
  const [canSwap, setCanSwap] = useState(true)

  const swapInterval = 12 * 60 * 60 * 1000 // 12h in ms
  const swapTimerRef = useRef<NodeJS.Timeout | null>(null)


  // Interval ref
  const tokenTimerIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
const buyTicket = async () => {
  if (!user || !walletAddress) {
    toast({
      title: "Error",
      description: "No wallet connected.",
      variant: "destructive",
    })
    return
  }

  const supabase = getSupabaseBrowserClient()
  if (!supabase) return

  // Check last swap time
  const { data, error } = await supabase
  .from("users")
  .select("tickets, last_ticket_swap")
  .eq("username", user.username)
  .single()


  if (error) {
    toast({ title: "Error", description: "Could not check last swap time.", variant: "destructive" })
    return
  }

  const lastSwap = typeof data?.last_ticket_swap === "string" || typeof data?.last_ticket_swap === "number"
  ? new Date(data.last_ticket_swap)
  : null

  const now = new Date()
  const twelveHours = 12 * 60 * 60 * 1000

  if (lastSwap && now.getTime() - lastSwap.getTime() < twelveHours) {
    const remaining = twelveHours - (now.getTime() - lastSwap.getTime())
    const hours = Math.floor(remaining / (1000 * 60 * 60))
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))

    toast({
      title: "Cooldown Active",
      description: `You can exchange again in ${hours}h ${minutes}min.`,
    })
    return
  }

  // Blockchain Transfer: Burn 2 tokens
  const tokenAbi = [
    {
      inputs: [
        { internalType: "address", name: "to", type: "address" },
        { internalType: "uint256", name: "amount", type: "uint256" },
      ],
      name: "transfer",
      outputs: [{ internalType: "bool", name: "", type: "bool" }],
      stateMutability: "nonpayable",
      type: "function",
    },
  ]

  const burnAddress = "0x000000000000000000000000000000000000dEaD"
  const amountToBurn = BigInt(2 * 1e18)

  toast({ title: "Processing", description: "Burning 2 $ANIME tokens..." })

  try {
    const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
      transaction: [
        {
          address: "0xD7f7B8137Aa3176d8578c78eC53a4D5258034257",
          abi: tokenAbi,
          functionName: "transfer",
          args: [burnAddress, amountToBurn],
        },
      ],
    })

    if (finalPayload.status !== "success") throw new Error("Blockchain transaction failed")

    setTokens((prev) => {
      const prevNumber = parseFloat(prev ?? "0")
      const updated = (prevNumber - 2).toFixed(1)
      return updated
    })

    // Update tickets + timestamp in DB
    const { error: updateError } = await supabase
      .from("users")
      .update({
        tickets: (typeof data?.tickets === "number" ? data.tickets : Number(data?.tickets) || 0) + 2,

        last_ticket_swap: now.toISOString(),
      })
      .eq("username", user.username)

    if (updateError) throw new Error("Failed to update tickets")

    toast({
      title: "Success",
      description: "You received 2 tickets for 2 $ANIME!",
    })

    refreshUserData?.()
  } catch (error: any) {
    console.error("Buy Ticket Error:", error)
    toast({
      title: "Error",
      description: error.message || "Something went wrong.",
      variant: "destructive",
    })
  }
  // Direkt nach erfolgreichem Claim:
setCanSwap(false)
setSwapCooldown(swapInterval)
setSwapTimerDisplay(formatTimeRemaining(swapInterval))

}



  const sendHapticFeedbackCommand = () =>
	MiniKit.commands.sendHapticFeedback({
		hapticsType: 'impact',
		style: 'light',
	})

  const tokenAbi = [
    {
      inputs: [
        { internalType: "address", name: "to", type: "address" },
        { internalType: "uint256", name: "amount", type: "uint256" },
      ],
      name: "mintToken",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
  ]

  // Format time remaining as HH:MM:SS
  const formatTimeRemaining = (milliseconds: number) => {
    if (!milliseconds || milliseconds <= 0) return "00:00:00"

    // Ensure we're working with a positive number
    milliseconds = Math.max(0, milliseconds)

    const hours = Math.floor(milliseconds / (1000 * 60 * 60))
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000)

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  // Update timer display
  const updateTokenTimerDisplay = (milliseconds: number | null) => {
    if (milliseconds === null) {
      setTokenTimerDisplay("00:00:00")
    } else {
      setTokenTimerDisplay(formatTimeRemaining(milliseconds))
    }
  }

  // Hilfsfunktion, um zu überprüfen, ob der Benutzer einen Token beanspruchen kann
  const checkCanClaimToken = async (username: string) => {
    try {
      const supabase = getSupabaseBrowserClient()
      if (!supabase) return { canClaim: false }

      const { data, error } = await supabase
        .from("users")
        .select("token_last_claimed, tokens, world_id")
        .eq("username", username)
        .single()

      if (error) {
        console.error("Error checking token claim status:", error)
        return { canClaim: false }
      }

      // Überprüfen, ob der Benutzer in den letzten 24 Stunden einen Token beansprucht hat
      if (data?.token_last_claimed) {
        const lastClaimed = new Date(data.token_last_claimed as string)
        const now = new Date()
        const hoursSinceLastClaim = (now.getTime() - lastClaimed.getTime()) / (1000 * 60 * 60)

        if (hoursSinceLastClaim < 24) {
          const timeUntilNextClaim = 24 * 60 * 60 * 1000 - (now.getTime() - lastClaimed.getTime())
          return {
            canClaim: false,
            alreadyClaimed: true,
            timeUntilNextClaim,
            nextClaimTime: new Date(lastClaimed.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          }
        }
      }

      return { canClaim: true }
    } catch (error) {
      console.error("Error in checkCanClaimToken:", error)
      return { canClaim: false }
    }
  }
useEffect(() => {
  if (!swapCooldown || swapCooldown <= 0) return
  if (swapTimerRef.current) clearInterval(swapTimerRef.current)
  swapTimerRef.current = setInterval(() => {
    setSwapCooldown((prev) => {
      if (!prev || prev <= 1000) {
        clearInterval(swapTimerRef.current!)
        setCanSwap(true)
        setSwapTimerDisplay("00:00:00")
        return null
      }
      const updated = prev - 1000
      setSwapTimerDisplay(formatTimeRemaining(updated))
      return updated
    })
  }, 1000)
  return () => {
    if (swapTimerRef.current) clearInterval(swapTimerRef.current)
  }
}, [swapCooldown])


useEffect(() => {
  if (!user?.username) return
  const fetchWallet = async () => {
    const supabase = getSupabaseBrowserClient()
    if(!supabase) return
    const { data } = await supabase
      .from("users")
      .select("world_id, last_ticket_swap")
      .eq("username", user.username)
      .single()

    if (typeof data?.world_id === "string") {
  setWalletAddress(data.world_id)

  // hole Token Balance sofort danach
  const balance = await useTokenBalance(data.world_id)
  setTokens(balance)
}

    if (typeof data?.last_ticket_swap === "string" || typeof data?.last_ticket_swap === "number") {
      const last = new Date(data.last_ticket_swap)
      const diff = new Date().getTime() - last.getTime()
      if (diff < swapInterval) {
        setLastSwapTime(last)
        setSwapCooldown(swapInterval - diff)
        setCanSwap(false)
      } else {
        setCanSwap(true)
      }
    }
  }
  fetchWallet()
}, [user?.username])


  // Check claim status and set up timer
  useEffect(() => {
    if (!user?.username) return

    const checkClaimStatus = async () => {
      setIsLoading(true)
      try {
        const result = await checkCanClaimToken(user.username)

        if (result.alreadyClaimed) {
          setTokenAlreadyClaimed(true)
          if (result.timeUntilNextClaim) {
            setTimeUntilNextTokenClaim(result.timeUntilNextClaim)
            updateTokenTimerDisplay(result.timeUntilNextClaim)
          }
        } else {
          setTokenAlreadyClaimed(false)
          setTimeUntilNextTokenClaim(null)
          updateTokenTimerDisplay(null)
        }
      } catch (error) {
        console.error("Error checking claim status:", error)
      } finally {
        setIsLoading(false)
      }
    }

    checkClaimStatus()

    
  }, [user?.username])

  useEffect(() => {
  if (tokenTimerIntervalRef.current) clearInterval(tokenTimerIntervalRef.current)

  if (timeUntilNextTokenClaim && timeUntilNextTokenClaim > 0) {
    tokenTimerIntervalRef.current = setInterval(() => {
      setTimeUntilNextTokenClaim((prev) => {
        if (prev === null) return null
        const newTime = prev - 1000
        if (newTime <= 0) {
          clearInterval(tokenTimerIntervalRef.current!)
          setTokenAlreadyClaimed(false)
          updateTokenTimerDisplay(null)
          return null
        } else {
          updateTokenTimerDisplay(newTime)
          return newTime
        }
      })
    }, 1000)
  }

  return () => {
    if (tokenTimerIntervalRef.current) clearInterval(tokenTimerIntervalRef.current)
  }
}, [timeUntilNextTokenClaim])

  const handleMint = async () => {
    sendHapticFeedbackCommand()
    if (!user) return
    if (!walletAddress) {
      toast({
        title: "Fehler",
        description: "Keine Wallet-Adresse gefunden. Bitte verbinden Sie Ihre Wallet.",
        variant: "destructive",
      })
      return
    }

    setTokenClaimLoading(true)
    try {
      // Überprüfen, ob der Benutzer bereits einen Token beansprucht hat
      const checkResult = await checkCanClaimToken(user.username)

      if (!checkResult.canClaim) {
        setTokenAlreadyClaimed(true)
        if (checkResult.timeUntilNextClaim) {
          setTimeUntilNextTokenClaim(checkResult.timeUntilNextClaim)
          updateTokenTimerDisplay(checkResult.timeUntilNextClaim)
        }
        toast({
          title: "Already Claimed",
          description: "You've already claimed your token today. Check back tomorrow!",
        })
        setTokenClaimLoading(false)
        return
      }

      // Zuerst die Blockchain-Transaktion durchführen
      const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
        transaction: [
          {
            address: "0xD7f7B8137Aa3176d8578c78eC53a4D5258034257",
            abi: tokenAbi,
            functionName: "mintToken",
            args: [walletAddress, BigInt(Number(1) * 1e18)],
          },
        ],
      })

      // Nur wenn die Blockchain-Transaktion erfolgreich war, den Token in der Datenbank beanspruchen
      if (finalPayload.status === "success") {
        // Jetzt den Token in der Datenbank beanspruchen
        const result = await claimDailyToken(user.username)

        if (result.success) {
          // Zeige die Token-Animation an
          setShowTokenAnimation(true)

          // Aktualisiere die Tokens nach einer kurzen Verzögerung, um die Animation abzuspielen
          setTimeout(async () => {
            setTokens((prev) => {
                const prevNumber = parseFloat(prev ?? "0")
                const updated = (prevNumber + 1).toFixed(1) // z. B. 6.0000
                return updated
            })

            toast({
              title: "Success!",
              description: "You've claimed 1 token as your daily bonus!",
            })

            setTokenAlreadyClaimed(true)
            if (result.nextClaimTime) {
              const nextClaimDate = new Date(result.nextClaimTime)
              const now = new Date()
              const newTimeUntilNextClaim = nextClaimDate.getTime() - now.getTime()
              setTimeUntilNextTokenClaim(newTimeUntilNextClaim)
              updateTokenTimerDisplay(newTimeUntilNextClaim)
            } else {
              const newTimeUntilNextClaim = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
              setTimeUntilNextTokenClaim(newTimeUntilNextClaim)
              updateTokenTimerDisplay(newTimeUntilNextClaim)
            }

            // Blende die Animation nach Abschluss aus
            setTimeout(() => {
              setShowTokenAnimation(false)
            }, 1000)
          }, 1500)
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to update database after successful blockchain transaction",
            variant: "destructive",
          })
        }
      } else {
        console.error("Error sending transaction", finalPayload)
        toast({
          title: "Blockchain Error",
          description: "The blockchain transaction failed. Token was not claimed.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error claiming token:", error)
      toast({
        title: "Error",
        description: "Failed to claim token",
        variant: "destructive",
      })
    } finally {
      if (!showTokenAnimation) {
        setTokenClaimLoading(false)
      }
    }
  }

  // Calculate time percentage for progress bar
  const calculateTimePercentage = () => {
    if (!timeUntilNextTokenClaim) return 100
    const totalTime = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
    const elapsedTime = totalTime - timeUntilNextTokenClaim
    return Math.min(100, Math.max(0, (elapsedTime / totalTime) * 100))
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white pb-20">
        {/* Header */}
        <header className="sticky top-0 z-10 backdrop-blur-md bg-white/80 border-b border-gray-100">
          <div className="max-w-lg mx-auto px-4 py-3">
            <div className="flex items-center">
              <Link href="/" className="mr-3">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <h1 className="text-lg font-medium">$ANIME Token</h1>
            </div>
          </div>
        </header>

        <main className="p-4 space-y-6 max-w-lg mx-auto">
          {/* Hero Section with Token Balance */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 text-white">
            {/* Background Elements */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-white/10 blur-xl"></div>
              <div className="absolute -bottom-40 -left-20 w-80 h-80 rounded-full bg-white/10 blur-xl"></div>

              {/* Animated particles */}
              {[...Array(10)].map((_, i) => (
                <motion.div
                  key={`hero-particle-${i}`}
                  className="absolute rounded-full bg-white/20"
                  style={{
                    width: Math.random() * 8 + 4,
                    height: Math.random() * 8 + 4,
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                  animate={{
                    y: [0, -30, 0],
                    opacity: [0.2, 0.5, 0.2],
                  }}
                  transition={{
                    duration: 5 + Math.random() * 5,
                    repeat: Number.POSITIVE_INFINITY,
                    delay: Math.random() * 5,
                  }}
                />
              ))}
            </div>

            <div className="relative p-6 z-10">
              <div className="flex flex-col items-center text-center">
                
                <h2 className="text-sm font-medium text-indigo-100 mb-1">Your $ANIME Balance</h2>
                <div className="flex items-center">
                  <span className="text-5xl font-bold">{tokens}</span>
                  <span className="ml-2 text-xl opacity-80">$ANIME</span>
                </div>

                {walletAddress ? (
                  <div className="mt-4 bg-white/10 rounded-full px-4 py-2 text-xs backdrop-blur-sm">
                    <span className="opacity-80">Wallet: </span>
                    {`${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`}
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 bg-white/10 text-white border-white/20 hover:bg-white/20"
                  >
                    Connect Wallet
                  </Button>
                )}
              </div>
            </div>

            {/* Wave effect at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-8 overflow-hidden">
              <svg viewBox="0 0 500 150" preserveAspectRatio="none" className="h-full w-full">
                <path
                  d="M0.00,49.98 C150.00,150.00 349.20,-50.00 500.00,49.98 L500.00,150.00 L0.00,150.00 Z"
                  className="fill-white"
                ></path>
              </svg>
            </div>
          </div>

          {/* Daily Token Claim Card */}
          <Card className="overflow-hidden border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white">
              <CardTitle className="flex items-center">
                <Sparkles className="h-5 w-5 mr-2" />
                Daily Token Claim
              </CardTitle>
              <CardDescription className="text-indigo-100">Claim 1 $ANIME token every 24 hours</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 border-4 border-t-transparent border-indigo-500 rounded-full animate-spin"></div>
                </div>
              ) : tokenAlreadyClaimed ? (
                <div className="space-y-4">
                  <div className="bg-indigo-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 text-indigo-500 mr-2" />
                        <span className="text-sm font-medium text-indigo-700">Next claim available in:</span>
                      </div>
                      <span className="text-sm font-mono text-indigo-700">{tokenTimerDisplay}</span>
                    </div>
                    <Progress
                      value={calculateTimePercentage()}
                      className="h-2 bg-indigo-100"
                      indicatorClassName="bg-indigo-500"
                    />
                  </div>

                  <ClaimButton onClaim={handleMint} disabled={true} loading={tokenClaimLoading} />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-indigo-50 rounded-xl p-4">
                    <div className="flex items-center">
                      <Sparkles className="h-5 w-5 text-indigo-500 mr-2" />
                      <p className="text-indigo-700 text-sm font-medium">Your daily token is ready to claim!</p>
                    </div>
                  </div>

                  <ClaimButton onClaim={handleMint} disabled={false} loading={tokenClaimLoading} />
                </div>
              )}
            </CardContent>
          </Card>
          {canSwap ? (
  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full">
    <Button
      onClick={buyTicket}
      className="w-full h-14 text-white font-bold bg-gradient-to-r from-indigo-500 to-purple-500 shadow-lg rounded-xl"
    >
      <Coins className="h-5 w-5 mr-2" />
      Buy 2 Tickets with 2 $ANIME
    </Button>
  </motion.div>
) : (
  <motion.div whileTap={{ scale: 0.98 }} className="w-full">
  <Button
    disabled
    className="w-full h-14 text-white font-bold bg-gradient-to-r from-indigo-500 to-purple-500 shadow-lg rounded-xl"
  >
    Ticket Claim available in {swapTimerDisplay}
  </Button>
</motion.div>


)}



        </main>

        {/* Token claim animation */}
        <AnimatePresence>
          {showTokenAnimation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
            >
              <div className="relative">
                {/* Flying token animation */}
                <motion.div
                  className="absolute"
                  initial={{
                    x: 0,
                    y: 0,
                    scale: 0,
                    rotate: Math.random() * 20 - 10,
                  }}
                  animate={{
                    x: [0, 0],
                    y: [0, -60],
                    scale: [0, 1.2, 1],
                    rotate: [Math.random() * 20 - 10, Math.random() * 40 - 20],
                  }}
                  transition={{
                    duration: 0.8,
                    ease: "easeOut",
                  }}
                >
                  <div className="bg-white rounded-lg p-2 shadow-lg flex items-center gap-2 border-2 border-indigo-300">
                    <Coins className="h-5 w-5 text-indigo-500" />
                    <span className="font-bold text-indigo-600">+1</span>
                  </div>
                </motion.div>

                {/* Central animation */}
                <motion.div
                  className="bg-white rounded-xl p-4 shadow-lg flex flex-col items-center gap-2 border-2 border-indigo-300"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{
                    scale: [0, 1.2, 1],
                    opacity: [0, 1, 1, 0],
                  }}
                  transition={{
                    duration: 1.5,
                    times: [0, 0.3, 0.5, 1],
                  }}
                >
                  <div className="text-xl font-bold text-indigo-600">+1 $ANIME Token!</div>
                  <div className="flex items-center gap-2">
                    <Coins className="h-6 w-6 text-indigo-500" />
                  </div>
                </motion.div>

                {/* Particles */}
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={`token-particle-${i}`}
                    className="absolute rounded-full bg-indigo-500"
                    style={{
                      width: Math.random() * 6 + 2,
                      height: Math.random() * 6 + 2,
                    }}
                    initial={{
                      x: 0,
                      y: 0,
                      opacity: 0,
                    }}
                    animate={{
                      x: (Math.random() - 0.5) * 200,
                      y: (Math.random() - 0.5) * 200,
                      opacity: [0, 0.8, 0],
                    }}
                    transition={{
                      duration: 1 + Math.random(),
                      delay: Math.random() * 0.3,
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <MobileNav />
      </div>
    </ProtectedRoute>
  )
}
