import { getReferrals } from '@/actions/referrals'
import { DoctorReferralsClient } from '@/components/modules/referrals/DoctorReferralsClient'
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function DoctorReferralsPage() {
    const user = await currentUser()
    if (!user) redirect('/sign-in')

    // Fetch data
    const { data: referrals, error } = await getReferrals('DOCTOR')

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Referrals Management</h1>
                    <p className="text-muted-foreground">Manage incoming requests and your outgoing referrals</p>
                </div>
            </div>

            <DoctorReferralsClient initialReferrals={referrals || []} doctorId={user.id} />
        </div>
    )
}
