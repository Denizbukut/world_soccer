"use server"

import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"

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
    reward: { type: "clan_xp", amount: 2 },
  },
]

export async function getClanMissions(clanId: number, username: string) {
  const supabase = createSupabaseServer()
  const today = new Date().toISOString().split("T")[0]

  // Clean up old missions
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
        const { data: newMission } = await supabase
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

        mission = newMission
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

  return { success: true, missions }
}

export async function incrementClanMission(clanId: number, missionType: string, amount = 1) {
 

  const supabase = createSupabaseServer()
  const today = new Date().toISOString().split("T")[0]

  const missionDef = CLAN_MISSIONS.find((m) => m.mission_type === missionType)
  if (!missionDef) {
    return { success: false }
  }

  // Mission vom heutigen Tag abrufen
  const { data: mission, error } = await supabase
    .from("clan_daily_missions")
    .select("*")
    .eq("clan_id", clanId)
    .eq("mission_type", missionType)
    .eq("mission_date", today)
    .single()
  
    


  if (error && error.code === "PGRST116") {
    // Noch kein Eintrag → neuen anlegen
    const initialProgress = Math.min(amount, missionDef.goal)

    const { error: insertError } = await supabase
      .from("clan_daily_missions")
      .insert({
        clan_id: clanId,
        mission_type: missionType,
        mission_date: today,
        goal: missionDef.goal,
        progress: initialProgress,
        completed: initialProgress >= missionDef.goal,
      })

    if (insertError) {
      console.error("Insert failed:", insertError)
      return { success: false }
    }

    return { success: true }
  }

  if (mission) {
    const newProgress = Math.min((mission.progress || 0) + amount, missionDef.goal)
    const completed = newProgress >= missionDef.goal

    const { error: updateError } = await supabase
      .from("clan_daily_missions")
      .update({
        progress: newProgress,
        completed: completed,
      })
      .eq("clan_id", clanId)
      .eq("mission_type", missionType)
      .eq("mission_date", today)

      console.log("Updating mission:", {
  missionType,
  amount,
  previousProgress: mission.progress,
  newProgress,
  clanId,
})


    if (updateError) {
      console.error("Update failed:", updateError)
      return { success: false }
    }
  }

  return { success: true }
}



export async function claimClanMissionReward(clanId: number, username: string, missionType: string) {
  const supabase = createSupabaseServer()
  const today = new Date().toISOString().split("T")[0]

  // Check if mission is completed
  const { data: mission } = await supabase
    .from("clan_daily_missions")
    .select("*")
    .eq("clan_id", clanId)
    .eq("mission_date", today)
    .eq("mission_type", missionType)
    .single()

  if (!mission || !mission.completed) {
    return { success: false, error: "Mission not completed" }
  }

  // Check if user already claimed
  const { data: existingClaim } = await supabase
    .from("clan_mission_claims")
    .select("*")
    .eq("clan_id", clanId)
    .eq("user_id", username)
    .eq("mission_type", missionType)
    .eq("mission_date", today)
    .single()

  if (existingClaim) {
    return { success: false, error: "Already claimed" }
  }

  const missionDef = CLAN_MISSIONS.find((m) => m.mission_type === missionType)
  if (!missionDef) return { success: false, error: "Invalid mission" }

  // Give reward
  const { reward } = missionDef
  const updates: any = {}

  if (reward.type === "regular_tickets") {
    const { data: user } = await supabase.from("users").select("tickets").eq("username", username).single()
    updates.tickets = (user?.tickets || 0) + reward.amount
  } else if (reward.type === "legendary_tickets") {
    const { data: user } = await supabase.from("users").select("legendary_tickets").eq("username", username).single()
    updates.legendary_tickets = (user?.legendary_tickets || 0) + reward.amount
  } else if (reward.type === "clan_xp") {
    const { data: clan } = await supabase.from("clans").select("xp").eq("id", clanId).single()
    await supabase
      .from("clans")
      .update({ xp: (clan?.xp || 0) + reward.amount })
      .eq("id", clanId)
  }

  if (Object.keys(updates).length > 0) {
    await supabase.from("users").update(updates).eq("username", username)
  }

  // Record claim
  await supabase.from("clan_mission_claims").insert({
    clan_id: clanId,
    user_id: username,
    mission_type: missionType,
    mission_date: today,
  })

  revalidatePath("/clan")
  return { success: true }
}
