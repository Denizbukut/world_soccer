-- Erstelle sbc_user_progress Tabelle
CREATE TABLE IF NOT EXISTS public.sbc_user_progress (
    id serial PRIMARY KEY,
    user_id uuid NOT NULL,
    challenge_id integer NOT NULL,
    is_completed boolean DEFAULT false,
    completed_at timestamp DEFAULT now(),
    UNIQUE(user_id, challenge_id)
);

-- Gewähre Rechte
GRANT ALL ON public.sbc_user_progress TO authenticated;
GRANT ALL ON public.sbc_user_progress TO service_role;

-- Teste Insert
INSERT INTO public.sbc_user_progress (user_id, challenge_id, is_completed) 
VALUES ('1b20f3f0-a8d0-4b10-b8e4-58fd5d498a3b', 1, true)
ON CONFLICT (user_id, challenge_id) 
DO UPDATE SET is_completed = true, completed_at = now();

-- Prüfe ob es funktioniert hat
SELECT * FROM public.sbc_user_progress WHERE user_id = '1b20f3f0-a8d0-4b10-b8e4-58fd5d498a3b';
