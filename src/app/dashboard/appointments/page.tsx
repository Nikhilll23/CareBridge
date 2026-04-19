import { AppointmentsClient } from '@/components/modules/appointments/AppointmentsClient'
import { getAppointments, getAppointmentStats, getDoctors } from '@/actions/appointments'
import { getPatients } from '@/actions/patients'
import { safeCurrentUser } from '@/lib/auth-safe'
import { syncUser } from '@/actions/auth'
import { redirect } from 'next/navigation'

export default async function AppointmentsPage() {
  const user = await safeCurrentUser()
  if (!user) redirect('/sign-in')

  const dbUser = await syncUser()
  if (!dbUser) redirect('/sign-in')

  let appointmentsRes: any = { success: true, data: [] }
  let statsRes: any = { success: true, data: { today: 0, pending: 0, completed: 0, cancelled: 0, inProgress: 0, total: 0 } }
  let doctorsRes: any = { success: true, data: [] }
  let patientsRes: any[] = []

  try {
    ;[appointmentsRes, statsRes, doctorsRes, patientsRes] = await Promise.all([
      getAppointments(),
      getAppointmentStats(),
      getDoctors(),
      getPatients()
    ])
  } catch (err) {
    console.warn('AppointmentsPage: DB fetch failed, using empty fallback', err)
  }

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
