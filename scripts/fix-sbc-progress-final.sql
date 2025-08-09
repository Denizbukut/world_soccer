-- SCHRITT 1: Lösche die alte Tabelle komplett
DROP TABLE IF EXISTS public.sbc_user_progress;

-- SCHRITT 2: Erstelle die Tabelle neu mit dem korrekten Schema
CREATE TABLE public.sbc_user_progress (
    id serial NOT NULL,
    user_id uuid NOT NULL,
    challenge_id integer NOT NULL,
    progress_percentage integer NOT NULL DEFAULT 0,
    is_completed boolean NOT NULL DEFAULT false,
    is_unlocked boolean NOT NULL DEFAULT true,
    reward_claimed boolean NOT NULL DEFAULT false,
    claimed_at timestamp with time zone NULL,
    created_at timestamp with time zone NULL DEFAULT now(),
    updated_at timestamp with time zone NULL DEFAULT now(),
    CONSTRAINT sbc_user_progress_pkey PRIMARY KEY (id),
    CONSTRAINT sbc_user_progress_user_id_challenge_id_key UNIQUE (user_id, challenge_id),
    CONSTRAINT sbc_user_progress_progress_percentage_check CHECK (
        ((progress_percentage >= 0) AND (progress_percentage <= 100))
    )
);

-- SCHRITT 3: Erstelle Indexe
CREATE INDEX idx_sbc_user_progress_user_id 
ON public.sbc_user_progress USING btree (user_id);

CREATE INDEX idx_sbc_user_progress_challenge_id 
ON public.sbc_user_progress USING btree (challenge_id);

-- SCHRITT 4: Gewähre Rechte
GRANT ALL ON public.sbc_user_progress TO authenticated;
GRANT ALL ON public.sbc_user_progress TO service_role;
GRANT ALL ON public.sbc_user_progress TO anon;

-- SCHRITT 5: Teste Insert
INSERT INTO public.sbc_user_progress (
    user_id, 
    challenge_id, 
    progress_percentage,
    is_completed,
    is_unlocked,
    reward_claimed,
    claimed_at
) VALUES (
    '1b20f3f0-a8d0-4b10-b8e4-58fd5d498a3b', -- User UUID von 'deniz'
    1, -- Challenge ID für 'Starter Squad'
    100,
    true,
    true,
    true,
    now()
) ON CONFLICT (user_id, challenge_id) 
DO UPDATE SET 
    progress_percentage = 100,
    is_completed = true,
    is_unlocked = true,
    reward_claimed = true,
    claimed_at = now(),
    updated_at = now();

-- SCHRITT 6: Prüfe ob es funktioniert hat
SELECT * FROM public.sbc_user_progress 
WHERE user_id = '1b20f3f0-a8d0-4b10-b8e4-58fd5d498a3b' 
AND challenge_id = 1;
