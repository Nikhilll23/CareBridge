import { getDoctorReports } from '@/actions/reports'
import { safeCurrentUser } from '@/lib/auth-safe'
import { redirect } from 'next/navigation'
import { DoctorReportsClient } from '@/components/modules/reports/DoctorReportsClient'

export default async function DoctorReportsPage() {
    const user = await safeCurrentUser()
    if (!user) redirect('/sign-in')

    const reports = await getDoctorReports()

    return <DoctorReportsClient reports={reports} />
}
