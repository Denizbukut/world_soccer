"use client"

import type React from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    console.log("Protected route - user:", user, "loading:", loading)

    if (!loading && !user) {
      console.log("No user found, redirecting to login...")
      router.push("/login")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-purple-600 border-t-transparent"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return <>{children}</>
}
