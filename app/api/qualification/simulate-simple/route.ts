import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function POST() {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  try {
    // Get top 30 users by prestige points
    const { data: leaderboardData, error: leaderboardError } = await supabase
      .from("users")
      .select("username, prestige_points")
      .order("prestige_points", { ascending: false })
      .limit(30)

    if (leaderboardError) {
      return NextResponse.json({ success: false, error: leaderboardError.message }, { status: 500 })
    }

    if (!leaderboardData || leaderboardData.length < 16) {
      return NextResponse.json({ success: false, error: "Not enough users for qualification matches" }, { status: 400 })
    }

    // Generate simple qualification matches with mock results
    const dbMatches = []
    
    for (let i = 2; i < 16; i++) { // i=2 entspricht Platz 3, i=15 entspricht Platz 16
      const player1 = leaderboardData[i] // Platz 3, 4, 5, ...
      const player2 = leaderboardData[31 - i] // Platz 30, 29, 28, ...
      
      if (player1 && player2) {
        // Simple simulation - higher prestige points usually wins
        const player1Rating = (player1.prestige_points || 100) / 20 // Convert to rating
        const player2Rating = (player2.prestige_points || 100) / 20
        
        // Generate scores (0-3 goals each)
        const player1Score = Math.floor(Math.random() * 4)
        const player2Score = Math.floor(Math.random() * 4)
        
        // Ensure no draws
        let finalPlayer1Score = player1Score
        let finalPlayer2Score = player2Score
        let winner = player1.username
        
        if (player1Score === player2Score) {
          // Force a winner based on rating
          if (player1Rating > player2Rating) {
            finalPlayer1Score = player1Score + 1
            winner = player1.username
          } else {
            finalPlayer2Score = player2Score + 1
            winner = player2.username
          }
        } else if (player2Score > player1Score) {
          winner = player2.username
        }
        
        // Generate possession and shots
        const possession1 = Math.floor(40 + Math.random() * 20) // 40-60%
        const possession2 = 100 - possession1
        const shots1 = Math.floor(5 + Math.random() * 8) // 5-12 shots
        const shots2 = Math.floor(5 + Math.random() * 8)
        
        dbMatches.push({
          match_id: `match-${i + 1}-${32 - i}`,
          player1_username: player1.username,
          player2_username: player2.username,
          player1_score: finalPlayer1Score,
          player2_score: finalPlayer2Score,
          winner_username: winner,
          player1_rank: i + 1,
          player2_rank: 32 - i,
          player1_prestige_points: player1.prestige_points || 100,
          player2_prestige_points: player2.prestige_points || 100,
          player1_team_rating: Math.round(player1Rating * 10) / 10,
          player2_team_rating: Math.round(player2Rating * 10) / 10,
          possession_player1: possession1,
          possession_player2: possession2,
          shots_player1: shots1,
          shots_player2: shots2,
          events: [
            `${Math.floor(Math.random() * 90) + 1}' - ⚽ GOAL! ${winner} scores!`,
            `${Math.floor(Math.random() * 90) + 1}' - 🎯 Great save by the goalkeeper!`,
            `${Math.floor(Math.random() * 90) + 1}' - 💥 What a match!`
          ]
        })
      }
    }

    // Clear existing matches and insert new ones
    await supabase
      .from("qualification_matches")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000")

    const { data: insertedMatches, error: insertError } = await supabase
      .from("qualification_matches")
      .insert(dbMatches)
      .select()

    if (insertError) {
      console.error("Insert error:", insertError)
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      data: insertedMatches,
      message: `Successfully simulated and saved ${dbMatches.length} qualification matches`
    })
  } catch (error) {
    console.error("Error simulating qualification matches:", error)
    return NextResponse.json({ success: false, error: "Internal server error: " + error.message }, { status: 500 })
  }
}
