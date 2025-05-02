import { createClient } from "@supabase/supabase-js"

// Create a single supabase client for the browser
const createBrowserClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

  return createClient(supabaseUrl, supabaseAnonKey)
}

// Singleton pattern for client-side
let browserClient: ReturnType<typeof createClient> | null = null

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    browserClient = createBrowserClient()
  }
  return browserClient
}
