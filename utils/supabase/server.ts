import { createClient } from "@supabase/supabase-js"
import type { cookies } from "next/headers"

export const createSupabaseServerClient = (cookieStore: ReturnType<typeof cookies>) => {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
      persistSession: false,
    },
  })
}
