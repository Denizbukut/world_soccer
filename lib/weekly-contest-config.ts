// Weekly Contest Configuration
// Ändere hier die Zeiten für neue Contests

export const WEEKLY_CONTEST_CONFIG = {
  // Contest Start Date (Montag der Woche)
  weekStart: "2026-02-02",
  
  // Contest End Date (Dienstag der nächsten Woche um 23:59:59 UTC)
  contestEnd: "2026-02-10T21:00:00Z",
  
  // Prize Pool Configuration
  prizePool: [
    { rank: "1st Place", reward:  "Maradona 98 Lvl. 15 + 2000 Icon Tickets", icon: "🥇" },
    { rank: "2nd Place", reward: "Henry 97 Lvl. 15 + 1000 Icon Tickets", icon: "🥈" },
    { rank: "3rd Place", reward: "Zidane 95 Lvl. 13 + 500 Icon Tickets", icon: "🥉" },
    { rank: "4th–6th Place", reward: "Puskas Lvl. 7 + 300 Icon Tickets", icon: "🎖️" },
    { rank: "7th–10th Place", reward:"Beckenbauer Lvl. 6 + 150 Icon Tickets", icon: "🎖️" },
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