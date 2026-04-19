import { getReceptionistStats } from '@/actions/receptionist'
import { safeCurrentUser } from '@/lib/auth-safe'
import { redirect } from 'next/navigation'
import { ReceptionistDashboardClient } from '@/components/modules/receptionist/ReceptionistDashboardClient'

export default async function ReceptionistDashboardPage() {
    const user = await safeCurrentUser()
    if (!user) redirect('/sign-in')

    const stats = await getReceptionistStats()

    return <ReceptionistDashboardClient stats={stats} />
}
