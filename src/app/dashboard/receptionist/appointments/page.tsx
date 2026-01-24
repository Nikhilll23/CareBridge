import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function ReceptionistAppointmentsPage() {
    const user = await currentUser()
    if (!user) redirect('/sign-in')

    // Redirect to main appointments page
    redirect('/dashboard/appointments')
}
