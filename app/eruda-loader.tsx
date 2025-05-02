"use client"

import { useEffect } from "react"

export default function ErudaLoader() {
  useEffect(() => {
    // Load Eruda for debugging
    const script = document.createElement("script")
    script.src = "//cdn.jsdelivr.net/npm/eruda"
    script.onload = () => {
      // @ts-ignore
      window.eruda.init()
    }
    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [])

  return null
}
