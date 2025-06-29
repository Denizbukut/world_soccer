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

interface XpPass {
  id: string
  user_id: string
  active: boolean
  purchased_at: string
  expires_at: string
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

    // Get current user data including clan info
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("username, tickets, ticket_last_claimed, clan_id")
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

    // Check if user has already claimed within the last 24 hours
    if (userData.ticket_last_claimed) {
      const lastClaimed = new Date(userData.ticket_last_claimed as string)
      const now = new Date()
      const hoursSinceLastClaim = (now.getTime() - lastClaimed.getTime()) / (1000 * 60 * 60)

      if (hoursSinceLastClaim < 24) {
        const timeUntilNextClaim = 24 * 60 * 60 * 1000 - (now.getTime() - lastClaimed.getTime())
        return {
          success: false,
          error: "Already claimed within the last 24 hours",
          alreadyClaimed: true,
          timeUntilNextClaim,
          nextClaimTime: new Date(lastClaimed.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        }
      }
    }

    // Base tickets (3 tickets per claim)
    let ticketsToAward = 3

    // Check if user is in a clan and if clan is level 2+
    if (userData.clan_id) {
      const { data: clanData, error: clanError } = await supabase
        .from("clans")
        .select("level")
        .eq("id", userData.clan_id)
        .single()

      if (!clanError && clanData && clanData.level >= 2) {
        // Level 2+ clan bonus: +1 ticket per day
        ticketsToAward += 1
      }
    }

    const newTicketCount = (typeof userData.tickets === "number" ? userData.tickets : 0) + ticketsToAward

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
      clanBonus: ticketsToAward > 3,
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

    // Remove cards with quantity 0
    console.log(`Removing cards with quantity 0 for user ${username}...`)
    const { data: removedCards, error: removeError } = await supabase
      .from("user_cards")
      .delete()
      .eq("user_id", username)
      .eq("quantity", 0)
      .select()

    if (removeError) {
      console.error("Error removing cards with quantity 0:", removeError)
    } else {
      console.log(`Successfully removed ${removedCards?.length || 0} cards with quantity 0`)
    }

    // Get user data from database including clan info
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("*, clan_id")
      .eq("username", username)
      .single()

    if (userError) {
      console.error("Error fetching user data:", userError)
      return { success: false, error: "User not found" }
    }

    // Get user's clan role if they're in a clan
    let userClanRole = null
    let clanLevel = 0
    if (userData.clan_id) {
      const { data: memberData, error: memberError } = await supabase
        .from("clan_members")
        .select("role")
        .eq("clan_id", userData.clan_id)
        .eq("user_id", username)
        .single()

      if (!memberError && memberData) {
        userClanRole = memberData.role
      }

      // Get clan level
      const { data: clanData, error: clanError } = await supabase
        .from("clans")
        .select("level")
        .eq("id", userData.clan_id)
        .single()

      if (!clanError && clanData) {
        clanLevel = clanData.level
      }
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

    // Prepare update data
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
      .eq("epoch", 2)

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
    let totalScoreToAdd = 0

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
        // Legendary pack rarity distribution
        let legendaryChance = 10

        // Lucky Star bonus: +2% legendary chance
        if (userClanRole === "lucky_star" || userClanRole === "leader") {
          legendaryChance += 2
        }

        if (random < 10) {
          rarity = "common"
          cardPool = commonCards
        } else if (random < 50) {
          rarity = "rare"
          cardPool = rareCards
        } else if (random < 92 + (legendaryChance - 10)) {
          rarity = "epic"
          cardPool = epicCards
        } else {
          rarity = "legendary"
          cardPool = legendaryCards
        }
      } else if (hasPremium) {
        // Premium user regular pack with Lucky Star bonus
        let legendaryChance = 5
        if (userClanRole === "lucky_star" || userClanRole === "leader") {
          legendaryChance += 2
        }

        if (random < 35) {
          rarity = "common"
          cardPool = commonCards
        } else if (random < 75) {
          rarity = "rare"
          cardPool = rareCards
        } else if (random < 95 + (legendaryChance - 5)) {
          rarity = "epic"
          cardPool = epicCards
        } else {
          rarity = "legendary"
          cardPool = legendaryCards
        }
      } else {
        // Regular pack with Lucky Star bonus
        let legendaryChance = 2
        if (userClanRole === "lucky_star" || userClanRole === "leader") {
          legendaryChance += 2
        }

        if (random < 50) {
          rarity = "common"
          cardPool = commonCards
        } else if (random < 84) {
          rarity = "rare"
          cardPool = rareCards
        } else if (random < 98 + (legendaryChance - 2)) {
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

      // Calculate score for this card
      const cardPoints = getScoreForRarity(selectedCard.rarity)
      totalScoreToAdd += cardPoints

      // Add card to user's collection
      const today = new Date().toISOString().split("T")[0]

      // Check if user already has this card
      const { data: existingCard, error: existingCardError } = await supabase
        .from("user_cards")
        .select("*")
        .eq("user_id", username)
        .eq("card_id", selectedCard.id)
        .eq("level", 1)
        .single()

      if (existingCardError && existingCardError.code !== "PGRST116") {
        console.error("Error checking existing card:", existingCardError)
      }

      if (existingCard) {
        // Update quantity if user already has this card
        const newQuantity = (existingCard.quantity || 0) + 1

        console.log(
          `Updating existing card: ${selectedCard.name}, ID: ${existingCard.id}, Old quantity: ${existingCard.quantity}, New quantity: ${newQuantity}`,
        )

        const { error: updateCardError } = await supabase
          .from("user_cards")
          .update({ quantity: newQuantity })
          .eq("id", existingCard.id)
          .eq("level", 1)

        if (updateCardError) {
          console.error("Error updating card quantity:", updateCardError)
        } else {
          console.log(`Successfully updated card quantity for ${selectedCard.name} to ${newQuantity}`)
        }
      } else {
        // Add new card to user's collection
        console.log(`Adding new card to collection: ${selectedCard.name}`)

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
          console.log(`Successfully added new card to collection: ${selectedCard.name}, ID: ${insertedCard?.[0]?.id}`)
        }
      }
    }

    // Calculate XP with clan bonuses
    let xpAmount = isLegendary ? 100 * count : 50 * count

    // Special case for jiraiya user
    if (username === "jiraiya") {
      xpAmount = 10 * count
    }

    // XP Hunter bonus: +5% XP from packs
    if (userClanRole === "xp_hunter") {
      xpAmount = Math.floor(xpAmount * 1.05)
    }

    // Founder bonus: +5% XP from all pack openings
    if (userClanRole === "leader" || (userData.clan_id && userData.username === userData.founder_id)) {
      xpAmount = Math.floor(xpAmount * 1.05)
    }

    // XP Pass bonus
    const { data: xpPassData } = await supabase
      .from("xp_passes")
      .select("active")
      .eq("user_id", username)
      .eq("active", true)
      .single()

    if (xpPassData?.active) {
      xpAmount = Math.floor(xpAmount * 1.2)
    }

    totalScoreToAdd = Math.round(totalScoreToAdd)

    // Update score in database
    const { data: currentUserData, error: currentUserError } = await supabase
      .from("users")
      .select("score")
      .eq("username", username)
      .single()

    if (currentUserError) {
      console.error("Error fetching current user score:", currentUserError)
      return { success: false, error: "Failed to fetch current user score" }
    }

    const currentScore = currentUserData.score || 0
    const newScore = Math.floor(currentScore + totalScoreToAdd)

    console.log(`UPDATING SCORE: ${username} - Current: ${currentScore}, Adding: ${totalScoreToAdd}, New: ${newScore}`)

    const { error: scoreUpdateError } = await supabase
      .from("users")
      .update({ score: newScore })
      .eq("username", username)

    if (scoreUpdateError) {
      console.error("Error updating score:", scoreUpdateError)
      return { success: false, error: "Failed to update score" }
    }

    // Update clan experience if user belongs to a clan
    const clanLevels = [
  { level: 1, required_xp: 0, reward: "Clan created" },
  { level: 2, required_xp: 5000, reward: "+1 regular ticket per day for everyone" },
  { level: 3, required_xp: 20000, reward: "Role limits increased to 5" },
  { level: 4, required_xp: 50000, reward: "Cheap Hustler role unlocked" },
]

    if (userData.clan_id) {
      const { data: clanData, error: clanError } = await supabase
  .from("clans")
  .select("xp, level")
  .eq("id", userData.clan_id)
  .single()

if (!clanError && clanData) {
  const xpGain = (isLegendary ? 2 : 1) * count
  let currentXp = clanData.xp || 0
  let currentLevel = clanData.level || 1

  let newXpTotal = currentXp + xpGain
  let newLevel = currentLevel

  for (let i = clanLevels.length - 1; i >= 0; i--) {
    if (newXpTotal >= clanLevels[i].required_xp) {
      newLevel = clanLevels[i].level
      break
    }
  }

  await supabase
    .from("clans")
    .update({ xp: newXpTotal, level: newLevel })
    .eq("id", userData.clan_id)
}

    }

    revalidatePath("/leaderboard")

    // Get updated ticket counts
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
      xpGained: xpAmount,
      clanBonuses: {
        xpHunter: userClanRole === "xp_hunter",
        luckystar: userClanRole === "lucky_star",
        founder: userClanRole === "leader",
      },
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

export async function drawGodPacks(username: string, count = 1) {
  try {
    const supabase = createSupabaseServer()

    // Remove cards with quantity 0
    await supabase.from("user_cards").delete().eq("user_id", username).eq("quantity", 0)

    // Get user data + clan info
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("*, clan_id")
      .eq("username", username)
      .single()

    if (userError || !userData) return { success: false, error: "User not found" }

    let userClanRole = null
    if (userData.clan_id) {
      const { data: memberData } = await supabase
        .from("clan_members")
        .select("role")
        .eq("clan_id", userData.clan_id)
        .eq("user_id", username)
        .single()

      userClanRole = memberData?.role || null
    }

    // Check daily God Pack limit
    const today = new Date().toISOString().split("T")[0]
    const { data: usageData } = await supabase
      .from("god_pack_daily_usage")
      .select("*")
      .eq("user_id", username)
      .eq("usage_date", today)
      .single()

    const alreadyOpened = usageData?.packs_opened || 0
    const remaining = 50 - alreadyOpened

    if (remaining <= 0) {
      return { success: false, error: "Daily God Pack limit reached" }
    }

    const drawCount = Math.min(count, remaining)

    // Fetch available cards (including godlike)
    const { data: cards } = await supabase
      .from("cards")
      .select("*")
      .eq("obtainable", true)
      .eq("epoch", 2)

    const epic = cards?.filter((c) => c.rarity === "epic") || []
    const legendary = cards?.filter((c) => c.rarity === "legendary") || []
    const godlike = cards?.filter((c) => c.rarity === "godlike") || []

    const drawnCards = []
    let totalScoreToAdd = 0

    for (let i = 0; i < drawCount; i++) {
      const random = Math.random() * 100
      let pool: any[] = []

      if (random < 1) pool = godlike
      else if (random < 49) pool = legendary
      else pool = epic

      // Falls leer, fallback auf alle Karten
      if (!pool || pool.length === 0) pool = cards ?? []


      const selectedCard = pool[Math.floor(Math.random() * pool.length)]
      drawnCards.push(selectedCard)


      // Score
      totalScoreToAdd += getScoreForRarity(selectedCard.rarity)

      // Insert/update user_cards
      const { data: existingCard } = await supabase
        .from("user_cards")
        .select("*")
        .eq("user_id", username)
        .eq("card_id", selectedCard.id)
        .eq("level", 1)
        .single()

      if (existingCard) {
        await supabase
          .from("user_cards")
          .update({ quantity: existingCard.quantity + 1 })
          .eq("id", existingCard.id)
      } else {
        await supabase.from("user_cards").insert({
          user_id: username,
          card_id: selectedCard.id,
          quantity: 1,
          level: 1,
          favorite: false,
          obtained_at: today,
        })
      }
    }

    // Update god_pack_daily_usage
    if (usageData) {
      await supabase
        .from("god_pack_daily_usage")
        .update({ packs_opened: Math.min(alreadyOpened + drawCount, 50), updated_at: new Date().toISOString() })
        .eq("id", usageData.id)
    } else {
      await supabase.from("god_pack_daily_usage").insert({
        user_id: username,
        usage_date: today,
        packs_opened: drawCount,
      })
    }

    // Update score
    const cardScore = Math.round(totalScoreToAdd)
    const { data: userScoreData } = await supabase.from("users").select("score").eq("username", username).single()
    const newScore = (userScoreData?.score || 0) + cardScore

    await supabase.from("users").update({ score: newScore }).eq("username", username)

    // Update clan XP
    if (userData.clan_id) {
      const { data: clanData } = await supabase
        .from("clans")
        .select("xp, level")
        .eq("id", userData.clan_id)
        .single()

      const clanLevels = [
        { level: 1, required_xp: 0 },
        { level: 2, required_xp: 5000 },
        { level: 3, required_xp: 20000 },
        { level: 4, required_xp: 50000 },
      ]

      const xpGain = drawCount * 5
      const newClanXp = (clanData?.xp || 0) + xpGain

      let newLevel = clanData?.level || 1
      for (let i = clanLevels.length - 1; i >= 0; i--) {
        if (newClanXp >= clanLevels[i].required_xp) {
          newLevel = clanLevels[i].level
          break
        }
      }

      await supabase.from("clans").update({ xp: newClanXp, level: newLevel }).eq("id", userData.clan_id)
    }

    // Calculate XP with bonuses
    let xpAmount = 200 * drawCount
    if (userClanRole === "xp_hunter") xpAmount = Math.floor(xpAmount * 1.05)
    if (userClanRole === "leader" || userData.username === userData.founder_id) xpAmount = Math.floor(xpAmount * 1.05)

    const { data: xpPass } = await supabase
      .from("xp_passes")
      .select("active")
      .eq("user_id", username)
      .eq("active", true)
      .single()

    if (xpPass?.active) xpAmount = Math.floor(xpAmount * 1.2)

    return {
      success: true,
      drawnCards,
      newScore,
      scoreAdded: cardScore,
      xpGained: xpAmount,
      godPacksUsedToday: alreadyOpened + drawCount,
      remainingToday: 50 - (alreadyOpened + drawCount),
    }
  } catch (error) {
    console.error("Error in drawGodPacks:", error)
    return { success: false, error: "Unexpected error drawing God Pack" }
  }
}
