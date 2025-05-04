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

// Add more detailed logging to help diagnose the issue
export async function drawCards(username: string, packType = "common", cardCount = 1) {
  try {
    const supabase = createSupabaseServer()

    console.log(`Drawing ${cardCount} cards from ${packType} pack for user ${username}`)

    // 1. Get user data to check tickets
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("username, tickets, legendary_tickets, experience, level, next_level_exp")
      .eq("username", username)
      .single()

    if (userError || !userData) {
      console.error("Error fetching user:", userError)
      return {
        success: false,
        error: "User not found",
      }
    }

    // 2. Check if user has enough tickets
    const ticketField = packType === "legendary" ? "legendary_tickets" : "tickets"
    const ticketCount = typeof userData[ticketField] === "number" ? (userData[ticketField] as number) : 0

    if (ticketCount < 1) {
      return {
        success: false,
        error: `Not enough ${packType} tickets`,
      }
    }

    // 3. Draw multiple cards
    const drawnCards: Card[] = []

    for (let i = 0; i < cardCount; i++) {
      // Determine card rarity based on probabilities
      const rarity = determineRarity(packType)
      console.log(`Card ${i + 1} determined rarity: ${rarity} for pack type: ${packType}`)

      // Get a random card of the determined rarity
      const { data: availableCards, error: cardsError } = await supabase.from("cards").select("*").eq("rarity", rarity)

      console.log(`Found ${availableCards?.length || 0} cards with rarity ${rarity}`)

      if (cardsError || !availableCards || availableCards.length === 0) {
        console.error(`Error fetching cards with rarity ${rarity}:`, cardsError)
        console.log("Trying to fetch any card as fallback...")

        // Try to get any card as fallback
        const { data: fallbackCards, error: fallbackError } = await supabase.from("cards").select("*").limit(10)

        console.log(`Found ${fallbackCards?.length || 0} fallback cards`)

        if (fallbackError || !fallbackCards || fallbackCards.length === 0) {
          console.error("Error fetching any cards:", fallbackError)
          return { success: false, error: "No cards available" }
        }

        // Select a random fallback card
        const randomCard = fallbackCards[Math.floor(Math.random() * fallbackCards.length)] as Card
        drawnCards.push(randomCard)
      } else {
        // Select a random card from the available cards
        const randomCard = availableCards[Math.floor(Math.random() * availableCards.length)] as Card
        drawnCards.push(randomCard)
      }
    }

    console.log("Cards drawn successfully:", drawnCards)

    // 4. Calculate XP gain based on pack type
    const xpGain = packType === "legendary" ? 50 : 25
    const currentExp = typeof userData.experience === "number" ? userData.experience : 0
    const currentLevel = typeof userData.level === "number" ? userData.level : 1
    const nextLevelExp = typeof userData.next_level_exp === "number" ? userData.next_level_exp : 100

    let newExp = currentExp + xpGain
    let newLevel = currentLevel
    let leveledUp = false

    // Check if user leveled up
    if (newExp >= nextLevelExp) {
      newExp -= nextLevelExp
      newLevel += 1
      leveledUp = true
    }

    // Calculate next level exp requirement (increases with each level)
    const newNextLevelExp = Math.floor(100 * Math.pow(1.5, newLevel - 1))

    // 5. Begin transaction: decrease tickets, add XP, and add cards to collection
    const { error: ticketError } = await supabase
      .from("users")
      .update({
        [ticketField]: ticketCount - 1,
        experience: newExp,
        level: newLevel,
        next_level_exp: newNextLevelExp,
      })
      .eq("username", userData.username)

    if (ticketError) {
      console.error("Error updating tickets and XP:", ticketError)
      return {
        success: false,
        error: "Failed to update user data",
      }
    }

    // 6. Add cards to user's collection
    for (const card of drawnCards) {
      // Check if user already has this card
      const { data: existingCards, error: existingCardError } = await supabase
        .from("user_cards")
        .select("*")
        .eq("user_id", username) // Using username as user_id
        .eq("card_id", card.id)

      if (existingCardError) {
        console.error("Error checking existing card:", existingCardError)
        // Continue anyway, we'll just add a new card
      }

      if (existingCards && existingCards.length > 0) {
        // Increment quantity
        const existingCard = existingCards[0] as UserCard
        await supabase
          .from("user_cards")
          .update({ quantity: existingCard.quantity + 1 })
          .eq("id", existingCard.id)
      } else {
        // Add new card to user's collection
        const { error: collectionError } = await supabase.from("user_cards").insert({
          user_id: username, // Using username as user_id
          card_id: card.id,
          quantity: 1,
          obtained_at: new Date().toISOString(),
        })

        if (collectionError) {
          console.error("Error adding card to collection:", collectionError)
          // Continue with other cards even if one fails
        }
      }
    }

    // 7. Get updated ticket count
    const { data: updatedUser } = await supabase
      .from("users")
      .select("tickets, legendary_tickets")
      .eq("username", username)
      .single()

    // Revalidate the collection page to show the new cards
    revalidatePath("/collection")
    revalidatePath("/draw")
    revalidatePath("/pass")

    const newTicketCount = typeof updatedUser?.tickets === "number" ? updatedUser.tickets : ticketCount - 1
    const newLegendaryTicketCount =
      typeof updatedUser?.legendary_tickets === "number"
        ? updatedUser.legendary_tickets
        : packType === "legendary"
          ? ticketCount - 1
          : (userData.legendary_tickets as number)

    return {
      success: true,
      drawnCards: drawnCards,
      newTicketCount,
      newLegendaryTicketCount,
      xpGained: xpGain,
      leveledUp,
      newLevel: leveledUp ? newLevel : null,
      newExp,
      newNextLevelExp,
    }
  } catch (error) {
    console.error("Unexpected error in drawCards:", error)
    return {
      success: false,
      error: "An unexpected error occurred",
    }
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
    // Legendary pack has better odds
    if (random < 5) return "legendary"
    if (random < 30) return "epic"
    if (random < 70) return "rare"
    return "common"
  } else {
    // Regular pack with specified chances:
    // 0.5% legendary, 5% epic, 35.5% rare, 59% common
    if (random < 0.5) return "legendary"
    if (random < 5.5) return "epic" // 0.5 + 5 = 5.5
    if (random < 41) return "rare" // 5.5 + 35.5 = 41
    return "common" // Remaining 59%
  }
}
