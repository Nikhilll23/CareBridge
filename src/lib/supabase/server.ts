import { supabaseAdmin } from '@/lib/supabase'

// Optimization: Reuse client instance if already created to prevent connection exhaustion
const client = (() => {
    if (process.env.NODE_ENV === 'production') {
        return supabaseAdmin
    }
    // In development, we want to reuse the same instance if possible, though hot-reloading complicates this.
    // Global singleton pattern for dev not fully applicable to Supabase JS generic client but helps.
    if (!(global as any).supabaseAdminClient) {
        (global as any).supabaseAdminClient = supabaseAdmin
    }
    return (global as any).supabaseAdminClient
})()

export function createClient() {
    // For server-side operations, use the admin client
    // This bypasses RLS but is necessary for server components
    return client
}
