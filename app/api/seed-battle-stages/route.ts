import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase"

// Battle stages data
const battleStages = [
  // Stage 1: Academy Training
  {
    stage_number: 1,
    level_number: 1,
    name: "First Steps",
    description: "Begin your journey with basic training at the Academy.",
    enemy_name: "Academy Instructor",
    enemy_avatar: "/stern-sensei.png",
    enemy_level: 3,
    enemy_cards: [
      { character: "Academy Student", level: 2 },
      { character: "Academy Student", level: 2 },
      { character: "Academy Instructor", level: 3 },
    ],
    reward_coins: 50,
    reward_exp: 20,
  },
  {
    stage_number: 1,
    level_number: 2,
    name: "Teamwork Exercise",
    description: "Learn to work with your cards as a team.",
    enemy_name: "Genin Team",
    enemy_avatar: "/diverse-genin-squad.png",
    enemy_level: 5,
    enemy_cards: [
      { character: "Genin", level: 4 },
      { character: "Genin", level: 4 },
      { character: "Genin Team Leader", level: 5 },
    ],
    reward_coins: 75,
    reward_exp: 30,
  },
  {
    stage_number: 1,
    level_number: 3,
    name: "Chakra Control",
    description: "Master the basics of chakra control.",
    enemy_name: "Chakra Specialist",
    enemy_avatar: "/focused-chakra-user.png",
    enemy_level: 7,
    enemy_cards: [
      { character: "Chakra Adept", level: 6 },
      { character: "Chakra Adept", level: 6 },
      { character: "Chakra Master", level: 7 },
    ],
    reward_coins: 100,
    reward_exp: 40,
  },
  {
    stage_number: 1,
    level_number: 4,
    name: "Taijutsu Practice",
    description: "Improve your physical combat skills.",
    enemy_name: "Taijutsu Expert",
    enemy_avatar: "/focused-fighter.png",
    enemy_level: 9,
    enemy_cards: [
      { character: "Taijutsu Student", level: 8 },
      { character: "Taijutsu Student", level: 8 },
      { character: "Taijutsu Sensei", level: 9 },
    ],
    reward_coins: 125,
    reward_exp: 50,
  },
  {
    stage_number: 1,
    level_number: 5,
    name: "Ninjutsu Training",
    description: "Learn the art of ninja techniques.",
    enemy_name: "Ninjutsu Specialist",
    enemy_avatar: "/stealthy-shadow.png",
    enemy_level: 11,
    enemy_cards: [
      { character: "Ninjutsu Apprentice", level: 10 },
      { character: "Ninjutsu Apprentice", level: 10 },
      { character: "Ninjutsu Master", level: 11 },
    ],
    reward_coins: 150,
    reward_exp: 60,
  },
  {
    stage_number: 1,
    level_number: 6,
    name: "Genjutsu Challenge",
    description: "Face the illusions of genjutsu.",
    enemy_name: "Genjutsu User",
    enemy_avatar: "/enigmatic-illusionist.png",
    enemy_level: 13,
    enemy_cards: [
      { character: "Genjutsu Novice", level: 12 },
      { character: "Genjutsu Novice", level: 12 },
      { character: "Genjutsu Expert", level: 13 },
    ],
    reward_coins: 175,
    reward_exp: 70,
  },
  {
    stage_number: 1,
    level_number: 7,
    name: "Graduation Exam",
    description: "Prove your worth and graduate from the Academy.",
    enemy_name: "Academy Principal",
    enemy_avatar: "/stern-academy-head.png",
    enemy_level: 15,
    enemy_cards: [
      { character: "Elite Instructor", level: 14 },
      { character: "Elite Instructor", level: 14 },
      { character: "Academy Principal", level: 15 },
    ],
    reward_coins: 200,
    reward_exp: 100,
  },

  // Stage 2: Chunin Exams
  {
    stage_number: 2,
    level_number: 1,
    name: "Written Test",
    description: "Pass the first stage of the Chunin Exams.",
    enemy_name: "Exam Proctor",
    enemy_avatar: "/stern-anime-proctor.png",
    enemy_level: 18,
    enemy_cards: [
      { character: "Chunin Candidate", level: 16 },
      { character: "Chunin Candidate", level: 17 },
      { character: "Exam Proctor", level: 18 },
    ],
    reward_coins: 250,
    reward_exp: 120,
  },
  {
    stage_number: 2,
    level_number: 2,
    name: "Forest of Death",
    description: "Survive the dangerous Forest of Death.",
    enemy_name: "Rival Team",
    enemy_avatar: "/placeholder.svg?height=200&width=200&query=anime%20rival%20team",
    enemy_level: 20,
    enemy_cards: [
      { character: "Rival Genin", level: 19 },
      { character: "Rival Genin", level: 19 },
      { character: "Rival Team Leader", level: 20 },
    ],
    reward_coins: 300,
    reward_exp: 150,
  },
  {
    stage_number: 2,
    level_number: 3,
    name: "Preliminary Matches",
    description: "Win your preliminary match to advance.",
    enemy_name: "Foreign Ninja",
    enemy_avatar: "/placeholder.svg?height=200&width=200&query=anime%20foreign%20ninja",
    enemy_level: 22,
    enemy_cards: [
      { character: "Foreign Genin", level: 21 },
      { character: "Foreign Genin", level: 21 },
      { character: "Foreign Jonin", level: 22 },
    ],
    reward_coins: 350,
    reward_exp: 180,
  },
  {
    stage_number: 2,
    level_number: 4,
    name: "Tournament Quarterfinals",
    description: "Defeat your opponent in the quarterfinals.",
    enemy_name: "Skilled Competitor",
    enemy_avatar: "/placeholder.svg?height=200&width=200&query=anime%20skilled%20ninja",
    enemy_level: 24,
    enemy_cards: [
      { character: "Skilled Genin", level: 23 },
      { character: "Skilled Genin", level: 23 },
      { character: "Elite Genin", level: 24 },
    ],
    reward_coins: 400,
    reward_exp: 200,
  },
  {
    stage_number: 2,
    level_number: 5,
    name: "Tournament Semifinals",
    description: "Win your semifinal match to advance to the finals.",
    enemy_name: "Elite Competitor",
    enemy_avatar: "/placeholder.svg?height=200&width=200&query=anime%20elite%20ninja",
    enemy_level: 26,
    enemy_cards: [
      { character: "Elite Genin", level: 25 },
      { character: "Elite Genin", level: 25 },
      { character: "Prodigy Genin", level: 26 },
    ],
    reward_coins: 450,
    reward_exp: 220,
  },
  {
    stage_number: 2,
    level_number: 6,
    name: "Tournament Finals",
    description: "Win the final match of the Chunin Exams.",
    enemy_name: "Exam Finalist",
    enemy_avatar: "/placeholder.svg?height=200&width=200&query=anime%20exam%20finalist",
    enemy_level: 28,
    enemy_cards: [
      { character: "Finalist", level: 27 },
      { character: "Finalist", level: 27 },
      { character: "Exam Champion", level: 28 },
    ],
    reward_coins: 500,
    reward_exp: 250,
  },
  {
    stage_number: 2,
    level_number: 7,
    name: "Unexpected Attack",
    description: "Defend the village from a surprise attack during the exams.",
    enemy_name: "Enemy Commander",
    enemy_avatar: "/placeholder.svg?height=200&width=200&query=anime%20enemy%20commander",
    enemy_level: 30,
    enemy_cards: [
      { character: "Enemy Ninja", level: 29 },
      { character: "Enemy Ninja", level: 29 },
      { character: "Enemy Commander", level: 30 },
    ],
    reward_coins: 600,
    reward_exp: 300,
  },

  // Stage 3: Rescue Mission
  {
    stage_number: 3,
    level_number: 1,
    name: "Mission Briefing",
    description: "Prepare for a dangerous rescue mission.",
    enemy_name: "Scout Team",
    enemy_avatar: "/placeholder.svg?height=200&width=200&query=anime%20scout%20team",
    enemy_level: 32,
    enemy_cards: [
      { character: "Scout Ninja", level: 31 },
      { character: "Scout Ninja", level: 31 },
      { character: "Scout Leader", level: 32 },
    ],
    reward_coins: 650,
    reward_exp: 320,
  },
  {
    stage_number: 3,
    level_number: 2,
    name: "Forest Ambush",
    description: "Survive an ambush in the forest.",
    enemy_name: "Ambush Squad",
    enemy_avatar: "/placeholder.svg?height=200&width=200&query=anime%20ambush%20squad",
    enemy_level: 34,
    enemy_cards: [
      { character: "Ambush Ninja", level: 33 },
      { character: "Ambush Ninja", level: 33 },
      { character: "Ambush Captain", level: 34 },
    ],
    reward_coins: 700,
    reward_exp: 350,
  },
  {
    stage_number: 3,
    level_number: 3,
    name: "Valley Crossing",
    description: "Cross a dangerous valley guarded by enemy forces.",
    enemy_name: "Valley Guards",
    enemy_avatar: "/placeholder.svg?height=200&width=200&query=anime%20valley%20guards",
    enemy_level: 36,
    enemy_cards: [
      { character: "Valley Guard", level: 35 },
      { character: "Valley Guard", level: 35 },
      { character: "Guard Captain", level: 36 },
    ],
    reward_coins: 750,
    reward_exp: 380,
  },
  {
    stage_number: 3,
    level_number: 4,
    name: "Enemy Hideout",
    description: "Infiltrate the enemy hideout.",
    enemy_name: "Hideout Guards",
    enemy_avatar: "/placeholder.svg?height=200&width=200&query=anime%20hideout%20guards",
    enemy_level: 38,
    enemy_cards: [
      { character: "Hideout Guard", level: 37 },
      { character: "Hideout Guard", level: 37 },
      { character: "Elite Guard", level: 38 },
    ],
    reward_coins: 800,
    reward_exp: 400,
  },
  {
    stage_number: 3,
    level_number: 5,
    name: "Inner Sanctum",
    description: "Reach the inner sanctum where the hostage is held.",
    enemy_name: "Elite Guards",
    enemy_avatar: "/placeholder.svg?height=200&width=200&query=anime%20elite%20guards",
    enemy_level: 40,
    enemy_cards: [
      { character: "Elite Guard", level: 39 },
      { character: "Elite Guard", level: 39 },
      { character: "Guard Commander", level: 40 },
    ],
    reward_coins: 850,
    reward_exp: 420,
  },
  {
    stage_number: 3,
    level_number: 6,
    name: "Rescue Operation",
    description: "Free the hostage and prepare for escape.",
    enemy_name: "Special Forces",
    enemy_avatar: "/placeholder.svg?height=200&width=200&query=anime%20special%20forces",
    enemy_level: 42,
    enemy_cards: [
      { character: "Special Force Ninja", level: 41 },
      { character: "Special Force Ninja", level: 41 },
      { character: "Special Force Captain", level: 42 },
    ],
    reward_coins: 900,
    reward_exp: 450,
  },
  {
    stage_number: 3,
    level_number: 7,
    name: "Final Showdown",
    description: "Face the enemy leader to complete the rescue mission.",
    enemy_name: "Enemy Leader",
    enemy_avatar: "/placeholder.svg?height=200&width=200&query=anime%20enemy%20leader",
    enemy_level: 45,
    enemy_cards: [
      { character: "Elite Bodyguard", level: 43 },
      { character: "Elite Bodyguard", level: 43 },
      { character: "Enemy Leader", level: 45 },
    ],
    reward_coins: 1000,
    reward_exp: 500,
  },
]

export async function GET() {
  try {
    const supabase = getSupabaseServerClient()

    // Get all cards to assign to enemy cards
    const { data: cards, error: cardsError } = await supabase.from("cards").select("id, character")

    if (cardsError) {
      console.error("Error fetching cards:", cardsError)
      return NextResponse.json({ error: "Failed to fetch cards" }, { status: 500 })
    }

    if (!cards || cards.length === 0) {
      return NextResponse.json({ error: "No cards found in database" }, { status: 500 })
    }

    // Process battle stages to add card IDs
    const processedStages = battleStages.map((stage) => {
      // Assign random card IDs to enemy cards
      const enemyCards = stage.enemy_cards.map((enemyCard: any) => {
        // Find a random card from the database
        const randomCard = cards[Math.floor(Math.random() * cards.length)]
        return {
          card_id: randomCard.id,
          level: enemyCard.level,
        }
      })

      // Assign a reward card for boss levels (level 7)
      let rewardCardId = null
      if (stage.level_number === 7) {
        const randomCard = cards[Math.floor(Math.random() * cards.length)]
        rewardCardId = randomCard.id
      }

      return {
        ...stage,
        enemy_cards: enemyCards,
        reward_card_id: rewardCardId,
      }
    })

    // Clear existing battle stages
    await supabase.from("battle_stages").delete().neq("id", "00000000-0000-0000-0000-000000000000")

    // Insert new battle stages
    const { data, error } = await supabase.from("battle_stages").insert(processedStages).select()

    if (error) {
      console.error("Error inserting battle stages:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `${data.length} battle stages`,
      count: data.length,
    })
  } catch (error) {
    console.error("Error in seed-battle-stages route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
