// Real "retail" reference prices used to compute the value of a deal.
// All values in USD.
//
// Ticket per-unit prices are derived from the average pack rate in
// `app/shop/page.tsx` (regularPackages = classic, legendaryPackages = elite).
// Card base values are anchored to the per-rarity minimum prices in
// `app/market-actions.ts` (legendary/elite/etc.) so deals stay consistent
// with what users would pay on the market.

export const TICKET_PRICE_USD = {
  classic: 0.05,
  elite: 0.08,
} as const

export const CARD_BASE_PRICE_USD: Record<string, number> = {
  basic: 0.1,
  common: 0.2,
  rare: 0.5,
  epic: 1.5,
  legendary: 4.0,
}

export const DEAL_DISCOUNT = 0.5 // 50% off the real price

export type DealRarity = keyof typeof CARD_BASE_PRICE_USD

function cardValue(rarity: string, level: number) {
  const base = CARD_BASE_PRICE_USD[rarity] ?? CARD_BASE_PRICE_USD.common
  return base * Math.max(1, level)
}

export function computeDealPrice(opts: {
  rarity: string
  cardLevel: number
  classicTickets: number
  eliteTickets: number
}) {
  const realPrice =
    cardValue(opts.rarity, opts.cardLevel) +
    opts.classicTickets * TICKET_PRICE_USD.classic +
    opts.eliteTickets * TICKET_PRICE_USD.elite

  const dealPrice = realPrice * DEAL_DISCOUNT
  return {
    realPrice: Number(realPrice.toFixed(2)),
    dealPrice: Number(dealPrice.toFixed(2)),
    discountPercentage: Math.round((1 - DEAL_DISCOUNT) * 100),
  }
}

export type DealTier = "daily" | "special"

export const DEAL_TIER_CONFIG: Record<
  DealTier,
  {
    rarities: string[]
    levelRange: [number, number]
    classicTicketsRange: [number, number]
    eliteTicketsRange: [number, number]
    descriptionPrefix: string
  }
> = {
  daily: {
    rarities: ["basic", "common", "rare"],
    levelRange: [1, 3],
    classicTicketsRange: [5, 10],
    eliteTicketsRange: [3, 7],
    descriptionPrefix: "Daily Deal",
  },
  special: {
    rarities: ["epic", "legendary"],
    levelRange: [3, 5],
    classicTicketsRange: [50, 200],
    eliteTicketsRange: [50, 200],
    descriptionPrefix: "Special Offer",
  },
}

export function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function pickOne<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
