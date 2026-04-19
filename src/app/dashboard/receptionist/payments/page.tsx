import { getAllPaymentsReceptionist } from '@/actions/receptionist'
import { safeCurrentUser } from '@/lib/auth-safe'
import { redirect } from 'next/navigation'
import { PaymentsListClient } from '@/components/modules/receptionist/PaymentsListClient'

export default async function ReceptionistPaymentsPage() {
    const user = await safeCurrentUser()
    if (!user) redirect('/sign-in')

    const payments = await getAllPaymentsReceptionist()

    return <PaymentsListClient payments={payments} />
}
