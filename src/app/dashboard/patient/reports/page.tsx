import { getPatientReports } from '@/actions/reports'
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { PatientReportsClient } from '@/components/modules/reports/PatientReportsClient'

export default async function PatientReportsPage() {
    const user = await currentUser()
    if (!user) redirect('/sign-in')

    const reports = await getPatientReports()

    return <PatientReportsClient reports={reports} />
}
