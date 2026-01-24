import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { BillingCounterClient } from '@/components/modules/receptionist/BillingCounterClient'

export default async function BillingCounterPage() {
    const user = await currentUser()
    if (!user) redirect('/sign-in')

    return <BillingCounterClient />
}
