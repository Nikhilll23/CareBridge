import { getDoctorStats, getDoctorAppointments } from '@/actions/doctor'
import { DoctorDashboardClient } from '@/components/modules/doctor/DoctorDashboardClient'
import { safeCurrentUser } from '@/lib/auth-safe'
import { redirect } from 'next/navigation'

export default async function DoctorDashboard() {
    const user = await safeCurrentUser()
    if (!user) redirect('/sign-in')

    let stats = null
    let appointments: any[] = []

    try {
        ;[stats, appointments] = await Promise.all([
            getDoctorStats(),
            getDoctorAppointments()
        ])
    } catch (err) {
        console.warn('DoctorDashboard: DB fetch failed', err)
    }

    if (!stats) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                Could not load doctor profile. Please refresh the page.
            </div>
        )
    }

    return (
        <DoctorDashboardClient
            stats={stats}
            appointments={appointments}
            doctorName={user.firstName || 'Doctor'}
        />
    )
}
