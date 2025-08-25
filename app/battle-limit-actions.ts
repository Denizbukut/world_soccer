"use server"

import { getSupabaseServerClient } from "@/lib/supabase"

const DAILY_BATTLE_LIMIT = 5

export async function checkAndUpdateBattleLimit(username: string) {
  try {
    const supabase = getSupabaseServerClient()
    
    // First, get the user's UUID
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .single()

    if (userError || !userData) {
      console.error("❌ Error fetching user:", userError)
      return { success: false, error: "User not found", canBattle: false }
    }

    const userId = userData.id

    // Check if user has a battle limit record
    const { data: limitData, error: limitError } = await supabase
      .from("user_battle_limits")
      .select("*")
      .eq("user_id", userId)
      .single()

    let currentBattlesUsed = 0
    let lastResetDate = new Date().toISOString().split('T')[0] // Today's date

    if (limitError && limitError.code === "PGRST116") {
      // No record exists, create one
      const { data: newLimitData, error: createError } = await supabase
        .from("user_battle_limits")
        .insert({
          user_id: userId,
          battles_used: 0,
          last_reset_date: lastResetDate
        })
        .select()
        .single()

      if (createError) {
        console.error("❌ Error creating battle limit record:", createError)
        return { success: false, error: "Failed to create battle limit", canBattle: false }
      }

      currentBattlesUsed = 0
    } else if (limitError) {
      console.error("❌ Error fetching battle limit:", limitError)
      return { success: false, error: "Failed to fetch battle limit", canBattle: false }
    } else {
      // Record exists, check if we need to reset
      const today = new Date().toISOString().split('T')[0]
      const recordDate = limitData.last_reset_date

      if (recordDate !== today) {
        // Reset for new day
        const { error: resetError } = await supabase
          .from("user_battle_limits")
          .update({
            battles_used: 0,
            last_reset_date: today,
            updated_at: new Date().toISOString()
          })
          .eq("user_id", userId)

        if (resetError) {
          console.error("❌ Error resetting battle limit:", resetError)
          return { success: false, error: "Failed to reset battle limit", canBattle: false }
        }

        currentBattlesUsed = 0
      } else {
        currentBattlesUsed = limitData.battles_used
      }
    }

    // Check if user can battle
    const canBattle = currentBattlesUsed < DAILY_BATTLE_LIMIT
    const battlesRemaining = DAILY_BATTLE_LIMIT - currentBattlesUsed

    if (canBattle) {
      // Increment battle count
      const { error: updateError } = await supabase
        .from("user_battle_limits")
        .update({
          battles_used: currentBattlesUsed + 1,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", userId)

      if (updateError) {
        console.error("❌ Error updating battle count:", updateError)
        return { success: false, error: "Failed to update battle count", canBattle: false }
      }
    }

    return {
      success: true,
      canBattle,
      battlesUsed: currentBattlesUsed + (canBattle ? 1 : 0),
      battlesRemaining: canBattle ? battlesRemaining - 1 : battlesRemaining,
      dailyLimit: DAILY_BATTLE_LIMIT
    }

  } catch (error) {
    console.error("💥 Error in checkAndUpdateBattleLimit:", error)
    return { success: false, error: "An unexpected error occurred", canBattle: false }
  }
}

export async function getBattleLimitStatus(username: string) {
  try {
    const supabase = getSupabaseServerClient()
    
    // Get user UUID
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .single()

    if (userError || !userData) {
      return { success: false, error: "User not found" }
    }

    const userId = userData.id

    // Get battle limit record
    const { data: limitData, error: limitError } = await supabase
      .from("user_battle_limits")
      .select("*")
      .eq("user_id", userId)
      .single()

    if (limitError && limitError.code === "PGRST116") {
      // No record exists
      return {
        success: true,
        battlesUsed: 0,
        battlesRemaining: DAILY_BATTLE_LIMIT,
        dailyLimit: DAILY_BATTLE_LIMIT,
        canBattle: true
      }
    } else if (limitError) {
      return { success: false, error: "Failed to fetch battle limit" }
    }

    // Check if we need to reset for new day
    const today = new Date().toISOString().split('T')[0]
    const recordDate = limitData.last_reset_date

    if (recordDate !== today) {
      // Reset for new day
      const { error: resetError } = await supabase
        .from("user_battle_limits")
        .update({
          battles_used: 0,
          last_reset_date: today,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", userId)

      if (resetError) {
        console.error("❌ Error resetting battle limit:", resetError)
      }

      return {
        success: true,
        battlesUsed: 0,
        battlesRemaining: DAILY_BATTLE_LIMIT,
        dailyLimit: DAILY_BATTLE_LIMIT,
        canBattle: true
      }
    }

    const battlesUsed = limitData.battles_used
    const battlesRemaining = DAILY_BATTLE_LIMIT - battlesUsed

    return {
      success: true,
      battlesUsed,
      battlesRemaining,
      dailyLimit: DAILY_BATTLE_LIMIT,
      canBattle: battlesUsed < DAILY_BATTLE_LIMIT
    }

  } catch (error) {
    console.error("💥 Error in getBattleLimitStatus:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}
