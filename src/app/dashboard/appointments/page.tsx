import { Suspense } from 'react'
import { AppointmentsClient } from '@/components/modules/appointments/AppointmentsClient'
import { getAppointments, getAppointmentStats, getDoctors } from '@/actions/appointments'
import { getPatients } from '@/actions/patients'

export const dynamic = 'force-dynamic'

async function AppointmentsContent() {
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
  const patients = patientsData || []
  const doctors = doctorsResult.data || []

  return (
    <AppointmentsClient
      appointments={appointments}
      stats={stats}
      patients={patients}
      doctors={doctors}
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
