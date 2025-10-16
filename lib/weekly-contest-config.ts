// Weekly Contest Configuration
// Ändere hier die Zeiten für neue Contests

export const WEEKLY_CONTEST_CONFIG = {
  // Contest Start Date (Montag der Woche)
  weekStart: "2025-10-16",
  
  // Contest End Date (Dienstag der nächsten Woche um 23:59:59 UTC)
  contestEnd: "2025-10-22T23:59:59Z",
  
  // Prize Pool Configuration
  prizePool: [
    { rank: "1st Place", reward: "$200 in WLD + Maradona Lvl.10 + 1000 Icon Tickets", icon: "🥇" },
    { rank: "2nd Place", reward: "$150 in WLD + Puskás Lvl. 6 + 500 Icon Tickets", icon: "🥈" },
    { rank: "3rd Place", reward: "$75 in WLD + Gullit Lvl. 4 + 300 Icon Tickets", icon: "🥉" },
    { rank: "4th–6th Place", reward: "van Dijk Lvl. 7 + 75 Icon Tickets", icon: "🎖️" },
    { rank: "7th–10th Place", reward:"Lewandowski Lvl. 5 + 25 Icon Tickets", icon: "🎖️" },
  ]
} as const

// Helper functions
export const getContestEndTimestamp = () => new Date(WEEKLY_CONTEST_CONFIG.contestEnd).getTime()

export const getContestEndDate = () => new Date(WEEKLY_CONTEST_CONFIG.contestEnd)

export const isContestActive = () => {
  const now = new Date()
  const contestEnd = getContestEndDate()
  return now <= contestEnd
}

export const getTimeUntilContestEnd = () => {
  const now = Date.now()
  const endTime = getContestEndTimestamp()
  return Math.max(0, endTime - now)
} 