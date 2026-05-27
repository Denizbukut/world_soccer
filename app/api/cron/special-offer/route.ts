import { runDealCron } from "@/lib/deals/cron-handler"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  return runDealCron("special", "special_offer", req)
}

export async function POST(req: Request) {
  return runDealCron("special", "special_offer", req)
}
