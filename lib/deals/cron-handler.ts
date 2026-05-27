import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import {
  DEAL_TIER_CONFIG,
  computeDealPrice,
  pickOne,
  randInt,
  type DealTier,
} from "./pricing"

function createSupabaseServer() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Supabase env vars missing")
  return createClient(url, key, { auth: { persistSession: false } })
}

function isAuthorized(req: Request) {
  const secret = process.env.CRON_SECRET
  // Allow unauthenticated calls only if CRON_SECRET is not configured at all
  // (so local dev works without configuring it). On Vercel, the secret is
  // automatically sent in the Authorization header for cron invocations.
  if (!secret) return true
  const header = req.headers.get("authorization")
  return header === `Bearer ${secret}`
}

export async function runDealCron(tier: DealTier, table: "daily_deals" | "special_offer", req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const config = DEAL_TIER_CONFIG[tier]
  const supabase = createSupabaseServer()
  const today = new Date().toISOString().split("T")[0]

  // Skip if today's deal already exists (idempotent reruns)
  const { data: existing } = await supabase.from(table).select("id").eq("date", today).maybeSingle()
  if (existing) {
    return NextResponse.json({ success: true, skipped: true, reason: "already exists", date: today, id: existing.id })
  }

  let { data: cards, error: cardsError } = await supabase
    .from("cards")
    .select("id, rarity")
    .in("rarity", config.rarities)
    .eq("obtainable", true)

  // Fallback for the high-tier pool: if none of the preferred rarities exist
  // in the deployed DB, fall back to the rarest available obtainable card.
  let usedFallback = false
  if ((!cards || cards.length === 0) && tier === "special") {
    const { data: allCards } = await supabase
      .from("cards")
      .select("id, rarity")
      .eq("obtainable", true)

    if (allCards && allCards.length > 0) {
      const counts = new Map<string, number>()
      for (const c of allCards) counts.set(c.rarity, (counts.get(c.rarity) ?? 0) + 1)
      const rarestRarity = [...counts.entries()].sort((a, b) => a[1] - b[1])[0][0]
      cards = allCards.filter((c) => c.rarity === rarestRarity)
      usedFallback = true
    }
  }

  if (cardsError || !cards || cards.length === 0) {
    return NextResponse.json(
      { success: false, error: "No eligible cards", details: cardsError?.message },
      { status: 500 },
    )
  }

  const card = pickOne(cards)
  const cardLevel = randInt(config.levelRange[0], config.levelRange[1])

  const tickets: { classic?: number; elite?: number; icon?: number } = {}
  for (const [type, range] of Object.entries(config.ticketRanges) as [
    "classic" | "elite" | "icon",
    [number, number],
  ][]) {
    tickets[type] = randInt(range[0], range[1])
  }

  const { dealPrice, discountPercentage } = computeDealPrice({
    rarity: card.rarity,
    cardLevel,
    classicTickets: tickets.classic,
    eliteTickets: tickets.elite,
    iconTickets: tickets.icon,
  })

  // special_offer has no sequence on `id`, so we compute the next id manually.
  let nextId: number | undefined
  if (table === "special_offer") {
    const { data: maxRow } = await supabase.from(table).select("id").order("id", { ascending: false }).limit(1).maybeSingle()
    nextId = (maxRow?.id ?? 0) + 1
  }

  const row: Record<string, unknown> = {
    date: today,
    card_id: card.id,
    card_level: cardLevel,
    price: dealPrice,
    description: `${config.descriptionPrefix} - 50% off`,
    discount_percentage: discountPercentage,
  }
  if (tickets.classic !== undefined) row.classic_tickets = tickets.classic
  if (tickets.elite !== undefined) row.elite_tickets = tickets.elite
  if (tickets.icon !== undefined) row.icon_tickets = tickets.icon
  if (nextId !== undefined) row.id = nextId

  const { data: inserted, error: insertError } = await supabase.from(table).insert(row).select().single()
  if (insertError) {
    return NextResponse.json({ success: false, error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, deal: inserted, usedFallback })
}
