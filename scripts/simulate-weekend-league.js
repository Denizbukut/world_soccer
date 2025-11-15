const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function simulateMatch(player1, player2) {
  const ratingDiff = player1.teamRating - player2.teamRating;
  const prestigeDiff = player1.prestige_points - player2.prestige_points;

  let player1GoalProb = 0.008;
  let player2GoalProb = 0.008;

  player1GoalProb += (ratingDiff / 100) * 0.002;
  player2GoalProb -= (ratingDiff / 100) * 0.002;

  player1GoalProb += (prestigeDiff / 1000) * 0.001;
  player2GoalProb -= (prestigeDiff / 1000) * 0.001;

  player1GoalProb = Math.max(0.002, Math.min(0.015, player1GoalProb));
  player2GoalProb = Math.max(0.002, Math.min(0.015, player2GoalProb));

  let player1Goals = 0;
  let player2Goals = 0;

  for (let minute = 1; minute <= 90; minute++) {
    if (Math.random() < player1GoalProb) {
      player1Goals++;
    }
    if (Math.random() < player2GoalProb) {
      player2Goals++;
    }
  }

  let winner;
  if (player1Goals > player2Goals) {
    winner = player1;
  } else if (player2Goals > player1Goals) {
    winner = player2;
  } else {
    winner = player1.prestige_points >= player2.prestige_points ? player1 : player2;
    if (winner === player1) {
      player1Goals++;
    } else {
      player2Goals++;
    }
  }

  return {
    player1Score: player1Goals,
    player2Score: player2Goals,
    winner,
  };
}

async function fetchTeamRating(username) {
  const { data: teamData } = await supabase
    .from('user_team')
    .select('*')
    .eq('user_id', username)
    .single();

  if (!teamData) {
    return 70;
  }

  const cardIds = Object.entries(teamData)
    .filter(([key, value]) => key.startsWith('slot_') && typeof value === 'string' && value)
    .map(([, value]) => value);

  if (cardIds.length === 0) {
    return 70;
  }

  const { data: cardsData } = await supabase
    .from('cards')
    .select('overall_rating')
    .in('id', cardIds);

  if (!cardsData || cardsData.length === 0) {
    return 70;
  }

  const validCards = cardsData.filter((card) => card.overall_rating && card.overall_rating > 0);
  if (validCards.length === 0) {
    return 70;
  }

  const totalRating = validCards.reduce((sum, card) => sum + card.overall_rating, 0);
  return Math.round((totalRating / validCards.length) * 10) / 10;
}

async function getParticipants() {
  console.log('📊 Fetching direct weekend league participants (Top 2)...');
  const { data: leaderboardData, error: leaderboardError } = await supabase
    .from('users')
    .select('username, prestige_points')
    .order('prestige_points', { ascending: false })
    .limit(2);

  if (leaderboardError) {
    throw new Error(`Failed to fetch leaderboard: ${leaderboardError.message}`);
  }

  if (!leaderboardData || leaderboardData.length < 2) {
    throw new Error('Not enough direct qualified players found.');
  }

  const directQualified = [];
  for (let i = 0; i < leaderboardData.length; i++) {
    const player = leaderboardData[i];
    const teamRating = await fetchTeamRating(player.username);
    directQualified.push({
      username: player.username,
      rank: i + 1,
      prestige_points: player.prestige_points || 100,
      teamRating,
      source: 'direct',
    });
  }

  console.log('🎯 Fetching qualification winners...');
  const { data: qualificationMatches, error: qualificationError } = await supabase
    .from('qualification_matches')
    .select('*');

  if (qualificationError) {
    throw new Error(`Failed to fetch qualification matches: ${qualificationError.message}`);
  }

  const qualificationWinners = [];
  if (qualificationMatches) {
    for (const match of qualificationMatches) {
      const winnerUsername = match.winner_username;
      const isPlayer1 = winnerUsername === match.player1_username;
      const rank = isPlayer1 ? match.player1_rank : match.player2_rank;
      const prestige = isPlayer1 ? match.player1_prestige_points : match.player2_prestige_points;
      const rating = isPlayer1 ? match.player1_team_rating : match.player2_team_rating;

      qualificationWinners.push({
        username: winnerUsername,
        rank,
        prestige_points: prestige,
        teamRating: rating,
        source: 'qualification',
      });
    }
  }

  const allParticipants = [...directQualified, ...qualificationWinners].sort(
    (a, b) => a.rank - b.rank,
  );

  if (allParticipants.length < 16) {
    throw new Error(`Not enough participants. Need 16, got ${allParticipants.length}`);
  }

  return allParticipants.slice(0, 16);
}

function buildBracket(participants) {
  const matches = [];

  console.log('🏟️ Simulating Round of 16...');
  const round16Matches = [];
  for (let i = 0; i < 8; i++) {
    const player1 = participants[i * 2];
    const player2 = participants[i * 2 + 1];
    const result = simulateMatch(player1, player2);
    const match = {
      id: `round16-${i + 1}`,
      round: 'round16',
      player1,
      player2,
      player1Score: result.player1Score,
      player2Score: result.player2Score,
      winner: result.winner,
      isSimulated: true,
    };
    round16Matches.push(match);
    matches.push(match);
    console.log(
      `   ${match.id}: ${player1.username} ${match.player1Score}-${match.player2Score} ${player2.username} (Winner: ${match.winner.username})`,
    );
  }

  console.log('🏟️ Simulating Quarterfinals...');
  const quarterPlayers = round16Matches.map((match) => match.winner);
  const quarterMatches = [];
  for (let i = 0; i < 4; i++) {
    const player1 = quarterPlayers[i * 2];
    const player2 = quarterPlayers[i * 2 + 1];
    const result = simulateMatch(player1, player2);
    const match = {
      id: `quarter-${i + 1}`,
      round: 'quarter',
      player1,
      player2,
      player1Score: result.player1Score,
      player2Score: result.player2Score,
      winner: result.winner,
      isSimulated: true,
    };
    quarterMatches.push(match);
    matches.push(match);
    console.log(
      `   ${match.id}: ${player1.username} ${match.player1Score}-${match.player2Score} ${player2.username} (Winner: ${match.winner.username})`,
    );
  }

  console.log('🏟️ Simulating Semifinals...');
  const semiPlayers = quarterMatches.map((match) => match.winner);
  const semiMatches = [];
  for (let i = 0; i < 2; i++) {
    const player1 = semiPlayers[i * 2];
    const player2 = semiPlayers[i * 2 + 1];
    const result = simulateMatch(player1, player2);
    const match = {
      id: `semi-${i + 1}`,
      round: 'semi',
      player1,
      player2,
      player1Score: result.player1Score,
      player2Score: result.player2Score,
      winner: result.winner,
      isSimulated: true,
    };
    semiMatches.push(match);
    matches.push(match);
    console.log(
      `   ${match.id}: ${player1.username} ${match.player1Score}-${match.player2Score} ${player2.username} (Winner: ${match.winner.username})`,
    );
  }

  console.log('🏆 Simulating Final...');
  const finalPlayers = semiMatches.map((match) => match.winner);
  if (finalPlayers.length === 2) {
    const result = simulateMatch(finalPlayers[0], finalPlayers[1]);
    const match = {
      id: 'final-1',
      round: 'final',
      player1: finalPlayers[0],
      player2: finalPlayers[1],
      player1Score: result.player1Score,
      player2Score: result.player2Score,
      winner: result.winner,
      isSimulated: true,
    };
    matches.push(match);
    console.log(
      `   ${match.id}: ${match.player1.username} ${match.player1Score}-${match.player2Score} ${match.player2.username} (Champion: ${match.winner.username})`,
    );
  }

  return matches;
}

async function saveMatches(matches) {
  const dbMatches = matches.map((match) => ({
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
    hidden: true,
  }));

  console.log('💾 Saving matches to weekend_league_matches table...');
  await supabase
    .from('weekend_league_matches')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  const { error: insertError } = await supabase
    .from('weekend_league_matches')
    .insert(dbMatches);

  if (insertError) {
    throw new Error(`Failed to insert weekend league matches: ${insertError.message}`);
  }
}

async function main() {
  try {
    console.log('🚀 Starting Weekend League simulation...\n');
    const participants = await getParticipants();
    console.log(`✅ Participants ready: ${participants.length}`);
    const matches = buildBracket(participants);
    await saveMatches(matches);
    const champion = matches[matches.length - 1].winner;
    console.log('\n🎉 Weekend League simulation complete!');
    console.log(`🏆 Champion: ${champion.username}`);
  } catch (error) {
    console.error('❌ Weekend League simulation failed:', error.message);
    process.exit(1);
  }
}

main();

