"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Coins, Star, Lock, Trophy } from "lucide-react"
import { motion } from "framer-motion"
// Removed Next.js Image import - using regular img tags
import { toast } from "@/components/ui/use-toast"

type BattleStageSelectionProps = {
  stages: any[]
  loading: boolean
  onStageSelect: (stage: any) => void
  userLevel: number
}

export default function BattleStageSelection({ stages, loading, onStageSelect, userLevel }: BattleStageSelectionProps) {
  const [expandedStage, setExpandedStage] = useState<number | null>(0)

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="anime-loading mx-auto"></div>
        <p className="mt-4 text-purple-300">Loading battle stages...</p>
      </div>
    )
  }

  if (stages.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-purple-300 mb-4">No battle stages available</p>
        <Button
          onClick={async () => {
            try {
              const response = await fetch("/api/seed-battle-stages")
              const data = await response.json()
              if (data.success) {
                toast({
                  title: "Success",
                  description: `Added ${data.message}`,
                })
                window.location.reload()
              } else {
                toast({
                  title: "Error",
                  description: data.error || "Failed to add battle stages",
                  variant: "destructive",
                })
              }
            } catch (error) {
              console.error("Error seeding battle stages:", error)
              toast({
                title: "Error",
                description: "Failed to add battle stages",
                variant: "destructive",
              })
            }
          }}
          className="anime-button"
        >
          Add Battle Stages
        </Button>
      </div>
    )
  }

  const toggleStage = (index: number) => {
    setExpandedStage(expandedStage === index ? null : index)
  }

  return (
    <div className="space-y-6">
      {stages.map((stageGroup, stageIndex) => {
        const stageNumber = stageGroup[0]?.stage_number
        const isLocked = userLevel < (stageNumber - 1) * 7

        return (
          <motion.div
            key={stageIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * stageIndex }}
          >
            <Card className={`anime-card ${isLocked ? "opacity-70" : ""}`}>
              <CardHeader
                className="cursor-pointer flex flex-row items-center justify-between"
                onClick={() => !isLocked && toggleStage(stageIndex)}
              >
                <div>
                  <CardTitle className="flex items-center gap-2 text-white">
                    {isLocked ? (
                      <Lock className="h-5 w-5 text-purple-400" />
                    ) : (
                      <Trophy className="h-5 w-5 text-yellow-400" />
                    )}
                    Stage {stageNumber}
                  </CardTitle>
                  <CardDescription className="text-purple-300">
                    {isLocked ? `Unlocks at level ${(stageNumber - 1) * 7}` : `${stageGroup.length} levels available`}
                  </CardDescription>
                </div>
                {isLocked ? (
                  <Badge variant="outline" className="text-purple-300 border-purple-500/30">
                    Locked
                  </Badge>
                ) : (
                  <Button variant="ghost" size="sm" className="text-purple-300 hover:text-white hover:bg-purple-500/20">
                    {expandedStage === stageIndex ? "Hide" : "Show"} Levels
                  </Button>
                )}
              </CardHeader>

              {expandedStage === stageIndex && !isLocked && (
                <CardContent>
                  <div className="space-y-3">
                    {stageGroup.map((level) => {
                      const isLevelLocked = userLevel < level.enemy_level - 5

                      return (
                        <motion.div
                          key={level.id}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          transition={{ duration: 0.3 }}
                        >
                          <Card className={`anime-card ${isLevelLocked ? "opacity-70" : ""}`}>
                            <CardHeader className="py-3">
                              <div className="flex justify-between items-center">
                                <div>
                                  <CardTitle className="text-base text-white">{level.name}</CardTitle>
                                  <CardDescription className="text-xs text-purple-300">
                                    {level.description}
                                  </CardDescription>
                                </div>
                                <Badge className="bg-gradient-to-r from-purple-400 to-purple-600 border-0">
                                  Level {level.level_number}
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="py-2">
                              <div className="flex gap-3">
                                <div className="relative w-16 h-16 overflow-hidden rounded-md">
                                  <img
                                    src={
                                      level.enemy_avatar ||
                                      "/placeholder.svg?height=200&width=200&query=anime%20character" ||
                                      "/placeholder.svg" ||
                                      "/placeholder.svg"
                                    }
                                    alt={level.enemy_name}
                                    className="absolute inset-0 w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-white">{level.enemy_name}</p>
                                  <div className="flex items-center gap-1 mt-1">
                                    <Star className="h-4 w-4 text-yellow-400" />
                                    <span className="text-xs text-yellow-200">Level {level.enemy_level}</span>
                                  </div>
                                  <div className="flex items-center gap-3 mt-2">
                                    <div className="flex items-center gap-1 text-xs">
                                      <Coins className="h-3 w-3 text-yellow-400" />
                                      <span className="text-yellow-200">{level.reward_coins}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs">
                                      <Star className="h-3 w-3 text-blue-400" />
                                      <span className="text-blue-200">{level.reward_exp} EXP</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                            <CardFooter className="py-2">
                              <Button
                                className="w-full anime-button"
                                size="sm"
                                disabled={isLevelLocked}
                                onClick={() => onStageSelect(level)}
                              >
                                {isLevelLocked ? `Requires Level ${level.enemy_level - 5}` : "Battle"}
                              </Button>
                            </CardFooter>
                          </Card>
                        </motion.div>
                      )
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}
