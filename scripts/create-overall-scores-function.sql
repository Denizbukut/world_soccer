-- Create a function to calculate overall scores according to the formula
CREATE OR REPLACE FUNCTION calculate_overall_scores(current_user TEXT, limit_count INTEGER)
RETURNS TABLE (
  username TEXT,
  avatar_url TEXT,
  level INTEGER,
  has_premium BOOLEAN,
  score BIGINT,
  rank BIGINT,
  card_count BIGINT,
  legendary_count BIGINT,
  epic_count BIGINT,
  rare_count BIGINT,
  common_count BIGINT,
  highest_card_level INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH user_card_counts AS (
    SELECT
      u.username,
      u.avatar_url,
      u.level,
      u.has_premium,
      COUNT(uc.card_id) AS card_count,
      COUNT(CASE WHEN c.rarity = 'legendary' THEN 1 END) AS legendary_count,
      COUNT(CASE WHEN c.rarity = 'epic' THEN 1 END) AS epic_count,
      COUNT(CASE WHEN c.rarity = 'rare' THEN 1 END) AS rare_count,
      COUNT(CASE WHEN c.rarity = 'common' THEN 1 END) AS common_count,
      COALESCE(MAX(uc.level), 0) AS highest_card_level
    FROM
      users u
    LEFT JOIN
      user_cards uc ON u.username = uc.user_id
    LEFT JOIN
      cards c ON uc.card_id = c.id
    GROUP BY
      u.username, u.avatar_url, u.level, u.has_premium
  ),
  scores AS (
    SELECT
      username,
      avatar_url,
      level,
      has_premium,
      card_count,
      legendary_count,
      epic_count,
      rare_count,
      common_count,
      highest_card_level,
      -- Calculate score using the formula:
      -- (Player Level × 100) + (Legendary Cards × 500) + (Epic Cards × 100) + (Rare Cards × 20) + (Common Cards × 5) + (Highest Card Level × 50)
      (level * 100) + 
      (legendary_count * 500) + 
      (epic_count * 100) + 
      (rare_count * 20) + 
      (common_count * 5) + 
      (highest_card_level * 50) AS score,
      ROW_NUMBER() OVER (ORDER BY 
        (level * 100) + 
        (legendary_count * 500) + 
        (epic_count * 100) + 
        (rare_count * 20) + 
        (common_count * 5) + 
        (highest_card_level * 50) DESC
      ) AS rank
    FROM
      user_card_counts
  ),
  top_scores AS (
    SELECT * FROM scores WHERE rank <= limit_count
  ),
  user_score AS (
    SELECT * FROM scores WHERE username = current_user AND rank > limit_count
  )
  SELECT * FROM top_scores
  UNION ALL
  SELECT * FROM user_score
  ORDER BY rank;
END;
$$ LANGUAGE plpgsql;
