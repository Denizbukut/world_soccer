import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json()
    
    if (!username) {
      return NextResponse.json({ 
        success: false, 
        error: 'Username is required' 
      }, { status: 400 })
    }

    const supabase = getSupabaseServerClient()

    // Get user UUID
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 })
    }

    const userId = userData.id

    // Get current battle limit status
    const { data: battleLimitData, error: battleLimitError } = await supabase
      .from("user_battle_limits")
      .select("battles_used, last_reset_date")
      .eq("user_id", userId)
      .single()

    let currentBattlesUsed = 0
    let lastResetDate = new Date().toISOString().split('T')[0] // Today's date

    if (battleLimitError && battleLimitError.code !== 'PGRST116') {
      console.error('Error fetching battle limit:', battleLimitError)
    } else if (battleLimitData) {
      currentBattlesUsed = battleLimitData.battles_used || 0
      lastResetDate = battleLimitData.last_reset_date || lastResetDate
    }

    // Check if we need to reset (new day)
    const today = new Date().toISOString().split('T')[0]
    if (lastResetDate !== today) {
      // Reset for new day
      currentBattlesUsed = 0
      lastResetDate = today
    }

    // Increment battle count
    const newBattlesUsed = currentBattlesUsed + 1
    const dailyLimit = 5
    const canBattle = newBattlesUsed <= dailyLimit

    // Update or create battle limit record
    const { error: upsertError } = await supabase
      .from("user_battle_limits")
      .upsert({
        user_id: userId,
        battles_used: newBattlesUsed,
        last_reset_date: lastResetDate,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })

    if (upsertError) {
      console.error('Error updating battle limit:', upsertError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to update battle limit' 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      canBattle,
      battlesUsed: newBattlesUsed,
      battlesRemaining: Math.max(0, dailyLimit - newBattlesUsed),
      dailyLimit
    })

  } catch (error) {
    console.error('Error in check-battle-limit API:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
