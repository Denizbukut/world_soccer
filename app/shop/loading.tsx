import { Skeleton } from "@/components/ui/skeleton"

export default function ShopLoading() {
  return (
    <div className="min-h-screen bg-[#f8f9ff] pb-20">
      {/* Header skeleton */}
      <header className="sticky top-0 z-10 backdrop-blur-md bg-white/80 border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <Skeleton className="h-7 w-20" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-16 rounded-full" />
            <Skeleton className="h-8 w-16 rounded-full" />
          </div>
        </div>
      </header>

      <main className="p-4 space-y-5 max-w-lg mx-auto">
        {/* Shop intro skeleton */}
        <Skeleton className="h-24 w-full rounded-2xl" />

        {/* Tabs skeleton */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-10 rounded-md" />
            <Skeleton className="h-10 rounded-md" />
          </div>

          {/* Cards skeleton */}
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-lg" />
            ))}
          </div>
        </div>

        {/* Info section skeleton */}
        <Skeleton className="h-32 w-full rounded-2xl" />
      </main>
    </div>
  )
}
