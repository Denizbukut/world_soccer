-- Füge is_repeatable zu sbc_challenges hinzu
ALTER TABLE public.sbc_challenges 
ADD COLUMN IF NOT EXISTS is_repeatable boolean NOT NULL DEFAULT false;

-- Erstelle die sbc_user_progress Tabelle neu
DROP TABLE IF EXISTS public.sbc_user_progress;

CREATE TABLE public.sbc_user_progress (
  id serial not null,
  user_id uuid not null,
  challenge_id integer not null,
  progress_percentage integer not null default 0,
  is_completed boolean not null default false,
  is_unlocked boolean not null default true,
  reward_claimed boolean not null default false,
  claimed_at timestamp with time zone null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint sbc_user_progress_pkey primary key (id),
  constraint sbc_user_progress_user_id_challenge_id_key unique (user_id, challenge_id),
  constraint sbc_user_progress_challenge_id_fkey foreign KEY (challenge_id) references sbc_challenges (id) on delete CASCADE,
  constraint sbc_user_progress_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint sbc_user_progress_progress_percentage_check check (
    (
      (progress_percentage >= 0)
      and (progress_percentage <= 100)
    )
  )
) TABLESPACE pg_default;

-- Erstelle die Indizes
CREATE INDEX IF NOT EXISTS idx_sbc_user_progress_user_id 
ON public.sbc_user_progress using btree (user_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_sbc_user_progress_challenge_id 
ON public.sbc_user_progress using btree (challenge_id) TABLESPACE pg_default;

-- Aktiviere RLS
ALTER TABLE public.sbc_user_progress ENABLE ROW LEVEL SECURITY;

-- Erstelle RLS Policies
CREATE POLICY "Users can view their own progress"
  ON public.sbc_user_progress
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
  ON public.sbc_user_progress
  FOR ALL
  USING (auth.uid() = user_id);

-- Gib Berechtigungen
GRANT ALL ON public.sbc_user_progress TO authenticated;
GRANT ALL ON public.sbc_user_progress TO service_role;
