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
  score?: number // Hinzufügen des score-Felds
  clan_id?: number
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
  refreshUserData: () => Promise<void>
  updateUserScore: (scoreToAdd: number) => void // Neue Methode zum Aktualisieren des Scores
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
  refreshUserData: async () => {},
  updateUserScore: () => {}, // Standardimplementierung
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

  // Load user data from database
  const loadUserDataFromDatabase = async (username: string) => {
    try {
      const supabase = getSupabaseBrowserClient()
      if (!supabase) return null

      const { data, error } = await supabase
        .from("users")
        .select("username, tickets, legendary_tickets, coins, level, world_id, experience, next_level_exp, has_premium, score, clan_id")
        .eq("username", username)
        .single()

      if (error) {
        console.error("Error loading user data from database:", error)
        return null
      }

      if (data) {
        // Transform database fields to match our User type with proper type assertions
        const userData: User = {
          username: String(data.username || ""),
          tickets: Number(data.tickets || 0),
          legendary_tickets: Number(data.legendary_tickets || 0),
          coins: Number(data.coins || 0),
          level: Number(data.level || 1),
          clan_id: Number(data.clan_id || null),
          experience: Number(data.experience || 0),
          nextLevelExp: Number(data.next_level_exp || 100),
          has_premium: Boolean(data.has_premium || false),
          score: Number(data.score || 0), // Score aus der Datenbank laden
        }

        return userData
      }

      return null
    } catch (error) {
      console.error("Error in loadUserDataFromDatabase:", error)
      return null
    }
  }

  // Refresh user data from database
  const refreshUserData = async () => {
    if (!user?.username) return

    try {
      const userData = await loadUserDataFromDatabase(user.username)
      if (userData) {
        setUser(userData)
        localStorage.setItem("animeworld_user", JSON.stringify(userData))
      }
    } catch (error) {
      console.error("Error refreshing user data:", error)
    }
  }

  useEffect(() => {
    const checkExistingAuth = async () => {
      // Check for World ID in localStorage
      /*
      const worldIdUserId = localStorage.getItem("worldId_userId")

      if (worldIdUserId) {
        // If World ID exists, use it to log in
        await login(worldIdUserId)
      }*/

      setLoading(false)
    }

    // Check for user in localStorage
    const checkUser = async () => {
      try {
        const isVerifiedAsHuman = localStorage.getItem("isVerifiedAsHuman")

  if (isVerifiedAsHuman !== "true") {
    console.log("User is NOT verified as human → skipping auto-login")
    setLoading(false)
    return
  }
  const isHumanVerified = localStorage.getItem("isVerifiedAsHuman") === "true"


if (!isHumanVerified) {
  console.log("Human verification missing – skipping auto login")
  setLoading(false)
  return
}

        console.log("Checking for user in localStorage...")
        const storedUser = localStorage.getItem("animeworld_user")
        console.log("Stored user:", storedUser)

        if (storedUser) {
          const parsedUser = JSON.parse(storedUser)
          console.log("Parsed user:", parsedUser)

          // 🚫 Block user "sasuke"
          if (parsedUser.username === "llegaraa2kwdd" || parsedUser.username === "nadapersonal" || parsedUser.username === "regresosss") {
            router.push("/login")
            return
          }

          // Set user from localStorage first for immediate UI rendering
          setUser(parsedUser)
          setIsAuthenticated(true)

          // Then fetch fresh data from database
          if (parsedUser.username) {
            const freshUserData = await loadUserDataFromDatabase(parsedUser.username)
            if (freshUserData) {
              console.log("Fresh user data from database:", freshUserData)
              setUser(freshUserData)
              localStorage.setItem("animeworld_user", JSON.stringify(freshUserData))
            }
          }
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

      // Try to load user data from database first
      const userData = await loadUserDataFromDatabase(username)

      if (userData) {
        // User exists in database, use that data
        console.log("User found in database:", userData)
        localStorage.setItem("animeworld_user", JSON.stringify(userData))
        setUser(userData)
        setIsAuthenticated(true)
        return { success: true }
      }

      // User doesn't exist in database, create new user
      const supabase = getSupabaseBrowserClient()
      if (!supabase) {
        return { success: false, error: "Failed to initialize Supabase client" }
      }

      // Create default user data
      const newUserData: User = {
        username,
        tickets: 5,
        legendary_tickets: 2,
        coins: 1000,
        level: 1,
        experience: 0,
        nextLevelExp: 100,
        has_premium: false,
        score: 100, // Initialer Score basierend auf Level * 100
      }

      // Insert new user into database
      const { error } = await supabase.from("users").insert({
        username: username,
        tickets: newUserData.tickets,
        legendary_tickets: newUserData.legendary_tickets,
        coins: newUserData.coins,
        level: newUserData.level,
        experience: newUserData.experience,
        next_level_exp: newUserData.nextLevelExp,
        has_premium: newUserData.has_premium,
        score: newUserData.score, // Score in die Datenbank einfügen
      })

      if (error) {
        console.error("Error creating new user in database:", error)
        return { success: false, error: "Failed to create user in database" }
      }

      console.log("Created new user in database:", newUserData)
      localStorage.setItem("animeworld_user", JSON.stringify(newUserData))
      setUser(newUserData)
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

  const updateUserTickets = async (newTicketCount: number, newLegendaryTicketCount?: number) => {
    if (user) {
      // Create updated user with new ticket count
      const updatedUser = { ...user }

      if (typeof newTicketCount === "number") {
        updatedUser.tickets = newTicketCount
      }

      // Update legendary tickets if provided
      if (typeof newLegendaryTicketCount === "number") {
        updatedUser.legendary_tickets = newLegendaryTicketCount
      }

      console.log("Updating user tickets:", updatedUser.tickets, "legendary:", updatedUser.legendary_tickets)

      // Update state and localStorage
      setUser(updatedUser)
      localStorage.setItem("animeworld_user", JSON.stringify(updatedUser))

      // Update database
      try {
        const supabase = getSupabaseBrowserClient()
        if (!supabase) return

        const updateData: Record<string, any> = {}
        if (typeof newTicketCount === "number") {
          updateData.tickets = newTicketCount
        }
        if (typeof newLegendaryTicketCount === "number") {
          updateData.legendary_tickets = newLegendaryTicketCount
        }

        const { error } = await supabase.from("users").update(updateData).eq("username", user.username)

        if (error) {
          console.error("Error updating tickets in database:", error)
        }
      } catch (error) {
        console.error("Error in updateUserTickets:", error)
      }
    }
  }

  const updateUserCoins = async (newCoinCount: number) => {
    if (user) {
      const updatedUser = { ...user, coins: newCoinCount }
      setUser(updatedUser)
      localStorage.setItem("animeworld_user", JSON.stringify(updatedUser))

      // Update database
      try {
        const supabase = getSupabaseBrowserClient()
        if (!supabase) return

        const { error } = await supabase.from("users").update({ coins: newCoinCount }).eq("username", user.username)

        if (error) {
          console.error("Error updating coins in database:", error)
        }
      } catch (error) {
        console.error("Error in updateUserCoins:", error)
      }
    }
  }

  // Calculate XP needed for a specific level using the new formula
  const calculateXpForLevel = (level: number) => {
    if (level <= 1) return 100
    return 100 + (level - 1) * 50
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

      // Calculate next level exp requirement using the new formula
      const nextLevelExp = calculateXpForLevel(newLevel)

      // Berechne Score-Erhöhung für Level-Up (100 Punkte pro Level)
      const scoreToAdd = leveledUp ? 100 : 0
      const newScore = (user.score || 0) + scoreToAdd

      const updatedUser = {
        ...user,
        experience: newExp,
        level: newLevel,
        nextLevelExp: nextLevelExp,
        score: newScore, // Score im User-Objekt aktualisieren
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
            score: newScore, // Score in der Datenbank aktualisieren
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

  const setUserPremium = async (hasPremium: boolean) => {
    if (user) {
      const updatedUser = { ...user, has_premium: hasPremium }
      setUser(updatedUser)
      localStorage.setItem("animeworld_user", JSON.stringify(updatedUser))

      // Update database
      try {
        const supabase = getSupabaseBrowserClient()
        if (!supabase) return

        const { error } = await supabase.from("users").update({ has_premium: hasPremium }).eq("username", user.username)

        if (error) {
          console.error("Error updating premium status in database:", error)
        }
      } catch (error) {
        console.error("Error in setUserPremium:", error)
      }
    }
  }

  // Neue Methode zum Aktualisieren des Scores
  const updateUserScore = async (scoreToAdd: number) => {
    if (user) {
      const currentScore = user.score || 0
      const newScore = currentScore + scoreToAdd

      const updatedUser = { ...user, score: newScore }
      setUser(updatedUser)
      localStorage.setItem("animeworld_user", JSON.stringify(updatedUser))

      // Update database
      try {
        const supabase = getSupabaseBrowserClient()
        if (!supabase) return

        const { error } = await supabase.from("users").update({ score: newScore }).eq("username", user.username)

        if (error) {
          console.error("Error updating score in database:", error)
        }
      } catch (error) {
        console.error("Error in updateUserScore:", error)
      }
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
        refreshUserData,
        updateUserScore, // Neue Methode zum Context hinzufügen
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
