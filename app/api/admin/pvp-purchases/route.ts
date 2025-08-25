import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  try {
    const { data, error } = await supabase
      .from("pvp_purchases")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100) // Limit to last 100 purchases for performance

    if (error) {
      console.error("Error fetching PvP purchases:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, purchases: data })
  } catch (error) {
    console.error("Error in PvP purchases API:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
