"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
// Removed Next.js Image import - using regular img tags
import { toast } from "react-hot-toast"

import { api } from "~/trpc/react"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog"
import { Skeleton } from "~/components/ui/skeleton"

export default function TradesPage() {
  const { data: session } = useSession()
  const router = useRouter()

  const [listings, setListings] = useState<
    | {
        id: string
        cards: {
          id: string
          name: string
          image_url: string | null
          character: string | null
        }
        price: number
        user: {
          id: string
          name: string | null
          image: string | null
        }
      }[]
    | undefined
  >([])
  const [selectedListing, setSelectedListing] = useState<
    | {
        id: string
        cards: {
          id: string
          name: string
          image_url: string | null
          character: string | null
        }
        price: number
        user: {
          id: string
          name: string | null
          image: string | null
        }
      }
    | undefined
  >(undefined)
  const [offerPrice, setOfferPrice] = useState(0)
  const [open, setOpen] = useState(false)

  const { data, isLoading } = api.listings.getAll.useQuery()
  const createTrade = api.trades.create.useMutation()

  useEffect(() => {
    if (data) {
      setListings(data)
    }
  }, [data])

  if (!session?.user) {
    router.push("/")
    return null
  }

  const handleTrade = async () => {
    if (!selectedListing) return

    await createTrade.mutateAsync({
      listingId: selectedListing.id,
      offerPrice: offerPrice,
    })

    toast.success("Trade offer sent!")
    setOpen(false)
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-3xl font-bold">Trades</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            <Skeleton className="h-[200px] w-[150px]" />
            <Skeleton className="h-[200px] w-[150px]" />
            <Skeleton className="h-[200px] w-[150px]" />
            <Skeleton className="h-[200px] w-[150px]" />
          </>
        ) : (
          listings?.map((listing) => (
            <div key={listing.id} className="flex flex-col items-center justify-center rounded-md border p-2">
              <div className="relative h-32 w-24">
                <img
                  src={
                    listing.cards.image_url && listing.cards.image_url.trim() !== ""
                      ? listing.cards.image_url
                      : `/placeholder.svg?height=400&width=300&query=${encodeURIComponent(listing.cards.character || "anime")}%20character`
                  }
                  alt={listing.cards.name || "Card"}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
              <p className="text-sm font-bold">{listing.cards.name}</p>
              <p className="text-sm">Price: ${listing.price}</p>
              <p className="text-xs text-gray-500">Seller: {listing.user.name}</p>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={() => setSelectedListing(listing)}>
                  Make Offer
                </Button>
              </DialogTrigger>
            </div>
          ))
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Make an Offer</DialogTitle>
            <DialogDescription>Make an offer for the selected listing.</DialogDescription>
          </DialogHeader>
          {selectedListing ? (
            <div className="flex flex-col gap-4 py-4">
              <div className="flex items-center space-x-2">
                <div className="relative h-24 w-24">
                  <img
                    src={
                      selectedListing.cards.image_url && selectedListing.cards.image_url.trim() !== ""
                        ? selectedListing.cards.image_url
                        : `/placeholder.svg?height=400&width=300&query=${encodeURIComponent(selectedListing.cards.character || "anime")}%20character`
                    }
                    alt={selectedListing.cards.name || "Card"}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p className="text-sm font-bold">{selectedListing.cards.name}</p>
                  <p className="text-sm">Price: ${selectedListing.price}</p>
                  <p className="text-xs text-gray-500">Seller: {selectedListing.user.name}</p>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="price">Offer Price</Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="Enter your offer price"
                  onChange={(e) => setOfferPrice(Number(e.target.value))}
                />
              </div>
            </div>
          ) : (
            <p>No listing selected.</p>
          )}
          <Button onClick={handleTrade}>Submit Offer</Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
