import { getDoctorStats, getDoctorAppointments } from '@/actions/doctor'
import { DoctorDashboardClient } from '@/components/modules/doctor/DoctorDashboardClient'
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function DoctorDashboard() {
    const user = await currentUser()
    if (!user) redirect('/sign-in')

    const stats = await getDoctorStats()
    const appointments = await getDoctorAppointments()

    if (!stats) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                Account not linked to a Doctor profile.
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
