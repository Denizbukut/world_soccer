# Banned Users System Guide

## Overview
The banned users system prevents specific usernames from drawing card packs in the World Soccer application.

## How it Works

### Backend Protection
- **Location**: `app/actions.ts` - Functions `drawCards()` and `drawGodPacks()`
- **Check**: Performed at the beginning of each draw function
- **Response**: Returns error message if user is banned

### Frontend Protection
- **Location**: `components/draw-content.tsx` - Functions `handleSelectPack()` and `sendPayment()`
- **Check**: Performed before API calls to provide immediate feedback
- **Response**: Shows toast notification if user is banned

### Centralized Configuration
- **Location**: `lib/banned-users.ts`
- **Purpose**: Single source of truth for banned users list
- **Functions**:
  - `isUserBanned(username)`: Check if a user is banned
  - `getBannedUsers()`: Get list of all banned users

## Adding/Removing Banned Users

### To Add a Banned User:
1. Open `lib/banned-users.ts`
2. Add the username to the `BANNED_USERS` array:
```typescript
export const BANNED_USERS = [
  "banned_user_1",
  "banned_user_2", 
  "test_banned",
  "new_banned_user", // Add new username here
]
```

### To Remove a Banned User:
1. Open `lib/banned-users.ts`
2. Remove the username from the `BANNED_USERS` array

## User Experience

### For Banned Users:
- **Regular/Elite/Icon Packs**: Immediate toast notification "Access Denied - You are banned from drawing packs"
- **God Packs**: Immediate toast notification before payment attempt
- **API Calls**: Server returns error response if somehow bypassed

### For Regular Users:
- No impact - system works normally

## Security Features

1. **Multiple Layers**: Both frontend and backend checks
2. **Immediate Feedback**: Users know immediately if they're banned
3. **Server-Side Protection**: Backend prevents any banned user from drawing
4. **Centralized Management**: Easy to update banned list in one place

## Testing

To test the banned users system:
1. Add a test username to the `BANNED_USERS` array
2. Try to draw packs with that username
3. Verify that appropriate error messages appear
4. Remove the test username to restore access

## Notes

- The banned list is case-sensitive
- Changes to the banned list require a server restart
- Banned users can still access other parts of the application
- Only pack drawing functionality is restricted 