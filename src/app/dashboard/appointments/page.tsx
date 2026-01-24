import { Suspense } from 'react'
import { AppointmentsClient } from '@/components/modules/appointments/AppointmentsClient'
import { getAppointments, getAppointmentStats, getDoctors } from '@/actions/appointments'
import { getPatients } from '@/actions/patients'

export const dynamic = 'force-dynamic'

import { currentUser } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

async function AppointmentsContent() {
  const user = await currentUser()
  if (!user) return null

  // Fetch user role
  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const userRole = userData?.role || 'PATIENT'

  // Fetch data
  const [appointmentsResult, statsResult, patientsData, doctorsResult] = await Promise.all([
    getAppointments(),
    getAppointmentStats(),
    getPatients(),
    getDoctors(),
  ])

  const appointments = appointmentsResult.data || []
  const stats = statsResult.data || {
    today: 0,
    pending: 0,
    completed: 0,
    cancelled: 0,
    inProgress: 0,
    total: 0,
  }

  let patients = patientsData || []
  const doctors = doctorsResult.data || []

  // If user is a patient, only show themselves in the patients list
  if (userRole === 'PATIENT') {
    const userEmail = user.emailAddresses[0]?.emailAddress
    if (userEmail) {
      patients = patients.filter(p => p.email === userEmail)
    }
  }

  return (
    <AppointmentsClient
      appointments={appointments}
      stats={stats}
      patients={patients}
      doctors={doctors}
      userRole={userRole}
    />
  )
}

export default async function AppointmentsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><div className="animate-pulse text-muted-foreground">Loading appointments...</div></div>}>
      <AppointmentsContent />
    </Suspense>
  )
}
