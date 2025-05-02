// components/rip3d.tsx
"use client"

import { Canvas, useFrame, useLoader } from "@react-three/fiber"
import { PerspectiveCamera, Environment, OrbitControls, useTexture } from "@react-three/drei"
import { useRef, useState, useEffect } from "react"
import * as THREE from "three"

interface CardData {
  image_url: string
  position: [number, number, number]
}

interface PackRip3DProps {
  visible: boolean
  cards: CardData[]
  onDone: () => void
}

export default function PackRip3D({ visible, cards, onDone }: PackRip3DProps) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null)
  const [showCards, setShowCards] = useState(false)
  const packTexture = useTexture(visible && cards.length > 0 && cards[0].image_url.includes("legendary") ? "/packs/legendary-glow.png" : "/packs/regular-glow.png")
  const [scale, setScale] = useState(1)

  useEffect(() => {
    if (visible) {
      setShowCards(false)
      setScale(1)

      setTimeout(() => {
        setScale(0.01) // simulate pack ripping
        setTimeout(() => {
          setShowCards(true)
          onDone()
        }, 1000)
      }, 1000)
    }
  }, [visible, onDone])

  useFrame(() => {
    if (cameraRef.current) {
      cameraRef.current.position.z = THREE.MathUtils.lerp(
        cameraRef.current.position.z,
        6,
        0.05
      )
    }
  })

  return (
    <div className="fixed inset-0 z-50">
      <Canvas className="bg-black">
        <PerspectiveCamera ref={cameraRef} makeDefault fov={50} position={[0, 0, 10]} />
        <ambientLight intensity={1.2} />
        <Environment preset="sunset" />

        {/* Pack plane */}
        {!showCards && (
          <mesh scale={scale} position={[0, 0, 0]}>
            <planeGeometry args={[3, 4.5]} />
            <meshBasicMaterial map={packTexture} transparent />
          </mesh>
        )}

        {/* Cards */}
        {showCards &&
          cards.map((card, index) => {
            const texture = useTexture(card.image_url)
            return (
              <mesh key={index} position={card.position}>
                <planeGeometry args={[2.5, 3.5]} />
                <meshBasicMaterial map={texture} transparent />
              </mesh>
            )
          })}

        <OrbitControls enableZoom={false} enablePan={false} />
      </Canvas>
    </div>
  )
}
