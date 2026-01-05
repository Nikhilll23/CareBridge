import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { RadiologyDashboard } from './RadiologyDashboard'

export const metadata = {
  title: 'Radiology & Imaging | HIS Core',
  description: 'Medical imaging and radiology reports management',
}

export default async function RadiologyPage() {
  const user = await currentUser()

  if (!user) {
    redirect('/sign-in')
  }

  // Check if user is admin or doctor
  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('role, email, first_name, last_name')
    .eq('id', user.id)
    .single()

  if (!userData || !['ADMIN', 'DOCTOR'].includes(userData.role)) {
    redirect('/dashboard')
  }

  const isAdmin = userData.role === 'ADMIN' || userData.email === 'omarhashmi494@gmail.com'

  return (
    <Suspense fallback={<div className="p-8">Loading radiology data...</div>}>
      <RadiologyDashboard 
        isAdmin={isAdmin} 
        currentUserId={user.id}
        userFullName={`${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.email}
      />
    </Suspense>
  )
}
