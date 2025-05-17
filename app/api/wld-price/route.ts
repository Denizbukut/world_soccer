// app/api/wld-price/route.ts
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const res = await fetch(
      "https://app-backend.worldcoin.dev/public/v1/miniapps/prices?cryptoCurrencies=WLD&fiatCurrencies=USD"
    )

    const json = await res.json()

    const amountStr = json?.result?.prices?.WLD?.USD?.amount
    const decimals = json?.result?.prices?.WLD?.USD?.decimals

    if (!amountStr || typeof decimals !== "number") {
      return NextResponse.json({ error: "Missing price data" }, { status: 500 })
    }

    const price = parseFloat(amountStr) / 10 ** decimals
    return NextResponse.json({ price }) // <--- Nur Preis zurückgeben
  } catch (error) {
    console.error("API Proxy Error:", error)
    return NextResponse.json({ error: "Failed to fetch WLD price" }, { status: 500 })
  }
}
