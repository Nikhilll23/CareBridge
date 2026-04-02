'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import type { BedData } from '@/components/modules/ipd/BedBoard'

export async function getBedStats(): Promise<BedData[]> {
    try {
        const { data: beds, error } = await supabaseAdmin
            .from('beds')
            .select(`
                id,
                bed_number,
                status,
                daily_charge,
                ward:wards(id, name),
                admission:admissions(
                    patient:patients(first_name, last_name, uhid)
                )
            `)
            .order('bed_number', { ascending: true })

        if (error) {
            console.warn('Fetch Beds Error:', error)
            return []
        }

        // Transform to BedData format
        return beds.map((bed: any) => ({
            id: bed.id,
            bedNumber: bed.bed_number,
            status: bed.status,
            dailyCharge: bed.daily_charge,
            wardId: bed.ward?.id,
            wardName: bed.ward?.name || 'Unknown Ward',
            currentPatient: bed.admission?.[0]?.patient ? {
                // Note: Relation is 'current_admission_id' on bed, but usually we just query active admissions
                // If the schema linked bed -> admission via FK on bed (current_admission_id), we fetch that one.
                // Assuming standard join:
                name: `${bed.admission?.[0]?.patient.first_name} ${bed.admission?.[0]?.patient.last_name}`,
                uhid: bed.admission?.[0]?.patient.uhid
            } : undefined
        }))
    } catch (e) {
        console.warn('Unexpected error fetching beds', e)
        return []
    }
}

export async function admitPatient(data: { patientId: string, bedId: string, doctorId: string, diagnosis: string }) {
    // 1. Create Admission Record
    // 2. Update Bed Status to OCCUPIED
    try {
        const { data: admission, error: admError } = await supabaseAdmin
            .from('admissions')
            .insert({
                patient_id: data.patientId,
                bed_id: data.bedId,
                doctor_id: data.doctorId,
                diagnosis: data.diagnosis,
                status: 'ADMITTED'
            })
            .select()
            .single()

        if (admError) throw admError

        await supabaseAdmin
            .from('beds')
            .update({ status: 'OCCUPIED' })
            .eq('id', data.bedId)

        revalidatePath('/dashboard/ipd/beds')
        return { success: true, message: 'Patient Admitted' }
    } catch (e) {
        return { success: false, error: 'Admission failed' }
    }
}
