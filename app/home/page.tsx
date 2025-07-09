"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { claimDailyBonus } from "@/app/actions"
import ProtectedRoute from "@/components/protected-route"
import MobileNav from "@/components/mobile-nav"
import { Button } from "@/components/ui/button"
import {
  Ticket,
  Gift,
  Sparkles,
  Crown,
  Clock,
  ArrowRightLeft,
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import Link from "next/link"
import { motion } from "framer-motion"
import Image from "next/image"

export default function HomePage() {
  const { user, updateUserTickets } = useAuth()
  const [claimLoading, setClaimLoading] = useState(false)
  const [nextClaimTime, setNextClaimTime] = useState<Date | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<string>("")
  const [canClaim, setCanClaim] = useState<boolean>(false)

  useEffect(() => {
    if (!user) return

    const checkClaimStatus = async () => {
      try {
        const lastClaimTimeStr = localStorage.getItem(`lastClaim_${user.username}`)
        const lastClaimTime = lastClaimTimeStr ? new Date(lastClaimTimeStr) : null

        if (!lastClaimTime) {
          setCanClaim(true)
          return
        }

        const nextClaim = new Date(lastClaimTime.getTime() + 12 * 60 * 60 * 1000)
        setNextClaimTime(nextClaim)

        const now = new Date()
        setCanClaim(now >= nextClaim)

        updateCountdown(nextClaim)
      } catch (error) {
        console.error("Error checking claim status:", error)
      }
    }

    checkClaimStatus()

    const interval = setInterval(() => {
      if (nextClaimTime) {
        updateCountdown(nextClaimTime)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [user, nextClaimTime])

  const updateCountdown = (nextClaim: Date) => {
    const now = new Date()
    const diff = nextClaim.getTime() - now.getTime()

    if (diff <= 0) {
      setTimeRemaining("Ready to claim!")
      setCanClaim(true)
      return
    }

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)

    setTimeRemaining(
      `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
    )
    setCanClaim(false)
  }

  const handleClaimBonus = async () => {
    if (!user || !canClaim) return

    setClaimLoading(true)
    try {
      const result = await claimDailyBonus(user.username)

      if (result.success) {
        await updateUserTickets(result.newTicketCount)
        const now = new Date()
        localStorage.setItem(`lastClaim_${user.username}`, now.toISOString())
        const nextClaim = new Date(now.getTime() + 12 * 60 * 60 * 1000)
        setNextClaimTime(nextClaim)
        setCanClaim(false)

        toast({
          title: "Success!",
          description: "You've claimed 3 tickets as your daily bonus!",
        })
      } else if (result.alreadyClaimed) {
        toast({ title: "Already Claimed", description: "You need to wait before claiming again." })
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to claim bonus",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error claiming bonus:", error)
      toast({
        title: "Error",
        description: "Failed to claim daily bonus",
        variant: "destructive",
      })
    } finally {
      setClaimLoading(false)
    }
  }

  const levelProgress = user?.experience && user?.nextLevelExp
    ? (user.experience / user.nextLevelExp) * 100
    : 0;

  return (
    <ProtectedRoute>
      {/* Rest of the component remains the same */}
    </ProtectedRoute>
  )
}
