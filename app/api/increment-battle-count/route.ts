import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json()

    if (!username) {
      return NextResponse.json({ 
        success: false, 
        error: "Username is required" 
      }, { status: 400 })
    }

    const supabase = createClient()

    // Get user UUID first
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

    // Get current battle limit data
    const { data: currentData, error: fetchError } = await supabase
      .from('user_battle_limits')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching battle limit:', fetchError)
      return NextResponse.json({ 
        success: false, 
        error: "Failed to fetch battle limit" 
      }, { status: 500 })
    }

    const now = new Date()
    const today = now.toISOString().split('T')[0] // YYYY-MM-DD format

    let battlesUsed = 1
    let lastResetDate = today

    if (currentData) {
      // Check if it's a new day
      if (currentData.last_reset_date === today) {
        // Same day, increment existing count
        battlesUsed = (currentData.battles_used || 0) + 1
        lastResetDate = currentData.last_reset_date
      } else {
        // New day, reset to 1
        battlesUsed = 1
        lastResetDate = today
      }
    }

    // Update or insert battle limit
    const { error: updateError } = await supabase
      .from('user_battle_limits')
      .upsert({
        user_id: userId,
        battles_used: battlesUsed,
        last_reset_date: lastResetDate,
        updated_at: now.toISOString()
      }, {
        onConflict: 'user_id'
      })

    if (updateError) {
      console.error('Error updating battle limit:', updateError)
      return NextResponse.json({ 
        success: false, 
        error: "Failed to update battle limit" 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      battlesUsed,
      lastResetDate
    })

  } catch (error) {
    console.error('Error in increment-battle-count:', error)
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error" 
    }, { status: 500 })
  }
}
