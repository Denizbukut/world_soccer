"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Trophy, 
  Activity,
  Target,
  MessageCircle,
  Zap,
  ChevronDown,
  ChevronUp,
  Gift,
  Coins,
  CreditCard
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import WeekendLeagueCountdown from "@/components/weekend-league-countdown"

const homeTeam = {
  username: "BarcaFan",
  shortName: "BAR",
  color: "bg-blue-600",
  badge: "/world-soccer/barcelona_badge.png"
}

const awayTeam = {
  username: "Madridista",
  shortName: "RMA", 
  color: "bg-white",
  badge: "/world-soccer/real_madrid_badge.png"
}

const comments = [
  "⚽ GOAL! Lewandowski with a brilliant finish! 1-0 Barcelona!",
  "🎯 Great save by Courtois! Real Madrid defending well.",
  "⚽ GOAL! Bellingham equalizes! 1-1!",
  "💥 What a match! Both teams playing attacking football!",
  "⚽ GOAL! Lewandowski again! 2-1 Barcelona!",
  "🔥 End to end action! This is football at its finest!"
]

export default function MatchSimulation() {
  const [currentMinute, setCurrentMinute] = useState(67)
  const [homeScore, setHomeScore] = useState(2)
  const [awayScore, setAwayScore] = useState(1)
  const [possession, setPossession] = useState({ home: 58, away: 42 })
  const [shots, setShots] = useState({ home: 8, away: 5 })
  const [currentComment, setCurrentComment] = useState(comments[4])
  const [commentIndex, setCommentIndex] = useState(4)
  const [showRewards, setShowRewards] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setCommentIndex(prev => {
        const newIndex = (prev + 1) % comments.length
        setCurrentComment(comments[newIndex])
        return newIndex
      })
    }, 4000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-2">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-2"
      >
        <h2 className="text-xl md:text-2xl font-bold text-yellow-400 mb-1 drop-shadow-lg">
          Live Match Preview
        </h2>
        <p className="text-sm text-gray-300 mb-1">
          Experience the future of football gaming
        </p>
        <p className="text-sm font-bold text-orange-400">
          Coming Soon
        </p>
      </motion.div>

      {/* Match Display */}
      <Card className="mb-2 bg-gradient-to-br from-orange-900/40 to-black/60 border-orange-500/30">
        <CardContent className="p-4">
          {/* Teams and Score */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className={`w-10 h-10 rounded-full ${homeTeam.color} flex items-center justify-center border-2 border-white/20`}>
                  <img 
                    src={homeTeam.badge} 
                    alt="Barcelona Badge"
                    className="w-6 h-6 object-contain"
                    onError={(e) => {
                      const target = e.currentTarget as HTMLImageElement
                      target.style.display = 'none'
                      const fallback = target.nextElementSibling as HTMLElement
                      if (fallback) fallback.style.display = 'flex'
                    }}
                  />
                  <div className="w-6 h-6 hidden items-center justify-center text-white font-bold text-xs">
                    {homeTeam.shortName}
                  </div>
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-300 font-medium">@{homeTeam.username}</div>
                <div className="text-xl font-bold text-yellow-400">{homeScore}</div>
              </div>
            </div>

            <div className="text-center">
              <div className="text-xs bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold mb-1 px-2 py-1 rounded-lg border border-orange-400/30">Quali Game</div>
              <div className="text-base font-bold text-white mb-1">{currentMinute}'</div>
              <div className="text-xs text-gray-400">Live</div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-center">
                <div className="text-xs text-gray-300 font-medium">@{awayTeam.username}</div>
                <div className="text-xl font-bold text-yellow-400">{awayScore}</div>
              </div>
              <div className="relative">
                <div className={`w-10 h-10 rounded-full ${awayTeam.color} flex items-center justify-center border-2 border-gray-300`}>
                  <img 
                    src={awayTeam.badge} 
                    alt="Real Madrid Badge"
                    className="w-6 h-6 object-contain"
                    onError={(e) => {
                      const target = e.currentTarget as HTMLImageElement
                      target.style.display = 'none'
                      const fallback = target.nextElementSibling as HTMLElement
                      if (fallback) fallback.style.display = 'flex'
                    }}
                  />
                  <div className="w-6 h-6 hidden items-center justify-center text-gray-800 font-bold text-xs">
                    {awayTeam.shortName}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Match Image */}
          <div className="relative mb-3">
            <div className="w-full h-32 bg-gradient-to-br from-orange-600 to-black rounded-lg flex items-center justify-center overflow-hidden">
              <div className="text-center text-white">
                <div className="text-3xl mb-1">⚽</div>
                <div className="text-sm font-bold">Match in Progress</div>
                <div className="text-xs opacity-80">Advanced Match Engine</div>
              </div>
            </div>
            <div className="absolute top-2 right-2">
              <Badge className="bg-red-500 text-white text-xs px-1 py-0.5">
                LIVE
              </Badge>
            </div>
          </div>

          {/* Live Comment */}
          <motion.div
            key={commentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-3 p-2 bg-gradient-to-r from-orange-900/40 to-black/60 rounded-lg border border-orange-500/30"
          >
            <div className="flex items-center gap-2">
              <MessageCircle className="h-3 w-3 text-orange-400" />
              <span className="text-xs text-white font-medium">{currentComment}</span>
            </div>
          </motion.div>
        </CardContent>
      </Card>

      {/* Compact Statistics */}
      <div className="grid grid-cols-2 gap-3 mb-2">
        {/* Possession */}
        <Card className="bg-gradient-to-br from-orange-900/40 to-black/60 border-orange-500/30">
          <CardContent className="p-3">
            <div className="flex items-center gap-1 mb-2">
              <Activity className="h-3 w-3 text-orange-400" />
              <h3 className="text-xs font-bold text-white">Possession</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="text-center">
                  <div className="text-sm font-bold text-orange-400">{possession.home}%</div>
                  <div className="text-xs text-gray-300">@{homeTeam.username}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-bold text-red-400">{possession.away}%</div>
                  <div className="text-xs text-gray-300">@{awayTeam.username}</div>
                </div>
              </div>
              <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-orange-500 to-red-600 rounded-full"
                  style={{ width: `${possession.home}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shots */}
        <Card className="bg-gradient-to-br from-orange-900/40 to-black/60 border-orange-500/30">
          <CardContent className="p-3">
            <div className="flex items-center gap-1 mb-2">
              <Target className="h-3 w-3 text-orange-400" />
              <h3 className="text-xs font-bold text-white">Shots</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-300">Total</span>
                <div className="flex gap-3">
                  <span className="text-xs text-orange-400 font-bold">{shots.home}</span>
                  <span className="text-xs text-red-400 font-bold">{shots.away}</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-300">On Target</span>
                <div className="flex gap-3">
                  <span className="text-xs text-orange-400 font-bold">4</span>
                  <span className="text-xs text-red-400 font-bold">3</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Coming Soon Badge with Rewards Dropdown */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <div className="inline-block">
          <button
            onClick={() => setShowRewards(!showRewards)}
            className="flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-3 py-1.5 text-sm rounded-full hover:from-yellow-600 hover:to-orange-600 transition-all duration-200"
          >
            <Zap className="h-3 w-3" />
            <span>Weekend League Countdown</span>
            {showRewards ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>
          
          {/* Rewards Dropdown */}
          <AnimatePresence>
            {showRewards && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="mt-2 bg-gradient-to-br from-orange-900/40 to-black/60 backdrop-blur-md rounded-lg border border-orange-500/30 p-3"
              >
                <WeekendLeagueCountdown />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* KO System Preview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4"
      >
        <Card className="bg-gradient-to-br from-orange-900/40 to-black/60 border-orange-500/30">
          <CardContent className="p-4">
                         <div className="text-center mb-3">
               <h3 className="text-lg font-bold text-yellow-400 mb-1">Tournament Bracket</h3>
               <p className="text-xs text-gray-300">Knockout System Preview</p>
             </div>
             
                          {/* KO Bracket Visualization - Top 16 Users */}
             <div className="space-y-3">
               {/* Round of 16 */}
               <div className="bg-gradient-to-r from-orange-600/30 to-red-600/30 rounded p-2 border border-orange-500/30 text-center">
                 <div className="text-xs text-white font-bold">Round of 16</div>
               </div>
               
               {/* Quarter Finals */}
               <div className="grid grid-cols-2 gap-2">
                 <div className="bg-gradient-to-r from-yellow-600/30 to-orange-600/30 rounded p-2 border border-yellow-500/30">
                   <div className="text-xs text-white font-bold">Quarter Finals</div>
                 </div>
                 <div className="bg-gradient-to-r from-yellow-600/30 to-orange-600/30 rounded p-2 border border-yellow-500/30">
                   <div className="text-xs text-white font-bold">Quarter Finals</div>
                 </div>
               </div>
               
               {/* Semi Finals */}
               <div className="grid grid-cols-2 gap-2">
                 <div className="bg-gradient-to-r from-yellow-500/40 to-orange-500/40 rounded p-2 border border-yellow-400/50">
                   <div className="text-xs text-white font-bold">Semi Finals</div>
                 </div>
                 <div className="bg-gradient-to-r from-yellow-500/40 to-orange-500/40 rounded p-2 border border-yellow-400/50">
                   <div className="text-xs text-white font-bold">Semi Finals</div>
                 </div>
               </div>
               
               {/* Final */}
               <div className="bg-gradient-to-r from-yellow-500/50 to-orange-500/50 rounded p-3 border border-yellow-400/60 text-center">
                 <div className="text-sm text-white font-bold">🏆 Final</div>
               </div>
             </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
