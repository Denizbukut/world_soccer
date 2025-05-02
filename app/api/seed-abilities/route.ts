import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase"

// Define ability types
type Ability = {
  name: string
  description: string
  damage?: number
  healing?: number
  effect?: string
  cooldown?: number
}

// Card abilities data
const cardAbilities = [
  {
    character: "Naruto Uzumaki",
    active_ability: {
      name: "Rasengan",
      description: "Deals massive damage to the opponent",
      damage: 40,
      cooldown: 2,
    },
    passive_ability: {
      name: "Nine-Tails Chakra",
      description: "Recovers 10% HP at the end of each turn",
      healing: 10,
      effect: "heal_over_time",
    },
  },
  {
    character: "Sasuke Uchiha",
    active_ability: {
      name: "Chidori",
      description: "Deals high damage with a chance to stun",
      damage: 35,
      effect: "stun",
      cooldown: 2,
    },
    passive_ability: {
      name: "Sharingan",
      description: "Has a 20% chance to dodge attacks",
      effect: "dodge",
    },
  },
  {
    character: "Sakura Haruno",
    active_ability: {
      name: "Cherry Blossom Impact",
      description: "Deals moderate damage and reduces enemy defense",
      damage: 25,
      effect: "defense_down",
      cooldown: 1,
    },
    passive_ability: {
      name: "Medical Ninjutsu",
      description: "Heals all allies for 15 HP each turn",
      healing: 15,
      effect: "team_heal",
    },
  },
  {
    character: "Kakashi Hatake",
    active_ability: {
      name: "Lightning Blade",
      description: "Deals high damage with increased critical hit chance",
      damage: 30,
      effect: "critical",
      cooldown: 2,
    },
    passive_ability: {
      name: "Copy Ninja",
      description: "Can copy the opponent's last used ability",
      effect: "copy",
    },
  },
  {
    character: "Hinata Hyuga",
    active_ability: {
      name: "Gentle Fist",
      description: "Deals damage and reduces enemy attack",
      damage: 20,
      effect: "attack_down",
      cooldown: 1,
    },
    passive_ability: {
      name: "Byakugan",
      description: "Increases accuracy and reveals enemy weaknesses",
      effect: "accuracy_up",
    },
  },
  {
    character: "Shikamaru Nara",
    active_ability: {
      name: "Shadow Possession",
      description: "Immobilizes the enemy for one turn",
      effect: "immobilize",
      cooldown: 3,
    },
    passive_ability: {
      name: "Tactical Genius",
      description: "Increases team's defense when HP is below 50%",
      effect: "team_defense_up",
    },
  },
  {
    character: "Rock Lee",
    active_ability: {
      name: "Primary Lotus",
      description: "Deals massive damage but reduces own HP",
      damage: 50,
      effect: "self_damage",
      cooldown: 3,
    },
    passive_ability: {
      name: "Eight Gates",
      description: "Attack increases as HP decreases",
      effect: "berserk",
    },
  },
  {
    character: "Gaara",
    active_ability: {
      name: "Sand Burial",
      description: "Deals damage and traps enemy, reducing their speed",
      damage: 25,
      effect: "speed_down",
      cooldown: 2,
    },
    passive_ability: {
      name: "Sand Shield",
      description: "Automatically blocks the first attack each battle",
      effect: "first_hit_block",
    },
  },
  {
    character: "Kankuro",
    active_ability: {
      name: "Puppet Master",
      description: "Controls enemy for one turn, making them attack themselves",
      damage: 20,
      effect: "control",
      cooldown: 3,
    },
    passive_ability: {
      name: "Puppet Arsenal",
      description: "Has a chance to counter-attack when hit",
      effect: "counter",
    },
  },
  {
    character: "Temari",
    active_ability: {
      name: "Wind Scythe",
      description: "Deals area damage to all enemies",
      damage: 20,
      effect: "area_damage",
      cooldown: 2,
    },
    passive_ability: {
      name: "Wind Mastery",
      description: "Increases evasion against projectile attacks",
      effect: "projectile_evasion",
    },
  },
  {
    character: "Pain",
    active_ability: {
      name: "Almighty Push",
      description: "Deals massive area damage and pushes enemies back",
      damage: 35,
      effect: "knockback",
      cooldown: 3,
    },
    passive_ability: {
      name: "Six Paths",
      description: "Revives once per battle with 30% HP",
      effect: "revive",
    },
  },
  {
    character: "Itachi Uchiha",
    active_ability: {
      name: "Tsukuyomi",
      description: "Puts enemy in genjutsu, skipping their next turn",
      effect: "skip_turn",
      cooldown: 4,
    },
    passive_ability: {
      name: "Mangekyo Sharingan",
      description: "Has a chance to reflect damage back to attacker",
      effect: "reflect",
    },
  },
]

// Default abilities for cards that don't have specific ones
const defaultAbilities = {
  common: {
    active_ability: {
      name: "Basic Attack",
      description: "A simple attack that deals moderate damage",
      damage: 15,
      cooldown: 1,
    },
    passive_ability: {
      name: "Endurance",
      description: "Slightly increases defense when HP is low",
      effect: "endurance",
    },
  },
  uncommon: {
    active_ability: {
      name: "Power Strike",
      description: "A stronger attack with a small chance to stun",
      damage: 20,
      effect: "minor_stun",
      cooldown: 2,
    },
    passive_ability: {
      name: "Recovery",
      description: "Recovers a small amount of HP each turn",
      healing: 5,
      effect: "minor_heal",
    },
  },
  rare: {
    active_ability: {
      name: "Special Technique",
      description: "A powerful technique that deals significant damage",
      damage: 25,
      cooldown: 2,
    },
    passive_ability: {
      name: "Resilience",
      description: "Has a chance to reduce incoming damage",
      effect: "damage_reduction",
    },
  },
  "ultra-rare": {
    active_ability: {
      name: "Ultimate Technique",
      description: "A devastating attack that deals heavy damage",
      damage: 35,
      cooldown: 3,
    },
    passive_ability: {
      name: "Mastery",
      description: "Increases all stats when HP is below 30%",
      effect: "stat_boost",
    },
  },
  legendary: {
    active_ability: {
      name: "Legendary Power",
      description: "An overwhelming attack that deals massive damage",
      damage: 45,
      cooldown: 3,
    },
    passive_ability: {
      name: "Legendary Aura",
      description: "Boosts team's attack and defense",
      effect: "team_boost",
    },
  },
}

export async function GET() {
  try {
    const supabase = getSupabaseServerClient()

    // Get all cards
    const { data: cards, error: cardsError } = await supabase.from("cards").select("id, character, rarity")

    if (cardsError) {
      console.error("Error fetching cards:", cardsError)
      return NextResponse.json({ error: cardsError.message }, { status: 500 })
    }

    let updatedCount = 0

    // Update each card with abilities
    for (const card of cards) {
      // Find specific abilities for this character
      const specificAbility = cardAbilities.find((ability) => ability.character === card.character)

      // Use specific abilities if found, otherwise use default based on rarity
      const abilities =
        specificAbility || defaultAbilities[card.rarity as keyof typeof defaultAbilities] || defaultAbilities.common

      // Update the card
      const { error } = await supabase
        .from("cards")
        .update({
          active_ability: abilities.active_ability,
          passive_ability: abilities.passive_ability,
        })
        .eq("id", card.id)

      if (error) {
        console.error(`Error updating abilities for card ${card.id}:`, error)
      } else {
        updatedCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated abilities for ${updatedCount} cards`,
    })
  } catch (error) {
    console.error("Error in seed-abilities route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
