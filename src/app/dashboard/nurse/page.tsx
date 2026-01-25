import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NurseDashboardClient } from '@/components/modules/nurse/NurseDashboardClient'

import { auth } from '@clerk/nextjs/server'

export default async function NurseDashboardPage() {
    const { userId } = await auth()

    if (!userId) {
        redirect('/sign-in')
    }

    const supabase = await createClient()

    // Check if user is a nurse using Clerk ID
    // Assuming the 'users' table id matches the Clerk userId (which middleware ensures)
    const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()

    if (userData?.role !== 'NURSE') {
        redirect('/dashboard')
    }

    return (
        <div className="p-6">
            <Suspense fallback={<div>Loading...</div>}>
                <NurseDashboardClient />
            </Suspense>
        </div>
    )
}
