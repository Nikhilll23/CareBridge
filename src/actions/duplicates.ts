'use server'

import { supabaseAdmin } from '@/lib/supabase'

export async function checkDuplicate(firstName: string, lastName: string, phone: string) {
    // 1. Exact Phone Match
    const { data: phoneMatch } = await supabaseAdmin
        .from('patients')
        .select('*')
        .eq('contact_number', phone)
        .single()

    if (phoneMatch) return { found: true, patient: phoneMatch, reason: 'Phone Number Match' }

    // 2. Name + Fuzzy Leniency (Postgres ILIKE)
    // Checking First + Last Name combination
    const { data: nameMatch } = await supabaseAdmin
        .from('patients')
        .select('*')
        .ilike('first_name', firstName)
        .ilike('last_name', lastName)
        .limit(1)
        .single()

    if (nameMatch) return { found: true, patient: nameMatch, reason: 'Name Match' }

    return { found: false }
}
