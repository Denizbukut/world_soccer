// Weekly Contest Configuration
// Ändere hier die Zeiten für neue Contests

export const WEEKLY_CONTEST_CONFIG = {
  // Contest Start Date (Montag der Woche)
  weekStart: "2025-08-06",
  
  // Contest End Date (Dienstag der nächsten Woche um 23:59:59 UTC)
  contestEnd: "2025-08-13T23:59:59Z",
  
  // Prize Pool Configuration
  prizePool: [
    { rank: "1st Place", reward: "$200 in WLD + Ibrahimovic Lvl.3", icon: "🥇" },
    { rank: "2nd Place", reward: "$150 in WLD + Ibrahimovic Lvl. 2", icon: "🥈" },
    { rank: "3rd Place", reward: "$100 in WLD + Ibrahimovic Lvl. 1", icon: "🥉" },
    { rank: "4th–6th Place", reward: "$30 in WLD + Salah Lvl. 2", icon: "🎖️" },
    { rank: "7th–10th Place", reward:"$10 in WLD + Salah Lvl. 1", icon: "🎖️" },
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