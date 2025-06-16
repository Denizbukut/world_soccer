"use server"

import { createClient } from "@supabase/supabase-js"

function createSupabaseServer() {
  return createClient(process.env.SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || "", {
    auth: { persistSession: false },
  })
}

export async function incrementLegendaryDraw(username: string, count = 1) {
  const supabase = createSupabaseServer()
  const weekStart = "2025-06-16" // für diese Woche fix (global synchron)
  const contestEnd = new Date("2025-06-24T23:59:59Z")
  const now = new Date()

  if (now > contestEnd) {
    return { success: false, error: "The contest has ended. No more entries allowed." }
  }

  const { data, error } = await supabase
    .from("weekly_contest_entries")
    .select("legendary_count")
    .eq("user_id", username)
    .eq("week_start_date", weekStart)
    .single()

  if (error && error.code === "PGRST116") {
    await supabase.from("weekly_contest_entries").insert({
      user_id: username,
      week_start_date: weekStart,
      legendary_count: count,
    })
  } else {
    const currentCount = data?.legendary_count || 0
    await supabase
      .from("weekly_contest_entries")
      .update({ legendary_count: currentCount + count, updated_at: new Date().toISOString() })
      .eq("user_id", username)
      .eq("week_start_date", weekStart)
  }

  return { success: true }
}
