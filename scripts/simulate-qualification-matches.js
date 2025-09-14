const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  console.error('SUPABASE_URL:', !!supabaseUrl)
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function simulateQualificationMatches() {
  try {
    console.log('🏆 Starting Weekend League Qualification Simulation...')

    // Get top 30 players from Battle Arena leaderboard (prestige_points)
    console.log('📊 Fetching top 30 players from Battle Arena leaderboard...')
    const { data: leaderboardData, error: leaderboardError } = await supabase
      .from('users')
      .select('username, prestige_points')
      .order('prestige_points', { ascending: false })
      .limit(30)

    if (leaderboardError) {
      console.error('❌ Error fetching leaderboard:', leaderboardError)
      return
    }

    if (!leaderboardData || leaderboardData.length < 30) {
      console.error('❌ Not enough players in leaderboard. Found:', leaderboardData?.length || 0)
      return
    }

    console.log(`✅ Found ${leaderboardData.length} players in leaderboard`)

    // Skip positions 1 and 2 (already qualified), start from position 3
    const qualificationPlayers = leaderboardData.slice(2) // Skip first 2 players
    console.log(`🎯 Simulating matches for positions 3-30 (${qualificationPlayers.length} players)`)

    const matches = []

    // Create matchups: 3 vs 30, 4 vs 29, 5 vs 28, etc.
    for (let i = 0; i < qualificationPlayers.length / 2; i++) {
      const player1 = qualificationPlayers[i]
      const player2 = qualificationPlayers[qualificationPlayers.length - 1 - i]
      
      // Calculate ranks (original leaderboard positions)
      const player1Rank = i + 3 // Position 3, 4, 5, etc.
      const player2Rank = 30 - i // Position 30, 29, 28, etc.

      console.log(`⚽ Match ${i + 1}: ${player1.username} (Rank ${player1Rank}) vs ${player2.username} (Rank ${player2Rank})`)

      // Simulate match result
      const matchResult = simulateMatch(player1, player2)
      
      const match = {
        match_id: `qual_${Date.now()}_${i + 1}`,
        player1_username: player1.username,
        player2_username: player2.username,
        player1_score: matchResult.player1Score,
        player2_score: matchResult.player2Score,
        winner_username: matchResult.winner,
        player1_rank: player1Rank,
        player2_rank: player2Rank,
        player1_prestige_points: player1.prestige_points || 0,
        player2_prestige_points: player2.prestige_points || 0,
        player1_team_rating: matchResult.player1TeamRating,
        player2_team_rating: matchResult.player2TeamRating,
        possession_player1: matchResult.possession1,
        possession_player2: matchResult.possession2,
        shots_player1: matchResult.shots1,
        shots_player2: matchResult.shots2,
        events: matchResult.events,
        hidden: true, // All qualification matches are hidden (not visible)
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      matches.push(match)
      console.log(`   Result: ${matchResult.player1Score}-${matchResult.player2Score} (Winner: ${matchResult.winner})`)
    }

    console.log(`\n💾 Inserting ${matches.length} matches into database...`)

    // Insert all matches into database
    const { data: insertedMatches, error: insertError } = await supabase
      .from('qualification_matches')
      .insert(matches)
      .select()

    if (insertError) {
      console.error('❌ Error inserting matches:', insertError)
      return
    }

    console.log('✅ Successfully simulated and saved qualification matches!')
    console.log(`📈 Summary:`)
    console.log(`   - Total matches: ${matches.length}`)
    console.log(`   - Players: ${qualificationPlayers.length}`)
    console.log(`   - Date: ${new Date().toISOString()}`)
    console.log(`   - All matches marked as hidden: hidden = true`)

    // Show some match results
    console.log(`\n🏆 Match Results:`)
    insertedMatches?.forEach((match, index) => {
      console.log(`   ${index + 1}. ${match.player1_username} ${match.player1_score}-${match.player2_score} ${match.player2_username} (Winner: ${match.winner_username})`)
    })

  } catch (error) {
    console.error('❌ Error in qualification simulation:', error)
  }
}

function simulateMatch(player1, player2) {
  // Base team ratings based on prestige points
  const baseRating1 = Math.min(95, Math.max(70, (player1.prestige_points || 0) / 100 + 70))
  const baseRating2 = Math.min(95, Math.max(70, (player2.prestige_points || 0) / 100 + 70))
  
  // Add some randomness to make it interesting
  const player1TeamRating = Math.round((baseRating1 + (Math.random() - 0.5) * 10) * 10) / 10
  const player2TeamRating = Math.round((baseRating2 + (Math.random() - 0.5) * 10) * 10) / 10
  
  // Calculate possession based on team ratings
  const totalRating = player1TeamRating + player2TeamRating
  const possession1 = Math.round((player1TeamRating / totalRating) * 100)
  const possession2 = 100 - possession1
  
  // Simulate shots based on possession and rating
  const shots1 = Math.floor(possession1 / 10 + Math.random() * 5)
  const shots2 = Math.floor(possession2 / 10 + Math.random() * 5)
  
  // Simulate goals based on shots and team rating
  const goalChance1 = (shots1 * player1TeamRating) / 1000
  const goalChance2 = (shots2 * player2TeamRating) / 1000
  
  const player1Score = Math.floor(goalChance1 + Math.random() * 2)
  const player2Score = Math.floor(goalChance2 + Math.random() * 2)
  
  // Ensure at least one goal is scored
  const totalGoals = player1Score + player2Score
  if (totalGoals === 0) {
    if (Math.random() > 0.5) {
      return simulateMatch(player1, player2) // Retry if no goals
    }
  }
  
  const winner = player1Score > player2Score ? player1.username : 
                 player2Score > player1Score ? player2.username : 
                 Math.random() > 0.5 ? player1.username : player2.username
  
  // Generate some match events
  const events = generateMatchEvents(player1Score, player2Score, player1.username, player2.username)
  
  return {
    player1Score,
    player2Score,
    winner,
    player1TeamRating,
    player2TeamRating,
    possession1,
    possession2,
    shots1,
    shots2,
    events
  }
}

function generateMatchEvents(goals1, goals2, player1, player2) {
  const events = []
  
  // Add goal events
  for (let i = 0; i < goals1; i++) {
    events.push({
      type: "goal",
      player: player1,
      minute: Math.floor(Math.random() * 90) + 1,
      description: `Goal by ${player1}!`
    })
  }
  
  for (let i = 0; i < goals2; i++) {
    events.push({
      type: "goal", 
      player: player2,
      minute: Math.floor(Math.random() * 90) + 1,
      description: `Goal by ${player2}!`
    })
  }
  
  // Add some random events
  const eventTypes = ["yellow_card", "red_card", "substitution", "corner", "foul"]
  for (let i = 0; i < Math.floor(Math.random() * 5) + 2; i++) {
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)]
    const player = Math.random() > 0.5 ? player1 : player2
    
    events.push({
      type: eventType,
      player: player,
      minute: Math.floor(Math.random() * 90) + 1,
      description: `${eventType.replace('_', ' ')} for ${player}`
    })
  }
  
  // Sort events by minute
  events.sort((a, b) => a.minute - b.minute)
  
  return events
}

// Run the simulation
simulateQualificationMatches()