import { supabaseAdmin } from '@/lib/supabase'
import { safeCurrentUser } from '@/lib/auth-safe'
import { redirect } from 'next/navigation'
import { DoctorReportsClient } from '@/components/modules/reports/DoctorReportsClient'

export default async function AdminReportsPage() {
    const user = await safeCurrentUser()
    if (!user) redirect('/sign-in')

    // Admin sees ALL reports from all doctors
    const { data: reports } = await supabaseAdmin
        .from('medical_reports')
        .select(`
            *,
            patient:patients(first_name, last_name, uhid),
            appointment:appointments(appointment_date, reason)
        `)
        .order('created_at', { ascending: false })

    return <DoctorReportsClient reports={reports || []} />
}
