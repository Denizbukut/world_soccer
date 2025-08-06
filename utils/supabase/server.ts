import { createClient as supabaseCreateClient } from "@supabase/supabase-js";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

export const createSupabaseServerClient = (cookieStore: ReadonlyRequestCookies) => {
  return supabaseCreateClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
      persistSession: false,
    },
  })
}

// Simplified server client for API routes that don't need cookie-based auth
export const createClient = () => {
  return supabaseCreateClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
      persistSession: false,
    },
  })
}
