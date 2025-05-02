import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase"

export async function GET() {
  try {
    const supabase = getSupabaseServerClient()

    // Get all users
    const { data: users, error: usersError } = await supabase.from("users").select("id")

    if (usersError) {
      console.error("Error fetching users:", usersError)
      return NextResponse.json({ error: usersError.message }, { status: 500 })
    }

    let createdCount = 0
    let updatedCount = 0

    // Create or update user levels for each user
    for (const user of users) {
      // Check if user level already exists
      const { data: existingLevel, error: levelError } = await supabase
        .from("user_levels")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle()

      if (levelError && levelError.code !== "PGRST116") {
        console.error(`Error checking level for user ${user.id}:`, levelError)
        continue
      }

      if (existingLevel) {
        // Update existing level
        const { error: updateError } = await supabase
          .from("user_levels")
          .update({
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingLevel.id)

        if (updateError) {
          console.error(`Error updating level for user ${user.id}:`, updateError)
        } else {
          updatedCount++
        }
      } else {
        // Create new level
        const { error: insertError } = await supabase.from("user_levels").insert({
          user_id: user.id,
          level: 1,
          experience: 0,
        })

        if (insertError) {
          console.error(`Error creating level for user ${user.id}:`, insertError)
        } else {
          createdCount++
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Created ${createdCount} and updated ${updatedCount} user levels`,
    })
  } catch (error) {
    console.error("Error in seed-user-levels route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
