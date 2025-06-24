"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@supabase/supabase-js"

// Create a server-side Supabase client
function createSupabaseServer() {
  return createClient(process.env.SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || "", {
    auth: {
      persistSession: false,
    },
  })
}

/**
 * Claims daily token for a user
 */
export async function claimDailyBonus(username: string) {
  try {
    const supabase = createSupabaseServer()

    // Get current user data including clan info
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("username, tickets, ticket_last_claimed, clan_id")
      .eq("username", username)
      .single()

    if (userError) {
      // Create user if not found
      const { error: createError } = await supabase.from("users").insert({
        username: username,
        tickets: 10,
        legendary_tickets: 2,
        ticket_last_claimed: new Date().toISOString(),
      })

      if (createError) {
        console.error("Error creating user:", createError)
        return { success: false, error: "Failed to create user" }
      }

      return { success: true, newTicketCount: 13 } // 10 initial + 3 bonus
    }

    // Check if user has already claimed within the last 24 hours
    if (userData.ticket_last_claimed) {
      const lastClaimed = new Date(userData.ticket_last_claimed as string)
      const now = new Date()
      const hoursSinceLastClaim = (now.getTime() - lastClaimed.getTime()) / (1000 * 60 * 60)

      if (hoursSinceLastClaim < 24) {
        const timeUntilNextClaim = 24 * 60 * 60 * 1000 - (now.getTime() - lastClaimed.getTime())
        return {
          success: false,
          error: "Already claimed within the last 24 hours",
          alreadyClaimed: true,
          timeUntilNextClaim,
          nextClaimTime: new Date(lastClaimed.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        }
      }
    }

    // Base tickets (3 tickets per claim)
    let ticketsToAward = 3

    // Check if user is in a clan and if clan is level 2+
    if (userData.clan_id) {
      const { data: clanData, error: clanError } = await supabase
        .from("clans")
        .select("level")
        .eq("id", userData.clan_id)
        .single()

      if (!clanError && clanData && clanData.level >= 2) {
        // Level 2+ clan bonus: +1 ticket per day
        ticketsToAward += 1
      }
    }

    const newTicketCount = (typeof userData.tickets === "number" ? userData.tickets : 0) + ticketsToAward

    // Update user
    const { error: updateError } = await supabase
      .from("users")
      .update({
        tickets: newTicketCount,
        ticket_last_claimed: new Date().toISOString(),
      })
      .eq("username", userData.username)

    if (updateError) {
      return { success: false, error: "Failed to update tickets" }
    }

    revalidatePath("/")
    return {
      success: true,
      newTicketCount: newTicketCount || 0,
      nextClaimTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      clanBonus: ticketsToAward > 3,
    }
  } catch (error) {
    console.error("Error claiming daily bonus:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}
