import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const battleData = await request.json()
    
         console.log("🔄 API: Starting savePvpBattleResult with data:", {
       userId: battleData.userId,
       opponentId: battleData.opponentId,
       result: battleData.result,
       homeScore: battleData.homeScore,
       awayScore: battleData.awayScore,
       battleModeId: battleData.battleModeId
     })

    const supabase = getSupabaseServerClient()

    // First, get the actual user UUIDs from the users table
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("username", battleData.userId)
      .single()

    const { data: opponentData, error: opponentError } = await supabase
      .from("users")
      .select("id")
      .eq("username", battleData.opponentId)
      .single()

    if (userError || opponentError) {
      console.error("❌ Error fetching user UUIDs:", { userError, opponentError })
      return NextResponse.json({ success: false, error: "Failed to fetch user UUIDs" }, { status: 400 })
    }

    // Get the correct battle mode ID for PvP battles
    const { data: battleModeData, error: battleModeError } = await supabase
      .from("battle_modes")
      .select("id")
      .eq("name", "PvP Battle")
      .single()

    if (battleModeError) {
      console.error("❌ Error fetching battle mode:", battleModeError)
      return NextResponse.json({ success: false, error: "Failed to fetch battle mode" }, { status: 400 })
    }

    // Prepare insert data with proper UUIDs
    const insertData = {
      user_id: userData.id,
      stage_id: null,
      is_pvp: true,
      opponent_id: opponentData.id,
      user_cards: battleData.userCards,
      opponent_cards: battleData.opponentCards,
      result: battleData.result,
      reward_coins: 0,
      reward_exp: 0,
      battle_mode_id: battleData.battleModeId || battleModeData.id,
    }

    console.log("📝 Inserting data:", insertData)

    // Save PvP battle history
    const { data, error } = await supabase
      .from("battle_history")
      .insert(insertData)
      .select()

    if (error) {
      console.error("❌ Error saving PvP battle result:", error)
      return NextResponse.json({ success: false, error: "Failed to save PvP battle result" }, { status: 500 })
    }

         console.log("✅ PvP battle result saved successfully:", data)

     // Simple solution: Always update prestige points for non-draw results
     // No complex duplicate checking - just update once per API call

     // Update prestige points for winner and loser
     if (battleData.result !== 'draw') {
      console.log("🎯 Processing prestige points for result:", battleData.result)
      const winnerUsername = battleData.result === 'win' ? battleData.userId : battleData.opponentId
      const loserUsername = battleData.result === 'win' ? battleData.opponentId : battleData.userId
      
      try {
        // Get current prestige points
        const { data: winnerData } = await supabase
          .from('users')
          .select('prestige_points')
          .eq('username', winnerUsername)
          .single()
        
        const { data: loserData } = await supabase
          .from('users')
          .select('prestige_points')
          .eq('username', loserUsername)
          .single()
        
        // Calculate new prestige points
        const currentWinnerPoints = winnerData?.prestige_points || 100
        const currentLoserPoints = loserData?.prestige_points || 100
        
                 // Use the values from battle_modes table: +10 for winner, -5 for loser
         const newWinnerPoints = Math.max(0, currentWinnerPoints + 10)
         const newLoserPoints = Math.max(0, currentLoserPoints - 5)
        
        // Update both users
        await supabase
          .from('users')
          .upsert([
            { username: winnerUsername, prestige_points: newWinnerPoints },
            { username: loserUsername, prestige_points: newLoserPoints }
          ])
        
        console.log("🏆 Prestige points updated:", {
          winner: winnerUsername,
          winnerPoints: `${currentWinnerPoints} → ${newWinnerPoints}`,
          loser: loserUsername,
          loserPoints: `${currentLoserPoints} → ${newLoserPoints}`
        })
      } catch (error) {
        console.error("❌ Error updating prestige points:", error)
      }
         } else {
       console.log("Draw - no prestige points changed:")
     }

     return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("💥 Error in savePvpBattleResult API:", error)
    return NextResponse.json({ success: false, error: "An unexpected error occurred" }, { status: 500 })
  }
}
