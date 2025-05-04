"use server"

import { createClient } from "@/utils/supabase/server"

export async function migrateCardLevels() {
  try {
    const supabase = createClient()

    // Get all user cards
    const { data: userCards, error: fetchError } = await supabase.from("user_cards").select("*").is("levels", null)

    if (fetchError) {
      console.error("Error fetching user cards:", fetchError)
      return { success: false, error: fetchError.message }
    }

    console.log(`Found ${userCards?.length || 0} cards to migrate`)

    // Update each card
    let successCount = 0
    let errorCount = 0

    for (const card of userCards || []) {
      try {
        const level = card.level || 1
        const quantity = card.quantity || 1

        // Create levels object
        const levels = { [level]: quantity }

        // Update the card
        const { error: updateError } = await supabase.from("user_cards").update({ levels }).eq("id", card.id)

        if (updateError) {
          console.error(`Error updating card ${card.id}:`, updateError)
          errorCount++
        } else {
          successCount++
        }
      } catch (err) {
        console.error(`Error processing card ${card.id}:`, err)
        errorCount++
      }
    }

    return {
      success: true,
      message: `Migration complete. ${successCount} cards updated successfully, ${errorCount} errors.`,
    }
  } catch (error) {
    console.error("Error in migrateCardLevels:", error)
    return { success: false, error: String(error) }
  }
}
