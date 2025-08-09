-- Add WBC card reward column to sbc_challenges table
ALTER TABLE "public"."sbc_challenges" 
ADD COLUMN "wbc_card_reward" UUID REFERENCES "public"."cards"("id");

-- Add comment to explain the column
COMMENT ON COLUMN "public"."sbc_challenges"."wbc_card_reward" IS 'ID of the WBC card that is rewarded upon completing this SBC challenge';

-- Example: Update a challenge to reward the WBC doue card
-- UPDATE "public"."sbc_challenges" 
-- SET "wbc_card_reward" = 'de1a7d49-d937-466b-bce0-84ca3abab47b'  -- doue WBC card ID
-- WHERE "id" = '1';  -- Starter Squad challenge
