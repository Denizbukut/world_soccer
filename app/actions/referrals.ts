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
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // Check if referred user reached level 5
  const { data: referredUser } = await supabase
    .from("users")
    .select("level")
    .eq("username", referredUsername)
    .single()

  if (!referredUser || referredUser.level < 5) {
    return { success: false, error: "User has not reached level 5 yet." }
  }

  // Get referral record
  const { data: referral } = await supabase
    .from("referrals")
    .select("id, reward_claimed")
    .eq("referrer_username", referrerUsername)
    .eq("referred_username", referredUsername)
    .single()

  if (!referral || referral.reward_claimed) {
    return { success: false, error: "Reward already claimed or referral not found." }
  }

  // Get referrer's current tickets
  const { data: userData } = await supabase
    .from("users")
    .select("tickets, legendary_tickets")
    .eq("username", referrerUsername)
    .single()

  const newTicketCount = (userData?.tickets ?? 0) + 5
  const newLegendaryTicketCount = (userData?.legendary_tickets ?? 0) + 3

  // Update tickets
  await supabase
    .from("users")
    .update({
      tickets: newTicketCount,
      legendary_tickets: newLegendaryTicketCount,
    })
    .eq("username", referrerUsername)

  // Mark referral as claimed
  await supabase
    .from("referrals")
    .update({ reward_claimed: true, claimed_at: new Date().toISOString() })
    .eq("id", referral.id)

  // ✅ Return updated counts for UI update
  return {
  success: true,
  newTicketCount: (userData?.tickets ?? 0) + 5,
  newLegendaryTicketCount: (userData?.legendary_tickets ?? 0) + 3,
}

}


export async function getReferredUsers(referrerUsername: string) {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data, error } = await supabase
    .from("referrals")
    .select("id, referred_username, reward_claimed")

    .eq("referrer_username", referrerUsername)

  if (error) return []

  const detailed = await Promise.all(
    data.map(async (ref) => {
      const { data: userData } = await supabase
        .from("users")
        .select("level")
        .eq("username", ref.referred_username)
        .single()

      return {
  id: ref.id, // <-- wichtig!
  username: ref.referred_username,
  level: userData?.level ?? 1,
  reward_claimed: ref.reward_claimed ?? false,
}

    })
  )

  return detailed
}