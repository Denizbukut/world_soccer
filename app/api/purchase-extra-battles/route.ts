import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { username, battleAmount, packageId } = await request.json();

    if (!username || !battleAmount || !packageId) {
      return NextResponse.json(
        { error: 'Username, battleAmount, and packageId are required' },
        { status: 400 }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get current user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get current battle limit
    const { data: battleLimit, error: battleLimitError } = await supabase
      .from('user_battle_limits')
      .select('*')
      .eq('user_id', username)
      .single();

    if (battleLimitError && battleLimitError.code !== 'PGRST116') {
      return NextResponse.json(
        { error: 'Failed to fetch battle limit' },
        { status: 500 }
      );
    }

    const currentBattlesUsed = battleLimit?.battles_used || 0;
    const newBattlesUsed = Math.max(0, currentBattlesUsed - battleAmount);

    // Update battle limit
    const { error: updateError } = await supabase
      .from('user_battle_limits')
      .upsert({
        user_id: username,
        battles_used: newBattlesUsed,
        last_reset_date: battleLimit?.last_reset_date || new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update battle limit' },
        { status: 500 }
      );
    }

    // Log the PvP purchase
    const { error: purchaseError } = await supabase
      .from('pvp_purchases')
      .insert({
        user_id: username,
        username: username,
        amount: battleAmount,
        package_id: packageId,
        purchased_at: new Date().toISOString()
      });

    if (purchaseError) {
      console.error('Error logging PvP purchase:', purchaseError);
      // Don't fail the request if we can't log the purchase
    }

    return NextResponse.json({
      success: true,
      message: `Successfully purchased ${battleAmount} additional PvP battle${battleAmount > 1 ? 's' : ''}!`,
      newBattlesUsed: newBattlesUsed,
      battlesRemaining: 5 - newBattlesUsed
    });

  } catch (error) {
    console.error('Error in purchase-extra-battles:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
