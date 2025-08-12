-- Give badbunny.3547 access to the Rare Formation challenge
UPDATE sbc_challenges 
SET 
    allowed_usernames = ARRAY['jiraiya', 'badbunny.3547'],
    access_type = 'private'
WHERE name = 'Rare Formation';

-- Verify the update
SELECT 
    id,
    name,
    access_type,
    allowed_usernames,
    is_active,
    wbc_card_reward
FROM sbc_challenges 
WHERE name = 'Rare Formation';
