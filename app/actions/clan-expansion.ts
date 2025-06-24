"use server"

import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"

// Create a server-side Supabase client
function createSupabaseServer() {
  return createClient(process.env.SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || "", {
    auth: {
      persistSession: false,
    },
  })
}

// Clan expansion donation
export async function processClanDonation(clanId: number, username: string, amount: number) {
  try {
    const supabase = createSupabaseServer()

    // Verify user is member of the clan
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("clan_id")
      .eq("username", username)
      .single()

    if (userError || userData.clan_id !== clanId) {
      return { success: false, error: "You are not a member of this clan" }
    }

    // Get current clan data
    const { data: clanData, error: clanError } = await supabase.from("clans").select("*").eq("id", clanId).single()

    if (clanError || !clanData) {
      return { success: false, error: "Clan not found" }
    }

    // Expansion tiers
    const expansionTiers = [
      { members: 30, cost: 0 },
      { members: 40, cost: 50 },
      { members: 50, cost: 70 },
      { members: 60, cost: 90 },
      { members: 70, cost: 110 },
    ]

    const currentTier = expansionTiers.find((tier) => tier.members === (clanData.max_members || 30))
    const nextTier = expansionTiers.find((tier) => tier.members > (clanData.max_members || 30))

    if (!nextTier) {
      return { success: false, error: "Clan is already at maximum expansion" }
    }

    // Calculate new total donated
    const newTotalDonated = (clanData.total_donated || 0) + amount
    let expansionUnlocked = false
    let newMaxMembers = clanData.max_members || 30
    let nextExpansionCost = clanData.next_expansion_cost || 50

    // Check if expansion is unlocked
    if (newTotalDonated >= nextTier.cost) {
      expansionUnlocked = true
      newMaxMembers = nextTier.members

      // Find next tier after this one
      const tierAfterNext = expansionTiers.find((tier) => tier.members > nextTier.members)
      nextExpansionCost = tierAfterNext ? tierAfterNext.cost : nextTier.cost
    }

    // Record the donation
    const { error: donationError } = await supabase.from("clan_donations").insert({
      clan_id: clanId,
      user_id: username,
      amount: amount,
      purpose: expansionUnlocked
        ? `Member expansion to ${newMaxMembers}`
        : `Contribution towards ${nextTier.members} member expansion`,
    })

    if (donationError) {
      console.error("Error recording donation:", donationError)
      return { success: false, error: "Error recording donation" }
    }

    // Update clan data
    const { error: updateError } = await supabase
      .from("clans")
      .update({
        total_donated: newTotalDonated,
        max_members: newMaxMembers,
        next_expansion_cost: nextExpansionCost,
      })
      .eq("id", clanId)

    if (updateError) {
      console.error("Error updating clan:", updateError)
      return { success: false, error: "Failed to update clan" }
    }

    // Add clan activity
    const activityDescription = expansionUnlocked
      ? `${username} donated ${amount} WLD and unlocked expansion to ${newMaxMembers} members!`
      : `${username} donated ${amount} WLD towards clan expansion`

    await supabase.from("clan_activities").insert({
      clan_id: clanId,
      user_id: username,
      activity_type: expansionUnlocked ? "expansion_unlocked" : "donation",
      description: activityDescription,
      xp_earned: Math.floor(amount / 10), // 1 XP per 10 WLD donated
    })

    revalidatePath("/clan")
    revalidatePath(`/clan/${clanId}`)

    return {
      success: true,
      expansionUnlocked,
      newMaxMembers,
      newTotalDonated,
      remainingAmount: expansionUnlocked ? 0 : nextTier.cost - newTotalDonated,
    }
  } catch (error) {
    console.error("Error in processClanDonation:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// Get clan donations history
export async function getClanDonations(clanId: number, username: string) {
  try {
    const supabase = createSupabaseServer()

    // Verify user is member of the clan
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("clan_id")
      .eq("username", username)
      .single()

    if (userError || userData.clan_id !== clanId) {
      return { success: false, error: "You are not a member of this clan" }
    }

    // Get donations
    const { data: donations, error: donationsError } = await supabase
      .from("clan_donations")
      .select("*")
      .eq("clan_id", clanId)
      .order("created_at", { ascending: false })
      .limit(50)

    if (donationsError) {
      console.error("Error fetching donations:", donationsError)
      return { success: false, error: "Error loading donations" }
    }

    // Calculate total donated
    const totalDonated = donations.reduce((sum, donation) => sum + Number(donation.amount), 0)

    return {
      success: true,
      donations: donations || [],
      totalDonated,
    }
  } catch (error) {
    console.error("Error in getClanDonations:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}
