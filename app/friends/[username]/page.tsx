"use client"

import { useEffect, useState } from "react"
import { getFriendCollection } from "@/app/actions/friends"
import CardItem from "@/components/card-item"
import MobileNav from "@/components/mobile-nav"
import { useParams } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"

export default function FriendCollectionPage() {
  const params = useParams<{ username: string }>()
  const username = params.username
  const [cards, setCards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const res = await getFriendCollection(username)
      if (res.success) setCards(res.cards ?? [])

      setLoading(false)
    }
    load()
  }, [username])

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <header className="p-4 bg-white border-b">
        <h1 className="text-lg font-bold">{username}'s Collection</h1>
      </header>
      <main className="p-4 grid grid-cols-2 gap-4">
        {loading && (
          <>
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-md" />
            ))}
          </>
        )}
        {!loading &&
          cards.map((card) => (
            <CardItem key={card.id} {...card} />

          ))}
        {!loading && cards.length === 0 && (
          <p className="col-span-2 text-center text-gray-500">No cards</p>
        )}
      </main>
      <MobileNav />
    </div>
  )
}