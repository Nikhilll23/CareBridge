import { LiveBedBoard } from '@/components/modules/beds/LiveBedBoard'
import { PatientBedView } from '@/components/modules/beds/PatientBedView'
import { currentUser } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { redirect } from 'next/navigation'

export default async function BedManagementPage() {
    const user = await currentUser()
    if (!user) redirect('/sign-in')

    // Get user role
    const { data: userData } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

    const userRole = userData?.role || 'PATIENT'
    const userEmail = user.primaryEmailAddress?.emailAddress || ''

    // Patients see only their bed, others see full board
    if (userRole === 'PATIENT') {
        return (
            <div className="container mx-auto py-6">
                <PatientBedView userEmail={userEmail} />
            </div>
        )
    }

    return (
        <div className="container mx-auto py-6">
            <LiveBedBoard userRole={userRole} />
        </div>
    )
}
