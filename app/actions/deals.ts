"use server"

import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { cache } from "react"
import { WEEKLY_CONTEST_CONFIG, getContestEndDate } from "@/lib/weekly-contest-config"

// Create a server-side Supabase client
function createSupabaseServer() {
  return createClient(process.env.SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || "", {
    auth: {
      persistSession: false,
    },
  })
}

// Cache the daily deal to prevent excessive database queries
export const getDailyDeal = cache(async (username: string) => {
  try {
    const supabase = createSupabaseServer()
    const today = new Date().toISOString().split("T")[0]

    // Get today's deal
    const { data: deal, error: dealError } = await supabase.from("daily_deals").select("*").eq("date", today).single()

    if (dealError) {
      console.error("Error fetching daily deal:", dealError)
      return { success: false, error: "No deal available today" }
    }

    // Get card information
    const { data: card, error: cardError } = await supabase.from("cards").select("*").eq("id", deal.card_id).single()

    if (cardError) {
      console.error("Error fetching card details:", cardError)
      return { success: false, error: "Failed to fetch card details" }
    }


    // Format the deal data to include card information
    const formattedDeal = {
      ...deal,
      card_name: card.name,
      card_image_url: card.image_url,
      card_rarity: card.rarity,
      card_character: card.character,
    }


    // Check if user has already interacted with this deal
    const { data: interaction, error: interactionError } = await supabase
      .from("deal_interactions")
      .select("*")
      .eq("user_id", username)
      .eq("deal_id", deal.id)
      .single()

    // If no interaction record exists, create one with seen=false and dismissed=false
    if (interactionError && interactionError.code === "PGRST116") {
      // PGRST116 means no rows returned
      await supabase.from("deal_interactions").insert({
        user_id: username,
        deal_id: deal.id,
        seen: false,
        dismissed: false,
        purchased: false,
      })

      return {
        success: true,
        deal: formattedDeal,
        interaction: {
          seen: false,
          dismissed: false,
          purchased: false,
        },
      }
    } else if (interactionError) {
      console.error("Error fetching deal interaction:", interactionError)
    }

    return {
      success: true,
      deal: formattedDeal,
      interaction: interaction || {
        seen: false,
        dismissed: false,
        purchased: false,
      },
    }
  } catch (error) {
    console.error("Error in getDailyDeal:", error)
    return { success: false, error: "Failed to fetch daily deal" }
  }
})

// Mark deal as seen
export async function markDealAsSeen(username: string, dealId: number) {
  try {
    const supabase = createSupabaseServer()

    const { error } = await supabase
      .from("deal_interactions")
      .update({ seen: true })
      .eq("user_id", username)
      .eq("deal_id", dealId)

    if (error) {
      console.error("Error marking deal as seen:", error)
      return { success: false, error: "Failed to update deal status" }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in markDealAsSeen:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// Mark deal as dismissed
export async function markDealAsDismissed(username: string, dealId: number) {
  try {
    const supabase = createSupabaseServer()

    const { error } = await supabase
      .from("deal_interactions")
      .update({ dismissed: true })
      .eq("user_id", username)
      .eq("deal_id", dealId)

    if (error) {
      console.error("Error marking deal as dismissed:", error)
      return { success: false, error: "Failed to update deal status" }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in markDealAsDismissed:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// Purchase deal
export async function purchaseDeal(username: string, dealId: number) {
  try {
    const supabase = createSupabaseServer()
    await supabase
        .from("user_cards")
        .delete()
        .eq("user_id", username)
        .eq("quantity", 0)
    // Get the deal details
    const { data: deal, error: dealError } = await supabase.from("daily_deals").select("*").eq("id", dealId).single()

    if (dealError) {
      console.error("Error fetching deal for purchase:", dealError)
      return { success: false, error: "Deal not found" }
    }

    // Get card information
    const { data: card, error: cardError } = await supabase.from("cards").select("*").eq("id", deal.card_id).single()

    if (cardError) {
      console.error("Error fetching card details:", cardError)
      return { success: false, error: "Failed to fetch card details" }
    }

    // Start a transaction to ensure all operations succeed or fail together
    // 1. Record the purchase
    const { error: purchaseError } = await supabase.from("deal_purchases").insert({
      user_id: username,
      deal_id: dealId,
      purchased_at: new Date().toISOString(),
    })

    if (purchaseError) {
      console.error("Error recording deal purchase:", purchaseError)
      return { success: false, error: "Failed to record purchase" }
    }

    // 2. Add the card to user's collection
    // First check if user already has this card
    const { data: existingCard, error: existingCardError } = await supabase
      .from("user_cards")
      .select("id, level, quantity")
      .eq("user_id", username)
      .eq("card_id", deal.card_id)
      .eq("level", deal.card_level)
      .single()

    // If user already has the card at the same level, increment quantity
    if (existingCardError && existingCardError.code === "PGRST116") {
      // Card doesn't exist at this level, add it
      const { error: insertCardError } = await supabase.from("user_cards").insert({
        user_id: username,
        card_id: deal.card_id,
        level: deal.card_level,
        quantity: 1,
        obtained_at: new Date().toISOString(),
      })

      if (insertCardError) {
        console.error("Error adding card to collection:", insertCardError)
        return { success: false, error: "Failed to add card to your collection" }
      }
    } else if (existingCardError) {
      console.error("Error checking existing card:", existingCardError)
      return { success: false, error: "Failed to check your card collection" }
    } else {
      // Card exists at this level, increment quantity
      const newQuantity = (existingCard.quantity || 1) + 1
      const { error: updateCardError } = await supabase
        .from("user_cards")
        .update({ quantity: newQuantity })
        .eq("id", existingCard.id)

      if (updateCardError) {
        console.error("Error updating card quantity:", updateCardError)
        return { success: false, error: "Failed to update card quantity" }
      }
    }

    // 3. Add tickets to user's account
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("tickets, elite_tickets")
      .eq("username", username)
      .single()

    if (userError) {
      console.error("Error fetching user data:", userError)
      return { success: false, error: "User not found" }
    }

    const newTickets = (userData.tickets || 0) + deal.classic_tickets
    const newEliteTickets = (userData.elite_tickets || 0) + deal.elite_tickets

    const { error: updateError } = await supabase
      .from("users")
      .update({
        tickets: newTickets,
        elite_tickets: newEliteTickets,
      })
      .eq("username", username)

    if (updateError) {
      console.error("Error updating user tickets:", updateError)
      return { success: false, error: "Failed to update user tickets" }
    }

    // 4. Add 30 contest points (2x bonus)
    const weekStart = WEEKLY_CONTEST_CONFIG.weekStart
    const contestEnd = getContestEndDate()
    const now = new Date()

    if (now <= contestEnd) {
      // Contest is still active, add points
      const { data: contestEntry, error: contestError } = await supabase
        .from('weekly_contest_entries')
        .select('legendary_count')
        .eq('user_id', username)
        .eq('week_start_date', weekStart)
        .single()

      if (contestError && contestError.code === 'PGRST116') {
        // No entry exists, create one with 30 points
        const { error: insertContestError } = await supabase
          .from('weekly_contest_entries')
          .insert({
            user_id: username,
            week_start_date: weekStart,
            legendary_count: 30,
          })

        if (insertContestError) {
          console.error('Error adding contest points:', insertContestError)
          // Don't fail the purchase, just log the error
        }
      } else if (!contestError) {
        // Entry exists, increment by 30
        const currentCount = contestEntry?.legendary_count || 0
        const { error: updateContestError } = await supabase
          .from('weekly_contest_entries')
          .update({ 
            legendary_count: currentCount + 30, 
            updated_at: new Date().toISOString() 
          })
          .eq('user_id', username)
          .eq('week_start_date', weekStart)

        if (updateContestError) {
          console.error('Error updating contest points:', updateContestError)
          // Don't fail the purchase, just log the error
        }
      }
    }

    // Revalidate relevant paths
    revalidatePath("/")

    return {
      success: true,
      newTickets,
      newEliteTickets,
    }
  } catch (error) {
    console.error("Error in purchaseDeal:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export const getSpecialDeal = cache(async (username: string) => {
  try {
    const supabase = createSupabaseServer();
    const today = new Date().toISOString().split("T")[0];
    // Get today's special deal
    const { data: deal, error: dealError } = await supabase.from("special_offer").select("*").eq("date", today).single();
    if (dealError || !deal) return { success: false };
    // Get card information
    const { data: card } = await supabase.from("cards").select("*").eq("id", deal.card_id).single();
    return {
      success: true,
      deal: { ...deal, card_name: card?.name, card_image_url: card?.image_url, card_rarity: card?.rarity, card_character: card?.character },
      interaction: { seen: false, dismissed: false, purchased: false }
    };
  } catch (error) {
    return { success: false };
  }
});
