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
  icon: 0.15,
} as const

export const CARD_BASE_PRICE_USD: Record<string, number> = {
  basic: 0.1,
  common: 0.2,
  rare: 0.5,
  epic: 1.5,
  elite: 2.0,
  legendary: 4.0,
  ultimate: 6.0,
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
  classicTickets?: number
  eliteTickets?: number
  iconTickets?: number
}) {
  const realPrice =
    cardValue(opts.rarity, opts.cardLevel) +
    (opts.classicTickets ?? 0) * TICKET_PRICE_USD.classic +
    (opts.eliteTickets ?? 0) * TICKET_PRICE_USD.elite +
    (opts.iconTickets ?? 0) * TICKET_PRICE_USD.icon

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
    // Which ticket types this tier grants. The actual DB column name matches
    // each entry (e.g. classic -> classic_tickets, icon -> icon_tickets).
    ticketRanges: Partial<Record<"classic" | "elite" | "icon", [number, number]>>
    descriptionPrefix: string
  }
> = {
  daily: {
    rarities: ["basic", "common", "rare"],
    levelRange: [1, 3],
    ticketRanges: { classic: [5, 10], elite: [3, 7] },
    descriptionPrefix: "Daily Deal",
  },
  special: {
    rarities: ["epic", "elite", "legendary", "ultimate"],
    levelRange: [3, 5],
    ticketRanges: { elite: [50, 200], icon: [10, 30] },
    descriptionPrefix: "Special Offer",
  },
}

export function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function pickOne<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
