// Types for abilities
export type ActiveAbility = {
  name: string
  description: string
  damage?: number
  healing?: number
  effect?: string
  cooldown?: number
}

export type PassiveAbility = {
  name: string
  description: string
  healing?: number
  effect?: string
}

export type BattleCard = {
  id: string
  name: string
  character: string
  image_url: string
  rarity: string
  type: string
  hp: number
  currentHp: number
  attack: number
  defense: number
  speed: number
  active_ability?: ActiveAbility
  passive_ability?: PassiveAbility
  cooldowns: Record<string, number>
  effects: string[]
  isPlayer: boolean
  level?: number
}

// Calculate damage based on attacker and defender stats
export function calculateDamage(attacker: BattleCard, defender: BattleCard): number {
  const baseDamage = attacker.attack
  const defense = defender.defense

  // Basic damage formula
  let damage = Math.max(5, baseDamage - defense / 2)

  // Apply type advantages (could be expanded)
  if (
    (attacker.type === "fire" && defender.type === "wind") ||
    (attacker.type === "water" && defender.type === "fire") ||
    (attacker.type === "earth" && defender.type === "water") ||
    (attacker.type === "wind" && defender.type === "earth") ||
    (attacker.type === "lightning" && defender.type === "water")
  ) {
    damage *= 1.5
  }

  // Apply random factor (±10%)
  const randomFactor = 0.9 + Math.random() * 0.2
  damage *= randomFactor

  return Math.floor(damage)
}

// Apply active ability effects
export function applyActiveAbility(
  attacker: BattleCard,
  defender: BattleCard,
  ability: ActiveAbility,
): { damage: number; effects: string[]; log: string[] } {
  const result = {
    damage: 0,
    effects: [] as string[],
    log: [] as string[],
  }

  // Apply base damage if specified
  if (ability.damage) {
    result.damage = ability.damage
    result.log.push(`${attacker.name} uses ${ability.name} for ${ability.damage} damage!`)
  }

  // Apply effects based on ability type
  if (ability.effect) {
    switch (ability.effect) {
      case "stun":
        if (Math.random() < 0.3) {
          result.effects.push("stunned")
          result.log.push(`${defender.name} is stunned and will skip their next turn!`)
        }
        break

      case "defense_down":
        result.effects.push("defense_down")
        result.log.push(`${defender.name}'s defense is reduced!`)
        break

      case "attack_down":
        result.effects.push("attack_down")
        result.log.push(`${defender.name}'s attack is reduced!`)
        break

      case "critical":
        if (Math.random() < 0.4) {
          result.damage *= 2
          result.log.push(`Critical hit! Damage doubled to ${result.damage}!`)
        }
        break

      case "immobilize":
        result.effects.push("immobilized")
        result.log.push(`${defender.name} is immobilized for one turn!`)
        break

      case "self_damage":
        // Damage attacker for 10% of their max HP
        const selfDamage = Math.floor(attacker.hp * 0.1)
        result.log.push(`${attacker.name} takes ${selfDamage} recoil damage!`)
        // This will be handled by the battle component
        break

      case "speed_down":
        result.effects.push("speed_down")
        result.log.push(`${defender.name}'s speed is reduced!`)
        break

      case "control":
        if (Math.random() < 0.5) {
          result.effects.push("controlled")
          result.log.push(`${defender.name} is controlled and will attack itself next turn!`)
        }
        break

      case "area_damage":
        // Area damage is handled by the battle component
        result.log.push(`${ability.name} hits all enemies!`)
        break

      case "knockback":
        result.effects.push("knockback")
        result.log.push(`${defender.name} is knocked back!`)
        break

      case "skip_turn":
        result.effects.push("skip_turn")
        result.log.push(`${defender.name} will skip their next turn!`)
        break
    }
  }

  // Apply healing if specified
  if (ability.healing) {
    result.log.push(`${attacker.name} heals for ${ability.healing} HP!`)
    // Healing is handled by the battle component
  }

  return result
}

// Apply passive ability effects at the end of turn
export function applyPassiveAbility(card: BattleCard, allCards: BattleCard[]): { effects: string[]; log: string[] } {
  const result = {
    effects: [] as string[],
    log: [] as string[],
  }

  if (!card.passive_ability) return result

  const ability = card.passive_ability

  // Apply effects based on passive ability type
  if (ability.effect) {
    switch (ability.effect) {
      case "heal_over_time":
        if (ability.healing) {
          const healAmount = Math.floor((card.hp * ability.healing) / 100)
          result.effects.push(`heal:${healAmount}`)
          result.log.push(`${card.name}'s ${ability.name} heals for ${healAmount} HP!`)
        }
        break

      case "team_heal":
        if (ability.healing) {
          const allyCards = allCards.filter((c) => c.isPlayer === card.isPlayer && c.currentHp > 0)
          result.effects.push(`team_heal:${ability.healing}`)
          result.log.push(`${card.name}'s ${ability.name} heals all allies for ${ability.healing} HP!`)
        }
        break

      case "team_defense_up":
        if (card.currentHp < card.hp / 2) {
          result.effects.push("team_defense_up")
          result.log.push(`${card.name}'s ${ability.name} increases team defense!`)
        }
        break

      case "berserk":
        const hpPercentage = (card.currentHp / card.hp) * 100
        if (hpPercentage < 50) {
          result.effects.push("berserk")
          result.log.push(`${card.name}'s ${ability.name} increases attack as HP decreases!`)
        }
        break

      // Other passive abilities like dodge, counter, etc. are handled during attack phase
    }
  }

  return result
}

// Check if a card can dodge an attack based on passive ability
export function canDodgeAttack(card: BattleCard): boolean {
  if (!card.passive_ability) return false

  if (card.passive_ability.effect === "dodge") {
    return Math.random() < 0.2 // 20% chance to dodge
  }

  if (card.passive_ability.effect === "projectile_evasion" && Math.random() < 0.3) {
    return true // 30% chance to evade projectiles
  }

  if (card.passive_ability.effect === "first_hit_block" && !card.effects.includes("hit_once")) {
    card.effects.push("hit_once")
    return true // Block first hit
  }

  return false
}

// Check if a card can counter-attack
export function canCounterAttack(card: BattleCard): boolean {
  if (!card.passive_ability) return false

  if (card.passive_ability.effect === "counter") {
    return Math.random() < 0.3 // 30% chance to counter
  }

  return false
}

// Check if a card can reflect damage
export function canReflectDamage(card: BattleCard): boolean {
  if (!card.passive_ability) return false

  if (card.passive_ability.effect === "reflect") {
    return Math.random() < 0.2 // 20% chance to reflect
  }

  return false
}

// Check if a card should revive
export function shouldRevive(card: BattleCard): boolean {
  if (!card.passive_ability) return false

  if (card.passive_ability.effect === "revive" && !card.effects.includes("revived") && card.currentHp <= 0) {
    card.effects.push("revived")
    return true
  }

  return false
}

// Process end of turn effects
export function processEndOfTurn(cards: BattleCard[]): { updatedCards: BattleCard[]; log: string[] } {
  const log: string[] = []
  const updatedCards = [...cards]

  // Process each card
  updatedCards.forEach((card) => {
    if (card.currentHp <= 0) return // Skip dead cards

    // Reduce cooldowns
    Object.keys(card.cooldowns).forEach((ability) => {
      if (card.cooldowns[ability] > 0) {
        card.cooldowns[ability]--
      }
    })

    // Apply passive abilities
    if (card.passive_ability) {
      const passiveResult = applyPassiveAbility(card, updatedCards)
      log.push(...passiveResult.log)

      // Process passive effects
      passiveResult.effects.forEach((effect) => {
        if (effect.startsWith("heal:")) {
          const healAmount = Number.parseInt(effect.split(":")[1])
          card.currentHp = Math.min(card.hp, card.currentHp + healAmount)
        }

        if (effect === "team_heal" && card.passive_ability?.healing) {
          // Heal all allies
          updatedCards
            .filter((c) => c.isPlayer === card.isPlayer && c.currentHp > 0)
            .forEach((ally) => {
              if (card.passive_ability?.healing) {
                ally.currentHp = Math.min(ally.hp, ally.currentHp + card.passive_ability.healing)
              }
            })
        }
      })
    }

    // Remove temporary effects
    card.effects = card.effects.filter(
      (effect) => !["stunned", "immobilized", "controlled", "knockback", "skip_turn"].includes(effect),
    )
  })

  return { updatedCards, log }
}
