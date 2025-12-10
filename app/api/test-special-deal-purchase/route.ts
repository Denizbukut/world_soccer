import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { WEEKLY_CONTEST_CONFIG, getContestEndDate } from '@/lib/weekly-contest-config'

function createSupabaseServer() {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration is missing')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
    },
  })
}

export async function POST(request: Request) {
  try {
    const { username } = await request.json()
    
    if (!username) {
      return NextResponse.json({ 
        success: false, 
        error: 'Username is required' 
      })
    }

    const supabase = createSupabaseServer()
    const today = new Date().toISOString().split('T')[0]
    
    // 1. Get today's special deal
    const { data: deal, error: dealError } = await supabase
      .from('special_offer')
      .select('*')
      .eq('date', today)
      .single()

    if (dealError || !deal) {
      return NextResponse.json({ 
        success: false, 
        error: 'No special deal found for today',
        today 
      })
    }

    // 2. Record purchase
    const { error: purchaseError } = await supabase
      .from('special_deal_purchases')
      .insert({
        user_id: username,
        special_deal_id: deal.id,
        purchased_at: new Date().toISOString(),
      })

    if (purchaseError) {
      console.error('Error recording purchase:', purchaseError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to record purchase' 
      })
    }

    // 3. Add card to collection
    const { data: existingCard, error: existingCardError } = await supabase
      .from('user_cards')
      .select('id, quantity')
      .eq('user_id', username)
      .eq('card_id', deal.card_id)
      .eq('level', deal.card_level)
      .single()

    if (existingCardError && existingCardError.code === 'PGRST116') {
      // Card doesn't exist, add it
      const { error: insertError } = await supabase.from('user_cards').insert({
        user_id: username,
        card_id: deal.card_id,
        level: deal.card_level,
        quantity: 1,
        obtained_at: new Date().toISOString(),
      })
      if (insertError) {
        console.error('Error adding card:', insertError)
      }
    } else if (!existingCardError) {
      // Card exists, increment quantity
      const currentQuantity = Number(existingCard.quantity) || 1
      const { error: updateError } = await supabase
        .from('user_cards')
        .update({ quantity: currentQuantity + 1 })
        .eq('id', existingCard.id)
      if (updateError) {
        console.error('Error updating card quantity:', updateError)
      }
    }

    // 4. Add tickets
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('elite_tickets, icon_tickets')
      .eq('username', username)
      .single()

    if (!userError && userData) {
      const currentEliteTickets = Number(userData.elite_tickets) || 0
      const currentIconTickets = Number(userData.icon_tickets) || 0
      
      const newEliteTickets = currentEliteTickets + deal.elite_tickets
      const newIconTickets = currentIconTickets + (deal.icon_tickets || 0)

      const { error: updateError } = await supabase
        .from('users')
        .update({
          elite_tickets: newEliteTickets,
          icon_tickets: newIconTickets,
        })
        .eq('username', username)

      if (updateError) {
        console.error('Error updating tickets:', updateError)
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to update tickets' 
        })
      }

      // 5. Add 150 contest points
      const weekStart = WEEKLY_CONTEST_CONFIG.weekStart
      const contestEnd = getContestEndDate()
      const now = new Date()

      if (now <= contestEnd) {
        // Contest is still active, add points
        const { data: contestEntry, error: contestError } = await supabase
          .from('weekly_contest_entries')
          .select('legendary_count')
          .eq('user_id', username)
          .eq('week_start_date', weekStart)
          .single()

        if (contestError && contestError.code === 'PGRST116') {
          // No entry exists, create one with 150 points
          const { error: insertContestError } = await supabase
            .from('weekly_contest_entries')
            .insert({
              user_id: username,
              week_start_date: weekStart,
              legendary_count: 150,
            })

          if (insertContestError) {
            console.error('Error adding contest points:', insertContestError)
            // Don't fail the purchase, just log the error
          }
        } else if (!contestError) {
          // Entry exists, increment by 150
          const currentCount = contestEntry?.legendary_count || 0
          const { error: updateContestError } = await supabase
            .from('weekly_contest_entries')
            .update({ 
              legendary_count: currentCount + 150, 
              updated_at: new Date().toISOString() 
            })
            .eq('user_id', username)
            .eq('week_start_date', weekStart)

          if (updateContestError) {
            console.error('Error updating contest points:', updateContestError)
            // Don't fail the purchase, just log the error
          }
        }
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Special deal purchase completed successfully',
        deal,
        newEliteTickets,
        newIconTickets,
        cardAdded: true,
        contestPointsAdded: now <= contestEnd ? 150 : 0
      })
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      })
    }

  } catch (error) {
    console.error('Error in test-special-deal-purchase:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    })
  }
}
