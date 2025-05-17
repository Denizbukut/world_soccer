// lib/getWLDPrice.ts

export interface WLDPriceResponse {
  prices: {
    WLD: {
      USD: number;
    };
  };
}

export async function getWLDPrice(): Promise<number | null> {
  try {
    const res = await fetch(
      "https://app-backend.worldcoin.dev/public/v1/miniapps/prices?cryptoCurrencies=WLD&fiatCurrencies=USD"
    )

    if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`)

    const json = await res.json()
    console.log("API response:", json) // <-- Debug-Ausgabe

    const amountStr = json?.result?.prices?.WLD?.USD?.amount
    const decimals = json?.result?.prices?.WLD?.USD?.decimals

    if (!amountStr || typeof decimals !== "number") {
      console.error("Missing amount or decimals in response")
      return null
    }

    const amount = parseFloat(amountStr)
    return amount / 10 ** decimals
  } catch (err) {
    console.error("Fehler beim Abrufen des WLD-Preises:", err)
    return null
  }
}

