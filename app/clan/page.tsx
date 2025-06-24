"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Users, ShieldPlus, Lock, ArrowLeft } from "lucide-react"
import MobileNav from "@/components/mobile-nav"

export default function ClanHome() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user) return
  }, [user, router])

  if (!user) {
    return <div className="p-6 text-center text-lg font-semibold">Loading...</div>
  }

  if (user.level < 15) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <Lock className="w-12 h-12 text-gray-400 mb-4" />
        <h1 className="text-3xl font-bold mb-2">Clans Locked 🔒</h1>
        <p className="text-muted-foreground mb-6 max-w-md">
          You need to reach <span className="font-semibold">Level 15</span> to unlock the Clan System.
        </p>
        <Button onClick={() => router.push("/")}>Back to Home</Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6">
      <div className="flex items-center justify-between mb-6 relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/")}
          className="absolute left-0"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <h1 className="text-3xl font-bold mx-auto">Clans</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Link href="/clan/browse" className="block">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl p-6 shadow-lg hover:scale-[1.02] transition-transform">
            <div className="flex items-center mb-4">
              <Users className="w-6 h-6 mr-2" />
              <h2 className="text-lg font-bold">Browse Clans</h2>
            </div>
            <p className="text-sm opacity-90">Find existing clans and join the community.</p>
          </div>
        </Link>

        <Link href="/clan/create" className="block">
          <div className="bg-gradient-to-r from-pink-500 to-red-500 text-white rounded-2xl p-6 shadow-lg hover:scale-[1.02] transition-transform">
            <div className="flex items-center mb-4">
              <ShieldPlus className="w-6 h-6 mr-2" />
              <h2 className="text-lg font-bold">Create Clan</h2>
            </div>
            <p className="text-sm opacity-90">Start your own clan and lead your community.</p>
          </div>
        </Link>
      </div>
      <MobileNav></MobileNav>
    </div>
    
  )
}
