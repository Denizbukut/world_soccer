import type { Metadata } from "next"
import TradeMenu from "@/components/trade-menu"
import ProtectedRoute from "@/components/protected-route"
import MobileNav from "@/components/mobile-nav"

export const metadata: Metadata = {
  title: "Trade Cards | Anime World TCG",
  description: "Buy and sell cards on the marketplace",
}

export default function TradePage() {
  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        <TradeMenu />
        <MobileNav />
      </div>
    </ProtectedRoute>
  )
}
