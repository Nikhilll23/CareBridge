import { safeCurrentUser } from '@/lib/auth-safe'
import { redirect } from 'next/navigation'
import { BillingCounterClient } from '@/components/modules/receptionist/BillingCounterClient'

export default async function BillingCounterPage() {
    const user = await safeCurrentUser()
    if (!user) redirect('/sign-in')

    return <BillingCounterClient />
}
