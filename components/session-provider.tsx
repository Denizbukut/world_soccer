"use client"

import type { ReactNode } from "react"

export function SessionProvider({ children }: { children: ReactNode }) {
  // Just render children without any context
  return <>{children}</>
}
