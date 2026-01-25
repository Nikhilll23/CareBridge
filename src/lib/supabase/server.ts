import { supabaseAdmin } from '@/lib/supabase'

export async function createClient() {
    return supabaseAdmin
}
