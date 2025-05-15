"use client"

import type React from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Home, CreditCard, Package, Repeat, ShoppingCart, Coins } from "lucide-react"
import { motion } from "framer-motion"

export default function MobileNav() {
  const pathname = usePathname()

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 backdrop-blur-md bg-white/90 shadow-[0_-1px_10px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-4">
        <NavItem href="/" icon={<Home />} label="Home" isActive={pathname === "/"} />
        <NavItem href="/draw" icon={<Package />} label="Draw" isActive={pathname === "/draw"} />
        <NavItem href="/ani" icon={<Coins />} label="ANI" isActive={pathname === "/ani"} />
        <NavItem href="/collection" icon={<CreditCard />} label="Collection" isActive={pathname === "/collection"} />
        <NavItem href="/trade" icon={<Repeat />} label="Trade" isActive={pathname === "/trade"} />
      </div>
    </div>
  )
}

interface NavItemProps {
  href: string
  icon: React.ReactNode
  label: string
  isActive: boolean
}

function NavItem({ href, icon, label, isActive }: NavItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center justify-center w-full h-full text-xs font-medium transition-colors relative",
        isActive ? "text-violet-600" : "text-gray-500",
      )}
    >
      <div className="h-5 w-5 mb-1">{icon}</div>
      <span>{label}</span>

      {isActive && (
        <motion.div
          layoutId="nav-indicator"
          className="absolute -bottom-0 w-12 h-0.5 bg-violet-600 rounded-full"
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      )}
    </Link>
  )
}
