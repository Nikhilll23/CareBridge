import { AppointmentsClient } from '@/components/modules/appointments/AppointmentsClient'
import { getAppointments, getAppointmentStats, getDoctors } from '@/actions/appointments'
import { getPatients } from '@/actions/patients'
import { currentUser } from '@clerk/nextjs/server'
import { syncUser } from '@/actions/auth'
import { redirect } from 'next/navigation'

export default async function AppointmentsPage() {
  const user = await currentUser()
  if (!user) redirect('/sign-in')

  const dbUser = await syncUser()
  if (!dbUser) redirect('/sign-in')

  /* 
    Fetch data in parallel for performance.
    Note: getPatients might return empty if user is Doctor and has no patients yet.
  */
  const [appointmentsRes, statsRes, doctorsRes, patientsRes] = await Promise.all([
    getAppointments(),
    getAppointmentStats(),
    getDoctors(),
    getPatients()
  ])

  return (
    <AppointmentsClient
      appointments={appointmentsRes.success ? appointmentsRes.data || [] : []}
      stats={statsRes.success ? statsRes.data! : { today: 0, pending: 0, completed: 0, cancelled: 0, inProgress: 0, total: 0 }}
      patients={patientsRes || []}
      doctors={doctorsRes.success ? doctorsRes.data || [] : []}
      userRole={dbUser.role}
    />
  )
}
