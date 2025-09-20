"use client"

import { useState, useEffect } from "react"
import { Clock, Trophy } from "lucide-react"

export default function WeekendLeagueCountdown() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  })
  const [isToday, setIsToday] = useState(false)

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date()
      const currentDay = now.getDay() // 0 = Sunday, 1 = Monday, etc.
     
      // Set target to next Sunday at 20:00:00
      const targetDate = new Date()
     
      if (currentDay === 0) {
        // It's Sunday - check if it's before 20:00
        const todayAt8PM = new Date()
        todayAt8PM.setHours(20, 0, 0, 0)
       
        if (now < todayAt8PM) {
          // It's Sunday but before 8 PM, target is today at 8 PM
          targetDate.setTime(todayAt8PM.getTime())
          setIsToday(true)
        } else {
          // It's Sunday but after 8 PM, target is next Sunday at 8 PM
          targetDate.setDate(now.getDate() + 7)
          targetDate.setHours(20, 0, 0, 0)
          setIsToday(false)
        }
      } else {
        // Calculate days until next Sunday
        const daysUntilSunday = 7 - currentDay
        targetDate.setDate(now.getDate() + daysUntilSunday)
        targetDate.setHours(20, 0, 0, 0)
        setIsToday(false)
      }
     
      const difference = targetDate.getTime() - now.getTime()
     
      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24))
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((difference % (1000 * 60)) / 1000)
       
        setTimeLeft({ days, hours, minutes, seconds })
      }
    }

    // Calculate immediately
    calculateTimeLeft()
   
    // Update every second
    const timer = setInterval(calculateTimeLeft, 1000)
   
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="bg-gradient-to-r from-yellow-800/40 to-orange-800/40 p-4 rounded-lg border border-yellow-500/30">
      <div className="flex items-center justify-center gap-2 mb-3">
        <Trophy className="w-5 h-5 text-yellow-400" />
        <h4 className="text-lg font-bold text-yellow-300">Weekend League Starts In</h4>
      </div>
     
      <div className="flex items-center justify-center gap-4 text-center">
        <div className="flex flex-col items-center">
          <div className="bg-yellow-500/20 px-3 py-2 rounded-lg border border-yellow-400/50">
            <span className="text-2xl font-bold text-yellow-300">{timeLeft.days}</span>
          </div>
          <span className="text-xs text-yellow-200 mt-1">Days</span>
        </div>
       
        <div className="flex flex-col items-center">
          <div className="bg-yellow-500/20 px-3 py-2 rounded-lg border border-yellow-400/50">
            <span className="text-2xl font-bold text-yellow-300">{timeLeft.hours.toString().padStart(2, '0')}</span>
          </div>
          <span className="text-xs text-yellow-200 mt-1">Hours</span>
        </div>
       
        <div className="flex flex-col items-center">
          <div className="bg-yellow-500/20 px-3 py-2 rounded-lg border border-yellow-400/50">
            <span className="text-2xl font-bold text-yellow-300">{timeLeft.minutes.toString().padStart(2, '0')}</span>
          </div>
          <span className="text-xs text-yellow-200 mt-1">Minutes</span>
        </div>
       
        <div className="flex flex-col items-center">
          <div className="bg-yellow-500/20 px-3 py-2 rounded-lg border border-yellow-400/50">
            <span className="text-2xl font-bold text-yellow-300">{timeLeft.seconds.toString().padStart(2, '0')}</span>
          </div>
          <span className="text-xs text-yellow-200 mt-1">Seconds</span>
        </div>
      </div>
     
      <div className="text-center mt-3">
        <div className="flex items-center justify-center gap-2 text-sm text-yellow-200">
          <Clock className="w-4 h-4" />
          <span>{isToday ? "Today at 8 PM" : "Next Sunday at 8 PM"}</span>
        </div>
      </div>
    </div>
  )
}
