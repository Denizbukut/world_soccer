import { NextRequest, NextResponse } from 'next/server'
import { submitSBCSquad } from '@/app/actions/sbc'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, challengeId, cardIds } = body
    
    console.log('🧪 TEST SBC SUBMISSION:', { userId, challengeId, cardIds })
    
    const result = await submitSBCSquad(userId, challengeId, cardIds)
    
    console.log('🧪 TEST RESULT:', result)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('🧪 TEST ERROR:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
  }
}
