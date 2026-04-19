import { safeCurrentUser } from '@/lib/auth-safe'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { PatientCartClient } from '@/components/modules/patient/PatientCartClient'

export default async function PatientCartPage() {
    const user = await safeCurrentUser()
    if (!user) redirect('/sign-in')

    const email = user.emailAddresses[0]?.emailAddress
    if (!email) redirect('/sign-in')

    // Get Patient — use oldest record (avoid duplicate issue)
    const { data: patients } = await supabaseAdmin
        .from('patients')
        .select('id, first_name, last_name, uhid')
        .eq('email', email)
        .order('created_at', { ascending: true })
        .limit(1)

    const patient = patients?.[0]

    if (!patient) {
        return (
            <div className="p-8 text-center">
                <h1 className="text-2xl font-bold text-red-500">Profile Not Found</h1>
                <p className="text-muted-foreground mt-2">
                    No patient record found for <strong>{email}</strong>.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                    Please contact hospital administration.
                </p>
            </div>
        )
    }

    // Get Cart Items using admin client (bypasses RLS)
    const { data: cartItems } = await supabaseAdmin
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
