import { NextResponse } from "next/server"

let cachedPrice: number | null = null
let lastFetched = 0

export async function GET() {
  const now = Date.now()
  const FIVE_MIN = 5 * 60 * 1000

  if (cachedPrice && now - lastFetched < FIVE_MIN) {
    return NextResponse.json({ price: cachedPrice })
  }

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

    // Cache it
    cachedPrice = price
    lastFetched = now

    return NextResponse.json({ price })
  } catch (error) {
    console.error("API Proxy Error:", error)
    return NextResponse.json({ error: "Failed to fetch WLD price" }, { status: 500 })
  }
}
