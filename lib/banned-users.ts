// Banned users list - these usernames cannot draw packs
export const BANNED_USERS = [
  "kielcoraggio",
  "kielcoraggio1",
  "jesus24win1",
  "ytph999",
  "kielcoraggio2",
  "leonandino",
  "bernar200918.8062",

  // Add more banned usernames here as needed
]

// Helper function to check if a user is banned
export const isUserBanned = (username:string): boolean => {
  return BANNED_USERS.includes(username)
}

// Helper function to get banned users list (for admin purposes)
export const getBannedUsers = (): string[] => {
  return [...BANNED_USERS]
} 