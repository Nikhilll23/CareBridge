import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PatientCartClient } from '@/components/modules/patient/PatientCartClient'

export default async function PatientCartPage() {
    const user = await currentUser()

    if (!user) {
        redirect('/sign-in')
    }

    const email = user.emailAddresses[0]?.emailAddress
    const supabase = await createClient()

    // 1. Get Patient ID from email
    const { data: patient } = await supabase
        .from('patients')
        .select('id, first_name, last_name, uhid')
        .eq('email', email)
        .single()

    if (!patient) {
        return (
            <div className="p-8 text-center">
                <h1 className="text-2xl font-bold text-red-500">Access Denied</h1>
                <p className="text-muted-foreground">Your account is not linked to a patient record. Please contact reception.</p>
            </div>
        )
    }

    // 2. Get Cart Items
    const { data: cartItems } = await supabase
        .from('pharmacy_cart_items')
        .select('*')
        .eq('patient_id', patient.id)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false })

    return (
        <div className="p-6">
            <PatientCartClient
                items={cartItems || []}
                patientId={patient.id}
                patientName={`${patient.first_name} ${patient.last_name}`}
            />
        </div>
    )
}
