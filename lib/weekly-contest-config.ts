// Weekly Contest Configuration
// Ändere hier die Zeiten für neue Contests

export const WEEKLY_CONTEST_CONFIG = {
  // Contest Start Date (Montag der Woche)
  weekStart: "2026-06-05",

  // Contest End Date - 7 Tage später
  contestEnd: "2026-06-12T21:00:00Z",

  // Prize Pool Configuration
  // Card ids for this contest's payout (cards table):
  //   RONALD 99    77050dd2-ccfd-4925-b494-eb830fb31c65 (goat)
  //   Ibrahimović  92eee6c4-ba43-43fc-8953-51d08b577103 (goat)
  //   Gullit       a1140f1e-1bd4-4f44-aba0-2197d5ace1ad (goat)
  //   Maldini      ec2645d2-d0d9-448a-b9d1-85135faecb32 (goat)
  //   Puskás       8bf68a05-a235-47c9-aebe-61c6deca0ed0 (goat)
  //   Buffon       bf1f2043-9570-4e9f-9dfd-ee4c077ac03c (goat)
  //   Iniesta      ac069bce-523a-42eb-a5c5-0e63afdc1818 (goat)
  //   Messi 93     7a03673d-f235-4172-a932-e68d134a0604 (goat)
  //   Mbappé       f6dcb351-13f5-4dec-9adf-fe0b61f81850 (ultimate)
  //   Haaland      0218aa1e-8da8-4879-a944-da2f9183ba64 (ultimate)
  //   Vini Jr.     4f8c1688-3f58-4ef5-8acc-4a6abadaf377 (ultimate)
  prizePool: [
    { rank: "1st Place", reward: "RONALD Lvl. 15 + Ibrahimović Lvl. 15 + 500 Icon Tickets", icon: "🐐" },
    { rank: "2nd Place", reward: "Gullit Lvl. 13 + 400 Icon Tickets", icon: "🥈" },
    { rank: "3rd Place", reward: "Maldini Lvl. 12 + 300 Icon Tickets", icon: "🥉" },
    { rank: "4th Place", reward: "Puskás Lvl. 11 + 200 Icon Tickets", icon: "🎖️" },
    { rank: "5th Place", reward: "Buffon Lvl. 10 + 150 Icon Tickets", icon: "🎖️" },
    { rank: "6th Place", reward: "Iniesta Lvl. 9 + 120 Icon Tickets", icon: "🎖️" },
    { rank: "7th Place", reward: "Messi Lvl. 8 + 90 Icon Tickets", icon: "🏅" },
    { rank: "8th Place", reward: "Mbappé Lvl. 7 + 70 Icon Tickets", icon: "🏅" },
    { rank: "9th Place", reward: "Haaland Lvl. 6 + 50 Icon Tickets", icon: "🏅" },
    { rank: "10th Place", reward: "Vini Jr. Lvl. 5 + 30 Icon Tickets", icon: "🏅" },
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