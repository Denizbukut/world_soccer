"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase"

type User = {
  username: string
  tickets: number
  legendary_tickets: number
  coins: number
  level: number
  experience: number
  nextLevelExp: number
  has_premium?: boolean
}

type AuthContextType = {
  user: User | null
  loading: boolean
  login: (username: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  updateUserTickets: (newTicketCount: number, newLegendaryTicketCount?: number) => void
  updateUserCoins: (newCoinCount: number) => void
  updateUserExp: (expToAdd: number) => Promise<{ leveledUp: boolean; newLevel?: number }>
  setUserPremium: (hasPremium: boolean) => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => ({ success: false }),
  logout: () => {},
  updateUserTickets: () => {},
  updateUserCoins: () => {},
  updateUserExp: async () => ({ leveledUp: false }),
  setUserPremium: () => {},
})

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Initialize Supabase client once when the provider mounts
  useEffect(() => {
    // Just initialize the client once to prevent multiple instances
    getSupabaseBrowserClient()
  }, [])

  useEffect(() => {
    const checkExistingAuth = async () => {
      // Check for World ID in localStorage
      const worldIdUserId = localStorage.getItem("worldId_userId")

      if (worldIdUserId) {
        // If World ID exists, use it to log in
        await login(worldIdUserId)
      }

      setLoading(false)
    }

    // Check for user in localStorage
    const checkUser = () => {
      try {
        console.log("Checking for user in localStorage...")
        const storedUser = localStorage.getItem("animeworld_user")
        console.log("Stored user:", storedUser)

        if (storedUser) {
          const parsedUser = JSON.parse(storedUser)

          // Add legendary_tickets if it doesn't exist in stored user data (for backward compatibility)
          if (parsedUser && !parsedUser.legendary_tickets) {
            parsedUser.legendary_tickets = 2 // Default value
          }

          console.log("Parsed user:", parsedUser)
          setUser(parsedUser)
          setIsAuthenticated(true)
        }
      } catch (error) {
        console.error("Error parsing user data:", error)
      } finally {
        checkExistingAuth()
      }
    }

    checkUser()
  }, [])

  const login = async (username: string) => {
    try {
      console.log("Logging in with username:", username)

      // Create a user object with username as primary identifier
      const userData = {
        username,
        tickets: 5,
        legendary_tickets: 2, // Initialize legendary tickets
        coins: 1000,
        level: 1,
        experience: 0,
        nextLevelExp: 100,
        has_premium: false,
      }

      console.log("Created user data:", userData)

      // Store in localStorage
      localStorage.setItem("animeworld_user", JSON.stringify(userData))

      // Set auth cookie
      document.cookie = "animeworld_auth=true; path=/; max-age=2592000" // 30 days

      // Update state
      setUser(userData)
      setIsAuthenticated(true)

      return { success: true }
    } catch (error) {
      console.error("Login error:", error)
      return { success: false, error: "An unexpected error occurred" }
    }
  }

  const logout = async () => {
    try {
      // Clear World ID from localStorage
      localStorage.removeItem("worldId_userId")

      // Rest of your existing logout code
      setUser(null)
      setIsAuthenticated(false)
      localStorage.removeItem("animeworld_user")
      document.cookie = "animeworld_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
      router.push("/login")
      return { success: true }
    } catch (error) {
      console.error("Logout error:", error)
      return { success: false, error: "Failed to logout" }
    }
  }

  const updateUserTickets = (newTicketCount: number, newLegendaryTicketCount?: number) => {
    if (user && typeof newTicketCount === "number") {
      // Create updated user with new ticket count
      const updatedUser = { ...user, tickets: newTicketCount }

      // Update legendary tickets if provided
      if (typeof newLegendaryTicketCount === "number") {
        updatedUser.legendary_tickets = newLegendaryTicketCount
      }

      // Update state and localStorage
      setUser(updatedUser)
      localStorage.setItem("animeworld_user", JSON.stringify(updatedUser))
    }
  }

  const updateUserCoins = (newCoinCount: number) => {
    if (user) {
      const updatedUser = { ...user, coins: newCoinCount }
      setUser(updatedUser)
      localStorage.setItem("animeworld_user", JSON.stringify(updatedUser))
    }
  }

  const updateUserExp = async (expToAdd: number) => {
    if (!user) return { leveledUp: false }

    try {
      let newExp = user.experience + expToAdd
      let newLevel = user.level
      let leveledUp = false

      // Check if user leveled up
      if (newExp >= user.nextLevelExp) {
        newExp -= user.nextLevelExp
        newLevel++
        leveledUp = true
      }

      // Calculate next level exp requirement
      const nextLevelExp = Math.floor(100 * Math.pow(1.5, newLevel - 1))

      const updatedUser = {
        ...user,
        experience: newExp,
        level: newLevel,
        nextLevelExp: nextLevelExp,
      }

      // Update user in database
      const supabase = getSupabaseBrowserClient()
      if (supabase) {
        await supabase
          .from("users")
          .update({
            experience: newExp,
            level: newLevel,
            next_level_exp: nextLevelExp,
          })
          .eq("username", user.username)
      }

      // Update local state
      setUser(updatedUser)
      localStorage.setItem("animeworld_user", JSON.stringify(updatedUser))

      return { leveledUp, newLevel: leveledUp ? newLevel : undefined }
    } catch (error) {
      console.error("Error updating user experience:", error)
      return { leveledUp: false }
    }
  }

  const setUserPremium = (hasPremium: boolean) => {
    if (user) {
      const updatedUser = { ...user, has_premium: hasPremium }
      setUser(updatedUser)
      localStorage.setItem("animeworld_user", JSON.stringify(updatedUser))
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        updateUserTickets,
        updateUserCoins,
        updateUserExp,
        setUserPremium,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
