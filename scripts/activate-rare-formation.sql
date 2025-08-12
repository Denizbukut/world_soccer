-- Activate the Rare Formation challenge
UPDATE sbc_challenges 
SET is_active = true
WHERE name = 'Rare Formation';

-- Verify the update
SELECT 
    id,
    name,
    is_active,
    is_repeatable,
    rewards_tickets,
    rewards_elite_tickets,
    rewards_icon_tickets,
    wbc_card_reward
FROM sbc_challenges 
WHERE name = 'Rare Formation';
