"use server"

// SBC Actions - Active functionality
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export interface SBCChallenge {
  id: number
  name: string
  description: string | null
  requirements_total_cards: number
  requirements_min_level: number
  requirements_specific_rarities?: string[]
  requirements_team_rating?: number
  requirements_rarity_level_counts?: Record<string, { count: number; min_level: number }>
  reward_type?: string
  reward_amount?: number
  // Legacy reward fields
  rewards_tickets?: number
  rewards_elite_tickets?: number
  rewards_icon_tickets?: number
  special_reward?: string
  is_active: boolean
  is_repeatable: boolean
  start_date?: string | null
  end_date?: string | null
  created_at: string
  updated_at: string
}

export interface SBCUserProgress {
  id: number
  user_id: string
  challenge_id: number
  progress_percentage: number
  is_completed: boolean
  is_unlocked: boolean
  reward_claimed: boolean
  claimed_at: string | null
  created_at: string
  updated_at: string
}

export interface SBCUserSquad {
  id: number
  user_id: string
  challenge_id: number
  squad_name: string | null
  card_ids: string[]
  total_level: number
  team_rating: number
  total_rarity_count: Record<string, number>
  is_valid: boolean
  submitted_at: string
}

export async function getSBCChallenges(): Promise<SBCChallenge[]> {
  try {
    const cookieStore = await cookies()
    const supabase = createSupabaseServerClient(cookieStore)
    
    const now = new Date().toISOString()
    
    const { data, error } = await supabase
      .from('sbc_challenges')
      .select('*')
      .eq('is_active', true)
      .or(`start_date.is.null,start_date.lte.${now}`)
      .or(`end_date.is.null,end_date.gt.${now}`)
      .order('id')

    if (error) {
      console.error('Error fetching SBC challenges:', error)
      // Return empty array instead of throwing error
      return []
    }

    return data || []
  } catch (error) {
    console.error('Unexpected error in getSBCChallenges:', error)
    return []
  }
}

export async function getUserSBCProgress(userId: string): Promise<SBCUserProgress[]> {
  try {
    const cookieStore = await cookies()
    const supabase = createSupabaseServerClient(cookieStore)
    
    // First get the user's UUID from the users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('username', userId)
      .single()

    if (userError || !userData) {
      console.error('Error fetching user UUID:', userError)
      return []
    }

    // Then get the progress using the UUID
    const { data, error } = await supabase
      .from('sbc_user_progress')
      .select('*')
      .eq('user_id', userData.id)

    if (error) {
      console.error('Error fetching user SBC progress:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Unexpected error in getUserSBCProgress:', error)
    return []
  }
}

export async function getUserSBCSquads(userId: string): Promise<SBCUserSquad[]> {
  try {
    const cookieStore = await cookies()
    const supabase = createSupabaseServerClient(cookieStore)

    const { data, error } = await supabase
      .from('sbc_user_squads')
      .select('*')
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false })

    if (error) {
      console.error('Error fetching user SBC squads:', error)
      // Return empty array instead of throwing error
      return []
    }

    return data || []
  } catch (error) {
    console.error('Unexpected error in getUserSBCSquads:', error)
    return []
  }
}

export async function submitSBCSquad(
  userId: string,
  challengeId: number,
  cardIds: string[],
  squadName?: string
): Promise<{ success: boolean; error?: string; validation?: any }> {
  try {
    const cookieStore = await cookies()
    const supabase = createSupabaseServerClient(cookieStore)

    console.log('=== ECHTE SBC FUNKTION ===')
    console.log('Parameters:', { userId, challengeId, cardIds })

    // SCHRITT 0: Prüfe ob Challenge bereits abgeschlossen ist
    console.log('SCHRITT 0: Prüfe Challenge-Status...')
    
    // Hole die User UUID für sbc_user_progress
    const { data: userUUIDData, error: userUUIDError } = await supabase
      .from('users')
      .select('id')
      .eq('username', userId)
      .single()

    if (userUUIDError || !userUUIDData) {
      console.error('FEHLER beim Laden der User UUID:', userUUIDError)
      return { success: false, error: 'Failed to get user UUID' }
    }

    // Prüfe ob Challenge bereits abgeschlossen ist
    const { data: existingProgress, error: progressCheckError } = await supabase
      .from('sbc_user_progress')
      .select('*')
      .eq('user_id', userUUIDData.id)
      .eq('challenge_id', challengeId)
      .single()

    // Hole Challenge-Details um is_repeatable zu prüfen
    const { data: challengeDetails, error: challengeDetailsError } = await supabase
      .from('sbc_challenges')
      .select('*')
      .eq('id', challengeId)
      .single()

    if (challengeDetailsError) {
      console.error('FEHLER beim Laden der Challenge-Details:', challengeDetailsError)
      return { success: false, error: 'Failed to load challenge details' }
    }

    // Prüfe ob Challenge bereits abgeschlossen ist UND nicht wiederholbar
    if (existingProgress && existingProgress.is_completed && !challengeDetails.is_repeatable) {
      console.log('❌ Challenge already completed and not repeatable!')
      return { success: false, error: 'Challenge already completed and not repeatable' }
    }

    // SCHRITT 1: VALIDATION - Prüfe Challenge-Anforderungen
    console.log('SCHRITT 1: Validiere Challenge-Anforderungen...')
    
    // Hole alle ausgewählten Karten - einfache Abfrage
    const { data: selectedCards, error: selectError } = await supabase
      .from('user_cards')
      .select('id, card_id, quantity')
      .eq('user_id', userId)
      .in('id', cardIds)

    if (selectError) {
      console.error('FEHLER beim Laden der Karten:', selectError)
      return { success: false, error: 'Failed to load cards' }
    }

    console.log('Gefundene User Cards:', selectedCards?.length || 0)
    console.log('Erwartete Anzahl:', cardIds.length)

    // Hole Karten-Details mit einfacher Abfrage
    const cardIdsToFetch = selectedCards?.map(card => card.card_id) || []
    console.log('Card IDs to fetch:', cardIdsToFetch)

    const { data: cardDetails, error: detailsError } = await supabase
      .from('cards')
      .select('*')
      .in('id', cardIdsToFetch)

    if (detailsError) {
      console.error('FEHLER beim Laden der Karten-Details:', detailsError)
      return { success: false, error: 'Failed to load card details' }
    }

    console.log('Gefundene Card Details:', cardDetails?.length || 0)

    // Kombiniere die Daten manuell
    const cardsWithDetails = selectedCards?.map(userCard => {
      const cardDetail = cardDetails?.find(card => card.id === userCard.card_id)
      return {
        ...userCard,
        cards: cardDetail || {
          id: userCard.card_id,
          name: 'Unknown Card',
          character: 'Unknown',
          image_url: '',
          rarity: 'common',
          type: 'player',
          overall_rating: 0,
          level: 1
        }
      }
    }) || []

    // Prüfe Anzahl der Karten
    if (cardsWithDetails.length !== challengeDetails.requirements_total_cards) {
      console.error(`❌ Wrong number of cards: ${cardsWithDetails.length}/${challengeDetails.requirements_total_cards}`)
      return { success: false, error: `Wrong number of cards: ${cardsWithDetails.length}/${challengeDetails.requirements_total_cards}` }
    }

    // Prüfe Team Rating falls erforderlich
    if (challengeDetails.requirements_team_rating) {
      const totalRating = cardsWithDetails.reduce((sum, card) => {
        const rating = (card.cards as any)?.overall_rating || 0
        return sum + rating
      }, 0)
      const averageRating = totalRating / cardsWithDetails.length
      
      if (averageRating < challengeDetails.requirements_team_rating) {
        console.error(`❌ Team Rating too low: ${averageRating.toFixed(1)}/${challengeDetails.requirements_team_rating}`)
        return { success: false, error: `Team rating too low: ${averageRating.toFixed(1)}/${challengeDetails.requirements_team_rating}` }
      }
    }

    // Prüfe spezifische Rarities falls erforderlich
    if (challengeDetails.requirements_specific_rarities) {
      const cardRarities = cardsWithDetails.map(card => (card.cards as any)?.rarity).filter(Boolean)
      const requiredRarities = challengeDetails.requirements_specific_rarities
      
      for (const requiredRarity of requiredRarities) {
        if (!cardRarities.includes(requiredRarity)) {
          console.error(`❌ Missing required rarity: ${requiredRarity}`)
          return { success: false, error: `Missing required rarity: ${requiredRarity}` }
        }
      }
    }

    console.log('✅ Challenge requirements fulfilled!')

    // SCHRITT 2: Karten aus user_cards löschen oder Quantity reduzieren
    console.log('SCHRITT 2: Prüfe und aktualisiere Karten...')
    
    // Verarbeite jede Karte einzeln
    for (const card of cardsWithDetails) {
      if (card.quantity > 1) {
        // Wenn Quantity > 1, reduziere um 1
        console.log(`Reduziere Quantity für Karte ${card.id} von ${card.quantity} auf ${card.quantity - 1}`)
        const { error: updateError } = await supabase
          .from('user_cards')
          .update({ quantity: card.quantity - 1 })
          .eq('id', card.id)

        if (updateError) {
          console.error(`FEHLER beim Reduzieren der Quantity für Karte ${card.id}:`, updateError)
          return { success: false, error: 'Failed to update card quantity' }
        }
      } else {
        // Wenn Quantity = 1, lösche die Karte
        console.log(`Lösche Karte ${card.id} (letzte Kopie)`)
        const { error: deleteError } = await supabase
          .from('user_cards')
          .delete()
          .eq('id', card.id)

        if (deleteError) {
          console.error(`FEHLER beim Löschen der Karte ${card.id}:`, deleteError)
          return { success: false, error: 'Failed to delete card' }
        }
      }
    }

    console.log('✅ Cards successfully updated!')

    // SCHRITT 3: Aktuelle User-Daten holen
    console.log('SCHRITT 3: Hole aktuelle User-Daten...')
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('tickets, tokens, elite_tickets, icon_tickets')
      .eq('username', userId)
      .single()

    if (userError) {
      console.error('FEHLER beim Laden der User-Daten:', userError)
      return { success: false, error: 'Failed to load user data' }
    }

    console.log('Aktuelle User-Daten:', userData)

    // SCHRITT 4: Rewards zum bestehenden Kontostand addieren
    console.log('SCHRITT 4: Addiere Rewards...')
    const updates = {
      // Normale Tickets
      tickets: (userData.tickets || 0) + (challengeDetails.rewards_tickets || 0),
      
      // Elite Tickets
      elite_tickets: (userData.elite_tickets || 0) + (challengeDetails.rewards_elite_tickets || 0),
      
      // Icon Tickets
      icon_tickets: (userData.icon_tickets || 0) + (challengeDetails.rewards_icon_tickets || 0),
      
      // Tokens
      tokens: (userData.tokens || 0) + (challengeDetails.reward_amount || 0)
    }

    console.log('Aktuelle Werte:', userData)
    console.log('Challenge Rewards:', challengeDetails)
    console.log('Neue Werte nach Addition:', updates)

    const { error: rewardError } = await supabase
      .from('users')
      .update(updates)
      .eq('username', userId)

    if (rewardError) {
      console.error('FEHLER beim Geben der Rewards:', rewardError)
      // Nicht fehlschlagen, wenn Rewards nicht funktionieren
    } else {
      console.log('✅ Rewards successfully given!')
    }

    // SCHRITT 5: Challenge als abgeschlossen markieren
    console.log('SCHRITT 5: Markiere Challenge als abgeschlossen...')
    
    // Versuche zuerst einen bestehenden Eintrag zu finden
    const { data: existingProgressEntry, error: findError } = await supabase
      .from('sbc_user_progress')
      .select('*')
      .eq('user_id', userUUIDData.id)
      .eq('challenge_id', challengeId)
      .single()

    if (findError && findError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('FEHLER beim Suchen des bestehenden Progress:', findError)
      // Versuche trotzdem einen neuen Eintrag zu erstellen
    }

    // Erstelle oder aktualisiere den Progress-Eintrag
    const progressData = {
      user_id: userUUIDData.id,
      challenge_id: challengeId,
      progress_percentage: 100,
      is_completed: true,
      is_unlocked: true,
      reward_claimed: true,
      claimed_at: new Date().toISOString()
    }

    let progressError = null

    if (existingProgressEntry) {
      // Update existing entry
      const { error: updateError } = await supabase
        .from('sbc_user_progress')
        .update(progressData)
        .eq('user_id', userUUIDData.id)
        .eq('challenge_id', challengeId)
      progressError = updateError
    } else {
      // Insert new entry
      const { error: insertError } = await supabase
        .from('sbc_user_progress')
        .insert(progressData)
      progressError = insertError
    }

    if (progressError) {
      console.error('FEHLER beim Markieren als abgeschlossen:', progressError)
      console.log('Versuche alternative Methode...')
      
      // Alternative: Versuche mit INSERT ... ON CONFLICT
      const { error: upsertError } = await supabase
        .from('sbc_user_progress')
        .upsert(progressData, {
          onConflict: 'user_id,challenge_id'
        })
      
      if (upsertError) {
        console.error('Auch Upsert fehlgeschlagen:', upsertError)
        // Trotzdem als Erfolg betrachten, da Karten und Rewards funktioniert haben
        console.log('⚠️ Progress konnte nicht gespeichert werden, aber Squad wurde erfolgreich eingereicht!')
      } else {
        console.log('✅ Progress mit Upsert erfolgreich gespeichert!')
      }
    } else {
      console.log('✅ Challenge marked as completed!')
    }

    console.log('🎉 SQUAD SUCCESSFULLY EXCHANGED!')
    
         return { 
       success: true, 
       validation: { 
         message: 'Squad successfully submitted and rewards given!',
         cardsUsed: cardsWithDetails.length,
         rewardsGiven: {
           tickets: challengeDetails.rewards_tickets || 0,
           elite_tickets: challengeDetails.rewards_elite_tickets || 0,
           icon_tickets: challengeDetails.rewards_icon_tickets || 0,
           tokens: challengeDetails.reward_amount || 0
         }
       }
     }

  } catch (error) {
    console.error('Error submitting SBC squad:', error)
    return { success: false, error: 'Failed to submit squad' }
  }
}

export async function getSquadAnalysis(
  userId: string,
  cardIds: string[]
): Promise<{ success: boolean; analysis?: any; error?: string }> {
  try {
    const cookieStore = await cookies()
    const supabase = createSupabaseServerClient(cookieStore)

    const { data: analysis, error } = await supabase
      .rpc('analyze_squad_composition', {
        p_user_id: userId,
        p_card_ids: cardIds
      })

    if (error) {
      console.error('Error analyzing squad:', error)
      return { success: false, error: 'Failed to analyze squad' }
    }

    return { success: true, analysis }
  } catch (error) {
    console.error('Error getting squad analysis:', error)
    return { success: false, error: 'Failed to get squad analysis' }
  }
}
