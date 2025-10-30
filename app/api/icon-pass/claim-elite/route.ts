import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json();

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if user has an active icon pass
    const { data: iconPass, error: iconPassError } = await supabase
      .from('icon_passes')
      .select('*')
      .eq('user_id', username)
      .eq('active', true)
      .single();

    if (iconPassError || !iconPass) {
      return NextResponse.json(
        { error: 'No active icon pass found' },
        { status: 400 }
      );
    }

    // Check if pass has expired
    if (new Date() > new Date(iconPass.expires_at)) {
      // Mark pass as inactive
      await supabase
        .from('icon_passes')
        .update({ active: false })
        .eq('id', iconPass.id);

      return NextResponse.json(
        { error: 'Icon pass has expired' },
        { status: 400 }
      );
    }

    // Check if user has already claimed today (24-hour cooldown)
    const { data: lastClaim, error: lastClaimError } = await supabase
      .from('icon_pass_claims')
      .select('claimed_at')
      .eq('user_id', username)
      .order('claimed_at', { ascending: false })
      .limit(1)
      .single();

    if (!lastClaimError && lastClaim) {
      const lastClaimTime = new Date(lastClaim.claimed_at);
      const now = new Date();
      const timeDiff = now.getTime() - lastClaimTime.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      if (hoursDiff < 24) {
        const remainingHours = Math.floor(24 - hoursDiff);
        const remainingMinutes = Math.floor((24 - hoursDiff - remainingHours) * 60);
        
        return NextResponse.json(
          { 
            error: 'Already claimed today',
            nextClaimIn: `${remainingHours}h ${remainingMinutes}m`,
            lastClaimTime: lastClaimTime.toISOString()
          },
          { status: 400 }
        );
      }
    }

    // Get current user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('elite_tickets')
      .eq('username', username)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Calculate new elite ticket count
    const currentEliteTickets = user.elite_tickets || 0;
    const newEliteTicketCount = currentEliteTickets + 1;

    // Update user elite tickets
    const { error: updateError } = await supabase
      .from('users')
      .update({ elite_tickets: newEliteTicketCount })
      .eq('username', username);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update elite tickets' },
        { status: 500 }
      );
    }

    // Record the claim
    const { error: claimError } = await supabase
      .from('icon_pass_claims')
      .insert({
        user_id: username,
        claim_type: 'elite',
        claimed_at: new Date().toISOString()
      });

    if (claimError) {
      console.error('Error recording claim:', claimError);
      // Don't fail the request if we can't record the claim
    }

    return NextResponse.json({
      success: true,
      message: 'Elite ticket claimed successfully!',
      newEliteTicketCount: newEliteTicketCount
    });

  } catch (error) {
    console.error('Error in claim-elite:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
