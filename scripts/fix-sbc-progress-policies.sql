-- Enable RLS on sbc_user_progress
ALTER TABLE public.sbc_user_progress ENABLE ROW LEVEL SECURITY;

-- Allow users to see their own progress
CREATE POLICY "Users can view their own progress"
  ON public.sbc_user_progress
  FOR SELECT
  USING (auth.uid() = user_id::uuid);

-- Allow users to update their own progress
CREATE POLICY "Users can update their own progress"
  ON public.sbc_user_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id::uuid);

-- Allow users to update their own progress
CREATE POLICY "Users can modify their own progress"
  ON public.sbc_user_progress
  FOR UPDATE
  USING (auth.uid() = user_id::uuid)
  WITH CHECK (auth.uid() = user_id::uuid);

-- Grant necessary permissions
GRANT ALL ON public.sbc_user_progress TO authenticated;
GRANT ALL ON public.sbc_user_progress TO service_role;
