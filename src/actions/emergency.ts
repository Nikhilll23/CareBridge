'use server'

import { supabaseAdmin } from '@/lib/supabase'
import type { Ambulance } from '@/types/admin'

export async function getEmergencyMapData() {
    try {
        // 1. Get Ambulances
        const { data: ambulances, error: ambError } = await supabaseAdmin
            .from('ambulances')
            .select('*')

        if (ambError) throw ambError

        // 2. Get Patients with city/state for clustering
        const { data: patients, error: patError } = await supabaseAdmin
            .from('patients')
            .select('id, first_name, last_name, city, state')
            .not('city', 'is', null)
            .limit(50)

        if (patError) throw patError

        return {
            success: true,
            ambulances: (ambulances as Ambulance[]) || [],
            patients: patients || []
        }
    } catch (error) {
        console.warn('Error fetching emergency map data:', error)
        return { success: false, ambulances: [], patients: [] }
    }
}
