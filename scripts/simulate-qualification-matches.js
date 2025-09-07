// Script to simulate and save qualification matches
// Run this once to generate the qualification match results

const fetch = require('node-fetch');

async function simulateQualificationMatches() {
  try {
    console.log('🎯 Starting qualification match simulation...');
    
    const response = await fetch('http://localhost:3000/api/qualification/simulate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ Successfully simulated qualification matches!');
      console.log(`📊 Generated ${data.data.length} match results`);
      console.log('💾 Results saved to database');
      
      // Show some sample results
      data.data.slice(0, 3).forEach((match, index) => {
        console.log(`\n🏆 Match ${index + 1}:`);
        console.log(`   ${match.player1_username} (${match.player1_score}) vs ${match.player2_username} (${match.player2_score})`);
        console.log(`   Winner: ${match.winner_username}`);
      });
      
    } else {
      console.error('❌ Error simulating matches:', data.error);
    }
  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

// Run the simulation
simulateQualificationMatches();
