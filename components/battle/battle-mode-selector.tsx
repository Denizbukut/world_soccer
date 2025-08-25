"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trophy, Users, Target, Zap } from "lucide-react"

interface BattleMode {
  id: number
  name: string
  description: string
  prestige_points_winner: number
  prestige_points_loser: number
  prestige_points_draw: number
  min_players: number
  max_players: number
  is_active: boolean
}

interface BattleModeSelectorProps {
  onModeSelect: (mode: BattleMode) => void
  selectedMode?: BattleMode
}

export default function BattleModeSelector({ onModeSelect, selectedMode }: BattleModeSelectorProps) {
  const [battleModes, setBattleModes] = useState<BattleMode[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBattleModes()
  }, [])

  const fetchBattleModes = async () => {
    try {
      const response = await fetch('/api/battle-modes')
      const data = await response.json()
      
      if (data.success) {
        setBattleModes(data.battleModes)
      } else {
        console.error('Failed to fetch battle modes:', data.error)
      }
    } catch (error) {
      console.error('Error fetching battle modes:', error)
    } finally {
      setLoading(false)
    }
  }

  const getModeIcon = (modeName: string) => {
    switch (modeName.toLowerCase()) {
      case 'pvp standard':
        return <Trophy className="h-5 w-5 text-yellow-500" />
      case 'quick battle':
        return <Zap className="h-5 w-5 text-blue-500" />
      case 'elite battle':
        return <Target className="h-5 w-5 text-red-500" />
      case 'friendly match':
        return <Users className="h-5 w-5 text-green-500" />
      case 'tournament mode':
        return <Trophy className="h-5 w-5 text-purple-500" />
      default:
        return <Trophy className="h-5 w-5 text-gray-500" />
    }
  }

  const getModeColor = (modeName: string) => {
    switch (modeName.toLowerCase()) {
      case 'pvp standard':
        return 'border-orange-500 bg-gradient-to-r from-orange-500 to-red-500'
      case 'quick battle':
        return 'border-orange-500 bg-gradient-to-r from-orange-500 to-red-500'
      case 'elite battle':
        return 'border-orange-500 bg-gradient-to-r from-orange-500 to-red-500'
      case 'friendly match':
        return 'border-orange-500 bg-gradient-to-r from-orange-500 to-red-500'
      case 'tournament mode':
        return 'border-orange-500 bg-gradient-to-r from-orange-500 to-red-500'
      default:
        return 'border-orange-500 bg-gradient-to-r from-orange-500 to-red-500'
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading battle modes...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Select Battle Mode</h2>
        <p className="text-gray-300">Choose your preferred battle type and rules</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {battleModes.map((mode) => (
          <motion.div
            key={mode.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card 
              className={`cursor-pointer transition-all duration-200 border-2 ${
                selectedMode?.id === mode.id 
                  ? 'border-orange-500 bg-orange-500' 
                  : `border-gray-600 hover:border-orange-400 ${getModeColor(mode.name)}`
              }`}
              onClick={() => onModeSelect(mode)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getModeIcon(mode.name)}
                                         <CardTitle className="text-lg text-black font-bold">{mode.name}</CardTitle>
                  </div>
                  <Badge className="bg-orange-600 text-white">
                    {mode.min_players}v{mode.max_players}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                                 <p className="text-black text-sm mb-4 font-medium">{mode.description}</p>
                
                <div className="space-y-2">
                                     <div className="flex justify-between items-center text-sm">
                     <span className="text-black font-semibold">Winner:</span>
                     <span className="text-green-600 font-bold">+20 PP</span>
                   </div>
                   
                   <div className="flex justify-between items-center text-sm">
                     <span className="text-black font-semibold">Loser:</span>
                     <span className="text-red-600 font-bold">
                       -10 PP
                     </span>
                   </div>
                   
                   <div className="flex justify-between items-center text-sm">
                     <span className="text-black font-semibold">Draw:</span>
                     <span className="text-blue-600 font-bold">
                       {mode.prestige_points_draw >= 0 ? '+' : ''}{mode.prestige_points_draw} PP
                     </span>
                   </div>
                </div>

                {selectedMode?.id === mode.id && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-4 pt-3 border-t border-orange-500/30"
                  >
                    <Button 
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                      onClick={(e) => {
                        e.stopPropagation()
                        onModeSelect(mode)
                      }}
                    >
                      Selected ✓
                    </Button>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
