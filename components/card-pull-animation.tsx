"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { PokemonStyleCard } from "./pokemon-style-card"
import confetti from "canvas-confetti"
import { Sparkles, Star } from "lucide-react"
import type { Card } from "@/types/card"

interface CardPullAnimationProps {
  isOpen: boolean
  onClose: () => void
  card: Card
  onComplete?: () => void
}

export function CardPullAnimation({ isOpen, onClose, card, onComplete }: CardPullAnimationProps) {
  const [animationStage, setAnimationStage] = useState<"initial" | "beam" | "silhouette" | "reveal" | "complete">(
    "initial",
  )
  const [audioEnabled, setAudioEnabled] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const particlesRef = useRef<number | null>(null)
  const [particles, setParticles] = useState<any[]>([])

  // Reset animation state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setAnimationStage("initial")

      // Animation sequence timing
      const timeline = [
        { stage: "beam", delay: 800 },
        { stage: "silhouette", delay: 2000 },
        { stage: "reveal", delay: 3000 },
        { stage: "complete", delay: 4500 },
      ]

      // Execute the animation sequence
      timeline.forEach(({ stage, delay }) => {
        setTimeout(() => {
          setAnimationStage(stage as any)

          // Play appropriate sound effect
          if (stage === "beam") playSound("beam")
          if (stage === "reveal") {
            // Play rarity-specific sound
            if (card.rarity === "legendary") playSound("legendary")
            else if (card.rarity === "ultra-rare") playSound("rare")
            else playSound("card-flip")

            // Trigger rarity-specific effects
            triggerRarityEffect(card.rarity)
          }
          if (stage === "complete") playSound("success")
        }, delay)
      })

      // Initialize particles
      initParticles()
    }

    return () => {
      // Clean up animations and sounds
      if (particlesRef.current) {
        cancelAnimationFrame(particlesRef.current)
      }
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
    }
  }, [isOpen, card])

  // Initialize particles for background effect
  const initParticles = () => {
    const newParticles = []
    const colors = getRarityColors(card.rarity)

    for (let i = 0; i < 50; i++) {
      newParticles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 4 + 1,
        speedX: (Math.random() - 0.5) * 2,
        speedY: (Math.random() - 0.5) * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: Math.random() * 0.5 + 0.2,
        rotation: Math.random() * 360,
      })
    }

    setParticles(newParticles)
    animateParticles(newParticles)
  }

  // Animate particles
  const animateParticles = (particleArray: any[]) => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particleArray.forEach((p, i) => {
        p.x += p.speedX
        p.y += p.speedY

        // Wrap around edges
        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0

        // Draw particle
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rotation * Math.PI) / 180)
        ctx.globalAlpha = p.opacity
        ctx.fillStyle = p.color

        // Draw star or circle based on rarity
        if (card.rarity === "legendary" || card.rarity === "ultra-rare") {
          // Star shape
          ctx.beginPath()
          for (let j = 0; j < 5; j++) {
            ctx.lineTo(
              Math.cos((j * 2 * Math.PI) / 5 - Math.PI / 2) * p.size,
              Math.sin((j * 2 * Math.PI) / 5 - Math.PI / 2) * p.size,
            )
            ctx.lineTo(
              Math.cos(((j + 0.5) * 2 * Math.PI) / 5 - Math.PI / 2) * (p.size / 2),
              Math.sin(((j + 0.5) * 2 * Math.PI) / 5 - Math.PI / 2) * (p.size / 2),
            )
          }
          ctx.closePath()
        } else {
          // Circle shape
          ctx.beginPath()
          ctx.arc(0, 0, p.size, 0, Math.PI * 2)
          ctx.closePath()
        }

        ctx.fill()
        ctx.restore()
      })

      particlesRef.current = requestAnimationFrame(animate)
    }

    particlesRef.current = requestAnimationFrame(animate)
  }

  // Function to play sound effects
  const playSound = (soundName: string) => {
    if (!audioEnabled) return

    const sounds: Record<string, string> = {
      "card-flip": "/sounds/card-flip.mp3",
      beam: "/sounds/whoosh.mp3",
      rare: "/sounds/rare-card.mp3",
      legendary: "/sounds/legendary-card.mp3",
      success: "/sounds/success.mp3",
    }

    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }

    const audio = new Audio(sounds[soundName])
    audio.volume = 0.5
    audio.play().catch((e) => console.error("Error playing sound:", e))
    audioRef.current = audio
  }

  // Get colors based on card rarity
  const getRarityColors = (rarity: string): string[] => {
    switch (rarity) {
      case "legendary":
        return ["#FFD700", "#FFC800", "#FFAF00", "#FFD700", "#FFEC00"]
      case "ultra-rare":
        return ["#9C27B0", "#673AB7", "#BA68C8", "#7B1FA2", "#6A1B9A"]
      case "rare":
        return ["#2196F3", "#1976D2", "#64B5F6", "#0D47A1", "#42A5F5"]
      case "uncommon":
        return ["#4CAF50", "#388E3C", "#81C784", "#2E7D32", "#66BB6A"]
      default:
        return ["#9E9E9E", "#757575", "#BDBDBD", "#616161", "#E0E0E0"]
    }
  }

  // Trigger rarity-specific effects
  const triggerRarityEffect = (rarity: string) => {
    const colors = getRarityColors(rarity)

    switch (rarity) {
      case "legendary":
        // Gold confetti explosion
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.6, x: 0.5 },
          colors,
          ticks: 300,
          gravity: 0.8,
          scalar: 2,
          shapes: ["circle", "square"],
        })

        // Side confetti
        setTimeout(() => {
          confetti({
            particleCount: 50,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.65 },
            colors,
          })
          confetti({
            particleCount: 50,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.65 },
            colors,
          })
        }, 300)

        // Create a golden glow effect
        const overlay = document.createElement("div")
        overlay.style.position = "fixed"
        overlay.style.top = "0"
        overlay.style.left = "0"
        overlay.style.right = "0"
        overlay.style.bottom = "0"
        overlay.style.backgroundColor = "rgba(255, 215, 0, 0.2)"
        overlay.style.zIndex = "100"
        overlay.style.pointerEvents = "none"
        document.body.appendChild(overlay)

        // Fade out and remove
        setTimeout(() => {
          overlay.style.transition = "opacity 1s"
          overlay.style.opacity = "0"
          setTimeout(() => document.body.removeChild(overlay), 1000)
        }, 1000)
        break

      case "ultra-rare":
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors,
          ticks: 200,
        })
        break

      case "rare":
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors,
          ticks: 150,
        })
        break

      case "uncommon":
        confetti({
          particleCount: 30,
          spread: 50,
          origin: { y: 0.6 },
          colors,
          ticks: 100,
        })
        break
    }
  }

  // Get background gradient based on card rarity
  const getBackgroundGradient = () => {
    switch (card.rarity) {
      case "legendary":
        return "from-yellow-900 via-amber-700 to-yellow-900"
      case "ultra-rare":
        return "from-purple-900 via-fuchsia-800 to-purple-900"
      case "rare":
        return "from-blue-900 via-indigo-800 to-blue-900"
      case "uncommon":
        return "from-green-900 via-emerald-800 to-green-900"
      default:
        return "from-gray-900 via-slate-800 to-gray-900"
    }
  }

  // Get beam color based on card rarity
  const getBeamColor = () => {
    switch (card.rarity) {
      case "legendary":
        return "bg-gradient-to-b from-yellow-300 via-amber-400 to-yellow-500"
      case "ultra-rare":
        return "bg-gradient-to-b from-purple-300 via-fuchsia-400 to-purple-500"
      case "rare":
        return "bg-gradient-to-b from-blue-300 via-indigo-400 to-blue-500"
      case "uncommon":
        return "bg-gradient-to-b from-green-300 via-emerald-400 to-green-500"
      default:
        return "bg-gradient-to-b from-gray-300 via-slate-400 to-gray-500"
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Dark overlay */}
      <div
        className="absolute inset-0 bg-black bg-opacity-90"
        onClick={animationStage === "complete" ? onClose : undefined}
      />

      {/* Particles canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-10" />

      <div className="relative w-full max-w-md mx-auto z-20">
        {/* Sound toggle button */}
        <button
          onClick={() => setAudioEnabled(!audioEnabled)}
          className="absolute top-4 left-4 z-30 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
        >
          {audioEnabled ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          )}
        </button>

        {/* Close button (only visible after animation completes) */}
        {animationStage === "complete" && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-30 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}

        <div className={`rounded-xl overflow-hidden bg-gradient-to-b ${getBackgroundGradient()} p-4 shadow-2xl`}>
          {/* Animation container */}
          <div className="relative h-[70vh] flex flex-col items-center justify-center">
            <AnimatePresence>
              {/* Initial setup - magical particles */}
              {animationStage === "initial" && (
                <motion.div
                  className="absolute inset-0 flex items-center justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <motion.div
                    className="w-40 h-40 rounded-full bg-white bg-opacity-5 flex items-center justify-center"
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.3, 0.7, 0.3],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "easeInOut",
                    }}
                  >
                    <motion.div
                      className="w-20 h-20 rounded-full bg-white bg-opacity-10"
                      animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.5, 0.8, 0.5],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "easeInOut",
                        delay: 0.3,
                      }}
                    />
                  </motion.div>

                  {/* Floating sparkles */}
                  <motion.div
                    className="absolute"
                    animate={{
                      rotate: [0, 360],
                      opacity: [0.7, 1, 0.7],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "linear",
                    }}
                  >
                    <Sparkles className="h-10 w-10 text-white opacity-30" />
                  </motion.div>
                </motion.div>
              )}

              {/* Beam of light */}
              {animationStage === "beam" && (
                <motion.div
                  className="absolute inset-0 flex items-center justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Vertical beam */}
                  <motion.div
                    className={`absolute w-1 ${getBeamColor()}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{
                      height: "100%",
                      opacity: 1,
                      width: ["1px", "2px", "100px", "2px"],
                    }}
                    transition={{
                      duration: 1,
                      times: [0, 0.2, 0.8, 1],
                    }}
                  />

                  {/* Pulsing circle */}
                  <motion.div
                    className="absolute"
                    animate={{
                      scale: [0, 1.5, 0],
                      opacity: [0, 0.5, 0],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: 1,
                      ease: "easeOut",
                    }}
                  >
                    <div className={`w-40 h-40 rounded-full ${getBeamColor()} bg-opacity-30 filter blur-md`} />
                  </motion.div>
                </motion.div>
              )}

              {/* Card silhouette */}
              {animationStage === "silhouette" && (
                <motion.div
                  className="absolute inset-0 flex items-center justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.div
                    className="relative w-64 h-96"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    {/* Card silhouette */}
                    <div className="w-full h-full rounded-lg bg-black border border-gray-700 shadow-lg overflow-hidden flex items-center justify-center">
                      <motion.div
                        animate={{
                          opacity: [0.3, 0.7, 0.3],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Number.POSITIVE_INFINITY,
                          ease: "easeInOut",
                        }}
                      >
                        <Star className="h-20 w-20 text-white opacity-20" />
                      </motion.div>
                    </div>

                    {/* Glowing edges */}
                    <motion.div
                      className="absolute inset-0 rounded-lg"
                      style={{
                        boxShadow: `0 0 20px 2px ${
                          card.rarity === "legendary"
                            ? "rgba(255, 215, 0, 0.5)"
                            : card.rarity === "ultra-rare"
                              ? "rgba(156, 39, 176, 0.5)"
                              : card.rarity === "rare"
                                ? "rgba(33, 150, 243, 0.5)"
                                : "rgba(255, 255, 255, 0.3)"
                        }`,
                      }}
                      animate={{
                        opacity: [0.5, 1, 0.5],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "easeInOut",
                      }}
                    />
                  </motion.div>
                </motion.div>
              )}

              {/* Card reveal */}
              {(animationStage === "reveal" || animationStage === "complete") && (
                <motion.div
                  className="absolute inset-0 flex items-center justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Flash of light */}
                  {animationStage === "reveal" && (
                    <motion.div
                      className="absolute inset-0 bg-white"
                      initial={{ opacity: 1 }}
                      animate={{ opacity: 0 }}
                      transition={{ duration: 0.5 }}
                    />
                  )}

                  {/* Card reveal with flip animation */}
                  <motion.div
                    className="relative w-64 h-96"
                    initial={{ rotateY: 90 }}
                    animate={{ rotateY: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 70,
                      damping: 15,
                      delay: animationStage === "reveal" ? 0.3 : 0,
                    }}
                    style={{ transformStyle: "preserve-3d" }}
                  >
                    <div className="w-full h-full">
                      <PokemonStyleCard
                        id={card.id}
                        name={card.name}
                        character={card.character}
                        imageUrl={card.image_url}
                        rarity={card.rarity}
                        owned={true}
                      />

                      {/* Shimmer effect */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-tr from-transparent via-white to-transparent"
                        style={{
                          backgroundSize: "200% 200%",
                          mixBlendMode: "overlay",
                          opacity: 0.4,
                        }}
                        initial={{ backgroundPosition: "200% 200%" }}
                        animate={{ backgroundPosition: "0% 0%" }}
                        transition={{ duration: 1.5, delay: 0.3 }}
                      />

                      {/* Rarity indicator */}
                      {card.rarity === "legendary" && (
                        <motion.div
                          className="absolute -top-3 -right-3 z-20"
                          animate={{
                            rotate: [0, 360],
                            scale: [1, 1.1, 1],
                          }}
                          transition={{
                            rotate: { repeat: Number.POSITIVE_INFINITY, duration: 3, ease: "linear" },
                            scale: { repeat: Number.POSITIVE_INFINITY, duration: 2, ease: "easeInOut" },
                          }}
                        >
                          <div className="bg-yellow-500 text-white p-1 rounded-full">
                            <Star className="h-5 w-5" />
                          </div>
                        </motion.div>
                      )}

                      {card.rarity === "ultra-rare" && (
                        <motion.div
                          className="absolute -top-3 -right-3 z-20"
                          animate={{
                            rotate: [0, 360],
                          }}
                          transition={{
                            repeat: Number.POSITIVE_INFINITY,
                            duration: 4,
                            ease: "linear",
                          }}
                        >
                          <div className="bg-purple-500 text-white p-1 rounded-full">
                            <Sparkles className="h-5 w-5" />
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Continue button (only shown when animation completes) */}
            {animationStage === "complete" && (
              <motion.button
                className="absolute bottom-8 px-10 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full text-white font-bold shadow-lg hover:shadow-xl transition-all"
                onClick={onClose}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Add to Collection
              </motion.button>
            )}

            {/* Skip button (only shown during animations, not at the end) */}
            {animationStage !== "complete" && (
              <motion.button
                className="absolute bottom-4 right-4 px-6 py-2 bg-black bg-opacity-50 rounded-full text-white text-sm hover:bg-opacity-70 transition-all"
                onClick={() => setAnimationStage("complete")}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                whileHover={{ scale: 1.05 }}
              >
                Skip Animation
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
