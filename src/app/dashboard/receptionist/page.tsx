import { getReceptionistStats } from '@/actions/receptionist'
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { ReceptionistDashboardClient } from '@/components/modules/receptionist/ReceptionistDashboardClient'

export default async function ReceptionistDashboardPage() {
    const user = await currentUser()
    if (!user) redirect('/sign-in')

    const stats = await getReceptionistStats()

    return <ReceptionistDashboardClient stats={stats} />
}
