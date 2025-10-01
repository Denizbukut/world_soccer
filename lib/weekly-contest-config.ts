// Weekly Contest Configuration
// Ändere hier die Zeiten für neue Contests

export const WEEKLY_CONTEST_CONFIG = {
  // Contest Start Date (Montag der Woche)
  weekStart: "2025-10-01",
  
  // Contest End Date (Dienstag der nächsten Woche um 23:59:59 UTC)
  contestEnd: "2025-10-07T23:59:59Z",
  
  // Prize Pool Configuration
  prizePool: [
    { rank: "1st Place", reward: "$200 in WLD + 99 Ronaldo Lvl.10 + 500 Icon Tickets", icon: "🥇" },
    { rank: "2nd Place", reward: "$150 in WLD + Pele Lvl. 4 + 250 Icon Tickets", icon: "🥈" },
    { rank: "3rd Place", reward: "$75 in WLD + Ibrahimovic Lvl. 3 + 150 Icon Tickets", icon: "🥉" },
    { rank: "4th–6th Place", reward: "Neymar Lvl. 5 + 50 Icon Tickets", icon: "🎖️" },
    { rank: "7th–10th Place", reward:"Kante Lvl. 3 + 20 Icon Tickets", icon: "🎖️" },
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