import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NurseDashboardClient } from '@/components/modules/nurse/NurseDashboardClient'

export default async function NurseDashboardPage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/signin')
    }

    // Check if user is a nurse
    const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
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
