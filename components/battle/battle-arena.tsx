"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { motion, AnimatePresence } from "framer-motion"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { Coins, Star, ArrowLeft } from "lucide-react"
import BattleCard from "./battle-card"
import { saveBattleResult } from "@/app/battle-actions"
import {
  calculateDamage,
  applyActiveAbility,
  canDodgeAttack,
  canCounterAttack,
  canReflectDamage,
  processEndOfTurn,
} from "@/lib/battle-utils"

type BattleArenaProps = {
  stage: any
  onBattleEnd: () => void
}

export default function BattleArena({ stage, onBattleEnd }: BattleArenaProps) {
  const { user, updateUserCoins, updateUserExp } = useAuth()
  const [playerCards, setPlayerCards] = useState<any[]>([])
  const [enemyCards, setEnemyCards] = useState<any[]>([])
  const [selectedCard, setSelectedCard] = useState<any>(null)
  const [targetCard, setTargetCard] = useState<any>(null)
  const [currentTurn, setCurrentTurn] = useState<"player" | "enemy">("player")
  const [battleLog, setBattleLog] = useState<string[]>([])
  const [battleState, setBattleState] = useState<"selecting" | "attacking" | "enemyTurn" | "finished">("selecting")
  const [loading, setLoading] = useState(true)
  const [battleResult, setBattleResult] = useState<"win" | "loss" | null>(null)
  const [showRewards, setShowRewards] = useState(false)
  const [animation, setAnimation] = useState<{
    type: string
    source: string
    target: string
  } | null>(null)

  const logEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (user) {
      fetchPlayerCards()
      prepareEnemyCards()
    }
  }, [user, stage])

  useEffect(() => {
    // Scroll battle log to bottom
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [battleLog])

  const fetchPlayerCards = async () => {
    setLoading(true)
    try {
      const supabase = getSupabaseBrowserClient()
      if (!supabase) {
        console.error("Supabase client not available")
        return
      }
      const { data, error } = await supabase
        .from("user_cards")
        .select(`
          id,
          cards (
            id,
            name,
            character,
            image_url,
            rarity,
            type,
            hp,
            attack,
            defense,
            speed,
            active_ability,
            passive_ability
          )
        `)
        .eq("user_id", user!.username)
        .order("id", { ascending: false })
        .limit(3)

      if (error) {
        console.error("Error fetching player cards:", error)
        toast({
          title: "Error",
          description: "Failed to load your cards",
          variant: "destructive",
        })
      } else {
        // Transform data and add battle properties
        const battleCards = data.map((card: any) => ({
          id: card.id,
          ...card.cards,
          currentHp: (card.cards as any).hp,
          cooldowns: {},
          effects: [],
          isPlayer: true,
        }))
        setPlayerCards(battleCards)
      }
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setLoading(false)
    }
  }

  const prepareEnemyCards = async () => {
    try {
      const supabase = getSupabaseBrowserClient()
      if (!supabase) {
        console.error("Supabase client not available")
        return
      }

      // Get enemy cards from stage data
      const enemyCardIds = stage.enemy_cards.map((card: any) => card.card_id)

      // Fetch card details
      const { data, error } = await supabase.from("cards").select("*").in("id", enemyCardIds)

      if (error) {
        console.error("Error fetching enemy cards:", error)
      } else if (data) {
        // Map enemy cards with battle properties
        const battleCards = data.map((card: any, index) => {
          const stageCard = stage.enemy_cards[index]
          // Scale card stats based on enemy level
          const levelMultiplier = stageCard.level / 10 + 1

          return {
            id: card.id,
            ...card,
            currentHp: Math.floor((card.hp as number) * levelMultiplier),
            maxHp: Math.floor((card.hp as number) * levelMultiplier),
            attack: Math.floor((card.attack as number) * levelMultiplier),
            defense: Math.floor((card.defense as number) * levelMultiplier),
            cooldowns: {},
            effects: [],
            isPlayer: false,
            level: stageCard.level,
          }
        })

        setEnemyCards(battleCards)
        addToBattleLog(`Battle against ${stage.enemy_name} has begun!`)
      }
    } catch (error) {
      console.error("Error preparing enemy cards:", error)
    }
  }

  const addToBattleLog = (message: string) => {
    setBattleLog((prev) => [...prev, message])
  }

  const handleCardSelect = (card: any) => {
    if (battleState !== "selecting" || card.currentHp <= 0) return

    setSelectedCard(card)
    setBattleState("attacking")
    addToBattleLog(`Selected ${card.name} for attack`)
  }

  const handleTargetSelect = (card: any) => {
    if (battleState !== "attacking" || !selectedCard || card.currentHp <= 0) return

    setTargetCard(card)
    performAttack(selectedCard, card)
  }

  const performAttack = (attacker: any, defender: any) => {
    // Check if defender can dodge
    if (canDodgeAttack(defender)) {
      addToBattleLog(`${defender.name} dodged the attack!`)

      // Reset selection and continue battle
      setTimeout(() => {
        setAnimation(null)
        setSelectedCard(null)
        setTargetCard(null)

        if (attacker.isPlayer) {
          setBattleState("enemyTurn")
          setTimeout(() => {
            performEnemyTurn()
          }, 1000)
        } else {
          setBattleState("selecting")
        }
      }, 1000)

      return
    }

    // Calculate damage
    let damage = calculateDamage(attacker, defender)

    // Check if attacker has an active ability and it's not on cooldown
    if (
      attacker.active_ability &&
      (!attacker.cooldowns[attacker.active_ability.name] || attacker.cooldowns[attacker.active_ability.name] <= 0)
    ) {
      // 50% chance to use ability
      if (Math.random() < 0.5) {
        const abilityResult = applyActiveAbility(attacker, defender, attacker.active_ability)

        // Add ability damage
        damage += abilityResult.damage

        // Add effects to defender
        defender.effects = [...defender.effects, ...abilityResult.effects]

        // Add to battle log
        abilityResult.log.forEach((log) => addToBattleLog(log))

        // Set cooldown
        if (attacker.active_ability.cooldown) {
          attacker.cooldowns[attacker.active_ability.name] = attacker.active_ability.cooldown
        }

        // Handle self-damage abilities
        if (attacker.active_ability.effect === "self_damage") {
          const selfDamage = Math.floor(attacker.hp * 0.1)
          attacker.currentHp = Math.max(0, attacker.currentHp - selfDamage)
        }
      }
    }

    // Check if defender can reflect damage
    if (canReflectDamage(defender)) {
      const reflectedDamage = Math.floor(damage * 0.5)
      addToBattleLog(`${defender.name} reflects ${reflectedDamage} damage back to ${attacker.name}!`)
      attacker.currentHp = Math.max(0, attacker.currentHp - reflectedDamage)
    }

    // Apply damage to defender
    defender.currentHp = Math.max(0, defender.currentHp - damage)

    // Update state based on who is attacking
    if (attacker.isPlayer) {
      setEnemyCards((prev) => prev.map((card) => (card.id === defender.id ? defender : card)))
      setPlayerCards((prev) => prev.map((card) => (card.id === attacker.id ? attacker : card)))
    } else {
      setPlayerCards((prev) => prev.map((card) => (card.id === defender.id ? defender : card)))
      setEnemyCards((prev) => prev.map((card) => (card.id === attacker.id ? attacker : card)))
    }

    // Show animation
    setAnimation({
      type: "attack",
      source: attacker.id,
      target: defender.id,
    })

    // Add to battle log
    addToBattleLog(`${attacker.name} attacks ${defender.name} for ${Math.floor(damage)} damage!`)

    // Check if defender is defeated
    if (defender.currentHp <= 0) {
      addToBattleLog(`${defender.name} has been defeated!`)
    }

    // Check if attacker's attack triggered a counter-attack
    if (defender.currentHp > 0 && canCounterAttack(defender)) {
      addToBattleLog(`${defender.name} counter-attacks!`)

      // Calculate counter damage (60% of normal damage)
      const counterDamage = Math.floor(calculateDamage(defender, attacker) * 0.6)
      attacker.currentHp = Math.max(0, attacker.currentHp - counterDamage)

      // Update state for counter attacker
      if (defender.isPlayer) {
        setPlayerCards((prev) => prev.map((card) => (card.id === defender.id ? defender : card)))
      } else {
        setEnemyCards((prev) => prev.map((card) => (card.id === defender.id ? defender : card)))
      }

      addToBattleLog(`${defender.name}'s counter-attack deals ${counterDamage} damage to ${attacker.name}!`)

      // Check if attacker is defeated by counter
      if (attacker.currentHp <= 0) {
        addToBattleLog(`${attacker.name} has been defeated by counter-attack!`)
      }
    }

    // Reset selection and change turn
    setTimeout(() => {
      setAnimation(null)
      setSelectedCard(null)
      setTargetCard(null)

      // Process end of turn effects
      const allCards = [...playerCards, ...enemyCards]
      const { updatedCards, log } = processEndOfTurn(allCards)

      // Update player and enemy cards
      setPlayerCards(updatedCards.filter((card) => card.isPlayer))
      setEnemyCards(updatedCards.filter((card) => !card.isPlayer))

      // Add logs
      log.forEach((logEntry) => addToBattleLog(logEntry))

      // Check if battle is over
      const remainingEnemies = enemyCards.filter((card) => card.currentHp > 0)
      const remainingPlayers = playerCards.filter((card) => card.currentHp > 0)

      if (remainingEnemies.length === 0) {
        // Player wins
        handleBattleEnd("win")
      } else if (remainingPlayers.length === 0) {
        // Player loses
        handleBattleEnd("loss")
      } else {
        // Continue battle
        if (attacker.isPlayer) {
          setBattleState("enemyTurn")
          setTimeout(() => {
            performEnemyTurn()
          }, 1000)
        } else {
          setBattleState("selecting")
        }
      }
    }, 1000)
  }

  const performEnemyTurn = () => {
    // Find a random living enemy card
    const livingEnemies = enemyCards.filter((card) => card.currentHp > 0)
    if (livingEnemies.length === 0) return

    const attacker = livingEnemies[Math.floor(Math.random() * livingEnemies.length)]

    // Find a random living player card
    const livingPlayers = playerCards.filter((card) => card.currentHp > 0)
    if (livingPlayers.length === 0) return

    const defender = livingPlayers[Math.floor(Math.random() * livingPlayers.length)]

    // Perform attack
    performAttack(attacker, defender)
  }

  const handleBattleEnd = async (result: "win" | "loss") => {
    setBattleResult(result)
    setBattleState("finished")

    if (result === "win") {
      addToBattleLog(`You have defeated ${stage.enemy_name}!`)

      // Save battle result
      try {
        const battleData = {
          userId: user!.username,
          stageId: stage.id,
          userCards: playerCards.map((card: any) => ({ id: card.id, finalHp: card.currentHp })),
          opponentCards: enemyCards.map((card: any) => ({ id: card.id, finalHp: card.currentHp })),
          result: "win" as const,
          rewardCoins: stage.reward_coins,
          rewardExp: stage.reward_exp,
        }

        await saveBattleResult(battleData)

        // Update user coins and exp
        await updateUserCoins(user!.coins + stage.reward_coins)
        await updateUserExp(stage.reward_exp)

        // Show rewards immediately instead of waiting 1.5 seconds
        setShowRewards(true)
      } catch (error) {
        console.error("Error saving battle result:", error)
      }
    } else {
      addToBattleLog(`You have been defeated by ${stage.enemy_name}!`)

      // Save battle result
      try {
        const battleData = {
          userId: user!.username,
          stageId: stage.id,
          userCards: playerCards.map((card: any) => ({ id: card.id, finalHp: card.currentHp })),
          opponentCards: enemyCards.map((card: any) => ({ id: card.id, finalHp: card.currentHp })),
          result: "loss" as const,
          rewardCoins: 0,
          rewardExp: Math.floor(stage.reward_exp / 4), // Consolation exp
        }

        await saveBattleResult(battleData)

        // Give some consolation exp
        await updateUserExp(Math.floor(stage.reward_exp / 4))
      } catch (error) {
        console.error("Error saving battle result:", error)
      }
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-orange-600 border-t-transparent mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Preparing battle...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBattleEnd} disabled={battleState === "finished" && !showRewards}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Stages
        </Button>
        <Badge
          className={battleResult === "win" ? "bg-green-600" : battleResult === "loss" ? "bg-red-600" : "bg-blue-600"}
        >
          {battleResult === "win"
            ? "Victory"
            : battleResult === "loss"
              ? "Defeat"
              : `${stage.name} - Level ${stage.level_number}`}
        </Badge>
      </div>

      {/* Enemy Cards */}
      <div className="grid grid-cols-3 gap-2">
        {enemyCards.map((card) => (
          <div
            key={card.id}
            className={`relative ${battleState === "attacking" && selectedCard ? "cursor-pointer" : ""} ${card.currentHp <= 0 ? "opacity-50" : ""}`}
            onClick={() =>
              battleState === "attacking" && selectedCard && card.currentHp > 0 ? handleTargetSelect(card) : null
            }
          >
            <BattleCard
              card={card}
              isTarget={targetCard?.id === card.id}
              isAnimating={animation?.target === card.id || animation?.source === card.id}
              animationType={animation?.type || ""}
            />
          </div>
        ))}
      </div>

      {/* Battle Log */}
      <Card className="mt-4">
        <CardContent className="p-3">
          <div className="h-24 overflow-y-auto text-sm space-y-1">
            {battleLog.map((log, index) => (
              <p key={index} className="text-xs">
                {log}
              </p>
            ))}
            <div ref={logEndRef} />
          </div>
        </CardContent>
      </Card>

      {/* Player Cards */}
      <div className="grid grid-cols-3 gap-2 mt-4">
        {playerCards.map((card) => (
          <div
            key={card.id}
            className={`relative ${battleState === "selecting" ? "cursor-pointer" : ""} ${card.currentHp <= 0 ? "opacity-50" : ""}`}
            onClick={() => (battleState === "selecting" && card.currentHp > 0 ? handleCardSelect(card) : null)}
          >
            <BattleCard
              card={card}
              isSelected={selectedCard?.id === card.id}
              isAnimating={animation?.target === card.id || animation?.source === card.id}
              animationType={animation?.type || ""}
            />

            {battleState === "selecting" && card.currentHp > 0 && (
              <div className="absolute inset-0 bg-blue-500/20 rounded-md flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <Badge className="bg-blue-600">Select</Badge>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Battle Status */}
      <div className="mt-4 text-center">
        {battleState === "selecting" && (
          <p className="text-sm text-muted-foreground">Select one of your cards to attack</p>
        )}
        {battleState === "attacking" && <p className="text-sm text-muted-foreground">Select an enemy card to attack</p>}
        {battleState === "enemyTurn" && <p className="text-sm text-orange-600">Enemy is attacking...</p>}
      </div>

      {/* Battle Results */}
      <AnimatePresence>
        {showRewards && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          >
            <Card className="w-full max-w-md">
              <CardContent className="p-6 text-center">
                <h2 className="text-2xl font-bold mb-4">{battleResult === "win" ? "Victory!" : "Defeat!"}</h2>

                <div className="space-y-4 mb-6">
                  {battleResult === "win" && (
                    <>
                      <div className="flex items-center justify-center gap-2">
                        <Coins className="h-6 w-6 text-yellow-500" />
                        <span className="text-xl font-bold">{stage.reward_coins} Coins</span>
                      </div>

                      <div className="flex items-center justify-center gap-2">
                        <Star className="h-6 w-6 text-blue-500" />
                        <span className="text-xl font-bold">{stage.reward_exp} EXP</span>
                      </div>
                    </>
                  )}

                  {battleResult === "loss" && (
                    <div className="flex items-center justify-center gap-2">
                      <Star className="h-6 w-6 text-blue-500" />
                      <span className="text-xl font-bold">{Math.floor(stage.reward_exp / 4)} EXP</span>
                    </div>
                  )}
                </div>

                <Button className="w-full" onClick={onBattleEnd}>
                  Continue
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
