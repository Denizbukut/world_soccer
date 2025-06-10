// ✅ app/api/draw/route.ts → korrekt für App Router
import { NextResponse } from "next/server"
import { drawCards } from "@/app/actions"

export async function POST(req: Request) {
  try {
    const { username, cardType } = await req.json()

    if (!username || !cardType) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
    }

    const result = await drawCards(username, cardType, 1)

    return NextResponse.json(result)
  } catch (error) {
    console.error("API /draw error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
