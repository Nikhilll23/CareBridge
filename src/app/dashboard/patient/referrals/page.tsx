import { getReferrals } from '@/actions/referrals'
import { ReferralRequestModal } from '@/components/modules/referrals/ReferralRequestModal'
import { PatientReferralsClient } from '@/components/modules/referrals/PatientReferralsClient'
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function PatientReferralsPage() {
    const user = await currentUser()
    if (!user) redirect('/sign-in')

    // Fetch initial data
    const { data: referrals, error } = await getReferrals('PATIENT')

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">My Referrals</h1>
                    <p className="text-muted-foreground">View and track your medical referrals</p>
                </div>
            </div>

            <PatientReferralsClient initialReferrals={referrals || []} patientId={user.id} />
            {/* Note: patientId here might need to be the actual UUID from DB if different from Clerk ID, 
                but we synced them to be same. passing user.id is safe for now. */}
        </div>
    )
}
