-- Check Rare Formation Challenge Requirements
SELECT 
    id,
    name,
    requirements_total_cards,
    requirements_min_level,
    requirements_team_rating,
    requirements_rarity_level_counts,
    requirements_specific_rarities,
    is_active,
    is_repeatable
FROM sbc_challenges 
WHERE name = 'Rare Formation';

-- Compare with Starter Squad
SELECT 
    id,
    name,
    requirements_total_cards,
    requirements_min_level,
    requirements_team_rating,
    requirements_rarity_level_counts,
    requirements_specific_rarities,
    is_active,
    is_repeatable
FROM sbc_challenges 
WHERE name = 'Starter Squad';
