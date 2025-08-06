"use client"

import { useState, useEffect } from "react"
// Removed Next.js Image import - using regular img tags
import { Skeleton } from "@/components/ui/skeleton"

type SafeImageProps = {
  src: string | null | undefined
  alt: string
  fill?: boolean
  className?: string
  sizes?: string
  priority?: boolean
  width?: number
  height?: number
}

export function SafeImage({
  src,
  alt,
  fill = false,
  className = "",
  sizes,
  priority = false,
  width,
  height,
}: SafeImageProps) {
  const [imgSrc, setImgSrc] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    // Reset states when src changes
    setLoading(true)
    setError(false)

    // Determine the image source
    if (!src || typeof src !== "string" || src.trim() === "") {
      // Create a placeholder based on the alt text
      const characterName = alt.split("-")[0]?.trim() || alt
      const query = `${characterName} from anime, high quality, detailed, vibrant colors`
      setImgSrc(`/placeholder.svg?height=400&width=300&query=${encodeURIComponent(query)}`)
    } else {
      // For all images, use them directly
      setImgSrc(src)
    }

    // Log for debugging
    console.log(`SafeImage: Setting image source for ${alt}:`, src)
  }, [src, alt])

  const handleError = () => {
    console.error(`Image error loading: ${src}`)
    setError(true)
    setLoading(false)

    // Extract character name from alt text or use alt text directly
    const characterName = alt.split("-")[0]?.trim() || alt
    const query = `${characterName} from anime, high quality, detailed, vibrant colors`
    setImgSrc(`/placeholder.svg?height=400&width=300&query=${encodeURIComponent(query)}`)
  }

  const handleLoad = () => {
    setLoading(false)
    setError(false)
  }

  if (!imgSrc) {
    return <Skeleton className={`${fill ? "absolute inset-0" : "w-full h-full"} ${className}`} />
  }

  return (
    <>
      {loading && <Skeleton className={`${fill ? "absolute inset-0" : "w-full h-full"} ${className}`} />}
      <img
        src={imgSrc || "/placeholder.svg"}
        alt={alt}
        width={!fill ? width || 300 : undefined}
        height={!fill ? height || 400 : undefined}
        className={`${fill ? "absolute inset-0 w-full h-full" : ""} ${className} ${loading ? "opacity-0" : "opacity-100"} transition-opacity duration-300`}
        onError={handleError}
        onLoad={handleLoad}
      />
    </>
  )
}

export default SafeImage
