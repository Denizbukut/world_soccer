import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase"

export async function GET() {
  try {
    const supabase = getSupabaseServerClient()

    console.log("🧪 Testing battle_history insert...")

    // Test 1: Simple insert with minimal data
    const testData1 = {
      user_id: "test-user-123",
      stage_id: null,
      is_pvp: true,
      opponent_id: "test-opponent-456",
      user_cards: [],
      opponent_cards: [],
      result: "win",
      reward_coins: 0,
      reward_exp: 0,
      battle_mode_id: 1
    }

    console.log("📝 Test 1 - Inserting:", testData1)

    const { data: data1, error: error1 } = await supabase
      .from("battle_history")
      .insert(testData1)
      .select()

    if (error1) {
      console.error("❌ Test 1 failed:", error1)
      return NextResponse.json({
        success: false,
        test: "Test 1 - Simple insert",
        error: error1.message,
        details: error1
      })
    }

    console.log("✅ Test 1 succeeded:", data1)

    // Clean up test data
    await supabase
      .from("battle_history")
      .delete()
      .eq("user_id", "test-user-123")

    // Test 2: Check if battle_modes table exists
    const { data: battleModes, error: battleModesError } = await supabase
      .from("battle_modes")
      .select("id, name")
      .limit(5)

    console.log("🔍 Battle modes check:", { battleModes, battleModesError })

    return NextResponse.json({
      success: true,
      message: "Test insert successful!",
      battleModes: battleModes,
      battleModesError: battleModesError
    })

  } catch (error) {
    console.error("💥 Error in test-insert:", error)
    return NextResponse.json({
      success: false,
      error: "An unexpected error occurred",
      details: error
    })
  }
}
