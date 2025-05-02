"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Layers, Package, Menu, ShoppingBag } from "lucide-react"

export default function MobileNav() {
  const pathname = usePathname()

  const isActive = (path: string) => {
    return pathname === path
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex justify-around items-center h-16">
        <Link
          href="/"
          className={`flex flex-col items-center justify-center w-full h-full ${
            isActive("/") ? "text-blue-500" : "text-gray-500"
          }`}
        >
          <Home className="h-5 w-5" />
          <span className="text-xs mt-1">Home</span>
        </Link>
        <Link
          href="/collection"
          className={`flex flex-col items-center justify-center w-full h-full ${
            isActive("/collection") ? "text-blue-500" : "text-gray-500"
          }`}
        >
          <Layers className="h-5 w-5" />
          <span className="text-xs mt-1">Collection</span>
        </Link>
        <Link
          href="/trade"
          className={`flex flex-col items-center justify-center w-full h-full ${
            isActive("/trade") ? "text-blue-500" : "text-gray-500"
          }`}
        >
          <ShoppingBag className="h-5 w-5" />
          <span className="text-xs mt-1">Trade</span>
        </Link>
        <Link
          href="/draw"
          className={`flex flex-col items-center justify-center w-full h-full ${
            isActive("/draw") ? "text-blue-500" : "text-gray-500"
          }`}
        >
          <Package className="h-5 w-5" />
          <span className="text-xs mt-1">Packs</span>
        </Link>
        <Link
          href="/profile"
          className={`flex flex-col items-center justify-center w-full h-full ${
            isActive("/profile") ? "text-blue-500" : "text-gray-500"
          }`}
        >
          <Menu className="h-5 w-5" />
          <span className="text-xs mt-1">More</span>
        </Link>
      </div>
    </div>
  )
}
