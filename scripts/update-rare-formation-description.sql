-- Update Rare Formation description to match the actual team rating requirement
UPDATE sbc_challenges 
SET description = 'Create an elite team with high-level cards and team rating of 81+'
WHERE name = 'Rare Formation';

-- Verify the update
SELECT 
    id,
    name,
    description,
    requirements_team_rating
FROM sbc_challenges 
WHERE name = 'Rare Formation';
