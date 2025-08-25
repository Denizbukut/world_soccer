-- Set all users' prestige points to exactly 1000
UPDATE users 
SET prestige_points = 1000
WHERE prestige_points IS NOT NULL OR prestige_points IS NULL;

-- Verify the changes
SELECT 
  username,
  prestige_points
FROM users 
ORDER BY username;

-- Count total users with 1000 prestige points
SELECT 
  COUNT(*) as total_users_with_1000_points
FROM users 
WHERE prestige_points = 1000;
