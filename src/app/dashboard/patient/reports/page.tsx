import { getPatientReports } from '@/actions/reports'
import { safeCurrentUser } from '@/lib/auth-safe'
import { redirect } from 'next/navigation'
import { PatientReportsClient } from '@/components/modules/reports/PatientReportsClient'

export default async function PatientReportsPage() {
    const user = await safeCurrentUser()
    if (!user) redirect('/sign-in')

    const reports = await getPatientReports()

    return <PatientReportsClient reports={reports} />
}
