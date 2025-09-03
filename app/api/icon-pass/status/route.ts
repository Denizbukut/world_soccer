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
      return NextResponse.json({
        hasActivePass: false,
        message: 'No active icon pass found'
      });
    }

    // Check if pass has expired
    if (new Date() > new Date(iconPass.expires_at)) {
      // Mark pass as inactive
      await supabase
        .from('icon_passes')
        .update({ active: false })
        .eq('id', iconPass.id);

      return NextResponse.json({
        hasActivePass: false,
        message: 'Icon pass has expired'
      });
    }

    // Check for any claims in the last 24 hours (this is the main validation)
    const { data: recentClaims, error: recentClaimsError } = await supabase
      .from('icon_pass_claims')
      .select('claimed_at')
      .eq('user_id', username)
      .gte('claimed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('claimed_at', { ascending: false });

    console.log(`🔍 Status check for ${username}: Found ${recentClaims?.length || 0} recent claims, Error: ${recentClaimsError?.message || 'None'}`);

    let canClaim = true;
    let nextClaimTime = null;
    let timeUntilNextClaim = null;
    let lastClaimTime = null;

    if (!recentClaimsError && recentClaims && recentClaims.length > 0) {
      // User has claimed in the last 24 hours
      const mostRecentClaim = new Date(recentClaims[0].claimed_at);
      lastClaimTime = mostRecentClaim.toISOString();
      
      const now = new Date();
      const timeDiff = now.getTime() - mostRecentClaim.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      console.log(`🔍 Time calculation for ${username}: Last claim: ${mostRecentClaim.toISOString()}, Now: ${now.toISOString()}, Hours since: ${hoursDiff.toFixed(2)}`);

      if (hoursDiff < 24) {
        canClaim = false;
        const remainingHours = Math.floor(24 - hoursDiff);
        const remainingMinutes = Math.floor((24 - hoursDiff - remainingHours) * 60);
        timeUntilNextClaim = `${remainingHours}h ${remainingMinutes}m`;
        nextClaimTime = new Date(mostRecentClaim.getTime() + 24 * 60 * 60 * 1000).toISOString();
        
        console.log(`🔒 User ${username} cannot claim yet. Last claim: ${mostRecentClaim.toISOString()}, Hours since: ${hoursDiff.toFixed(2)}, Remaining: ${timeUntilNextClaim}`);
      } else {
        console.log(`✅ User ${username} can claim. Last claim: ${mostRecentClaim.toISOString()}, Hours since: ${hoursDiff.toFixed(2)}`);
      }
    } else {
      console.log(`✅ User ${username} has never claimed or last claim was more than 24 hours ago`);
    }

    // Calculate remaining time for icon pass
    const now = new Date();
    const expiryDate = new Date(iconPass.expires_at);
    const diff = expiryDate.getTime() - now.getTime();
    
    let remainingTime = '';
    if (diff > 0) {
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        remainingTime = `${days}d ${hours}h ${minutes}m`;
      } else if (hours > 0) {
        remainingTime = `${hours}h ${minutes}m`;
      } else {
        remainingTime = `${minutes}m`;
      }
    }

    return NextResponse.json({
      hasActivePass: true,
      iconPass: {
        id: iconPass.id,
        purchased_at: iconPass.purchased_at,
        expires_at: iconPass.expires_at,
        remaining_time: remainingTime,
        is_expired: false
      },
      claimStatus: {
        canClaim,
        lastClaimTime: lastClaimTime,
        nextClaimTime,
        timeUntilNextClaim
      }
    });

  } catch (error) {
    console.error('Error in icon pass status check:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
