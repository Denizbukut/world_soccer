import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function createSupabaseServer() {
  return createClient(process.env.SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || "", {
    auth: { persistSession: false },
  })
}

const CLAN_MISSIONS = [
  {
    mission_type: "regular_packs",
    goal: 200,
    reward: { type: "regular_tickets", amount: 2 },
  },
  {
    mission_type: "legendary_cards",
    goal: 30,
    reward: { type: "legendary_tickets", amount: 2 },
  },
  {
    mission_type: "legendary_packs",
    goal: 50,
    reward: { type: "clan_xp", amount: 50 },
  },
]

export async function POST(request: NextRequest) {
  try {
    const { clanId, username } = await request.json()

    if (!clanId || !username) {
      return NextResponse.json({ success: false, error: "Missing clanId or username" })
    }

    const supabase = createSupabaseServer()
    const today = new Date().toISOString().split("T")[0]

    // Clean up old missions first
    await supabase.from("clan_daily_missions").delete().neq("mission_date", today)

    await supabase.from("clan_mission_claims").delete().neq("mission_date", today)

    const missions = await Promise.all(
      CLAN_MISSIONS.map(async (missionDef) => {
        // Get or create mission progress
        let { data: mission, error } = await supabase
          .from("clan_daily_missions")
          .select("*")
          .eq("clan_id", clanId)
          .eq("mission_date", today)
          .eq("mission_type", missionDef.mission_type)
          .single()

        if (error && error.code === "PGRST116") {
          // Create new mission
          const { data: newMission, error: insertError } = await supabase
            .from("clan_daily_missions")
            .insert({
              clan_id: clanId,
              mission_type: missionDef.mission_type,
              goal: missionDef.goal,
              progress: 0,
              completed: false,
              mission_date: today,
            })
            .select()
            .single()

          if (insertError) {
            console.error("Error creating mission:", insertError)
            mission = {
              progress: 0,
              completed: false,
            }
          } else {
            mission = newMission
          }
        }

        // Check if user has claimed this mission
        const { data: userClaim } = await supabase
          .from("clan_mission_claims")
          .select("*")
          .eq("clan_id", clanId)
          .eq("user_id", username)
          .eq("mission_type", missionDef.mission_type)
          .eq("mission_date", today)
          .single()

        return {
          mission_type: missionDef.mission_type,
          goal: missionDef.goal,
          progress: mission?.progress || 0,
          completed: mission?.completed || false,
          user_claimed: !!userClaim,
          reward: missionDef.reward,
        }
      }),
    )

    return NextResponse.json({ success: true, missions })
  } catch (error) {
    console.error("Error in clan missions API:", error)
    return NextResponse.json({ success: false, error: "Internal server error" })
  }
}
