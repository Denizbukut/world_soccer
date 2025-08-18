# Avatar Price Calculation - Dynamic WLD Pricing

## How it works

The avatar prices are now calculated dynamically based on the current WLD price from the API, instead of using fixed values from the database.

## Price Calculation

### Epic Avatars
- **USD Value:** $1.00
- **WLD Price:** `1.0 / current_wld_price`

### God Avatars  
- **USD Value:** $5.00
- **WLD Price:** `5.0 / current_wld_price`

### Basic Avatars
- **Price:** Free (0 WLD)

## Examples

### If WLD = $2.50:
- Epic Avatar: 1.0 / 2.50 = **0.4 WLD**
- God Avatar: 5.0 / 2.50 = **2.0 WLD**

### If WLD = $3.00:
- Epic Avatar: 1.0 / 3.00 = **0.333 WLD**
- God Avatar: 5.0 / 3.00 = **1.667 WLD**

### If WLD = $2.00:
- Epic Avatar: 1.0 / 2.00 = **0.5 WLD**
- God Avatar: 5.0 / 2.00 = **2.5 WLD**

## Code Location

The calculation happens in `components/home-content.tsx`:

```typescript
const calculateAvatarPrice = (rarity: string) => {
  if (!price) return 0 // Fallback if WLD price not available
  
  if (rarity === 'epic') {
    return 1.0 / price // $1.00 USD / WLD price
  } else if (rarity === 'god') {
    return 5.0 / price // $5.00 USD / WLD price
  }
  return 0 // Basic avatars are free
}
```

## Benefits

1. **Always correct USD value** - Avatars always cost the intended USD amount
2. **Automatic updates** - Prices update automatically when WLD price changes
3. **No database changes needed** - Prices are calculated in real-time
4. **Consistent pricing** - Same USD value regardless of WLD volatility
