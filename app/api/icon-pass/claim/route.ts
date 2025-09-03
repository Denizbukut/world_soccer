import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Simple in-memory rate limiter (in production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(username: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const maxRequests = 5; // Max 5 requests per minute

  const userLimit = rateLimitMap.get(username);
  
  if (!userLimit || now > userLimit.resetTime) {
    // Reset or create new limit
    rateLimitMap.set(username, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (userLimit.count >= maxRequests) {
    return false;
  }

  userLimit.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json();

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    // Check rate limit
    if (!checkRateLimit(username)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait before trying again.' },
        { status: 429 }
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

      console.log(`🔍 Claim check for ${username}: Last claim: ${lastClaim.claimed_at}, Hours since: ${hoursDiff.toFixed(2)}`);

      // Strict 24-hour validation - must be exactly 24 hours or more
      if (hoursDiff < 24) {
        const remainingHours = Math.floor(24 - hoursDiff);
        const remainingMinutes = Math.floor((24 - hoursDiff - remainingHours) * 60);
        
        console.log(`🔒 User ${username} blocked from claiming. Remaining: ${remainingHours}h ${remainingMinutes}m`);
        console.log(`🔒 Blocking claim: Last claim was ${hoursDiff.toFixed(2)} hours ago, need 24 hours`);
        
        return NextResponse.json(
          { 
            error: 'Already claimed today',
            nextClaimIn: `${remainingHours}h ${remainingMinutes}m`,
            lastClaimTime: lastClaim.claimed_at,
            nextClaimAvailable: new Date(lastClaimTime.getTime() + 24 * 60 * 60 * 1000).toISOString()
          },
          { status: 400 }
        );
      } else {
        console.log(`✅ User ${username} can claim. Last claim was ${hoursDiff.toFixed(2)} hours ago`);
      }
    } else {
      console.log(`✅ User ${username} has never claimed before`);
    }

    // Additional security: Check if there are any claims in the last 24 hours
    const { data: recentClaims, error: recentClaimsError } = await supabase
      .from('icon_pass_claims')
      .select('claimed_at')
      .eq('user_id', username)
      .gte('claimed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('claimed_at', { ascending: false });

    if (!recentClaimsError && recentClaims && recentClaims.length > 0) {
      const mostRecentClaim = new Date(recentClaims[0].claimed_at);
      const now = new Date();
      const timeDiff = now.getTime() - mostRecentClaim.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      console.log(`🔍 Security check for ${username}: Found ${recentClaims.length} recent claims, most recent: ${mostRecentClaim.toISOString()}, Hours since: ${hoursDiff.toFixed(2)}`);

      if (hoursDiff < 24) {
        const remainingHours = Math.floor(24 - hoursDiff);
        const remainingMinutes = Math.floor((24 - hoursDiff - remainingHours) * 60);
        
        console.log(`🔒 User ${username} blocked by security check. Remaining: ${remainingHours}h ${remainingMinutes}m`);
        console.log(`🔒 Security check blocking claim: Last claim was ${hoursDiff.toFixed(2)} hours ago, need 24 hours`);
        
        return NextResponse.json(
          { 
            error: 'Already claimed today (security check)',
            nextClaimIn: `${remainingHours}h ${remainingMinutes}m`,
            lastClaimTime: mostRecentClaim.toISOString(),
            nextClaimAvailable: new Date(mostRecentClaim.getTime() + 24 * 60 * 60 * 1000).toISOString()
          },
          { status: 400 }
        );
      } else {
        console.log(`✅ User ${username} passed security check. Last claim was ${hoursDiff.toFixed(2)} hours ago`);
      }
    } else {
      console.log(`✅ User ${username} passed security check. No recent claims found`);
    }

    // Get current user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('icon_tickets')
      .eq('username', username)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Calculate new ticket count
    const currentTickets = user.icon_tickets || 0;
    const newTicketCount = currentTickets + 1;

    // Update user's icon tickets
    const { error: updateError } = await supabase
      .from('users')
      .update({ icon_tickets: newTicketCount })
      .eq('username', username);

    if (updateError) {
      console.error('Error updating user tickets:', updateError);
      return NextResponse.json(
        { error: 'Failed to update tickets' },
        { status: 500 }
      );
    }

    // Record the claim
    const { error: claimError } = await supabase
      .from('icon_pass_claims')
      .insert({
        user_id: username,
        claimed_at: new Date().toISOString(),
        tickets_claimed: 1
      });

    if (claimError) {
      console.error('Error recording claim:', claimError);
      // Don't fail the request if we can't record the claim
    } else {
      console.log(`🎯 Successfully recorded claim for user ${username} at ${new Date().toISOString()}`);
    }

    const nextClaimTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    console.log(`🎉 User ${username} successfully claimed icon ticket! New count: ${newTicketCount}, Next claim available: ${nextClaimTime.toISOString()}`);
    console.log(`🎉 Claim recorded at: ${new Date().toISOString()}, 24-hour cooldown starts now`);
    
    return NextResponse.json({
      success: true,
      message: 'Icon ticket claimed successfully',
      newTicketCount,
      nextClaimAvailable: nextClaimTime.toISOString()
    });

  } catch (error) {
    console.error('Error in icon pass claim:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
