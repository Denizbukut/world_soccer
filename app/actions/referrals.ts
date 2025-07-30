"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@supabase/supabase-js"

function createSupabaseServer() {
  return createClient(process.env.SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || "", {
    auth: {
      persistSession: false,
    },
  })
}

export async function claimReferralRewardForUser(referrerUsername: string, referredUsername: string) {
  try {
    const supabase = createSupabaseServer()

    // Check if referred user reached level 5
    const { data: referredUser, error: referredUserError } = await supabase
      .from("users")
      .select("level")
      .eq("username", referredUsername)
      .single()

    if (referredUserError) {
      console.error("Error fetching referred user:", referredUserError)
      return { success: false, error: "Failed to fetch referred user data." }
    }

    if (!referredUser || referredUser.level < 5) {
      return { success: false, error: "User has not reached level 5 yet." }
    }

    // Get referral record
    const { data: referral, error: referralError } = await supabase
      .from("referrals")
      .select("id, reward_claimed")
      .eq("referrer_username", referrerUsername)
      .eq("referred_username", referredUsername)
      .single()

    if (referralError) {
      console.error("Error fetching referral record:", referralError)
      return { success: false, error: "Failed to fetch referral record." }
    }

    if (!referral || referral.reward_claimed) {
      return { success: false, error: "Reward already claimed or referral not found." }
    }

    // Get referrer's current tickets
    const { data: userData, error: userDataError } = await supabase
      .from("users")
      .select("tickets, legendary_tickets")
      .eq("username", referrerUsername)
      .single()

    if (userDataError) {
      console.error("Error fetching user data:", userDataError)
      return { success: false, error: "Failed to fetch user data." }
    }

    const newTicketCount = (userData?.tickets ?? 0) + 5
    const newLegendaryTicketCount = (userData?.legendary_tickets ?? 0) + 3

    // Update tickets
    const { error: updateError } = await supabase
      .from("users")
      .update({
        tickets: newTicketCount,
        legendary_tickets: newLegendaryTicketCount,
      })
      .eq("username", referrerUsername)

    if (updateError) {
      console.error("Error updating user tickets:", updateError)
      return { success: false, error: "Failed to update user tickets." }
    }

    // Mark referral as claimed
    const { error: claimError } = await supabase
      .from("referrals")
      .update({ reward_claimed: true, claimed_at: new Date().toISOString() })
      .eq("id", referral.id)

    if (claimError) {
      console.error("Error marking referral as claimed:", claimError)
      return { success: false, error: "Failed to mark referral as claimed." }
    }

    // ✅ Return updated counts for UI update
    return {
      success: true,
      newTicketCount: newTicketCount,
      newLegendaryTicketCount: newLegendaryTicketCount,
    }
  } catch (error) {
    console.error("Unexpected error in claimReferralRewardForUser:", error)
    return { success: false, error: "An unexpected error occurred." }
  }
}

export async function getReferredUsers(referrerUsername: string) {
  try {
    const supabase = createSupabaseServer()
    const { data, error } = await supabase
      .from("referrals")
      .select("id, referred_username, reward_claimed")
      .eq("referrer_username", referrerUsername)

    if (error) {
      console.error("Error fetching referrals:", error)
      return []
    }

    if (!data || data.length === 0) {
      return []
    }

    const detailed = await Promise.all(
      data.map(async (ref) => {
        try {
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("level")
            .eq("username", ref.referred_username)
            .single()

          if (userError) {
            console.error(`Error fetching user level for ${ref.referred_username}:`, userError)
            return {
              id: ref.id,
              username: ref.referred_username,
              level: 1, // Fallback level
              reward_claimed: ref.reward_claimed ?? false,
            }
          }

          return {
            id: ref.id,
            username: ref.referred_username,
            level: userData?.level ?? 1,
            reward_claimed: ref.reward_claimed ?? false,
          }
        } catch (error) {
          console.error(`Error processing referral ${ref.referred_username}:`, error)
          return {
            id: ref.id,
            username: ref.referred_username,
            level: 1, // Fallback level
            reward_claimed: ref.reward_claimed ?? false,
          }
        }
      })
    )

    return detailed
  } catch (error) {
    console.error("Unexpected error in getReferredUsers:", error)
    return []
  }
}