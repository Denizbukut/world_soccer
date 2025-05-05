"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@supabase/supabase-js"

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

      if (hoursSinceLastClaim < 12) {
        const timeUntilNextClaim = 12 * 60 * 60 * 1000 - (now.getTime() - lastClaimed.getTime())
        return {
          success: false,
          error: "Already claimed within the last 12 hours",
          alreadyClaimed: true,
          timeUntilNextClaim,
          nextClaimTime: new Date(lastClaimed.getTime() + 12 * 60 * 60 * 1000).toISOString(),
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
      nextClaimTime: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
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

export async function drawCards(username: string, packType: string, count = 1) {
  try {
    const supabase = createSupabaseServer()

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
    const { data: availableCards, error: cardsError } = await supabase.from("cards").select("*")

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

    for (let i = 0; i < count; i++) {
      const random = Math.random() * 100
      let rarity: CardRarity
      let cardPool: any[]

      if (isLegendary) {
        // Legendary pack rarity distribution: Common 10%, Rare 40%, Epic 40%, Legendary 10%
        if (random < 10) {
          rarity = "common"
          cardPool = commonCards
        } else if (random < 50) {
          rarity = "rare"
          cardPool = rareCards
        } else if (random < 90) {
          rarity = "epic"
          cardPool = epicCards
        } else {
          rarity = "legendary"
          cardPool = legendaryCards
        }
      } else {
        // Regular pack rarity distribution: Common 60%, Rare 34%, Epic 5%, Legendary 1%
        if (random < 60) {
          rarity = "common"
          cardPool = commonCards
        } else if (random < 94) {
          rarity = "rare"
          cardPool = rareCards
        } else if (random < 99) {
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

      // Add card to user's collection
      const today = new Date().toISOString().split("T")[0] // Format as YYYY-MM-DD

      // Check if user already has this card
      const { data: existingCard, error: existingCardError } = await supabase
        .from("user_cards")
        .select("*")
        .eq("user_id", username)
        .eq("card_id", selectedCard.id)
        .single()

      if (existingCardError && existingCardError.code !== "PGRST116") {
        // PGRST116 means no rows returned
        console.error("Error checking existing card:", existingCardError)
      }

      if (existingCard) {
        // Update quantity if user already has this card
        const { error: updateCardError } = await supabase
          .from("user_cards")
          .update({ quantity: (existingCard.quantity || 0) + 1 })
          .eq("id", existingCard.id)

        if (updateCardError) {
          console.error("Error updating card quantity:", updateCardError)
        }
      } else {
        // Add new card to user's collection
        const { error: insertCardError } = await supabase.from("user_cards").insert({
          user_id: username,
          card_id: selectedCard.id,
          quantity: 1,
          level: 1,
          favorite: false,
          obtained_at: today,
        })

        if (insertCardError) {
          console.error("Error adding card to collection:", insertCardError)
        }
      }
    }

    // Get updated ticket counts - but don't return the entire user object
    const { data: updatedUser, error: updatedUserError } = await supabase
      .from("users")
      .select("tickets, legendary_tickets")
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

    // Get the user's cards with their quantities
    const { data: userCardsData, error: userCardsError } = await supabase
      .from("user_cards")
      .select("id, card_id, quantity")
      .eq("user_id", username) // Using username as user_id
      .gt("quantity", 0)

    if (userCardsError) {
      console.error("Error fetching user cards:", userCardsError)
      return { success: false, error: "Failed to fetch user cards" }
    }

    if (!userCardsData || userCardsData.length === 0) {
      return { success: true, cards: [] }
    }

    // Extract card IDs
    const cardIds = userCardsData.map((item: { card_id: string }) => item.card_id)

    // Then, get the card details for those IDs
    const { data: cardsData, error: cardsError } = await supabase.from("cards").select("*").in("id", cardIds)

    if (cardsError) {
      console.error("Error fetching card details:", cardsError)
      return { success: false, error: "Failed to fetch card details" }
    }

    // Create a map of card details by ID for easy lookup
    const cardDetailsMap = new Map()
    cardsData?.forEach((card: Card) => {
      cardDetailsMap.set(card.id, card)
    })

    // Combine the user cards with their details
    const cards = userCardsData
      .map((userCard: { card_id: string; quantity: number }) => {
        const cardDetails = cardDetailsMap.get(userCard.card_id)
        if (!cardDetails) return null

        return {
          id: cardDetails.id,
          name: cardDetails.name,
          character: cardDetails.character,
          image_url: cardDetails.image_url,
          rarity: cardDetails.rarity,
          type: cardDetails.type,
          description: cardDetails.description,
          quantity: userCard.quantity,
        }
      })
      .filter(Boolean) // Remove any null entries

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
