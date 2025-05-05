import { Star } from "lucide-react"

type StarColor = "red" | "blue" | "gold"
type StarSize = "xs" | "sm" | "md" | "lg" | "xl"

export function getStarInfo(level: number): { color: StarColor; count: number } {
  // Max level is 15
  const cappedLevel = Math.min(level, 15)

  if (cappedLevel <= 5) {
    // Level 1-5: Red stars
    return { color: "red", count: cappedLevel }
  } else if (cappedLevel <= 10) {
    // Level 6-10: Blue stars
    return { color: "blue", count: cappedLevel - 5 }
  } else {
    // Level 11-15: Gold stars
    return { color: "gold", count: cappedLevel - 10 }
  }
}

export function renderStars(level: number, size: StarSize = "md") {
  const { color, count } = getStarInfo(level)

  // Map color to Tailwind classes with more prominent colors
  const colorClasses = {
    red: "text-red-600",
    blue: "text-blue-500",
    gold: "text-yellow-400",
  }

  // Map size to Lucide icon size with adjusted sizes
  const sizeClasses = {
    xs: "h-3 w-3",
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
    xl: "h-12 w-12",
  }

  // Border colors - much darker for better visibility
  const borderColors = {
    red: "#991b1b", // red-800
    blue: "#1e40af", // blue-800
    gold: "#854d0e", // amber-800
  }

  // Fill colors (solid)
  const fillColors = {
    red: "#ef4444", // red-500
    blue: "#3b82f6", // blue-500
    gold: "#f59e0b", // amber-500
  }

  // Highlight colors (lighter)
  const highlightColors = {
    red: "#fee2e2", // red-100
    blue: "#dbeafe", // blue-100
    gold: "#fef3c7", // amber-100
  }

  return (
    <div className="flex items-center">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="relative mx-0.5">
          {/* Main star with strong fill color and dark border */}
          <div className="relative">
            <Star
              className={`${sizeClasses[size]} ${colorClasses[color]}`}
              strokeWidth={2} // Increased stroke width for better visibility
              stroke={borderColors[color]}
              fill={fillColors[color]}
            />

            {/* Highlight spot for light reflection */}
            <div
              className="absolute rounded-full"
              style={{
                width: "30%",
                height: "30%",
                top: "30%",
                left: "30%",
                background: highlightColors[color],
                opacity: 0.8,
                filter: "blur(1px)",
                zIndex: 1,
              }}
            />
          </div>

          {/* Glow effect */}
          <div
            className="absolute inset-0 rounded-full opacity-70"
            style={{
              backgroundColor: fillColors[color],
              filter: "blur(3px)",
              transform: "scale(0.6)",
              mixBlendMode: "overlay",
              zIndex: -1,
            }}
          />
        </div>
      ))}
    </div>
  )
}

// Helper function to render a single star with the appropriate color based on level
export function renderSingleStar(level: number, size: StarSize = "md") {
  const { color } = getStarInfo(level)

  // Map color to Tailwind classes
  const colorClasses = {
    red: "text-red-600",
    blue: "text-blue-500",
    gold: "text-yellow-400",
  }

  // Map size to Lucide icon size
  const sizeClasses = {
    xs: "h-3 w-3",
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
    xl: "h-12 w-12",
  }

  // Border colors - much darker for better visibility
  const borderColors = {
    red: "#991b1b", // red-800
    blue: "#1e40af", // blue-800
    gold: "#854d0e", // amber-800
  }

  // Fill colors (solid)
  const fillColors = {
    red: "#ef4444", // red-500
    blue: "#3b82f6", // blue-500
    gold: "#f59e0b", // amber-500
  }

  // Highlight colors (lighter)
  const highlightColors = {
    red: "#fee2e2", // red-100
    blue: "#dbeafe", // blue-100
    gold: "#fef3c7", // amber-100
  }

  return (
    <div className="relative">
      <div className="relative">
        <Star
          className={`${sizeClasses[size]} ${colorClasses[color]}`}
          strokeWidth={2} // Increased stroke width for better visibility
          stroke={borderColors[color]}
          fill={fillColors[color]}
        />

        {/* Highlight spot for light reflection */}
        <div
          className="absolute rounded-full"
          style={{
            width: "30%",
            height: "30%",
            top: "30%",
            left: "30%",
            background: highlightColors[color],
            opacity: 0.8,
            filter: "blur(1px)",
            zIndex: 1,
          }}
        />
      </div>

      {/* Glow effect */}
      <div
        className="absolute inset-0 rounded-full opacity-70"
        style={{
          backgroundColor: fillColors[color],
          filter: "blur(3px)",
          transform: "scale(0.6)",
          mixBlendMode: "overlay",
          zIndex: -1,
        }}
      />
    </div>
  )
}
