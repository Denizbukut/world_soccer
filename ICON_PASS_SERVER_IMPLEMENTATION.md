# Icon Pass Server-Side Implementation

## Overview
The icon pass ticket claiming system has been migrated from client-side to server-side implementation for improved security, reliability, and data consistency.

## New API Endpoints

### 1. `/api/icon-pass/claim` (POST)
Claims a daily icon ticket for the user.

**Request Body:**
```json
{
  "username": "string"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Icon ticket claimed successfully",
  "newTicketCount": 5,
  "nextClaimAvailable": "2024-01-01T12:00:00.000Z"
}
```

**Features:**
- Validates active icon pass
- Checks 24-hour cooldown period
- Updates user's icon ticket count
- Records claim in database
- Returns updated ticket count

### 2. `/api/icon-pass/claim-rewards` (POST)
Claims all available level-based icon pass rewards.

**Request Body:**
```json
{
  "username": "string"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully claimed 8 icon tickets",
  "newTicketCount": 12,
  "rewardsClaimed": [
    {"level": 1, "tickets": 1},
    {"level": 5, "tickets": 5},
    {"level": 2, "tickets": 1}
  ],
  "totalTicketsAdded": 7
}
```

**Features:**
- Processes all unclaimed level rewards
- Special levels (every 5th) give 5 tickets instead of 1
- Updates claimed_rewards table
- Updates user's icon ticket count

### 5. `/api/icon-pass/status` (POST)
Checks icon pass status and claim availability.

**Request Body:**
```json
{
  "username": "string"
}
```

**Response:**
```json
{
  "hasActivePass": true,
  "iconPass": {
    "id": "uuid",
    "purchased_at": "2024-01-01T00:00:00.000Z",
    "expires_at": "2024-01-08T00:00:00.000Z",
    "remaining_time": "6d 12h 30m",
    "is_expired": false
  },
  "claimStatus": {
    "canClaim": false,
    "lastClaimTime": "2024-01-01T12:00:00.000Z",
    "nextClaimTime": "2024-01-02T12:00:00.000Z",
    "timeUntilNextClaim": "23h 45m"
  }
}
```

## Database Changes

### New Table: `icon_pass_claims`
```sql
CREATE TABLE icon_pass_claims (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
    claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tickets_claimed INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Indexes:**
- `idx_icon_pass_claims_user_id` on `user_id`
- `idx_icon_pass_claims_claimed_at` on `claimed_at`

## Security Features

1. **Server-side validation** of all claim requests
2. **24-hour cooldown** enforced at database level with multiple validation layers
3. **Icon pass expiration** automatically checked and enforced
4. **Service role authentication** for database operations
5. **Input validation** and error handling
6. **Rate limiting** to prevent abuse (max 5 requests per minute)
7. **Database triggers** to prevent multiple claims within 24 hours
8. **Real-time server validation** every minute instead of client-side timers
9. **Double-check validation** for recent claims in the last 24 hours

## Benefits of Server-Side Implementation

1. **Security**: Users cannot manipulate client-side code to bypass restrictions
2. **Reliability**: Database operations are atomic and consistent
3. **Audit Trail**: All claims are recorded with timestamps
4. **Scalability**: Better performance for multiple concurrent users
5. **Maintenance**: Centralized logic easier to update and debug

## Migration Notes

- **Client-side localStorage tracking has been removed**
- **All claim operations now go through API endpoints**
- **No fallback to localStorage - pure server-side validation**
- **Real-time countdown updates handled client-side for better UX**
- **Icon tickets now use server-side validation**
- **24-hour cooldown enforced for Icon tickets**

## Complete Server-Side Implementation

The system now provides **100% server-side validation** for all ticket claiming operations:

1. **Icon Tickets** - `/api/icon-pass/claim`
2. **Level Rewards** - `/api/icon-pass/claim-rewards`
3. **Status Check** - `/api/icon-pass/status`

**No client-side manipulation is possible** - all timing, validation, and ticket updates are handled server-side.

## Environment Variables Required

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Usage Example

```typescript
// Claim daily ticket
const response = await fetch('/api/icon-pass/claim', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'user123' })
});

const data = await response.json();
if (data.success) {
  console.log(`Claimed ticket! New total: ${data.newTicketCount}`);
}
```

## Troubleshooting

### Common Issues

1. **"Already claimed today" Error**
   - This is a security feature, not a bug
   - Wait exactly 24 hours from your last claim
   - The system uses server time, not client time

2. **"Too many requests" Error**
   - You're hitting the rate limit (5 requests per minute)
   - Wait a minute before trying again

3. **"No active icon pass found" Error**
   - Your icon pass has expired
   - Purchase a new one to continue claiming tickets

### Security Measures

- **Client-side timers removed**: All timing is now server-side
- **Database triggers**: Prevents multiple claims even if API is bypassed
- **Rate limiting**: Prevents API abuse
- **Double validation**: Multiple checks ensure 24-hour cooldown
- **Real-time updates**: Status checked every minute from server
