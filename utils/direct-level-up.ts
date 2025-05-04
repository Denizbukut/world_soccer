"use server"

import { createClient } from "@/utils/supabase/server"

export async function directLevelUp(username: string, cardId: string) {
  try {
    const supabase = createClient()

    // Get the user's card
    const { data: userCard, error: fetchError } = await supabase
      .from("user_cards")
      .select("*")
      .eq("user_id", username)
      .eq("card_id", cardId)
      .single()

    if (fetchError || !userCard) {
      console.error("Error fetching user card:", fetchError)
      return { success: false, error: fetchError?.message || "Card not found" }
    }

    // Check if user has enough cards
    if ((userCard.quantity || 0) < 2) {
      return { success: false, error: "Not enough cards for level up" }
    }

    // Calculate the new level
    const currentLevel = userCard.level || 1
    const nextLevel = currentLevel + 1

    // Create or update the levels object
    const levels = userCard.levels || {}
    levels[currentLevel] = (levels[currentLevel] || userCard.quantity || 0) - 2
    levels[nextLevel] = (levels[nextLevel] || 0) + 1

    // Update the card
    const { error: updateError } = await supabase
      .from("user_cards")
      .update({
        levels,
        quantity: userCard.quantity - 2,
      })
      .eq("id", userCard.id)

    if (updateError) {
      console.error("Error updating card:", updateError)
      return { success: false, error: updateError.message }
    }

    // Create a new card entry for the higher level if needed
    if (nextLevel > currentLevel) {
      // Check if a higher level card already exists
      const { data: existingCard, error: checkError } = await supabase
        .from("user_cards")
        .select("*")
        .eq("user_id", username)
        .eq("card_id", cardId)
        .eq("level", nextLevel)
        .maybeSingle()

      if (checkError) {
        console.error("Error checking for existing higher level card:", checkError)
      }

      if (!existingCard) {
        // Create a new card entry for the higher level
        const { error: insertError } = await supabase.from("user_cards").insert({
          user_id: username,
          card_id: cardId,
          level: nextLevel,
          quantity: 1,
          favorite: userCard.favorite,
          obtained_at: new Date().toISOString(),
        })

        if (insertError) {
          console.error("Error creating higher level card:", insertError)
          return { success: false, error: insertError.message }
        }
      } else {
        // Update the existing higher level card
        const { error: incrementError } = await supabase
          .from("user_cards")
          .update({ quantity: (existingCard.quantity || 0) + 1 })
          .eq("id", existingCard.id)

        if (incrementError) {
          console.error("Error updating higher level card:", incrementError)
          return { success: false, error: incrementError.message }
        }
      }
    }

    return { success: true, message: "Card successfully leveled up" }
  } catch (error) {
    console.error("Error in directLevelUp:", error)
    return { success: false, error: String(error) }
  }
}
