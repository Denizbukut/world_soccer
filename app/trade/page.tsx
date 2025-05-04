"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import ProtectedRoute from "@/components/protected-route"
import MobileNav from "@/components/mobile-nav"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { motion } from "framer-motion"
import { Repeat, Users, ArrowLeftRight, Clock, AlertCircle } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function TradePage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState("marketplace")

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#f8f9ff] pb-20">
        {/* Header */}
        <header className="sticky top-0 z-10 backdrop-blur-md bg-white/80 border-b border-gray-100">
          <div className="max-w-lg mx-auto px-4 py-3">
            <div className="flex justify-between items-center">
              <h1 className="text-lg font-medium">Trade Center</h1>
            </div>
          </div>
        </header>

        <main className="p-4 max-w-lg mx-auto">
          <Tabs defaultValue="marketplace" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 bg-white h-12 p-1 mb-4">
              <TabsTrigger value="marketplace" className="h-10">
                <div className="flex items-center justify-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>Marketplace</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="my-trades" className="h-10">
                <div className="flex items-center justify-center gap-2">
                  <ArrowLeftRight className="h-4 w-4" />
                  <span>My Trades</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="history" className="h-10">
                <div className="flex items-center justify-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>History</span>
                </div>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="marketplace">
              <ComingSoonSection
                title="Marketplace Coming Soon"
                description="Trade cards with other players in the global marketplace. Buy, sell, and exchange cards to complete your collection."
                icon={<Users className="h-12 w-12 text-violet-400" />}
              />
            </TabsContent>

            <TabsContent value="my-trades">
              <ComingSoonSection
                title="My Trades Coming Soon"
                description="Create and manage your trade offers. Set your terms and negotiate with other players."
                icon={<ArrowLeftRight className="h-12 w-12 text-violet-400" />}
              />
            </TabsContent>

            <TabsContent value="history">
              <ComingSoonSection
                title="Trade History Coming Soon"
                description="View your past trades and transactions. Track your trading activity and card value over time."
                icon={<Clock className="h-12 w-12 text-violet-400" />}
              />
            </TabsContent>
          </Tabs>
        </main>

        <MobileNav />
      </div>
    </ProtectedRoute>
  )
}

interface ComingSoonSectionProps {
  title: string
  description: string
  icon: React.ReactNode
}

function ComingSoonSection({ title, description, icon }: ComingSoonSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-2xl shadow-sm p-6 text-center"
    >
      <div className="flex flex-col items-center">
        <div className="w-20 h-20 rounded-full bg-violet-100 flex items-center justify-center mb-4">{icon}</div>
        <h2 className="text-xl font-medium mb-2">{title}</h2>
        <p className="text-gray-500 mb-6 max-w-sm mx-auto">{description}</p>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start text-left">
          <AlertCircle className="h-5 w-5 text-amber-500 mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-amber-800 text-sm font-medium">Feature in Development</p>
            <p className="text-amber-700 text-xs mt-1">
              We're working hard to bring you the best trading experience. Check back soon for updates!
            </p>
          </div>
        </div>

        <div className="relative w-full h-48 mb-6">
          <Image
            src="/placeholder.svg?key=zo22o"
            alt="Trading Marketplace Preview"
            fill
            className="object-cover rounded-lg"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent rounded-lg flex items-end justify-center pb-4">
            <span className="text-white text-sm font-medium">Preview</span>
          </div>
        </div>

        <Link href="/collection">
          <Button className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 rounded-full px-6">
            <Repeat className="h-4 w-4 mr-2" />
            Back to Collection
          </Button>
        </Link>
      </div>
    </motion.div>
  )
}
