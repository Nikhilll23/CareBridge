import { createSupabaseBrowserClient } from '@/lib/supabase'

export function createClient() {
    // For client-side operations, use the browser client
    return createSupabaseBrowserClient()
}
