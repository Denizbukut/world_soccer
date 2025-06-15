import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const weekStart = "2025-06-09"

  try {
    // Nur die Top 20 abrufen
    const { data, error } = await supabase
      .from("weekly_contest_entries")
      .select("user_id, legendary_count")
      .eq("week_start_date", weekStart)
      .neq("user_id", "llegaraa2kwdd")
      .neq("user_id", "nadapersonal")
      .order("legendary_count", { ascending: false })
      .limit(20)

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
