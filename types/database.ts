// Define types for Supabase database tables

export interface User {
    username: string
    tickets: number
    legendary_tickets: number
    coins: number
    level: number
    experience: number
    next_level_exp: number
    has_premium: boolean
    ticket_last_claimed?: string
    last_login?: string
    walletaddress?: string
    world_id?: string
  }
  
  export interface PremiumPass {
    id: string
    user_id: string
    active: boolean
    purchased_at: string
    expires_at?: string
    last_legendary_claim?: string
  }
  
  export interface ClaimedReward {
    id: string
    user_id: string
    level: number
    standard_claimed: boolean
    premium_claimed: boolean
    claimed_at: string
  }
  
  export interface UserCard {
    id: string
    user_id: string
    card_id: string
    quantity: number
    level?: number
    favorite?: boolean
    obtained_at?: string
  }
  
  export interface Card {
    id: string
    name: string
    character: string
    image_url?: string
    rarity: "common" | "rare" | "epic" | "legendary"
    type?: string
    description?: string
  }
  