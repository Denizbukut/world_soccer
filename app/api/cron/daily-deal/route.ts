import { runDealCron } from "@/lib/deals/cron-handler"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  return runDealCron("daily", "daily_deals", req)
}

export async function POST(req: Request) {
  return runDealCron("daily", "daily_deals", req)
}
