"use client"

import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, Trophy, Star, Info, ChevronDown, ChevronUp } from "lucide-react"
import { useRouter } from "next/navigation"
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
  const router = useRouter()
  const [userTeam, setUserTeam] = useState<UserTeam | null>(null)
  const [userCards, setUserCards] = useState<Card[]>([])
  const [opponentTeam, setOpponentTeam] = useState<UserTeam | null>(null)
  const [opponentCards, setOpponentCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null)
  const [battleInProgress, setBattleInProgress] = useState(false)
  const [showSimulation, setShowSimulation] = useState(false)
  const [showInfoDialog, setShowInfoDialog] = useState(false)
  const [userTeamExpanded, setUserTeamExpanded] = useState(false)
  const [opponentTeamExpanded, setOpponentTeamExpanded] = useState(false)

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
        await loadTeamCards(userTeamData as unknown as UserTeam, setUserCards)
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
        await loadTeamCards(opponentTeamData as unknown as UserTeam, setOpponentCards)
      }
    } catch (error) {
      console.error("Error loading teams:", error)
    } finally {
      setLoading(false)
    }
  }

     const loadTeamCards = async (team: UserTeam, setCards: React.Dispatch<React.SetStateAction<Card[]>>) => {
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

       const { data: cardsData, error } = await supabase
         .from("cards")
         .select("id, name, overall_rating, rarity")
         .in("id", cardIds)

       if (error) {
         console.error("Error fetching team cards:", error)
         setCards([])
       } else {
         setCards((cardsData as Card[]) || [])
       }
     } catch (error) {
       console.error("Error loading team cards:", error)
       setCards([])
     }
   }

       const loadDefaultOpponentCards = async (setCards: React.Dispatch<React.SetStateAction<Card[]>>, opponentUsername?: string) => {
      // Create default opponent cards with realistic ratings
      const defaultCards: Card[] = [
        { id: "default-gk", name: "Neuer", overall_rating: 88, rarity: "legendary" },
        { id: "default-df1", name: "Van Dijk", overall_rating: 89, rarity: "legendary" },
        { id: "default-df2", name: "Dias", overall_rating: 87, rarity: "epic" },
        { id: "default-df3", name: "Alaba", overall_rating: 86, rarity: "epic" },
        { id: "default-df4", name: "Walker", overall_rating: 85, rarity: "epic" },
        { id: "default-mf1", name: "De Bruyne", overall_rating: 91, rarity: "legendary" },
        { id: "default-mf2", name: "Modric", overall_rating: 88, rarity: "legendary" },
        { id: "default-mf3", name: "Kimmich", overall_rating: 87, rarity: "epic" },
        { id: "default-mf4", name: "Silva", overall_rating: 86, rarity: "epic" },
        { id: "default-fw1", name: "Haaland", overall_rating: 91, rarity: "legendary" },
        { id: "default-fw2", name: "Mbappé", overall_rating: 91, rarity: "legendary" }
      ]
      setCards(defaultCards)
    }

  const calculateTeamRating = (cards: Card[]) => {
    if (cards.length === 0) return 0
    
    const validCards = cards.filter(card => card.overall_rating && card.overall_rating > 0)
    
    if (validCards.length === 0) return 0
    
    const totalRating = validCards.reduce((sum, card) => sum + card.overall_rating, 0)
    const averageRating = totalRating / validCards.length
    return Math.round(averageRating * 10) / 10
  }

  const simulateBattle = () => {
    setShowSimulation(true)
  }

  const handleBattleEnd = async (result: any) => {
    const opponentUsername = localStorage.getItem('pvp_opponent') || "damla123"
    
    // Check battle limit AFTER the battle is completed
    try {
      const battleLimitResponse = await fetch('/api/check-battle-limit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: user!.username
        })
      })

      if (battleLimitResponse.ok) {
        const battleLimitResult = await battleLimitResponse.json()
        if (!battleLimitResult.success || !battleLimitResult.canBattle) {
          console.log('Battle limit reached after battle completion')
        }
      }
    } catch (error) {
      console.error('Error checking battle limit:', error)
    }
    
    try {
      if (result.winner === 'draw') {
        // Handle draw - no points change
        const selectedMode = JSON.parse(localStorage.getItem('selected_battle_mode') || '{"id": 1, "name": "PvP Battle"}')
        const response = await fetch('/api/update-prestige-points', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            winnerUsername: user!.username,
            loserUsername: opponentUsername,
            isDraw: true,
            battleModeId: selectedMode.id
          })
        })

        if (response.ok) {
          const data = await response.json()
          console.log('Draw - no prestige points changed:', data)
        }
      } else {
        // Handle win/loss
        const winnerUsername = result.winner === 'user' ? user!.username : opponentUsername
        const loserUsername = result.winner === 'user' ? opponentUsername : user!.username
        
        const selectedMode = JSON.parse(localStorage.getItem('selected_battle_mode') || '{"id": 1, "name": "PvP Battle"}')
        const response = await fetch('/api/update-prestige-points', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            winnerUsername,
            loserUsername,
            isDraw: false,
            battleModeId: selectedMode.id
          })
        })

        if (response.ok) {
          const data = await response.json()
          console.log('Prestige points updated:', data)
        } else {
          console.error('Failed to update prestige points')
        }
      }
    } catch (error) {
      console.error('Error updating prestige points:', error)
    }
    
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

            {/* Team Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* User Team */}
              <Card className="bg-gradient-to-br from-green-900/40 to-black/60 border-green-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white">Your Team</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setUserTeamExpanded(!userTeamExpanded)}
                      className="text-white hover:bg-white/20 p-2"
                    >
                      {userTeamExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                    <span className="text-lg text-white font-semibold">
                      Rating: {calculateTeamRating(userCards)}
                    </span>
                  </div>
                  
                  <AnimatePresence>
                    {userTeamExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-2 pt-2 border-t border-green-500/30">
                          {userCards.map((card, index) => (
                            <div key={card.id} className="flex justify-between items-center bg-white/10 p-2 rounded">
                              <span className="text-white text-sm">{card.name}</span>
                              <span className="text-yellow-400 text-sm font-semibold">{card.overall_rating}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>

              {/* Opponent Team */}
              <Card className="bg-gradient-to-br from-red-900/40 to-black/60 border-red-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white">
                      {(localStorage.getItem('pvp_opponent') || "damla123")}'s Team
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setOpponentTeamExpanded(!opponentTeamExpanded)}
                      className="text-white hover:bg-white/20 p-2"
                    >
                      {opponentTeamExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                    <span className="text-lg text-white font-semibold">
                      Rating: {calculateTeamRating(opponentCards)}
                    </span>
                  </div>
                  
                  <AnimatePresence>
                    {opponentTeamExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-2 pt-2 border-t border-red-500/30">
                          {opponentCards.map((card, index) => (
                            <div key={card.id} className="flex justify-between items-center bg-white/10 p-2 rounded">
                              <span className="text-white text-sm">{card.name}</span>
                              <span className="text-yellow-400 text-sm font-semibold">{card.overall_rating}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </div>

            {/* PvP Statistics */}
            <div className="mb-8">
              <PvpStats username={user?.username || ""} />
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
              <PvpStats username={user?.username || ""} />
            </div>
          </>
        )}

        {/* Info Dialog */}
        <Dialog open={showInfoDialog} onOpenChange={setShowInfoDialog}>
          <DialogContent className="bg-gradient-to-br from-blue-900 to-black border-blue-500/30 text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-center text-white">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Info className="w-6 h-6 text-blue-400" />
                  <span>Battle Info</span>
                </div>
              </DialogTitle>
            </DialogHeader>
            <div className="text-center space-y-4">
              <div className="bg-blue-800/30 p-4 rounded-lg border border-blue-500/30">
                <p className="text-lg font-semibold text-blue-200">
                  The better the team rating and player levels, the better your team!!!
                </p>
              </div>
              <div className="text-sm text-gray-300">
                <p>• Higher overall ratings increase your chances of winning</p>
                <p>• Player levels provide additional bonuses</p>
                <p>• Team chemistry and formation matter</p>
                <p>• Only users with a complete team (11 players) can participate in PvP battles</p>
                <p>• Battle limits reset daily at midnight - you get 5 new battles every day</p>
                <p>• To start a battle: Click "Challenge" on a player, then select your battle mode</p>
              </div>
              
              <div className="bg-orange-800/30 p-4 rounded-lg border border-orange-500/30 mt-4">
                <p className="text-lg font-semibold text-orange-200">
                  Collect as many prestige points as possible to qualify for the weekend league playoffs!
                </p>
                <p className="text-sm text-orange-300 mt-2">
                  The top 30 users will qualify for the playoffs!!!
                </p>
                <p className="text-sm text-yellow-300 mt-2">
                  🏆 Places 1 and 2 directly qualify for the weekend league!
                </p>
                <p className="text-sm text-green-300 mt-2 font-bold">
                  🚀 Weekend League starts in 2 weeks!
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
