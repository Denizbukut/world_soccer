"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@supabase/supabase-js"
import {  incrementMission } from "@/app/actions/missions"


// Card rarity types
type CardRarity = "common" | "rare" | "epic" | "legendary"

// Define types for our data
type UserCard = {
  id: string
  user_id: string
  card_id: string
  quantity: number
  level?: number
  favorite?: boolean
  obtained_at: string
}

type Card = {
  id: string
  name: string
  character: string
  image_url?: string
  rarity: CardRarity
  type?: string
  description?: string
}

// Create a server-side Supabase client
function createSupabaseServer() {
  return createClient(process.env.SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || "", {
    auth: {
      persistSession: false,
    },
  })
}

/**
 * Claims daily login bonus for a user
 */
export async function claimDailyBonus(username: string) {
  try {
    const supabase = createSupabaseServer()

    // Get current user data
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("username, tickets, ticket_last_claimed")
      .eq("username", username)
      .single()

    if (userError) {
      // Create user if not found
      const { error: createError } = await supabase.from("users").insert({
        username: username,
        tickets: 10,
        legendary_tickets: 2,
        ticket_last_claimed: new Date().toISOString(),
      })

      if (createError) {
        console.error("Error creating user:", createError)
        return { success: false, error: "Failed to create user" }
      }

      return { success: true, newTicketCount: 13 } // 10 initial + 3 bonus
    }

    // Check if user has already claimed within the last 12 hours
    if (userData.ticket_last_claimed) {
      const lastClaimed = new Date(userData.ticket_last_claimed as string)
      const now = new Date()
      const hoursSinceLastClaim = (now.getTime() - lastClaimed.getTime()) / (1000 * 60 * 60)

      if (hoursSinceLastClaim < 24) {
        const timeUntilNextClaim = 24 * 60 * 60 * 1000 - (now.getTime() - lastClaimed.getTime())
        return {
          success: false,
          error: "Already claimed within the last 12 hours",
          alreadyClaimed: true,
          timeUntilNextClaim,
          nextClaimTime: new Date(lastClaimed.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        }
      }
    }

    // Award tickets (3 tickets per claim)
    const newTicketCount = (typeof userData.tickets === "number" ? userData.tickets : 0) + 3

    // Update user
    const { error: updateError } = await supabase
      .from("users")
      .update({
        tickets: newTicketCount,
        ticket_last_claimed: new Date().toISOString(),
      })
      .eq("username", userData.username)

    if (updateError) {
      return { success: false, error: "Failed to update tickets" }
    }

    revalidatePath("/")
    return {
      success: true,
      newTicketCount: newTicketCount || 0,
      nextClaimTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }
  } catch (error) {
    console.error("Error claiming daily bonus:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// Helper function to generate a random card based on rarity
function generateRandomCard(rarity: CardRarity): Card {
  // Placeholder implementation - replace with your actual card generation logic
  const cardNames = {
    common: ["Common Card 1", "Common Card 2"],
    rare: ["Rare Card 1", "Rare Card 2"],
    epic: ["Epic Card 1", "Epic Card 2"],
    legendary: ["Legendary Card 1", "Legendary Card 2"],
  }

  const name = cardNames[rarity][Math.floor(Math.random() * cardNames[rarity].length)]
  return {
    id: Math.random().toString(36).substring(2, 15), // Generate a random ID
    name: name,
    character: "Placeholder Character",
    rarity: rarity,
  }
}

// Funktion, um Punkte für eine Kartenrarität zu erhalten
function getScoreForRarity(rarity: CardRarity): number {
  switch (rarity) {
    case "legendary":
      return 100 // Geändert von 500 auf 100
    case "epic":
      return 40 // Geändert von 100 auf 40
    case "rare":
      return 25 // Geändert von 20 auf 25
    case "common":
      return 5 // Unverändert
    default:
      return 0
  }
}

export async function drawCards(username: string, packType: string, count = 1) {
  try {
    const supabase = createSupabaseServer()

    // Zuerst alle Karten mit quantity 0 entfernen
    console.log(`Removing cards with quantity 0 for user ${username}...`);
    const { data: removedCards, error: removeError } = await supabase
      .from("user_cards")
      .delete()
      .eq("user_id", username)
      .eq("quantity", 0)
      .select();

    if (removeError) {
      console.error("Error removing cards with quantity 0:", removeError);
    } else {
      console.log(`Successfully removed ${removedCards?.length || 0} cards with quantity 0`);
    }

    // Get user data from database
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .single()

    if (userError) {
      console.error("Error fetching user data:", userError)
      return { success: false, error: "User not found" }
    }

    // Check if user has enough tickets
    const isLegendary = packType === "legendary"
    const ticketField = isLegendary ? "legendary_tickets" : "tickets"
    const currentTickets = userData[ticketField] || 0
    
    if (currentTickets < count) {
      return {
        success: false,
        error: `Not enough ${isLegendary ? "legendary " : ""}tickets`,
      }
    }

    // Deduct tickets
    const newTicketCount = currentTickets - count

    // Prepare update data - ONLY update the ticket fields
    const updateData: Record<string, any> = {}
    if (isLegendary) {
      updateData.legendary_tickets = newTicketCount
    } else {
      updateData.tickets = newTicketCount
    }

    // Update user tickets in database
    const { error: updateError } = await supabase.from("users").update(updateData).eq("username", username)

    if (updateError) {
      console.error("Error updating tickets:", updateError)
      return { success: false, error: "Failed to update tickets" }
    }

    // Get available cards from database
    const { data: availableCards, error: cardsError } = await supabase
      .from("cards")
      .select("*")
      .eq("obtainable", true)


    if (cardsError || !availableCards || availableCards.length === 0) {
      console.error("Error fetching available cards:", cardsError)
      return { success: false, error: "Failed to fetch cards" }
    }

    // Filter cards by rarity for each pack type
    const commonCards = availableCards.filter((card) => card.rarity === "common")
    const rareCards = availableCards.filter((card) => card.rarity === "rare")
    const epicCards = availableCards.filter((card) => card.rarity === "epic")
    const legendaryCards = availableCards.filter((card) => card.rarity === "legendary")

    // Generate random cards based on rarity chances
    const drawnCards = []
    let totalScoreToAdd = 0 // Gesamtpunktzahl für alle gezogenen Karten

    for (let i = 0; i < count; i++) {
      const random = Math.random() * 100
      let rarity: CardRarity
      let cardPool: any[]


      // Check if user has premium to determine drop rates
      const hasPremium = userData.has_premium || false
      if (!isLegendary) {
        await incrementMission(username, "open_regular_pack")
      }


      if (isLegendary) {
        
// Legendary pack rarity distribution: Common 10%, Rare 40%, Epic 40%, Legendary 10%
        if (random < 10) {
          rarity = "common"
          cardPool = commonCards
        } else if (random < 50) {
          rarity = "rare"
          cardPool = rareCards
        } else if (random < 92) {
          rarity = "epic"
          cardPool = epicCards
        } else {
          rarity = "legendary"
          cardPool = legendaryCards
        }
        
        
      } 
      else if (hasPremium) {
        // Premium user regular pack: Common 35%, Rare 40%, Epic 20%, Legendary 5%
        if (random < 35) {
          rarity = "common"
          cardPool = commonCards
        } else if (random < 75) {
          rarity = "rare"
          cardPool = rareCards
        } else if (random < 95) {
          rarity = "epic"
          cardPool = epicCards
        } else {
          rarity = "legendary"
          cardPool = legendaryCards
        }
      } else {
        
        // Regular pack rarity distribution: Common 50%, Rare 34%, Epic 14%, Legendary 2%
        if (random < 50) {
          rarity = "common"
          cardPool = commonCards
        } else if (random < 84) {
          rarity = "rare"
          cardPool = rareCards
        } else if (random < 98) {
          rarity = "epic"
          cardPool = epicCards
        } else {
          rarity = "legendary"
          cardPool = legendaryCards
        }
      }

      // If no cards of the selected rarity, fall back to common
      if (!cardPool || cardPool.length === 0) {
        rarity = "common"
        cardPool = commonCards.length > 0 ? commonCards : availableCards
      }

      // Select a random card from the pool
      const selectedCard = cardPool[Math.floor(Math.random() * cardPool.length)]
      drawnCards.push(selectedCard)

      if (selectedCard.rarity === "legendary") {
        await incrementMission(username, "draw_legendary_card")
      }


      // Punkte für diese Karte berechnen und zur Gesamtpunktzahl hinzufügen
      const cardPoints = getScoreForRarity(selectedCard.rarity)
      totalScoreToAdd += cardPoints
      console.log(`Card ${selectedCard.name} (${selectedCard.rarity}) worth ${cardPoints} points`)

      // Add card to user's collection
      const today = new Date().toISOString().split("T")[0] // Format as YYYY-MM-DD

      // Check if user already has this card (excluding those with quantity 0 since we deleted them)
      const { data: existingCard, error: existingCardError } = await supabase
        .from("user_cards")
        .select("*")
        .eq("user_id", username)
        .eq("card_id", selectedCard.id)
        .eq("level", 1)  // wichtig!
        .single()

      if (existingCardError && existingCardError.code !== "PGRST116") {
        // PGRST116 means no rows returned
        console.error("Error checking existing card:", existingCardError)
      }

      if (existingCard) {
        // Update quantity if user already has this card
        const newQuantity = (existingCard.quantity || 0) + 1;
        
        console.log(`Updating existing card: ${selectedCard.name}, ID: ${existingCard.id}, Old quantity: ${existingCard.quantity}, New quantity: ${newQuantity}`);
        
        const { error: updateCardError } = await supabase
          .from("user_cards")
          .update({ quantity: newQuantity })
          .eq("id", existingCard.id)
          .eq("level", 1)

        if (updateCardError) {
          console.error("Error updating card quantity:", updateCardError)
        } else {
          console.log(`Successfully updated card quantity for ${selectedCard.name} to ${newQuantity}`);
        }
      } else {
        // Add new card to user's collection
        console.log(`Adding new card to collection: ${selectedCard.name}`);
        
        const { data: insertedCard, error: insertCardError } = await supabase
          .from("user_cards")
          .insert({
            user_id: username,
            card_id: selectedCard.id,
            quantity: 1,
            level: 1,
            favorite: false,
            obtained_at: today,
          })
          .select()

        if (insertCardError) {
          console.error("Error adding card to collection:", insertCardError)
        } else {
          console.log(`Successfully added new card to collection: ${selectedCard.name}, ID: ${insertedCard?.[0]?.id}`);
        }
      }
    }

    // Rest der Funktion bleibt unverändert...
    // DIREKT HIER den Score aktualisieren - das ist der wichtigste Teil
    const { data: currentUserData, error: currentUserError } = await supabase
      .from("users")
      .select("score")
      .eq("username", username)
      .single()

    if (currentUserError) {
      console.error("Error fetching current user score:", currentUserError)
      return { success: false, error: "Failed to fetch current user score" }
    }

    // Berechne den neuen Score
    const currentScore = currentUserData.score || 0
    const newScore = currentScore + totalScoreToAdd

    console.log(`UPDATING SCORE: ${username} - Current: ${currentScore}, Adding: ${totalScoreToAdd}, New: ${newScore}`)

    // Aktualisiere den Score in der Datenbank
    const { error: scoreUpdateError } = await supabase
      .from("users")
      .update({ score: newScore })
      .eq("username", username)

    if (scoreUpdateError) {
      console.error("Error updating score:", scoreUpdateError)
      return { success: false, error: "Failed to update score" }
    }

    // Überprüfe, ob der Score tatsächlich aktualisiert wurde
    const { data: verifyData, error: verifyError } = await supabase
      .from("users")
      .select("score")
      .eq("username", username)
      .single()

    if (verifyError) {
      console.error("Error verifying score update:", verifyError)
    } else {
      console.log(`SCORE VERIFICATION: Expected ${newScore}, Actual ${verifyData.score}`)
      if (verifyData.score !== newScore) {
        console.error(`Score verification failed! Expected: ${newScore}, Actual: ${verifyData.score}`)
      } else {
        console.log("Score successfully updated and verified!")
      }
    }

    // Revalidiere den Leaderboard-Pfad
    revalidatePath("/leaderboard")

    // Get updated ticket counts - but don't return the entire user object
    const { data: updatedUser, error: updatedUserError } = await supabase
      .from("users")
      .select("tickets, legendary_tickets, score")
      .eq("username", username)
      .single()

    if (updatedUserError) {
      console.error("Error fetching updated user data:", updatedUserError)
    }

    return {
      success: true,
      drawnCards,
      newTicketCount: updatedUser?.tickets || (isLegendary ? userData.tickets : newTicketCount),
      newLegendaryTicketCount:
        updatedUser?.legendary_tickets || (isLegendary ? newTicketCount : userData.legendary_tickets),
      scoreAdded: totalScoreToAdd,
      newScore: updatedUser?.score || newScore,
      removedZeroQuantityCards: removedCards?.length || 0,
    }
  } catch (error) {
    console.error("Error drawing cards:", error)
    return { success: false, error: "Failed to draw cards" }
  }
}

/**
 * Gets all cards in a user's collection
 */
export async function getUserCards(username: string) {
  try {
    const supabase = createSupabaseServer()

    // Ändere die Abfrage, um die ID aus der user_cards-Tabelle zurückzugeben
    // Wichtig: Wir holen nur Karten mit quantity > 0, da nur diese in der Sammlung angezeigt werden sollen
    const { data: userCards, error: userCardsError } = await supabase
      .from("user_cards")
      .select(`
        id,
        card_id,
        level,
        quantity,
        favorite,
        obtained_at
      `)
      .eq("user_id", username)
      .gt("quantity", 0)

    if (userCardsError) {
      console.error("Error fetching user cards:", userCardsError)
      return { success: false, error: "Failed to fetch user cards" }
    }

    if (!userCards || userCards.length === 0) {
      return { success: true, cards: [] }
    }

    // Extrahiere die card_ids
    const cardIds = userCards.map((item) => item.card_id)

    // Hole die Kartendetails für diese IDs
    const { data: cardsData, error: cardsError } = await supabase.from("cards").select("*").in("id", cardIds)

    if (cardsError) {
      console.error("Error fetching card details:", cardsError)
      return { success: false, error: "Failed to fetch card details" }
    }

    // Erstelle eine Map der Kartendetails nach ID für einfachen Zugriff
    const cardDetailsMap = new Map()
    cardsData?.forEach((card) => {
      cardDetailsMap.set(card.id, card)
    })

    // Kombiniere die Benutzerkarten mit ihren Details
    const cards = userCards
      .map((userCard) => {
        const cardDetails = cardDetailsMap.get(userCard.card_id)
        if (!cardDetails) return null

        return {
          id: userCard.id, // Die eindeutige ID aus der user_cards-Tabelle
          card_id: userCard.card_id,
          name: cardDetails.name,
          character: cardDetails.character,
          image_url: cardDetails.image_url,
          rarity: cardDetails.rarity,
          type: cardDetails.type,
          description: cardDetails.description,
          level: userCard.level || 1,
          quantity: userCard.quantity || 1,
          favorite: userCard.favorite || false,
          obtained_at: userCard.obtained_at,
        }
      })
      .filter(Boolean) // Entferne alle null-Einträge

    return { success: true, cards }
  } catch (error) {
    console.error("Error in getUserCards:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// Helper function to determine card rarity based on pack type
function determineRarity(packType: string): CardRarity {
  const random = Math.random() * 100 // Random number between 0-100

  if (packType === "legendary") {
    // Legendary pack with updated odds:
    // 10% legendary, 40% epic, 40% rare, 10% common
    if (random < 10) return "legendary"
    if (random < 50) return "epic" // 10 + 40 = 50
    if (random < 90) return "rare" // 50 + 40 = 90
    return "common" // Remaining 10%
  } else {
    // Regular pack with updated odds:
    // 1% legendary, 5% epic, 34% rare, 60% common
    if (random < 1) return "legendary"
    if (random < 6) return "epic" // 1 + 5 = 6
    if (random < 40) return "rare" // 6 + 34 = 40
    return "common" // Remaining 60%
  }
}

/**
 * Utility-Funktion zum Bereinigen von Karten mit Quantity 0
 * Diese Funktion kann verwendet werden, um Karten mit Quantity 0 zu entfernen oder auf 1 zu setzen
 */
export async function cleanupZeroQuantityCards(username: string, action: 'remove' | 'fix' = 'fix') {
  try {
    const supabase = createSupabaseServer()
    
    // Finde alle Karten mit Quantity 0
    const { data: zeroCards, error: fetchError } = await supabase
      .from("user_cards")
      .select("*")
      .eq("user_id", username)
      .eq("quantity", 0)
    
    if (fetchError) {
      console.error("Error fetching zero quantity cards:", fetchError)
      return { success: false, error: "Failed to fetch cards with zero quantity" }
    }
    
    if (!zeroCards || zeroCards.length === 0) {
      return { success: true, message: "No cards with zero quantity found", count: 0 }
    }
    
    let successCount = 0;
    
    if (action === 'remove') {
      // Entferne alle Karten mit Quantity 0
      const { error: deleteError } = await supabase
        .from("user_cards")
        .delete()
        .eq("user_id", username)
        .eq("quantity", 0)
      
      if (deleteError) {
        console.error("Error removing zero quantity cards:", deleteError)
        return { success: false, error: "Failed to remove cards with zero quantity" }
      }
      
      successCount = zeroCards.length;
    } else {
      // Setze Quantity auf 1 für alle Karten mit Quantity 0
      for (const card of zeroCards) {
        const { error: updateError } = await supabase
          .from("user_cards")
          .update({ quantity: 1 })
          .eq("id", card.id)
        
        if (!updateError) {
          successCount++;
        } else {
          console.error(`Error fixing card ${card.id}:`, updateError)
        }
      }
    }
    
    return { 
      success: true, 
      message: `Successfully ${action === 'remove' ? 'removed' : 'fixed'} ${successCount} cards with zero quantity`,
      count: successCount,
      totalFound: zeroCards.length
    }
  } catch (error) {
    console.error(`Error in cleanupZeroQuantityCards:`, error)
    return { success: false, error: "An unexpected error occurred" }
  }
}