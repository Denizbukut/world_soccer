import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 })
    }

    const supabase = getSupabaseServerClient()

    // Check if username already exists
    const { data: existingUser } = await supabase.from("users").select("id").eq("username", username).single()

    if (existingUser) {
      return NextResponse.json({ error: "Username already exists" }, { status: 409 })
    }

    // Create new user
    const { data: newUser, error } = await supabase
      .from("users")
      .insert({
        username,
        password_hash: password, // In a real app, you would hash this
        tickets: 5,
        coins: 100,
        last_login: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating user:", error)
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        tickets: newUser.tickets,
        coins: newUser.coins,
      },
    })
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
