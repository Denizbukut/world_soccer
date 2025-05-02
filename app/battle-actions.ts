"use server"

import { revalidatePath } from "next/cache"
import { getSupabaseServerClient } from "@/lib/supabase"

export async function saveBattleResult(battleData: {
  userId: string
  stageId: string
  userCards: { id: string; finalHp: number }[]
  opponentCards: { id: string; finalHp: number }[]
  result: "win" | "loss" | "draw"
  rewardCoins: number
  rewardExp: number
}) {
  try {
    const supabase = getSupabaseServerClient()

    // Save battle history
    const { data, error } = await supabase
      .from("battle_history")
      .insert({
        user_id: battleData.userId,
        stage_id: battleData.stageId,
        is_pvp: false,
        user_cards: battleData.userCards,
        opponent_cards: battleData.opponentCards,
        result: battleData.result,
        reward_coins: battleData.rewardCoins,
        reward_exp: battleData.rewardExp,
      })
      .select()

    if (error) {
      console.error("Error saving battle result:", error)
      return { success: false, error: "Failed to save battle result" }
    }

    // Update user coins if they won
    if (battleData.result === "win" && battleData.rewardCoins > 0) {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("coins")
        .eq("id", battleData.userId)
        .single()

      if (!userError && userData) {
        await supabase
          .from("users")
          .update({ coins: userData.coins + battleData.rewardCoins })
          .eq("id", battleData.userId)
      }
    }

    // Update user experience
    if (battleData.rewardExp > 0) {
      const { data: levelData, error: levelError } = await supabase
        .from("user_levels")
        .select("level, experience")
        .eq("user_id", battleData.userId)
        .single()

      if (!levelError && levelData) {
        const newExp = levelData.experience + battleData.rewardExp
        let newLevel = levelData.level

        // Calculate experience needed for next level
        const nextLevelExp = Math.floor(100 * Math.pow(1.5, levelData.level - 1))

        // Check if user leveled up
        if (newExp >= nextLevelExp) {
          newLevel++
        }

        await supabase
          .from("user_levels")
          .update({
            level: newLevel,
            experience: newExp,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", battleData.userId)
      }
    }

    revalidatePath("/battle")
    return { success: true, data }
  } catch (error) {
    console.error("Error in saveBattleResult:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function getUserBattleHistory(userId: string) {
  try {
    const supabase = getSupabaseServerClient()

    const { data, error } = await supabase
      .from("battle_history")
      .select(`
        *,
        battle_stages(name, stage_number, level_number),
        opponent_id(username)
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching battle history:", error)
      return { success: false, error: "Failed to fetch battle history" }
    }

    return { success: true, data }
  } catch (error) {
    console.error("Error in getUserBattleHistory:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}
