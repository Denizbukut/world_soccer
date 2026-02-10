// Weekly Contest Configuration
// Ändere hier die Zeiten für neue Contests

export const WEEKLY_CONTEST_CONFIG = {
  // Contest Start Date (Montag der Woche)
  weekStart: "2026-02-10",
  
  // Contest End Date (Dienstag der nächsten Woche um 23:59:59 UTC)
  contestEnd: "2026-02-18T21:00:00Z",
  
  // Prize Pool Configuration
  prizePool: [
    { rank: "1st Place", reward:  "PELE 96 Lvl. 15 + 2000 Icon Tickets", icon: "🥇" },
    { rank: "2nd Place", reward: "Ronaldo 95 Lvl. 15 + 1000 Icon Tickets", icon: "🥈" },
    { rank: "3rd Place", reward: "Messi 93 Lvl. 13 + 500 Icon Tickets", icon: "🥉" },
    { rank: "4th–6th Place", reward: "Ronaldinho 94 Lvl. 11 + 200 Icon Tickets", icon: "🎖️" },
    { rank: "7th–10th Place", reward:"Beckenbauer Lvl. 4 + 100 Icon Tickets", icon: "🎖️" },
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