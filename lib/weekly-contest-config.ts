// Weekly Contest Configuration
// Ändere hier die Zeiten für neue Contests

export const WEEKLY_CONTEST_CONFIG = {
  // Contest Start Date (Montag der Woche)
  weekStart: "2026-02-28",
  
  // Contest End Date (Dienstag der nächsten Woche um 23:59:59 UTC)
  contestEnd: "2026-03-08T21:00:00Z",
  
  // Prize Pool Configuration
  prizePool: [
    { rank: "1st Place", reward:  "ME+ 2000 Icon Tickets", icon: "🥇" },
    { rank: "2nd Place", reward: "Maldini Lvl. 13 + 500 Icon Tickets", icon: "🥈" },
    { rank: "3rd Place", reward: "Iniesta Lvl. 11 + 250 Icon Tickets", icon: "🥉" },
    { rank: "4th–6th Place", reward: "Ronaldinho 94 Lvl. 9 + 100 Icon Tickets", icon: "🎖️" },
    { rank: "7th–10th Place", reward:"Cruyff Lvl. 5 + 50 Icon Tickets", icon: "🎖️" },
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