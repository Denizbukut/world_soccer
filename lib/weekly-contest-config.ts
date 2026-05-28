// Weekly Contest Configuration
// Ändere hier die Zeiten für neue Contests

export const WEEKLY_CONTEST_CONFIG = {
  // Contest Start Date (Montag der Woche)
  weekStart: "2026-05-28",

  // Contest End Date - 7 Tage später
  contestEnd: "2026-06-04T21:00:00Z",

  // Prize Pool Configuration
  prizePool: [
    { rank: "1st Place", reward: "GOAT Messi Lvl. 15 + 5000 Icon Tickets", icon: "🐐" },
    { rank: "2nd Place", reward: "GOAT Maradona Lvl. 13 + 2500 Icon Tickets", icon: "🥈" },
    { rank: "3rd Place", reward: "GOAT Pelé Lvl. 12 + 1500 Icon Tickets", icon: "🥉" },
    { rank: "4th Place", reward: "Cristiano Ronaldo Lvl. 11 + 1000 Icon Tickets", icon: "🎖️" },
    { rank: "5th Place", reward: "Cruyff Lvl. 10 + 800 Icon Tickets", icon: "🎖️" },
    { rank: "6th Place", reward: "Zidane Lvl. 9 + 600 Icon Tickets", icon: "🎖️" },
    { rank: "7th Place", reward: "Ronaldinho Lvl. 8 + 500 Icon Tickets", icon: "🏅" },
    { rank: "8th Place", reward: "Beckenbauer Lvl. 7 + 400 Icon Tickets", icon: "🏅" },
    { rank: "9th Place", reward: "Di Stéfano Lvl. 6 + 350 Icon Tickets", icon: "🏅" },
    { rank: "10th Place", reward: "Ultimate Card Lvl. 5 + 300 Icon Tickets", icon: "🏅" },
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