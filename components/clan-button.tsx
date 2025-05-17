"use client"

import { useState, useEffect } from "react"
import { Shield, Users, ChevronRight } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { getUserClan } from "@/app/actions/clans"
import { Badge } from "@/components/ui/badge"

interface ClanButtonProps {
  username: string
}

export default function ClanButton({ username }: ClanButtonProps) {
  const [loading, setLoading] = useState(true)
  const [clanInfo, setClanInfo] = useState<{
    id: number
    name: string
    level: number
    member_count: number
  } | null>(null)

  useEffect(() => {
    const loadClanInfo = async () => {
      if (!username) return

      try {
        const result = await getUserClan(username)
        if (result.success && result.clan) {
          setClanInfo({
            id: result.clan.id,
            name: result.clan.name,
            level: result.clan.level,
            member_count: result.clan.member_count,
          })
        }
      } catch (error) {
        console.error("Error loading clan info:", error)
      } finally {
        setLoading(false)
      }
    }

    loadClanInfo()
  }, [username])

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 animate-pulse"></div>
            <div className="space-y-2">
              <div className="h-4 w-24 bg-gray-100 rounded animate-pulse"></div>
              <div className="h-3 w-16 bg-gray-100 rounded animate-pulse"></div>
            </div>
          </div>
          <div className="h-5 w-5 bg-gray-100 rounded animate-pulse"></div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.4 }}
      className={`bg-white rounded-xl shadow-md border ${clanInfo ? "border-violet-200" : "border-gray-100"} overflow-hidden hover:shadow-lg transition-all duration-300`}
    >
      <Link href="/clan" className="block">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                clanInfo ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white" : "bg-gray-100 text-gray-400"
              }`}
            >
              {clanInfo ? <Shield className="h-5 w-5" /> : <Users className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="font-medium text-base">{clanInfo ? clanInfo.name : "Join a Clan"}</h3>
              <p className="text-xs text-gray-500">
                {clanInfo ? (
                  <span className="flex items-center">
                    <Badge className="mr-2 bg-violet-500 text-[10px] py-0">Level {clanInfo.level}</Badge>
                    {clanInfo.member_count} {clanInfo.member_count === 1 ? "member" : "members"}
                  </span>
                ) : (
                  "Team up with other players"
                )}
              </p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </div>
      </Link>
    </motion.div>
  )
}
