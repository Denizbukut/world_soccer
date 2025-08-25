import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase"

export async function GET() {
  try {
    const supabase = getSupabaseServerClient()

    // Get all battle history entries
    const { data, error } = await supabase
      .from("battle_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20)

    if (error) {
      console.error("Error fetching battle history:", error)
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        details: error 
      })
    }

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      entries: data,
      message: `Found ${data?.length || 0} battle history entries`
    })

  } catch (error) {
    console.error("Error in test-battle-history:", error)
    return NextResponse.json({ 
      success: false, 
      error: "An unexpected error occurred" 
    })
  }
}
