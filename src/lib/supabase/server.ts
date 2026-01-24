import { supabaseAdmin } from '@/lib/supabase'

export function createClient() {
    // For server-side operations, use the admin client
    // This bypasses RLS but is necessary for server components
    return supabaseAdmin
}
