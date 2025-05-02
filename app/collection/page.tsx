"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import CardCatalog from "@/components/card-catalog"
import MobileNav from "@/components/mobile-nav"
import { Input } from "@/components/ui/input"
import { Search, Filter, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function CollectionPage() {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState("")
  const [showSearch, setShowSearch] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-white pb-20">
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200 p-2">
        <div className="flex justify-between items-center">
          {showSearch ? (
            <div className="flex items-center w-full">
              <Input
                type="text"
                placeholder="Search cards..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 border-gray-300 text-black"
              />
              <button
                onClick={() => {
                  setSearchTerm("")
                  setShowSearch(false)
                }}
                className="ml-2 p-2 rounded-full bg-gray-100 text-black"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-lg font-bold text-black">Card Collection</h1>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowSearch(true)} className="p-2 rounded-full bg-gray-100 text-black">
                  <Search className="h-4 w-4" />
                </button>
                <button className="p-2 rounded-full bg-gray-100 text-black">
                  <Filter className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      <main className="p-2 bg-white text-black">
        {error ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={() => setError(null)} variant="outline" className="text-black">
              Try Again
            </Button>
          </div>
        ) : (
          <CardCatalog username={user?.username} searchTerm={searchTerm} />
        )}
      </main>

      <MobileNav />
    </div>
  )
}
