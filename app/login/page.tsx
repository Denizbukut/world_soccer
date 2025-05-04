"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { motion } from "framer-motion"
import { MiniKit } from "@worldcoin/minikit-js"
import { createClient } from "@supabase/supabase-js"
import Image from "next/image"
import { Globe } from "lucide-react"

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { login } = useAuth()

  const signInWithWallet = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/nonce`)
      const { nonce } = await res.json()

      const { commandPayload: generateMessageResult, finalPayload } = await MiniKit.commandsAsync.walletAuth({
        nonce: nonce,
        expirationTime: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000),
        notBefore: new Date(new Date().getTime() - 24 * 60 * 60 * 1000),
      })

      const address = MiniKit.user?.walletAddress
      const username = MiniKit.user?.username

      console.log("MiniKit user:", MiniKit.user)
      console.log("MiniKit username:", username)
      console.log("MiniKit wallet address:", address)

      if (address) {
        // Always use the username from MiniKit if available
        const userIdentifier = username || address
        console.log("Using identifier for login:", userIdentifier)

        // Store the World ID username in localStorage for future reference
        localStorage.setItem("worldId_userId", userIdentifier)

        // Check if user exists in database and create if not
        try {
          // Create Supabase client
          const supabase = createClient(
            "https://facmifesfgnihtiruqxl.supabase.co",
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhY21pZmVzZmduaWh0aXJ1cXhsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTg3Mjk2NywiZXhwIjoyMDYxNDQ4OTY3fQ.__CwDGKM2hcP3B7sEpKve8zIdSDyGiQrnaYRSSVQsy0",
          )

          // Check if user exists
          const { data: existingUser, error: fetchError } = await supabase
            .from("users")
            .select("username")
            .eq("username", userIdentifier)
            .single()

          if (fetchError && fetchError.code !== "PGRST116") {
            console.error("Error checking if user exists:", fetchError)
          }

          // If user doesn't exist, create a new user
          if (!existingUser) {
            console.log("User doesn't exist, creating new user:", userIdentifier)
            const { data: newUser, error: insertError } = await supabase
            .from("users")
            .insert([
              {
                username: userIdentifier,
                tickets: 5,
                coins: 1000,
                level: 1,
                experience: 0,
                world_id: address,
                walletaddress: address, // Add the wallet address to the new column
              },
            ])
            .select()

            if (insertError) {
              console.error("Error creating new user:", insertError)
            } else {
              console.log("New user created successfully:", newUser)
            }
          } else {
            console.log("User already exists:", existingUser)

            // Update the last_login timestamp
            const { error: updateError } = await supabase
            .from("users")
            .update({
              last_login: new Date().toISOString(),
              walletaddress: address, // Update the wallet address in case it changed or wasn't set
            })
            .eq("username", userIdentifier)

            if (updateError) {
              console.error("Error updating last login:", updateError)
            }
          }
        } catch (dbError) {
          console.error("Database operation failed:", dbError)
          // Continue with login even if database operations fail
        }

        // Login with the auth context
        const loginResult = await login(userIdentifier)

        if (loginResult.success) {
          // Navigate to home page
          router.push("/")
          return true
        } else {
          setError(loginResult.error || "Login failed. Please try again.")
          return false
        }
      } else {
        setError("Could not get wallet address. Please try again.")
        return false
      }
    } catch (error) {
      console.error("Error verifying wallet:", error)
      setError("Failed to verify wallet. Please try again.")
      return false
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative flex items-end justify-center">
      {/* Full screen background image using Next.js Image component for better optimization */}
      <Image
        src="/aw_login_bg.png"
        alt="Anime World Background"
        fill
        priority
        className="object-cover"
        sizes="100vw"
        style={{
          zIndex: -1,
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-20 w-full max-w-xs px-4 z-10"
      >
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
        <button
          onClick={signInWithWallet}
          style= {{ backgroundColor: "#2E5283"}}
          className="w-full  text-white border border-black font-medium py-4 rounded-xl mb-6 hover:from-black hover:to-gray-800 transition-all duration-300 flex items-center justify-center gap-2 shadow-md"
            disabled={isLoading}
        >
          {isLoading ? (
            "Connecting..."
          ) : (
            <>
              <Globe className="text-white" size={20} />
              Connect with World ID
            </>
          )}
        </button>
      </motion.div>
    </div>
  )
}
