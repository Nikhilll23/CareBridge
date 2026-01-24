import { getAllPaymentsReceptionist } from '@/actions/receptionist'
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { PaymentsListClient } from '@/components/modules/receptionist/PaymentsListClient'

export default async function ReceptionistPaymentsPage() {
    const user = await currentUser()
    if (!user) redirect('/sign-in')

    const payments = await getAllPaymentsReceptionist()

    return <PaymentsListClient payments={payments} />
}
