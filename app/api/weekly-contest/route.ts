// /app/api/weekly-contest/route.ts
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { WEEKLY_CONTEST_CONFIG } from "@/lib/weekly-contest-config"

export async function GET() {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const weekStart = WEEKLY_CONTEST_CONFIG.weekStart

  const { data, error } = await supabase
    .from("weekly_contest_entries")
    .select("user_id, legendary_count")
    .eq("week_start_date", weekStart)
    .order("legendary_count", { ascending: false })

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data })
}
