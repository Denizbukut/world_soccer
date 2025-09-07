// Match simulation for qualification matches
export interface QualificationMatch {
  player1: {
    username: string
    rank: number
    prestige_points: number
    teamRating: number
  }
  player2: {
    username: string
    rank: number
    prestige_points: number
    teamRating: number
  }
  matchId: string
}

export interface MatchResult {
  matchId: string
  player1: string
  player2: string
  player1Score: number
  player2Score: number
  winner: string
  events: string[]
  possession: { player1: number; player2: number }
  shots: { player1: number; player2: number }
}

// Match events for commentary
const matchEvents = [
  "⚽ GOAL! Brilliant finish!",
  "🎯 Great save by the goalkeeper!",
  "💥 What a shot! Just wide of the post!",
  "🔥 End to end action!",
  "⚡ Counter attack!",
  "🛡️ Solid defensive work!",
  "🎪 Skillful dribbling!",
  "📐 Perfect cross into the box!",
  "🚀 Long range effort!",
  "⚽ GOAL! Clinical finish!",
  "🎯 Corner kick opportunity!",
  "💪 Strong tackle!",
  "⚽ GOAL! Header from the corner!",
  "🎪 Beautiful passing play!",
  "⚡ Quick breakaway!",
  "🛡️ Last ditch defending!",
  "📐 Free kick in a dangerous position!",
  "🚀 Shot from distance!",
  "⚽ GOAL! Penalty converted!",
  "🎯 Off the crossbar!",
  "💥 What a match!",
  "🔥 Both teams giving their all!",
  "⚡ Pace of the game is incredible!",
  "🛡️ Defensive masterclass!",
  "📐 Set piece specialist!",
  "🚀 Thunderous strike!",
  "⚽ GOAL! World class finish!",
  "🎯 Unbelievable save!",
  "💪 Physical battle in midfield!",
  "🎪 Technical brilliance!"
]

// Simulate a single qualification match
export function simulateQualificationMatch(match: QualificationMatch): MatchResult {
  const { player1, player2, matchId } = match
  
  // Calculate base probabilities based on team ratings
  const ratingDiff = player1.teamRating - player2.teamRating
  const prestigeDiff = player1.prestige_points - player2.prestige_points
  
  // Base goal probabilities (adjusted by rating difference)
  let player1GoalProb = 0.008 // Base 0.8% per minute
  let player2GoalProb = 0.008
  
  // Adjust probabilities based on rating difference
  if (ratingDiff > 5) {
    player1GoalProb = 0.012
    player2GoalProb = 0.005
  } else if (ratingDiff > 2) {
    player1GoalProb = 0.010
    player2GoalProb = 0.006
  } else if (ratingDiff < -5) {
    player1GoalProb = 0.005
    player2GoalProb = 0.012
  } else if (ratingDiff < -2) {
    player1GoalProb = 0.006
    player2GoalProb = 0.010
  }
  
  // Slight adjustment based on prestige points (experience factor)
  const prestigeFactor = prestigeDiff / 1000 // Small factor
  player1GoalProb += prestigeFactor * 0.001
  player2GoalProb -= prestigeFactor * 0.001
  
  // Ensure probabilities are reasonable
  player1GoalProb = Math.max(0.003, Math.min(0.015, player1GoalProb))
  player2GoalProb = Math.max(0.003, Math.min(0.015, player2GoalProb))
  
  // Simulate 90 minutes
  let player1Score = 0
  let player2Score = 0
  const events: string[] = []
  
  // Generate possession (slightly favor higher rated team)
  const possessionBase = 50 + (ratingDiff * 2)
  const player1Possession = Math.max(30, Math.min(70, possessionBase))
  const player2Possession = 100 - player1Possession
  
  // Generate shots (based on possession and rating)
  const player1Shots = Math.floor(8 + (player1Possession - 50) * 0.1 + Math.random() * 6)
  const player2Shots = Math.floor(8 + (player2Possession - 50) * 0.1 + Math.random() * 6)
  
  // Simulate goals with controlled scoring
  for (let minute = 1; minute <= 90; minute++) {
    // Player 1 goal chance
    if (Math.random() < player1GoalProb) {
      player1Score++
      const goalEvent = matchEvents[Math.floor(Math.random() * matchEvents.length)]
      events.push(`${minute}' - ${goalEvent} ${player1.username} leads ${player1Score}-${player2Score}!`)
    }
    
    // Player 2 goal chance
    if (Math.random() < player2GoalProb) {
      player2Score++
      const goalEvent = matchEvents[Math.floor(Math.random() * matchEvents.length)]
      events.push(`${minute}' - ${goalEvent} ${player2.username} equalizes! ${player1Score}-${player2Score}`)
    }
    
    // Add some non-goal events (very limited to prevent overflow)
    if (Math.random() < 0.05 && events.length < 3) { // 5% chance per minute, max 3 events
      const event = matchEvents[Math.floor(Math.random() * matchEvents.length)]
      if (!event.includes('GOAL')) {
        events.push(`${minute}' - ${event}`)
      }
    }
  }
  
  // Determine winner - GUARANTEED NO DRAWS
  let winner: string
  
  // If it's a draw, force a winner immediately
  if (player1Score === player2Score) {
    // Force a winner based on rating difference
    if (ratingDiff > 0) {
      // Player 1 has higher rating, give them the win
      player1Score++
      winner = player1.username
    } else if (ratingDiff < 0) {
      // Player 2 has higher rating, give them the win
      player2Score++
      winner = player2.username
    } else {
      // Equal ratings - random winner
      if (Math.random() > 0.5) {
        player1Score++
        winner = player1.username
      } else {
        player2Score++
        winner = player2.username
      }
    }
  } else if (player1Score > player2Score) {
    winner = player1.username
  } else {
    winner = player2.username
  }
  
  return {
    matchId,
    player1: player1.username,
    player2: player2.username,
    player1Score,
    player2Score,
    winner,
    events: events.slice(-3), // Keep last 3 events to prevent overflow
    possession: { player1: player1Possession, player2: player2Possession },
    shots: { player1: player1Shots, player2: player2Shots }
  }
}

// Simulate all qualification matches
export function simulateAllQualificationMatches(matches: QualificationMatch[]): MatchResult[] {
  return matches.map(match => simulateQualificationMatch(match))
}

// Generate mock qualification results for display
export function generateMockQualificationResults(): MatchResult[] {
  const mockMatches: QualificationMatch[] = [
    {
      player1: { username: "BarcaFan", rank: 3, prestige_points: 1250, teamRating: 87.5 },
      player2: { username: "Madridista", rank: 30, prestige_points: 890, teamRating: 82.1 },
      matchId: "match-3-30"
    },
    {
      player1: { username: "LiverpoolFC", rank: 4, prestige_points: 1200, teamRating: 86.2 },
      player2: { username: "ChelseaBlue", rank: 29, prestige_points: 920, teamRating: 83.4 },
      matchId: "match-4-29"
    },
    {
      player1: { username: "ManCityFan", rank: 5, prestige_points: 1180, teamRating: 85.8 },
      player2: { username: "ArsenalGunner", rank: 28, prestige_points: 950, teamRating: 84.1 },
      matchId: "match-5-28"
    },
    {
      player1: { username: "BayernMunich", rank: 6, prestige_points: 1150, teamRating: 85.2 },
      player2: { username: "DortmundFan", rank: 27, prestige_points: 980, teamRating: 84.5 },
      matchId: "match-6-27"
    },
    {
      player1: { username: "PSGSupporter", rank: 7, prestige_points: 1120, teamRating: 84.8 },
      player2: { username: "JuventusFan", rank: 26, prestige_points: 1010, teamRating: 85.0 },
      matchId: "match-7-26"
    }
  ]
  
  return simulateAllQualificationMatches(mockMatches)
}
