"use client"

import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, Trophy, Info, ChevronDown, ChevronUp } from "lucide-react"
import PvpBattleSimulation from "./pvp-battle-simulation"
import PvpStats from "./pvp-stats"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface UserTeam {
  id: string;
  user_id: string;
  slot_0?: string; // GK
  slot_1?: string; // DF1
  slot_2?: string; // DF2
  slot_3?: string; // DF3
  slot_4?: string; // DF4
  slot_5?: string; // MF1
  slot_6?: string; // MF2
  slot_7?: string; // MF3
  slot_8?: string; // MF4
  slot_9?: string; // FW1
  slot_10?: string; // FW2
  updated_at?: string;
}

interface Card {
  id: string;
  name: string;
  overall_rating: number;
  rarity: string;
  level?: number;
}

interface BattleResult {
  winner: string;
  score: string;
  events: string[];
}

interface PvpBattleArenaProps {
  onBackToBattle: () => void;
  onBattleEnd?: () => void;
}

export default function PvpBattleArena({ onBackToBattle, onBattleEnd }: PvpBattleArenaProps) {
  const { user } = useAuth()
  const [userTeam, setUserTeam] = useState<UserTeam | null>(null)
  const [userCards, setUserCards] = useState<Card[]>([])
  const [opponentTeam, setOpponentTeam] = useState<UserTeam | null>(null)
  const [opponentCards, setOpponentCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null)
  const [showSimulation, setShowSimulation] = useState(false)
  const [showInfoDialog, setShowInfoDialog] = useState(false)
  const [showUserTeam, setShowUserTeam] = useState(false)
  const [showOpponentTeam, setShowOpponentTeam] = useState(false)
  const [statsRefreshTrigger, setStatsRefreshTrigger] = useState(0)

  useEffect(() => {
    if (user?.username) {
      loadTeams()
    }
  }, [user?.username])

  const loadTeams = async () => {
    setLoading(true)
    try {
      const supabase = getSupabaseBrowserClient()
      if (!supabase) return

      // Load current user's team
      const { data: userTeamData, error: userError } = await supabase
        .from("user_team")
        .select("*")
        .eq("user_id", user!.username)
        .single()

      if (userError && userError.code !== "PGRST116") {
        console.error("Error fetching user team:", userError)
      } else if (userTeamData) {
        setUserTeam(userTeamData as unknown as UserTeam)
        await loadTeamCards(userTeamData as unknown as UserTeam, setUserCards, user!.username)
      }

      // Get opponent username from localStorage
      const opponentUsername = localStorage.getItem('pvp_opponent') || "damla123"

      // Load opponent's team
      const { data: opponentTeamData, error: opponentError } = await supabase
        .from("user_team")
        .select("*")
        .eq("user_id", opponentUsername)
        .single()

      if (opponentError && opponentError.code !== "PGRST116") {
        console.error("Error fetching opponent team:", opponentError)
        // Create default opponent team if opponent doesn't have one
        const defaultOpponentTeam: UserTeam = {
          id: `default-${opponentUsername}`,
          user_id: opponentUsername,
          slot_0: "default-gk",
          slot_1: "default-df1",
          slot_2: "default-df2", 
          slot_3: "default-df3",
          slot_4: "default-df4",
          slot_5: "default-mf1",
          slot_6: "default-mf2",
          slot_7: "default-mf3",
          slot_8: "default-mf4",
          slot_9: "default-fw1",
          slot_10: "default-fw2"
        }
        setOpponentTeam(defaultOpponentTeam)
        await loadDefaultOpponentCards(setOpponentCards, opponentUsername)
      } else if (opponentTeamData) {
        setOpponentTeam(opponentTeamData as unknown as UserTeam)
        await loadTeamCards(opponentTeamData as unknown as UserTeam, setOpponentCards, opponentUsername)
      }
    } catch (error) {
      console.error("Error loading teams:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadTeamCards = async (team: UserTeam, setCards: React.Dispatch<React.SetStateAction<Card[]>>, username?: string) => {
    try {
      const supabase = getSupabaseBrowserClient()
      if (!supabase) return

      const cardIds = Object.entries(team)
        .filter(([key, value]) => key.startsWith('slot_') && typeof value === 'string' && value)
        .map(([key, value]) => value as string)

      if (cardIds.length === 0) {
        setCards([])
        return
      }

      // First get the card details from cards table
      const { data: cardsData, error: cardsError } = await supabase
        .from("cards")
        .select("id, name, overall_rating, rarity")
        .in("id", cardIds)

      if (cardsError) {
        console.error("Error fetching cards:", cardsError)
        setCards([])
        return
      }

      // Then get the level information from user_cards table
      let userCardsData: any[] = []
      try {
        console.log("Querying user_cards for username:", username)
        const { data: userCardsResult, error: userCardsError } = await supabase
          .from("user_cards")
          .select("card_id, level")
          .eq("user_id", username || "")

        console.log("user_cards query result:", userCardsResult)
        console.log("user_cards query error:", userCardsError)

        if (userCardsError) {
          console.error("Error fetching user cards:", userCardsError)
          // Continue with default level 1 for all cards
        } else {
          userCardsData = userCardsResult || []
          console.log("Loaded user_cards data:", userCardsData)
        }
      } catch (error) {
        console.error("Error in user_cards query:", error)
        // Continue with default level 1 for all cards
      }

             // Combine the data
       const cardsWithLevels = cardsData.map((card: any) => {
         const userCards = userCardsData.filter((uc: any) => uc.card_id === card.id)
         console.log(`Card ${card.name}: found ${userCards.length} user cards:`, userCards)
         
         // Find the highest level card for this card_id
         let cardLevel = 1
         if (userCards.length > 0) {
           // Sort by level descending to get the highest level
           const sortedCards = userCards.sort((a: any, b: any) => (b.level || 1) - (a.level || 1))
           cardLevel = sortedCards[0].level || 1
           console.log(`Card ${card.name}: highest level found = ${cardLevel}`)
         }
         
         console.log(`Card ${card.name}: finalLevel=${cardLevel}`)
         return {
           ...card,
           level: cardLevel
         }
       })

      setCards(cardsWithLevels as Card[])
    } catch (error) {
      console.error("Error loading team cards:", error)
      setCards([])
    }
  }

  const loadDefaultOpponentCards = async (setCards: React.Dispatch<React.SetStateAction<Card[]>>, opponentUsername?: string) => {
    // Create default opponent cards with realistic ratings
    const defaultCards: Card[] = [
      { id: "default-gk", name: "Neuer", overall_rating: 88, rarity: "legendary", level: 1 },
      { id: "default-df1", name: "Van Dijk", overall_rating: 89, rarity: "legendary", level: 1 },
      { id: "default-df2", name: "Dias", overall_rating: 87, rarity: "epic", level: 1 },
      { id: "default-df3", name: "Alaba", overall_rating: 86, rarity: "epic", level: 1 },
      { id: "default-df4", name: "Walker", overall_rating: 85, rarity: "epic", level: 1 },
      { id: "default-mf1", name: "De Bruyne", overall_rating: 91, rarity: "legendary", level: 1 },
      { id: "default-mf2", name: "Modric", overall_rating: 88, rarity: "legendary", level: 1 },
      { id: "default-mf3", name: "Kimmich", overall_rating: 87, rarity: "epic", level: 1 },
      { id: "default-mf4", name: "Silva", overall_rating: 86, rarity: "epic", level: 1 },
      { id: "default-fw1", name: "Haaland", overall_rating: 91, rarity: "legendary", level: 1 },
      { id: "default-fw2", name: "Mbappé", overall_rating: 91, rarity: "legendary", level: 1 }
    ]
    setCards(defaultCards)
  }

  // Calculate level bonus based on rarity
  const getLevelBonus = (rarity: string, level: number = 1) => {
    const levelMultiplier = {
      'basic': 0.1,
      'rare': 0.15,
      'elite': 0.2,
      'ultimate': 0.35,
      'goat': 1.0
    };
    
    const multiplier = levelMultiplier[rarity.toLowerCase() as keyof typeof levelMultiplier] || 0.1;
    return (level - 1) * multiplier; // -1 because level 1 has no bonus
  };

  // Calculate individual card rating with level bonus
  const getCardRatingWithBonus = (card: Card) => {
    const levelBonus = getLevelBonus(card.rarity, card.level);
    const adjustedRating = card.overall_rating + levelBonus;
    return Math.round(adjustedRating * 10) / 10;
  };

  const calculateTeamRating = (cards: Card[]) => {
    if (cards.length === 0) return 0
    
    const validCards = cards.filter(card => card.overall_rating && card.overall_rating > 0)
    
    if (validCards.length === 0) return 0
    
    const totalRating = validCards.reduce((sum, card) => {
      const levelBonus = getLevelBonus(card.rarity, card.level);
      return sum + card.overall_rating + levelBonus;
    }, 0)
    const averageRating = totalRating / validCards.length
    return Math.round(averageRating * 10) / 10
  }

  const simulateBattle = async () => {
    console.log("simulateBattle called")
    
    // Check battle limit before starting the actual battle
    try {
      console.log("Checking battle limit for user:", user!.username)
      
      const response = await fetch('/api/check-battle-limit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: user!.username }),
      })

      const battleLimitCheck = await response.json()
      console.log("Battle limit check result:", battleLimitCheck)
      
      if (!battleLimitCheck.success) {
        alert("Error checking battle limit: " + (battleLimitCheck.error || "Unknown error"))
        return
      }

      if (!battleLimitCheck.canBattle) {
        alert(`Daily Battle Limit Reached! You have used ${battleLimitCheck.battlesUsed}/${battleLimitCheck.dailyLimit} daily battles. Come back tomorrow!`)
        return
      }

      // Increment battle count now that we're actually starting the battle
      console.log("Incrementing battle count...")
      const incrementResponse = await fetch('/api/increment-battle-count', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: user!.username }),
      })

      const incrementResult = await incrementResponse.json()
      console.log("Increment result:", incrementResult)
      
      if (!incrementResult.success) {
        alert("Error incrementing battle count: " + (incrementResult.error || "Unknown error"))
        return
      }

      console.log("Starting simulation...")
      setShowSimulation(true)
    } catch (error) {
      console.error("Error in simulateBattle:", error)
      alert("Error starting battle. Please try again.")
    }
  }

  const handleBattleEnd = async (result: any) => {
    const opponentUsername = localStorage.getItem('pvp_opponent') || "damla123"
    
    setBattleResult({
      winner: result.winner === 'user' ? user!.username : result.winner === 'opponent' ? opponentUsername : 'Draw',
      score: result.score,
      events: ["Match completed!"]
    })
    setShowSimulation(false)
    
    // Call onBattleEnd callback to update battle limits in parent component
    if (onBattleEnd) {
      onBattleEnd()
    }
    
    // Update PvP stats without reloading the page
    setStatsRefreshTrigger(prev => prev + 1)
  }

  const handleBackFromSimulation = () => {
    setShowSimulation(false)
  }

  const handleBackToBattle = () => {
    onBackToBattle()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-black flex items-center justify-center" translate="no">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading teams...</p>
        </div>
      </div>
    )
  }

  if (!userTeam) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-black flex items-center justify-center" translate="no">
        <div className="text-center text-white">
          <p className="mb-4">You need to create a team first!</p>
          <Button onClick={handleBackToBattle} className="bg-orange-600 hover:bg-orange-700">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Battle
          </Button>
        </div>
      </div>
    )
  }

  // Check if user has a complete team (all 11 players)
  const hasCompleteTeam = userCards.length === 11
  if (!hasCompleteTeam) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-black flex items-center justify-center" translate="no">
        <div className="text-center text-white">
          <p className="mb-4">You need a complete team with all 11 players to battle!</p>
          <p className="text-sm text-gray-300 mb-4">Current players: {userCards.length}/11</p>
          <Button onClick={handleBackToBattle} className="bg-orange-600 hover:bg-orange-700">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Battle
          </Button>
        </div>
      </div>
    )
  }

  // Show simulation if active
  if (showSimulation) {
    return (
      <PvpBattleSimulation
        userCards={userCards}
        opponentCards={opponentCards}
        opponentUsername={localStorage.getItem('pvp_opponent') || "damla123"}
        onBattleEnd={handleBattleEnd}
        onBack={handleBackFromSimulation}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-black" translate="no">
      {/* Header */}
      <header className="bg-orange-600 text-white p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Button
              onClick={handleBackToBattle}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold">PvP Battle</h1>
            <Button
              onClick={() => setShowInfoDialog(true)}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 p-2 ml-2"
            >
              <Info className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="p-4 max-w-4xl mx-auto">
        {!battleResult ? (
          <>
            {/* Battle Button - Above Teams */}
            <div className="text-center mb-6">
              <Button
                onClick={simulateBattle}
                className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold py-4 px-8 rounded-lg text-lg"
              >
                Start 90-Minute Battle!
              </Button>
            </div>

                         {/* Team Comparison - Individual Collapsible Menus */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
               {/* User Team - Collapsible */}
               <Card className="bg-gradient-to-br from-green-900/40 to-black/60 border-green-500/30">
                 <CardContent className="p-4">
                   <Button
                     onClick={() => setShowUserTeam(!showUserTeam)}
                     variant="ghost"
                     className="w-full flex justify-between items-center text-white hover:bg-white/10 p-0 h-auto"
                   >
                     <div className="flex items-center gap-4">
                       <Trophy className="w-5 h-5 text-yellow-400" />
                       <span className="text-lg font-bold">Your Team</span>
                     </div>
                     {showUserTeam ? (
                       <ChevronUp className="w-5 h-5 text-white" />
                     ) : (
                       <ChevronDown className="w-5 h-5 text-white" />
                     )}
                   </Button>
                   
                   <AnimatePresence>
                     {showUserTeam && (
                       <motion.div
                         initial={{ opacity: 0, height: 0 }}
                         animate={{ opacity: 1, height: "auto" }}
                         exit={{ opacity: 0, height: 0 }}
                         transition={{ duration: 0.3 }}
                         className="overflow-hidden"
                       >
                         <div className="mt-4">
                           <div className="flex items-center justify-center gap-2 mb-4">
                             <Trophy className="w-4 h-4 text-yellow-400" />
                                                           <span className="text-white font-semibold">
                                Rating: {calculateTeamRating(userCards)} (Base: {Math.round(userCards.reduce((sum, card) => sum + card.overall_rating, 0) / userCards.length * 10) / 10} + <span className="text-red-100 font-bold bg-red-800/70 px-1 rounded border border-red-400/50">{Math.round((calculateTeamRating(userCards) - userCards.reduce((sum, card) => sum + card.overall_rating, 0) / userCards.length) * 10) / 10}</span>)
                              </span>
                           </div>
                           <div className="space-y-2">
                                                           {userCards.map((card, index) => {
                                const levelBonus = getLevelBonus(card.rarity, card.level);
                                const hasBonus = levelBonus > 0;
                                return (
                                  <div key={card.id} className="flex justify-between items-center bg-white/10 p-2 rounded">
                                    <span className="text-white text-sm">{card.name}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-yellow-400 text-sm font-semibold">{card.overall_rating}</span>
                                      {hasBonus && (
                                        <span className="text-red-100 text-sm font-bold bg-red-800/70 px-2 py-1 rounded border border-red-400/50">+{levelBonus.toFixed(1)}</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                           </div>
                         </div>
                       </motion.div>
                     )}
                   </AnimatePresence>
                 </CardContent>
               </Card>

               {/* Opponent Team - Collapsible */}
               <Card className="bg-gradient-to-br from-red-900/40 to-black/60 border-red-500/30">
                 <CardContent className="p-4">
                   <Button
                     onClick={() => setShowOpponentTeam(!showOpponentTeam)}
                     variant="ghost"
                     className="w-full flex justify-between items-center text-white hover:bg-white/10 p-0 h-auto"
                   >
                     <div className="flex items-center gap-4">
                       <Trophy className="w-5 h-5 text-yellow-400" />
                       <span className="text-lg font-bold truncate">
                         {(localStorage.getItem('pvp_opponent') || "damla123")}'s Team
                       </span>
                     </div>
                     {showOpponentTeam ? (
                       <ChevronUp className="w-5 h-5 text-white" />
                     ) : (
                       <ChevronDown className="w-5 h-5 text-white" />
                     )}
                   </Button>
                   
                   <AnimatePresence>
                     {showOpponentTeam && (
                       <motion.div
                         initial={{ opacity: 0, height: 0 }}
                         animate={{ opacity: 1, height: "auto" }}
                         exit={{ opacity: 0, height: 0 }}
                         transition={{ duration: 0.3 }}
                         className="overflow-hidden"
                       >
                         <div className="mt-4">
                           <div className="flex items-center justify-center gap-2 mb-4">
                             <Trophy className="w-4 h-4 text-yellow-400" />
                                                           <span className="text-white font-semibold">
                                Rating: {calculateTeamRating(opponentCards)} (Base: {Math.round(opponentCards.reduce((sum, card) => sum + card.overall_rating, 0) / opponentCards.length * 10) / 10} + <span className="text-red-100 font-bold bg-red-800/70 px-1 rounded border border-red-400/50">{Math.round((calculateTeamRating(opponentCards) - opponentCards.reduce((sum, card) => sum + card.overall_rating, 0) / opponentCards.length) * 10) / 10}</span>)
                              </span>
                           </div>
                           <div className="space-y-2">
                                                           {opponentCards.map((card, index) => {
                                const levelBonus = getLevelBonus(card.rarity, card.level);
                                const hasBonus = levelBonus > 0;
                                return (
                                  <div key={card.id} className="flex justify-between items-center bg-white/10 p-2 rounded">
                                    <span className="text-white text-sm">{card.name}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-yellow-400 text-sm font-semibold">{card.overall_rating}</span>
                                      {hasBonus && (
                                        <span className="text-red-100 text-sm font-bold bg-red-800/70 px-2 py-1 rounded border border-red-400/50">+{levelBonus.toFixed(1)}</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                           </div>
                         </div>
                       </motion.div>
                     )}
                   </AnimatePresence>
                 </CardContent>
               </Card>
             </div>

                         {/* PvP Statistics */}
             <div className="mb-8">
               <PvpStats username={user?.username || ""} refreshTrigger={statsRefreshTrigger} />
             </div>
          </>
        ) : (
          <>
            {/* Battle Result */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center mb-8"
            >
              <Card className="bg-gradient-to-br from-yellow-900/40 to-black/60 border-yellow-500/30 max-w-2xl mx-auto">
                <CardContent className="p-8">
                  <h2 className="text-3xl font-bold text-white mb-6">Battle Result</h2>
                  
                  <div className="mb-6">
                    <div className="text-4xl font-bold text-white mb-2">{battleResult.score}</div>
                    <div className="text-xl text-yellow-400 font-semibold">
                      {battleResult.winner === "Draw" ? "It's a Draw!" : `Winner: ${battleResult.winner}`}
                    </div>
                  </div>

                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-white mb-3">Match Events</h3>
                    <div className="space-y-2">
                      {battleResult.events.map((event, index) => (
                        <div key={index} className="text-gray-300 text-sm">{event}</div>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={handleBackToBattle}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    Back to Battle Arena
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

                         {/* PvP Statistics - also shown after battle */}
             <div className="mb-8">
               <PvpStats username={user?.username || ""} refreshTrigger={statsRefreshTrigger} />
             </div>
          </>
        )}

        {/* Info Dialog */}
        <Dialog open={showInfoDialog} onOpenChange={setShowInfoDialog}>
          <DialogContent className="bg-gradient-to-br from-blue-900 to-black border-blue-500/30 text-white max-w-4xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-center text-white">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Info className="w-6 h-6 text-blue-400" />
                  <span>Battle Info</span>
                </div>
              </DialogTitle>
            </DialogHeader>
            <div className="text-center space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="text-lg font-semibold text-white mb-6">
                Card Level Bonuses
              </div>
              <div className="text-sm text-gray-300 space-y-2">
                <p>• Basic Cards: +0.1 rating per level</p>
                <p>• Rare Cards: +0.15 rating per level</p>
                <p>• Elite Cards: +0.2 rating per level</p>
                <p>• Ultimate Cards: +0.35 rating per level</p>
                <p>• GOAT Cards: +1.0 rating per level</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
