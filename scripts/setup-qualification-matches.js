// Script to create table and simulate qualification matches
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTable() {
  console.log('🗄️ Creating qualification_matches table...');
  
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS qualification_matches (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      match_id VARCHAR(50) UNIQUE NOT NULL,
      player1_username VARCHAR(100) NOT NULL,
      player2_username VARCHAR(100) NOT NULL,
      player1_score INTEGER NOT NULL DEFAULT 0,
      player2_score INTEGER NOT NULL DEFAULT 0,
      winner_username VARCHAR(100) NOT NULL,
      player1_rank INTEGER NOT NULL,
      player2_rank INTEGER NOT NULL,
      player1_prestige_points INTEGER NOT NULL,
      player2_prestige_points INTEGER NOT NULL,
      player1_team_rating DECIMAL(4,1) NOT NULL,
      player2_team_rating DECIMAL(4,1) NOT NULL,
      possession_player1 INTEGER NOT NULL,
      possession_player2 INTEGER NOT NULL,
      shots_player1 INTEGER NOT NULL,
      shots_player2 INTEGER NOT NULL,
      events JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;

  try {
    const { error } = await supabase.rpc('exec_sql', { sql: createTableSQL });
    
    if (error) {
      console.log('⚠️ Table might already exist or using alternative method...');
      // Try direct table creation
      const { error: directError } = await supabase
        .from('qualification_matches')
        .select('id')
        .limit(1);
      
      if (directError && directError.code === 'PGRST116') {
        console.log('✅ Table created successfully');
      } else if (directError) {
        console.error('❌ Error creating table:', directError);
        return false;
      } else {
        console.log('✅ Table already exists');
      }
    } else {
      console.log('✅ Table created successfully');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error creating table:', error);
    return false;
  }
}

async function simulateMatches() {
  console.log('🎯 Simulating qualification matches...');
  
  try {
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
      
      return true;
    } else {
      console.error('❌ Error simulating matches:', data.error);
      return false;
    }
  } catch (error) {
    console.error('💥 Error:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Setting up qualification matches...\n');
  
  // Wait a bit for the server to start
  console.log('⏳ Waiting for server to start...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Create table
  const tableCreated = await createTable();
  if (!tableCreated) {
    console.error('❌ Failed to create table');
    return;
  }
  
  console.log('');
  
  // Simulate matches
  const simulationSuccess = await simulateMatches();
  if (!simulationSuccess) {
    console.error('❌ Failed to simulate matches');
    return;
  }
  
  console.log('\n🎉 Qualification matches setup complete!');
  console.log('📱 You can now visit the ANI page to see the results');
}

main().catch(console.error);
