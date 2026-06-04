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

// Last Day of Contest Special promotions
// These automatically go live during the final day of the contest.
export const LAST_DAY_SPECIAL = {
  goatPackDailyLimit: 500, // Raised daily GOAT pack limit for the last day
  goatSinglePackDiscount: 0.3, // 30% off a single GOAT pack
  goatFivePackDiscount: 0.5, // 50% off the 5x GOAT pack bundle
  ticketDiscount: 0.25, // 25% off all tickets (and therefore the normal packs you buy with them)
  drawTicketDiscount: 0.25, // 25% fewer tickets needed for the 5x and 20x multi draws
} as const

// Helper functions
export const getContestEndTimestamp = () => new Date(WEEKLY_CONTEST_CONFIG.contestEnd).getTime()

export const getContestEndDate = () => new Date(WEEKLY_CONTEST_CONFIG.contestEnd)

// True during the final 24h of the contest (the "last day"), before it ends
export const isContestLastDay = () => {
  const now = Date.now()
  const endTime = getContestEndTimestamp()
  if (now > endTime) return false
  return endTime - now <= 24 * 60 * 60 * 1000
}

// Tickets required to draw `count` packs. On the contest's last day the 5x/20x
// multi draws cost fewer tickets. Single draws are never discounted.
// This is the single source of truth shared by the client UI and the server.
export const getDrawTicketCost = (count: number) => {
  if (isContestLastDay() && count >= 5) {
    return Math.max(1, Math.round(count * (1 - LAST_DAY_SPECIAL.drawTicketDiscount)))
  }
  return count
}

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