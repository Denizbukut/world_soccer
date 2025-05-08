"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@supabase/supabase-js"

// Supabase Server-Client erstellen
function createSupabaseServer() {
  return createClient(process.env.SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || "", {
    auth: {
      persistSession: false,
    },
  })
}

// Typ-Definitionen
type MarketListing = {
  id: string
  seller_id: string
  card_id: string
  price: number
  created_at: string
  status: "active" | "sold" | "cancelled"
  buyer_id?: string
  sold_at?: string
  user_card_id: number | string
  card_level: number
  seller_world_id?: string
}

type Card = {
  id: string
  name: string
  character: string
  image_url?: string
  rarity: "common" | "rare" | "epic" | "legendary"
}

type MarketListingWithDetails = MarketListing & {
  card: Card
  seller_username: string
}

// Maximum number of cards a user can list
const MAX_USER_LISTINGS = 7

/**
 * Holt alle aktiven Marketplace-Listings
 */
export async function getMarketListings() {
  try {
    const supabase = createSupabaseServer()

    // Hole alle aktiven Listings
    const { data: listings, error } = await supabase
      .from("market_listings")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching market listings:", error)
      return { success: false, error: "Failed to fetch market listings" }
    }

    if (!listings || listings.length === 0) {
      return { success: true, listings: [] }
    }

    // Extrahiere card_ids und seller_ids für weitere Abfragen
    const cardIds = [...new Set(listings.map((listing: MarketListing) => listing.card_id))]
    const sellerIds = [...new Set(listings.map((listing: MarketListing) => listing.seller_id))]

    // Hole Kartendetails
    const { data: cards, error: cardsError } = await supabase
      .from("cards")
      .select("id, name, character, image_url, rarity")
      .in("id", cardIds)

    if (cardsError) {
      console.error("Error fetching card details:", cardsError)
      return { success: false, error: "Failed to fetch card details" }
    }

    // Hole Verkäufer-Usernames
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("username, world_id")
      .in("username", sellerIds)

    if (usersError) {
      console.error("Error fetching user details:", usersError)
      return { success: false, error: "Failed to fetch user details" }
    }

    // Erstelle eine Map für schnellen Zugriff
    const cardMap = new Map()
    cards?.forEach((card: Card) => {
      cardMap.set(card.id, card)
    })

    const userMap = new Map()
    users?.forEach((user: { username: string; world_id: string }) => {
      userMap.set(user.username, user)
    })

    // Kombiniere die Daten
    const listingsWithDetails = listings.map((listing: MarketListing) => {
      const card = cardMap.get(listing.card_id)
      const seller = userMap.get(listing.seller_id)

      return {
        ...listing,
        card,
        seller_username: seller?.username || listing.seller_id,
        seller_world_id: seller?.world_id || null,
      }
    })

    return { success: true, listings: listingsWithDetails }
  } catch (error) {
    console.error("Error in getMarketListings:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

/**
 * Holt die Marketplace-Listings eines bestimmten Benutzers
 */
export async function getUserListings(username: string) {
  try {
    const supabase = createSupabaseServer()

    // Hole alle Listings des Benutzers (username ist bereits die ID)
    const { data: listings, error } = await supabase
      .from("market_listings")
      .select("*")
      .eq("seller_id", username)
      .eq("status", "active")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching user listings:", error)
      return { success: false, error: "Failed to fetch your listings" }
    }

    if (!listings || listings.length === 0) {
      return { success: true, listings: [], listingCount: 0, maxListings: MAX_USER_LISTINGS }
    }

    // Extrahiere card_ids für weitere Abfragen
    const cardIds = [...new Set(listings.map((listing: MarketListing) => listing.card_id))]

    // Hole Kartendetails
    const { data: cards, error: cardsError } = await supabase
      .from("cards")
      .select("id, name, character, image_url, rarity")
      .in("id", cardIds)

    if (cardsError) {
      console.error("Error fetching card details:", cardsError)
      return { success: false, error: "Failed to fetch card details" }
    }

    // Erstelle eine Map für schnellen Zugriff
    const cardMap = new Map()
    cards?.forEach((card: Card) => {
      cardMap.set(card.id, card)
    })

    // Kombiniere die Daten
    const listingsWithDetails = listings.map((listing: MarketListing) => {
      const card = cardMap.get(listing.card_id)

      return {
        ...listing,
        card,
        seller_username: username,
      }
    })

    return {
      success: true,
      listings: listingsWithDetails,
      listingCount: listings.length,
      maxListings: MAX_USER_LISTINGS,
    }
  } catch (error) {
    console.error("Error in getUserListings:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

/**
 * Überprüft, ob ein Benutzer das Limit für Listings erreicht hat
 */
export async function checkUserListingLimit(username: string) {
  try {
    const supabase = createSupabaseServer()

    // Zähle die aktiven Listings des Benutzers
    const { count, error } = await supabase
      .from("market_listings")
      .select("*", { count: "exact", head: true })
      .eq("seller_id", username)
      .eq("status", "active")

    if (error) {
      console.error("Error checking user listing limit:", error)
      return { success: false, error: "Failed to check your listing limit" }
    }

    return {
      success: true,
      canList: (count || 0) < MAX_USER_LISTINGS,
      listingCount: count || 0,
      maxListings: MAX_USER_LISTINGS,
    }
  } catch (error) {
    console.error("Error in checkUserListingLimit:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// Ändere die createListing-Funktion, um mit username als ID zu arbeiten
export async function createListing(
  username: string,
  userCardId: number | string,
  cardId: string,
  price: number,
  cardLevel: number,
) {
  try {
    // Detailliertes Logging für Debugging
    console.log("=== CREATE LISTING START ===")
    console.log("Parameters:", { username, userCardId, cardId, price, cardLevel })

    const supabase = createSupabaseServer()

    // Überprüfe zuerst, ob der Benutzer das Limit erreicht hat
    const { count, error: countError } = await supabase
      .from("market_listings")
      .select("*", { count: "exact", head: true })
      .eq("seller_id", username)
      .eq("status", "active")

    if (countError) {
      console.error("Error checking user listing count:", countError)
      return { success: false, error: "Failed to check your listing count" }
    }

    if ((count || 0) >= MAX_USER_LISTINGS) {
      return {
        success: false,
        error: `You can only list a maximum of ${MAX_USER_LISTINGS} cards at a time. Please remove some listings before adding more.`,
      }
    }

    // Hole die Benutzerinformationen (username ist bereits die ID)
    console.log("Fetching user data for:", username)
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("world_id")
      .eq("username", username)
      .single()

    if (userError) {
      console.error("Error fetching user:", userError)
      return { success: false, error: "User not found: " + userError.message }
    }

    if (!userData) {
      console.error("User data is null for username:", username)
      return { success: false, error: "User not found in database" }
    }

    console.log("User data:", userData)
    const worldId = userData.world_id

    // Überprüfe, ob der Benutzer die Karte besitzt
    console.log("Checking if user owns card:", { userCardId, username })
    const { data: userCard, error: userCardError } = await supabase
      .from("user_cards")
      .select("quantity, level")
      .eq("id", userCardId)
      .eq("user_id", username)
      .single()

    if (userCardError) {
      console.error("Error checking user card:", userCardError)
      return { success: false, error: "Error checking if you own this card: " + userCardError.message }
    }

    if (!userCard) {
      console.error("User card not found:", { userCardId, username })
      return { success: false, error: "Card not found in your collection" }
    }

    console.log("User card data:", userCard)

    if (userCard.quantity < 1) {
      return { success: false, error: "You don't have enough copies of this card" }
    }

    // Überprüfe, ob der Benutzer bereits eine Karte dieser Art (unabhängig vom Level) zum Verkauf anbietet
    console.log("Checking if user has already listed this card type:", { cardId, username })
    const { data: existingListings, error: existingListingsError } = await supabase
      .from("market_listings")
      .select("id, card_level")
      .eq("card_id", cardId)
      .eq("seller_id", username)
      .eq("status", "active")

    if (existingListingsError) {
      console.error("Error checking existing listings:", existingListingsError)
      return { success: false, error: "Error checking your existing listings: " + existingListingsError.message }
    }

    if (existingListings && existingListings.length > 0) {
      console.log("User already has this card type listed:", existingListings)
      return {
        success: false,
        error:
          "You can only list one card of each type at a time. You already have this card listed (Level " +
          existingListings[0].card_level +
          ").",
      }
    }

    // Erstelle das Listing
    console.log("Creating listing with data:", {
      seller_id: username, // Verwende username als seller_id
      seller_world_id: worldId,
      card_id: cardId,
      price,
      user_card_id: userCardId,
      card_level: cardLevel || userCard.level,
    })

    const { data: listing, error: listingError } = await supabase
      .from("market_listings")
      .insert({
        seller_id: username, // Verwende username als seller_id
        seller_world_id: worldId,
        card_id: cardId,
        price,
        user_card_id: userCardId,
        card_level: cardLevel || userCard.level,
        status: "active",
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (listingError) {
      console.error("Error creating listing:", listingError)
      return { success: false, error: "Failed to create listing: " + listingError.message }
    }

    console.log("Listing created successfully:", listing)

    // Reduziere die Kartenanzahl des Benutzers um 1
    console.log("Updating user card quantity:", { userCardId, username, newQuantity: userCard.quantity - 1 })
    const { error: updateError } = await supabase
      .from("user_cards")
      .update({ quantity: userCard.quantity - 1 })
      .eq("id", userCardId)
      .eq("user_id", username)

    if (updateError) {
      console.error("Error updating user card quantity:", updateError)
      // Rollback das Listing, wenn die Aktualisierung fehlschlägt
      console.log("Rolling back listing due to error")
      await supabase.from("market_listings").delete().eq("id", listing.id)
      return { success: false, error: "Failed to update card quantity: " + updateError.message }
    }

    console.log("Card quantity updated successfully")
    console.log("=== CREATE LISTING COMPLETE ===")

    revalidatePath("/trade")
    revalidatePath("/collection")
    return { success: true, listing }
  } catch (error) {
    console.error("Unexpected error in createListing:", error)
    return {
      success: false,
      error: "An unexpected error occurred: " + (error instanceof Error ? error.message : String(error)),
    }
  }
}

/**
 * Kauft eine Karte vom Marketplace
 */
export async function purchaseCard(username: string, listingId: string) {
  try {
    const supabase = createSupabaseServer()

    // Hole die Benutzerinformationen (username ist bereits die ID)
    const { data: buyerData, error: buyerError } = await supabase
      .from("users")
      .select("coins")
      .eq("username", username)
      .single()

    if (buyerError || !buyerData) {
      console.error("Error fetching buyer:", buyerError)
      return { success: false, error: "Buyer not found" }
    }

    const buyerCoins = buyerData.coins

    // Hole das Listing
    const { data: listing, error: listingError } = await supabase
      .from("market_listings")
      .select("*")
      .eq("id", listingId)
      .eq("status", "active")
      .single()

    if (listingError || !listing) {
      console.error("Error fetching listing:", listingError)
      return { success: false, error: "Listing not found or already sold" }
    }

    // Verhindere, dass Benutzer ihre eigenen Karten kaufen
    if (listing.seller_id === username) {
      return { success: false, error: "You cannot buy your own card" }
    }

    // Starte eine Transaktion
    // 1. Aktualisiere das Listing
    const { error: updateListingError } = await supabase
      .from("market_listings")
      .update({
        status: "sold",
        buyer_id: username,
        sold_at: new Date().toISOString(),
      })
      .eq("id", listingId)
      .eq("status", "active")

    if (updateListingError) {
      console.error("Error updating listing:", updateListingError)
      return { success: false, error: "Failed to update listing" }
    }

    // 4. Erstelle einen Eintrag in der trades-Tabelle
    const { error: tradeError } = await supabase.from("trades").insert({
      seller_id: listing.seller_id,
      buyer_id: username,
      user_card_id: listing.user_card_id,
      card_id: listing.card_id,
      price: listing.price,
      created_at: new Date().toISOString(),
    })

    if (tradeError) {
      console.error("Error creating trade record:", tradeError)
      // Wir setzen hier keinen Rollback ein, da der Handel bereits abgeschlossen ist
    }

    // 5. Aktualisiere die user_cards-Tabelle
    // Prüfe zuerst, ob der Käufer die Karte bereits besitzt
    const { data: existingCard, error: existingCardError } = await supabase
      .from("user_cards")
      .select("id, quantity")
      .eq("user_id", username)
      .eq("card_id", listing.card_id)
      .eq("level", listing.card_level)
      .single()

    if (existingCardError && existingCardError.code !== "PGRST116") {
      // PGRST116 bedeutet "No rows returned", was in Ordnung ist
      console.error("Error checking existing card:", existingCardError)
      return { success: false, error: "Failed to check if you already own this card" }
    }

    if (existingCard) {
      // Aktualisiere die Anzahl, wenn der Käufer die Karte bereits besitzt
      const { error: updateCardError } = await supabase
        .from("user_cards")
        .update({ quantity: existingCard.quantity + 1 })
        .eq("id", existingCard.id)

      if (updateCardError) {
        console.error("Error updating card quantity:", updateCardError)
        return { success: false, error: "Failed to add card to your collection" }
      }
    } else {
      // Ändere den Besitzer der Karte, wenn der Käufer sie noch nicht besitzt
      const { error: updateCardError } = await supabase
        .from("user_cards")
        .update({ user_id: username, quantity: 1 })
        .eq("id", listing.user_card_id)

      if (updateCardError) {
        console.error("Error updating card owner:", updateCardError)
        // Füge eine neue Karte hinzu, wenn die Aktualisierung fehlschlägt
        const { error: insertCardError } = await supabase.from("user_cards").insert({
          user_id: username,
          card_id: listing.card_id,
          quantity: 1,
          level: listing.card_level || 1,
          favorite: false,
          obtained_at: new Date().toISOString().split("T")[0], // Format as YYYY-MM-DD
        })

        if (insertCardError) {
          console.error("Error adding card to collection:", insertCardError)
          return { success: false, error: "Failed to add card to your collection" }
        }
      }
    }

    revalidatePath("/trade")
    revalidatePath("/collection")
    return { success: true, message: "Card purchased successfully" }
  } catch (error) {
    console.error("Error in purchaseCard:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

/**
 * Storniert ein Listing und gibt die Karte zurück
 * Jetzt wird der Eintrag komplett aus der Datenbank gelöscht
 */
export async function cancelListing(username: string, listingId: string) {
  try {
    const supabase = createSupabaseServer()

    // Hole das Listing
    const { data: listing, error: listingError } = await supabase
      .from("market_listings")
      .select("*")
      .eq("id", listingId)
      .eq("seller_id", username)
      .eq("status", "active")
      .single()

    if (listingError || !listing) {
      console.error("Error fetching listing:", listingError)
      return { success: false, error: "Listing not found or already sold" }
    }

    // Gib die Karte zurück
    // Prüfe zuerst, ob der Benutzer die Karte bereits besitzt
    const { data: existingCard, error: existingCardError } = await supabase
      .from("user_cards")
      .select("id, quantity")
      .eq("user_id", username)
      .eq("card_id", listing.card_id)
      .eq("level", listing.card_level)
      .single()

    if (existingCardError && existingCardError.code !== "PGRST116") {
      console.error("Error checking existing card:", existingCardError)
      return { success: false, error: "Failed to check if you already own this card" }
    }

    if (existingCard) {
      // Aktualisiere die Anzahl, wenn der Benutzer die Karte bereits besitzt
      const { error: updateCardError } = await supabase
        .from("user_cards")
        .update({ quantity: existingCard.quantity + 1 })
        .eq("id", existingCard.id)

      if (updateCardError) {
        console.error("Error updating card quantity:", updateCardError)
        return { success: false, error: "Failed to return card to your collection" }
      }
    } else {
      // Füge eine neue Karte hinzu, wenn der Benutzer sie nicht mehr besitzt
      const { error: insertCardError } = await supabase.from("user_cards").insert({
        user_id: username,
        card_id: listing.card_id,
        quantity: 1,
        level: listing.card_level || 1,
        favorite: false,
        obtained_at: new Date().toISOString().split("T")[0], // Format as YYYY-MM-DD
      })

      if (insertCardError) {
        console.error("Error adding card to collection:", insertCardError)
        return { success: false, error: "Failed to return card to your collection" }
      }
    }

    // Lösche das Listing komplett aus der Datenbank
    const { error: deleteError } = await supabase.from("market_listings").delete().eq("id", listingId)

    if (deleteError) {
      console.error("Error deleting listing:", deleteError)
      return { success: false, error: "Failed to delete listing" }
    }

    revalidatePath("/trade")
    revalidatePath("/collection")
    return { success: true, message: "Listing cancelled successfully" }
  } catch (error) {
    console.error("Error in cancelListing:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

/**
 * Aktualisiert den Preis eines Listings
 */
export async function updateListingPrice(username: string, listingId: string, newPrice: number) {
  try {
    const supabase = createSupabaseServer()

    // Hole das Listing
    const { data: listing, error: listingError } = await supabase
      .from("market_listings")
      .select("*")
      .eq("id", listingId)
      .eq("seller_id", username)
      .eq("status", "active")
      .single()

    if (listingError || !listing) {
      console.error("Error fetching listing:", listingError)
      return { success: false, error: "Listing not found or already sold" }
    }

    // Validiere den neuen Preis
    if (newPrice <= 0 || newPrice > 500) {
      return { success: false, error: "Invalid price. Price must be between 0.1 and 500 WLD" }
    }

    // Aktualisiere den Preis
    const { error: updateError } = await supabase
      .from("market_listings")
      .update({ price: newPrice })
      .eq("id", listingId)

    if (updateError) {
      console.error("Error updating listing price:", updateError)
      return { success: false, error: "Failed to update listing price" }
    }

    revalidatePath("/trade")
    return { success: true, message: "Listing price updated successfully" }
  } catch (error) {
    console.error("Error in updateListingPrice:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

/**
 * Holt den Transaktionsverlauf eines Benutzers
 */
export async function getTransactionHistory(username: string) {
  try {
    const supabase = createSupabaseServer()

    // Hole alle Käufe und Verkäufe des Benutzers
    const { data: listings, error } = await supabase
      .from("market_listings")
      .select("*")
      .or(`seller_id.eq.${username},buyer_id.eq.${username}`)
      .eq("status", "sold")
      .order("sold_at", { ascending: false })

    if (error) {
      console.error("Error fetching transaction history:", error)
      return { success: false, error: "Failed to fetch transaction history" }
    }

    if (!listings || listings.length === 0) {
      return { success: true, transactions: [] }
    }

    // Extrahiere card_ids für weitere Abfragen
    const cardIds = [...new Set(listings.map((listing: MarketListing) => listing.card_id))]

    // Sammle alle beteiligten Benutzer
    const usernames = new Set<string>()
    listings.forEach((listing: MarketListing) => {
      if (listing.seller_id) usernames.add(listing.seller_id)
      if (listing.buyer_id) usernames.add(listing.buyer_id as string)
    })

    // Hole Kartendetails
    const { data: cards, error: cardsError } = await supabase
      .from("cards")
      .select("id, name, character, image_url, rarity")
      .in("id", cardIds)

    if (cardsError) {
      console.error("Error fetching card details:", cardsError)
      return { success: false, error: "Failed to fetch card details" }
    }

    // Erstelle Maps für schnellen Zugriff
    const cardMap = new Map()
    cards?.forEach((card: Card) => {
      cardMap.set(card.id, card)
    })

    // Kombiniere die Daten
    const transactionsWithDetails = listings.map((listing: MarketListing) => {
      const card = cardMap.get(listing.card_id)
      const isSeller = listing.seller_id === username

      return {
        ...listing,
        card,
        transaction_type: isSeller ? "sold" : "purchased",
        other_party: isSeller ? listing.buyer_id : listing.seller_id,
      }
    })

    return { success: true, transactions: transactionsWithDetails }
  } catch (error) {
    console.error("Error in getTransactionHistory:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}
