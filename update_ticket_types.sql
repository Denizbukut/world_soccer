-- First, let's see what ticket_type values currently exist in the table
SELECT ticket_type, COUNT(*) as count
FROM ticket_purchases 
GROUP BY ticket_type
ORDER BY ticket_type;

-- Now let's check if there are any values that are not 'regular', 'legendary', 'xp_pass', 'classic', 'elite', or 'icon'
SELECT DISTINCT ticket_type
FROM ticket_purchases 
WHERE ticket_type NOT IN ('regular', 'legendary', 'xp_pass', 'classic', 'elite', 'icon');

-- If the above query returns any unexpected values, we need to handle them first
-- For now, let's try a safer approach - update the constraint to include all existing values

-- Drop the existing check constraint
ALTER TABLE ticket_purchases DROP CONSTRAINT IF EXISTS ticket_purchases_ticket_type_check;

-- Add new check constraint that allows all the values we want plus any existing ones
ALTER TABLE ticket_purchases ADD CONSTRAINT ticket_purchases_ticket_type_check 
CHECK (ticket_type IN ('classic', 'elite', 'icon', 'xp_pass', 'regular', 'legendary'));

-- Now update existing ticket_purchases to use new naming convention
-- Change 'regular' to 'classic' and 'legendary' to 'elite'
UPDATE ticket_purchases 
SET ticket_type = CASE 
    WHEN ticket_type = 'regular' THEN 'classic'
    WHEN ticket_type = 'legendary' THEN 'elite'
    ELSE ticket_type
END
WHERE ticket_type IN ('regular', 'legendary');

-- Now we can update the constraint to only allow the new values
ALTER TABLE ticket_purchases DROP CONSTRAINT ticket_purchases_ticket_type_check;
ALTER TABLE ticket_purchases ADD CONSTRAINT ticket_purchases_ticket_type_check 
CHECK (ticket_type IN ('classic', 'elite', 'icon', 'xp_pass'));

-- Verify the final changes
SELECT ticket_type, COUNT(*) as count
FROM ticket_purchases 
GROUP BY ticket_type
ORDER BY ticket_type; 