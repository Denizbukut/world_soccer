"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import ProtectedRoute from "@/components/protected-route"
import MobileNav from "@/components/mobile-nav"
import BattleStageSelection from "@/components/battle/battle-stage-selection"
import BattleArena from "@/components/battle/battle-arena"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { motion } from "framer-motion"
import { toast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"

export default function BattlePage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState("story")
  const [selectedStage, setSelectedStage] = useState<any>(null)
  const [battleStarted, setBattleStarted] = useState(false)
  const [stages, setStages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchStages()
    }
  }, [user])

  const fetchStages = async () => {
    setLoading(true)
    try {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase
        .from("battle_stages")
        .select("*")
        .order("stage_number")
        .order("level_number")

      if (error) {
        console.error("Error fetching battle stages:", error)
      } else {
        // Group stages by stage_number
        const groupedStages: Record<number, any[]> = {}
        data?.forEach((stage) => {
          if (!groupedStages[stage.stage_number]) {
            groupedStages[stage.stage_number] = []
          }
          groupedStages[stage.stage_number].push(stage)
        })

        setStages(Object.values(groupedStages))
      }
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleStageSelect = (stage: any) => {
    setSelectedStage(stage)
    setBattleStarted(true)
  }

  const handleBattleEnd = () => {
    setBattleStarted(false)
    setSelectedStage(null)
  }

  const seedBattleStages = async () => {
    try {
      const response = await fetch("/api/seed-battle-stages")
      const data = await response.json()
      if (data.success) {
        toast({
          title: "Success",
          description: `Added ${data.message}`,
        })
        fetchStages()
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
  }

  const seedCardAbilities = async () => {
    try {
      const response = await fetch("/api/seed-abilities")
      const data = await response.json()
      if (data.success) {
        toast({
          title: "Success",
          description: data.message,
        })
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to add card abilities",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error seeding card abilities:", error)
      toast({
        title: "Error",
        description: "Failed to add card abilities",
        variant: "destructive",
      })
    }
  }

  return (
    <ProtectedRoute>
      <div className="pb-20">
        <header className="bg-orange-600 text-white p-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Battle Arena</h1>
            <div className="flex items-center gap-2">
              <div className="bg-white/20 px-2 py-1 rounded-md text-sm">Level {user?.level || 1}</div>
            </div>
          </div>
        </header>

        <main className="p-4">
          {battleStarted && selectedStage ? (
            <BattleArena stage={selectedStage} onBattleEnd={handleBattleEnd} />
          ) : (
            <Tabs defaultValue="story" className="w-full" onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="story">Story Mode</TabsTrigger>
                <TabsTrigger value="pvp">PvP Battles</TabsTrigger>
              </TabsList>

              <TabsContent value="story" className="mt-4 space-y-4">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  {stages.length === 0 && !loading ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground mb-4">No battle stages available</p>
                      <div className="flex flex-col gap-2 items-center">
                        <Button onClick={seedBattleStages} className="bg-orange-600 hover:bg-orange-700">
                          Add Battle Stages
                        </Button>
                        <Button onClick={seedCardAbilities} variant="outline">
                          Add Card Abilities
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <BattleStageSelection
                      stages={stages}
                      loading={loading}
                      onStageSelect={handleStageSelect}
                      userLevel={user?.level || 1}
                    />
                  )}
                </motion.div>
              </TabsContent>

              <TabsContent value="pvp" className="mt-4">
                <div className="text-center py-8">
                  <p className="text-muted-foreground">PvP Battles coming soon!</p>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </main>

        <MobileNav />
      </div>
    </ProtectedRoute>
  )
}
