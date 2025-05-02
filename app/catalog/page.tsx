"use client"

import { useAuth } from "@/contexts/auth-context"
import CardCatalog from "@/components/card-catalog"
import MobileNav from "@/components/mobile-nav"
import ProtectedRoute from "@/components/protected-route"

export default function CatalogPage() {
  const { user } = useAuth()

  return (
    <ProtectedRoute>
      <div className="pb-20">
        <header className="bg-orange-600 text-white p-4">
          <h1 className="text-2xl font-bold">Card Catalog</h1>
        </header>

        <main className="p-4">
          <CardCatalog username={user?.username} />
        </main>

        <MobileNav />
      </div>
    </ProtectedRoute>
  )
}
