-- =====================================================================
-- Weekly Contest payout — week_start_date = 2026-05-28 (ended 2026-06-04 21:00 UTC)
-- Pays the Top 10 their Icon Tickets AND their prize card.
--
-- Prize scale (Icon Tickets): 500 / 400 / 300 / 200 / 150 / 120 / 90 / 70 / 50 / 30
-- Cards are granted at the configured level (matches lib/weekly-contest-config.ts).
--
-- SAFE TO RUN ONCE. A tracking table (weekly_contest_payouts) makes a second
-- run a no-op, so nobody is paid twice.
--
-- Winners were resolved from weekly_contest_entries (legendary_count DESC,
-- updated_at ASC), excluding the same banned accounts as the public leaderboard.
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS weekly_contest_payouts (
  week_start_date date        NOT NULL,
  user_id         text        NOT NULL,
  rank            int         NOT NULL,
  card_id         uuid,
  card_level      int,
  icon_tickets    int         NOT NULL,
  paid_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (week_start_date, user_id)
);

WITH prize(rank, user_id, card_id, lvl, tickets) AS (
  VALUES
    ( 1, 'toushiroukidz.3588', 'acf5741e-99e2-43aa-999b-8d0429265c3e'::uuid, 15, 500), -- MESSI (98)
    ( 2, 'dezignerdude',       'a231cdae-70fb-4f75-a6f5-d3a4b21b2d4e'::uuid, 13, 400), -- Maradona
    ( 3, 'pesolaka6729.5087',  '775cffb7-cd36-46c5-97ef-d18b6b1564ca'::uuid, 12, 300), -- Pelé
    ( 4, 'xgrokxd',            'ce6f5a5a-4288-4e68-8ef7-debbea0bdcb5'::uuid, 11, 200), -- Cristiano Ronaldo
    ( 5, 'alex8191.1836',      'ace1073d-4aae-42b7-af4c-dbf052beb5f0'::uuid, 10, 150), -- Cruyff
    ( 6, 'ranoclaudio.938452', 'd1a81042-ccaf-46bc-a739-06bc78986f72'::uuid,  9, 120), -- Zidane
    ( 7, 'orkhan.1176',        'bb67e918-054a-4e28-98d8-b6c541ee5f1d'::uuid,  8,  90), -- Ronaldinho
    ( 8, 'flavio01',           'fb3aeff1-e5e5-4668-b10c-23a9d0d20504'::uuid,  7,  70), -- Beckenbauer
    ( 9, 'damla123',           '1100de84-da2c-4b52-8492-767ced017ff6'::uuid,  6,  50), -- Henry (GOAT)
    (10, 'aylagorilla',        'ba5e5726-7f30-4971-85e0-90850d75442b'::uuid,  5,  30)  -- Lewandowski (Ultimate)
),

-- Record the payout. ON CONFLICT keeps this idempotent: only rows inserted on
-- THIS run flow downstream, so re-running pays nobody again.
todo AS (
  INSERT INTO weekly_contest_payouts (week_start_date, user_id, rank, card_id, card_level, icon_tickets)
  SELECT DATE '2026-05-28', p.user_id, p.rank, p.card_id, p.lvl, p.tickets
  FROM prize p
  ON CONFLICT (week_start_date, user_id) DO NOTHING
  RETURNING user_id, card_id, card_level AS lvl, icon_tickets AS tickets
),

-- 1) Pay Icon Tickets
pay_tickets AS (
  UPDATE users u
  SET icon_tickets = COALESCE(u.icon_tickets, 0) + t.tickets
  FROM todo t
  WHERE u.username = t.user_id
  RETURNING u.username
),

-- 2a) Grant card to winners who already own that card at that level -> +1 quantity
bump_card AS (
  UPDATE user_cards uc
  SET quantity = uc.quantity + 1
  FROM todo t
  WHERE uc.user_id = t.user_id
    AND uc.card_id = t.card_id
    AND uc.level   = t.lvl
  RETURNING uc.user_id, uc.card_id
)

-- 2b) Grant card to winners who don't own it yet -> insert a fresh row
INSERT INTO user_cards (user_id, card_id, quantity, level, favorite, obtained_at)
SELECT t.user_id, t.card_id, 1, t.lvl, false, CURRENT_DATE
FROM todo t
WHERE NOT EXISTS (
  SELECT 1 FROM bump_card b
  WHERE b.user_id = t.user_id AND b.card_id = t.card_id
);

COMMIT;

-- Verify afterwards:
--   SELECT * FROM weekly_contest_payouts WHERE week_start_date = '2026-05-28' ORDER BY rank;
