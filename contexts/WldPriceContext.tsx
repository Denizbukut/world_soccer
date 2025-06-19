// contexts/WldPriceContext.tsx
"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from "react"

interface WldPriceContextType {
  price: number | null
}

const WldPriceContext = createContext<WldPriceContextType>({ price: null })

export const useWldPrice = () => useContext(WldPriceContext)

export const WldPriceProvider = ({ children }: { children: ReactNode }) => {
  const [price, setPrice] = useState<number | null>(null)
  const lastFetched = useRef<number>(0)

  useEffect(() => {
  const fetchPrice = async () => {
    const now = Date.now()
    const FIVE_MINUTES = 8 * 60 * 1000

    if (price !== null && now - lastFetched.current < FIVE_MINUTES) return

    try {
      const res = await fetch("/api/wld-price")
      const json = await res.json()
      if (json.price) {
        setPrice(json.price)
        lastFetched.current = now
      }
    } catch (err) {
      console.error("Error fetching WLD price:", err)
    }
  }

  fetchPrice() // Initial call

  const interval = setInterval(fetchPrice, 5 * 60 * 1000) // Every 5 minutes
  return () => clearInterval(interval)
}, [price])


  return (
    <WldPriceContext.Provider value={{ price }}>
      {children}
    </WldPriceContext.Provider>
  )
}
