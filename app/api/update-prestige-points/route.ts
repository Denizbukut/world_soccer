import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const { winnerUsername, loserUsername, isDraw = false, battleModeId = 1 } = await request.json()

    const cookieStore = await cookies()
    const supabase = createSupabaseServerClient(cookieStore)
    if (!supabase) {
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      )
    }

    // Get battle mode configuration
    const { data: battleMode, error: battleModeError } = await supabase
      .from("battle_modes")
      .select("*")
      .eq("id", battleModeId)
      .single()

    if (battleModeError || !battleMode) {
      console.error("Error fetching battle mode:", battleModeError)
      return NextResponse.json(
        { error: "Battle mode not found" },
        { status: 404 }
      )
    }

    // Get current prestige points for both users
    const { data: users, error: fetchError } = await supabase
      .from("users")
      .select("username, prestige_points")
      .in("username", [winnerUsername, loserUsername])

    if (fetchError) {
      console.error("Error fetching users:", fetchError)
      return NextResponse.json(
        { error: "Failed to fetch user data" },
        { status: 500 }
      )
    }

    const winner = users?.find((u: any) => u.username === winnerUsername)
    const loser = users?.find((u: any) => u.username === loserUsername)

    if (!winner || !loser) {
      return NextResponse.json(
        { error: "One or both users not found" },
        { status: 404 }
      )
    }

    // Calculate prestige points based on battle mode
    let winnerGain = 0
    let loserLoss = 0
    let drawPoints = 0

    if (isDraw) {
      winnerGain = battleMode.prestige_points_draw
      loserLoss = battleMode.prestige_points_draw
      drawPoints = battleMode.prestige_points_draw
    } else {
      winnerGain = battleMode.prestige_points_winner
      loserLoss = battleMode.prestige_points_loser
    }

    const newWinnerPoints = Math.max(0, (winner.prestige_points || 100) + winnerGain)
    const newLoserPoints = Math.max(0, (loser.prestige_points || 100) + loserLoss) // Note: loserLoss is already negative

    // Update both users' prestige points
    const { error: updateError } = await supabase
      .from("users")
      .upsert([
        { username: winnerUsername, prestige_points: newWinnerPoints },
        { username: loserUsername, prestige_points: newLoserPoints }
      ])

    if (updateError) {
      console.error("Error updating prestige points:", updateError)
      return NextResponse.json(
        { error: "Failed to update prestige points" },
        { status: 500 }
      )
    }

    // Record battle in history (using existing structure)
    const { error: historyError } = await supabase
      .from("battle_history")
      .insert({
        battle_mode_id: battleModeId,
        user_id: winnerUsername, // Using username as user_id for now
        opponent_id: loserUsername, // Using username as opponent_id for now
        is_pvp: true,
        user_cards: [], // Empty for now, can be enhanced later
        opponent_cards: [], // Empty for now, can be enhanced later
        result: isDraw ? 'draw' : 'win', // Using existing result format
        reward_coins: 0, // Can be enhanced later
        reward_exp: 0 // Can be enhanced later
      })

    if (historyError) {
      console.error("Error recording battle history:", historyError)
      // Don't fail the request, just log the error
    }

    return NextResponse.json({
      success: true,
      battleMode: battleMode.name,
      winner: {
        username: winnerUsername,
        oldPoints: winner.prestige_points || 100,
        newPoints: newWinnerPoints,
        gain: winnerGain
      },
      loser: {
        username: loserUsername,
        oldPoints: loser.prestige_points || 100,
        newPoints: newLoserPoints,
        loss: loserLoss
      }
    })

  } catch (error) {
    console.error("Error in update-prestige-points:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
