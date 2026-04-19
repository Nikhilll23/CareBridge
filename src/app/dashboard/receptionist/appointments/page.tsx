import { safeCurrentUser } from '@/lib/auth-safe'
import { redirect } from 'next/navigation'

export default async function ReceptionistAppointmentsPage() {
    const user = await safeCurrentUser()
    if (!user) redirect('/sign-in')

    // Redirect to main appointments page
    redirect('/dashboard/appointments')
}
