import { createClient, SupabaseClient } from "@supabase/supabase-js"

// Typen (optional, wenn du keine eigenen generierten Typen hast)
type GenericClient = SupabaseClient<any, "public", any>

// ✅ Client-seitig (Browser)
export function getSupabaseBrowserClient(): GenericClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key)
}

// ✅ Server-seitig (z. B. in app/actions.ts)
export function getSupabaseServerClient(): GenericClient {
  const url = process.env.SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key)
}
