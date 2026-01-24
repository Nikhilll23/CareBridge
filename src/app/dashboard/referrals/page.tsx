import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { syncUser } from '@/actions/auth'

export default async function ReferralsRedirectPage() {
    const user = await currentUser()
    if (!user) redirect('/sign-in')

    const dbUser = await syncUser()
    if (dbUser?.role === 'DOCTOR') {
        redirect('/dashboard/doctor/referrals')
    } else if (dbUser?.role === 'PATIENT') {
        redirect('/dashboard/patient/referrals')
    }

    redirect('/dashboard')
}
