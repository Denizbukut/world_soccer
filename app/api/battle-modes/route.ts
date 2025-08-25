import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabase = createSupabaseServerClient(cookieStore)
    
    if (!supabase) {
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      )
    }

    const { data: battleModes, error } = await supabase
      .from("battle_modes")
      .select("*")
      .eq("is_active", true)
      .order("id")

    if (error) {
      console.error("Error fetching battle modes:", error)
      return NextResponse.json(
        { error: "Failed to fetch battle modes" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      battleModes: battleModes || []
    })

  } catch (error) {
    console.error("Error in battle-modes:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
