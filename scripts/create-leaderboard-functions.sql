-- Function to get user card counts
CREATE OR REPLACE FUNCTION get_user_card_counts(limit_num integer)
RETURNS TABLE (
  user_id text,
  count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    uc.user_id,
    COUNT(uc.card_id)::bigint
  FROM 
    user_cards uc
  GROUP BY 
    uc.user_id
  ORDER BY 
    COUNT(uc.card_id) DESC
  LIMIT limit_num;
END;
$$ LANGUAGE plpgsql;

-- Function to get a user's rank based on card count
CREATE OR REPLACE FUNCTION get_user_card_rank(target_count integer)
RETURNS integer AS $$
DECLARE
  user_rank integer;
BEGIN
  SELECT COUNT(*) + 1 INTO user_rank
  FROM (
    SELECT COUNT(*) as card_count
    FROM user_cards
    GROUP BY user_id
    HAVING COUNT(*) > target_count
  ) as counts;
  
  RETURN user_rank;
END;
$$ LANGUAGE plpgsql;
