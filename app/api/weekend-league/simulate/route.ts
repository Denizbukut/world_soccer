import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

interface WeekendLeaguePlayer {
  username: string
  rank: number
  prestige_points: number
  teamRating: number
  source: 'direct' | 'qualification'
}

interface WeekendLeagueMatch {
  id: string
  round: 'round16' | 'quarter' | 'semi' | 'final'
  player1: WeekendLeaguePlayer | null
  player2: WeekendLeaguePlayer | null
  player1Score: number
  player2Score: number
  winner: WeekendLeaguePlayer | null
  isSimulated: boolean
}

// Simulate a single match
function simulateMatch(player1: WeekendLeaguePlayer, player2: WeekendLeaguePlayer): { player1Score: number, player2Score: number, winner: WeekendLeaguePlayer } {
  // Calculate base probabilities based on team ratings and prestige points
  const ratingDiff = player1.teamRating - player2.teamRating
  const prestigeDiff = player1.prestige_points - player2.prestige_points
  
  // Base goal probabilities (adjusted by rating and prestige difference)
  let player1GoalProb = 0.008 // Base 0.8% per minute
  let player2GoalProb = 0.008
  
  // Adjust probabilities based on rating difference
  player1GoalProb += (ratingDiff / 100) * 0.002
  player2GoalProb -= (ratingDiff / 100) * 0.002
  
  // Adjust probabilities based on prestige difference
  player1GoalProb += (prestigeDiff / 1000) * 0.001
  player2GoalProb -= (prestigeDiff / 1000) * 0.001
  
  // Ensure minimum probabilities
  player1GoalProb = Math.max(0.002, Math.min(0.015, player1GoalProb))
  player2GoalProb = Math.max(0.002, Math.min(0.015, player2GoalProb))
  
  // Simulate 90 minutes of play
  let player1Goals = 0
  let player2Goals = 0
  
  for (let minute = 1; minute <= 90; minute++) {
    if (Math.random() < player1GoalProb) {
      player1Goals++
    }
    if (Math.random() < player2GoalProb) {
      player2Goals++
    }
  }
  
  // Determine winner
  let winner: WeekendLeaguePlayer
  if (player1Goals > player2Goals) {
    winner = player1
  } else if (player2Goals > player1Goals) {
    winner = player2
  } else {
    // Draw - determine winner by prestige points
    winner = player1.prestige_points >= player2.prestige_points ? player1 : player2
    // Add one goal to winner to break tie
    if (winner === player1) {
      player1Goals++
    } else {
      player2Goals++
    }
  }
  
  return {
    player1Score: player1Goals,
    player2Score: player2Goals,
    winner
  }
}

export async function POST() {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  try {
    // Get direct qualified players (Top 2 from Battle Arena)
    const { data: leaderboardData, error: leaderboardError } = await supabase
      .from("users")
      .select("username, prestige_points")
      .order("prestige_points", { ascending: false })
      .limit(2)

    if (leaderboardError) {
      return NextResponse.json({ success: false, error: leaderboardError.message }, { status: 500 })
    }

    // Get squad ratings for direct qualified players
    const directQualified: WeekendLeaguePlayer[] = []
    for (const player of leaderboardData) {
      // Get user's team
      const { data: teamData } = await supabase
        .from("user_team")
        .select("*")
        .eq("user_id", player.username)
        .single()

      let teamRating = 70 // Default rating
      if (teamData) {
        // Get card IDs from team slots
        const cardIds = Object.entries(teamData)
          .filter(([key, value]) => key.startsWith('slot_') && typeof value === 'string' && value)
          .map(([key, value]) => value as string)

        if (cardIds.length > 0) {
          // Get card details
          const { data: cardsData } = await supabase
            .from("cards")
            .select("overall_rating")
            .in("id", cardIds)

          if (cardsData && cardsData.length > 0) {
            // Calculate average rating
            const validCards = cardsData.filter(card => card.overall_rating && card.overall_rating > 0)
            if (validCards.length > 0) {
              const totalRating = validCards.reduce((sum, card) => sum + card.overall_rating, 0)
              const averageRating = totalRating / validCards.length
              teamRating = Math.round(averageRating * 10) / 10
            }
          }
        }
      }

      directQualified.push({
        username: player.username,
        rank: directQualified.length + 1,
        prestige_points: player.prestige_points || 100,
        teamRating,
        source: 'direct'
      })
    }

    // Get qualification match winners
    const { data: qualificationMatches, error: qualificationError } = await supabase
      .from("qualification_matches")
      .select("*")

    if (qualificationError) {
      return NextResponse.json({ success: false, error: qualificationError.message }, { status: 500 })
    }

    const qualificationWinners: WeekendLeaguePlayer[] = []
    if (qualificationMatches && qualificationMatches.length > 0) {
      for (const match of qualificationMatches) {
        const winnerUsername = match.winner_username
        const winnerRank = winnerUsername === match.player1_username ? match.player1_rank : match.player2_rank
        const winnerPrestige = winnerUsername === match.player1_username ? match.player1_prestige_points : match.player2_prestige_points
        const winnerRating = winnerUsername === match.player1_username ? match.player1_team_rating : match.player2_team_rating

        qualificationWinners.push({
          username: winnerUsername,
          rank: winnerRank,
          prestige_points: winnerPrestige,
          teamRating: winnerRating,
          source: 'qualification'
        })
      }
    }

    // Combine all participants (16 total: 2 direct + 14 qualification winners)
    const allParticipants = [...directQualified, ...qualificationWinners]

    if (allParticipants.length < 16) {
      return NextResponse.json({ 
        success: false, 
        error: `Not enough participants. Need 16, got ${allParticipants.length}` 
      }, { status: 400 })
    }

    // Create tournament bracket
    const matches: WeekendLeagueMatch[] = []
    
    // Round of 16 (8 matches)
    const round16Players = [...allParticipants]
    const round16Matches: WeekendLeagueMatch[] = []
    
    for (let i = 0; i < 8; i++) {
      const player1 = round16Players[i * 2]
      const player2 = round16Players[i * 2 + 1]
      
      const result = simulateMatch(player1, player2)
      
      const match: WeekendLeagueMatch = {
        id: `round16-${i + 1}`,
        round: 'round16',
        player1,
        player2,
        player1Score: result.player1Score,
        player2Score: result.player2Score,
        winner: result.winner,
        isSimulated: true
      }
      
      round16Matches.push(match)
      matches.push(match)
    }

    // Quarterfinals (4 matches)
    const quarterPlayers = round16Matches.map(match => match.winner).filter(Boolean) as WeekendLeaguePlayer[]
    const quarterMatches: WeekendLeagueMatch[] = []
    
    for (let i = 0; i < 4; i++) {
      const player1 = quarterPlayers[i * 2]
      const player2 = quarterPlayers[i * 2 + 1]
      
      const result = simulateMatch(player1, player2)
      
      const match: WeekendLeagueMatch = {
        id: `quarter-${i + 1}`,
        round: 'quarter',
        player1,
        player2,
        player1Score: result.player1Score,
        player2Score: result.player2Score,
        winner: result.winner,
        isSimulated: true
      }
      
      quarterMatches.push(match)
      matches.push(match)
    }

    // Semifinals (2 matches)
    const semiPlayers = quarterMatches.map(match => match.winner).filter(Boolean) as WeekendLeaguePlayer[]
    const semiMatches: WeekendLeagueMatch[] = []
    
    for (let i = 0; i < 2; i++) {
      const player1 = semiPlayers[i * 2]
      const player2 = semiPlayers[i * 2 + 1]
      
      const result = simulateMatch(player1, player2)
      
      const match: WeekendLeagueMatch = {
        id: `semi-${i + 1}`,
        round: 'semi',
        player1,
        player2,
        player1Score: result.player1Score,
        player2Score: result.player2Score,
        winner: result.winner,
        isSimulated: true
      }
      
      semiMatches.push(match)
      matches.push(match)
    }

    // Final (1 match)
    const finalPlayers = semiMatches.map(match => match.winner).filter(Boolean) as WeekendLeaguePlayer[]
    
    if (finalPlayers.length === 2) {
      const result = simulateMatch(finalPlayers[0], finalPlayers[1])
      
      const finalMatch: WeekendLeagueMatch = {
        id: 'final-1',
        round: 'final',
        player1: finalPlayers[0],
        player2: finalPlayers[1],
        player1Score: result.player1Score,
        player2Score: result.player2Score,
        winner: result.winner,
        isSimulated: true
      }
      
      matches.push(finalMatch)
    }

    // Convert to database format
    const dbMatches = matches.map(match => ({
      match_id: match.id,
      round: match.round,
      player1_username: match.player1?.username || null,
      player2_username: match.player2?.username || null,
      player1_score: match.player1Score,
      player2_score: match.player2Score,
      winner_username: match.winner?.username || null,
      player1_rank: match.player1?.rank || 0,
      player2_rank: match.player2?.rank || 0,
      player1_prestige_points: match.player1?.prestige_points || 0,
      player2_prestige_points: match.player2?.prestige_points || 0,
      player1_team_rating: match.player1?.teamRating || 0,
      player2_team_rating: match.player2?.teamRating || 0,
      is_simulated: match.isSimulated,
      hidden: true
    }))

    // Clear existing matches and insert new ones
    await supabase
      .from("weekend_league_matches")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000")

    const { data: insertedMatches, error: insertError } = await supabase
      .from("weekend_league_matches")
      .insert(dbMatches)
      .select()

    if (insertError) {
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      data: matches,
      message: `Successfully simulated Weekend League tournament with ${matches.length} matches`
    })
  } catch (error) {
    console.error("Error simulating weekend league:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
