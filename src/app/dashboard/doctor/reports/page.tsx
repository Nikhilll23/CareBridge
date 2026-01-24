import { getDoctorReports } from '@/actions/reports'
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { DoctorReportsClient } from '@/components/modules/reports/DoctorReportsClient'

export default async function DoctorReportsPage() {
    const user = await currentUser()
    if (!user) redirect('/sign-in')

    const reports = await getDoctorReports()

    return <DoctorReportsClient reports={reports} />
}
