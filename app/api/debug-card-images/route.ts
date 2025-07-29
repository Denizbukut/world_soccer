import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch sample cards to check image URLs
    const { data: cards, error: cardsError } = await supabase
      .from('cards')
      .select('id, name, image_url, rarity')
      .limit(10)

    if (cardsError) {
      console.error('Error fetching cards:', cardsError)
      return NextResponse.json({ error: 'Failed to fetch cards' }, { status: 500 })
    }

    // Check if image_url field exists and has values
    const cardsWithImages = cards?.filter(card => card.image_url) || []
    const cardsWithoutImages = cards?.filter(card => !card.image_url) || []

    return NextResponse.json({
      success: true,
      totalCards: cards?.length || 0,
      cardsWithImages: cardsWithImages.length,
      cardsWithoutImages: cardsWithoutImages.length,
      sampleCardsWithImages: cardsWithImages.slice(0, 5).map(card => ({
        id: card.id,
        name: card.name,
        image_url: card.image_url,
        rarity: card.rarity
      })),
      sampleCardsWithoutImages: cardsWithoutImages.slice(0, 5).map(card => ({
        id: card.id,
        name: card.name,
        image_url: card.image_url,
        rarity: card.rarity
      }))
    })

  } catch (error) {
    console.error('Debug card images error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 