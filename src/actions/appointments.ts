'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import { currentUser } from '@clerk/nextjs/server'
import { logAuditAction } from './audit'

// Validation Schema
const appointmentSchema = z.object({
  patientId: z.string().uuid('Invalid patient ID'),
  doctorId: z.string().min(1, 'Doctor is required'),
  appointmentDate: z.string().datetime('Invalid date format'),
  reason: z.string().min(3, 'Reason is required (minimum 3 characters)'),
  notes: z.string().optional(),
})

export type AppointmentStatus = 'PENDING' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export interface Appointment {
  id: string
  patient_id: string
  doctor_id: string
  appointment_date: string
  status: AppointmentStatus
  reason: string
  notes: string | null
  created_at: string
  updated_at: string
  patient?: {
    id: string
    first_name: string
    last_name: string
    contact_number: string
  }
  doctor?: {
    id: string
    full_name: string
    email: string
    role: string
  }
}

/**
 * Get appointments based on user role
 * - Admins: All appointments
 * - Doctors: Only their appointments
 */
export async function getAppointments(filters?: {
  doctorId?: string
  status?: AppointmentStatus
  date?: string
}) {
  try {
    const user = await currentUser()
    if (!user) {
      return { success: false, error: 'Unauthorized', data: [] }
    }

    // Get user role from database
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    let query = supabaseAdmin
      .from('appointments')
      .select(`
        *,
        patient:patients(id, first_name, last_name, contact_number)
      `)
      .order('appointment_date', { ascending: true })

    // Apply role-based filtering
    if (userData?.role === 'DOCTOR') {
      query = query.eq('doctor_id', user.id)
    } else if (userData?.role === 'PATIENT') {
      const userEmail = user.emailAddresses[0]?.emailAddress
      if (!userEmail) return { success: true, data: [] }

      const { data: patientProfile } = await supabaseAdmin
        .from('patients')
        .select('id')
        .eq('email', userEmail)
        .single()

      if (!patientProfile) {
        return { success: true, data: [] }
      }

      query = query.eq('patient_id', patientProfile.id)
    } else if (userData?.role === 'ADMIN') {
      // Admin sees all
    } else {
      return { success: false, error: 'Unauthorized access', data: [] }
    }

    // Apply additional filters
    if (filters?.doctorId) {
      query = query.eq('doctor_id', filters.doctorId)
    }
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.date) {
      // Filter by specific date
      const startOfDay = new Date(filters.date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(filters.date)
      endOfDay.setHours(23, 59, 59, 999)

      query = query
        .gte('appointment_date', startOfDay.toISOString())
        .lte('appointment_date', endOfDay.toISOString())
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching appointments:', error)
      return { success: false, error: 'Failed to fetch appointments', data: [] }
    }

    // Manually fetch doctor details for each appointment
    if (data && data.length > 0) {
      const doctorIds = [...new Set(data.map(apt => apt.doctor_id))]
      const { data: doctors } = await supabaseAdmin
        .from('users')
        .select('id, first_name, last_name, email, role')
        .in('id', doctorIds)

      // Map doctor details to appointments with formatted full_name
      const appointmentsWithDoctors = data.map(appointment => ({
        ...appointment,
        doctor: doctors?.find(doc => doc.id === appointment.doctor_id)
          ? {
            id: doctors.find(doc => doc.id === appointment.doctor_id)!.id,
            full_name: `${doctors.find(doc => doc.id === appointment.doctor_id)!.first_name || ''} ${doctors.find(doc => doc.id === appointment.doctor_id)!.last_name || ''}`.trim() || doctors.find(doc => doc.id === appointment.doctor_id)!.email,
            email: doctors.find(doc => doc.id === appointment.doctor_id)!.email,
            role: doctors.find(doc => doc.id === appointment.doctor_id)!.role
          }
          : null
      }))

      return { success: true, data: appointmentsWithDoctors as Appointment[] }
    }

    return { success: true, data: data as Appointment[] }
  } catch (error) {
    console.error('Error in getAppointments:', error)
    return { success: false, error: 'Failed to fetch appointments', data: [] }
  }
}

/**
 * Get appointments for today
 */
export async function getTodayAppointments() {
  const today = new Date().toISOString().split('T')[0]
  return getAppointments({ date: today })
}

/**
 * Get appointment statistics
 */
export async function getAppointmentStats() {
  try {
    const user = await currentUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayISO = today.toISOString()

    // Get user role
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    let baseQuery = supabaseAdmin.from('appointments').select('status, appointment_date')

    // Filter by role
    if (userData?.role === 'DOCTOR') {
      baseQuery = baseQuery.eq('doctor_id', user.id)
    } else if (userData?.role === 'PATIENT') {
      const userEmail = user.emailAddresses[0]?.emailAddress
      if (!userEmail) return { success: false, error: 'No email found' }

      const { data: patient } = await supabaseAdmin.from('patients').select('id').eq('email', userEmail).single()
      if (!patient) return { success: true, data: { today: 0, pending: 0, completed: 0, cancelled: 0, inProgress: 0, total: 0 } }

      baseQuery = baseQuery.eq('patient_id', patient.id)
    }

    const { data: appointments } = await baseQuery

    if (!appointments) {
      return { success: false, error: 'Failed to fetch stats' }
    }

    // Calculate stats
    const todayAppointments = appointments.filter(
      (apt) => new Date(apt.appointment_date) >= today
    ).length

    const pending = appointments.filter((apt) => apt.status === 'SCHEDULED').length
    const completed = appointments.filter((apt) => apt.status === 'COMPLETED').length
    const cancelled = appointments.filter((apt) => apt.status === 'CANCELLED').length
    const inProgress = appointments.filter((apt) => apt.status === 'IN_PROGRESS').length

    return {
      success: true,
      data: {
        today: todayAppointments,
        pending,
        completed,
        cancelled,
        inProgress,
        total: appointments.length,
      },
    }
  } catch (error) {
    console.error('Error in getAppointmentStats:', error)
    return { success: false, error: 'Failed to fetch stats' }
  }
}

/**
 * Create a new appointment
 */
export async function createAppointment(data: z.infer<typeof appointmentSchema>) {
  try {
    const user = await currentUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Validate input
    const validatedData = appointmentSchema.parse(data)

    // Check permissions
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return { success: false, error: 'User not found' }
    }

    // If patient, verify they are booking for themselves
    if (userData.role === 'PATIENT') {
      const { data: patientData } = await supabaseAdmin
        .from('patients')
        .select('id')
        .eq('email', user.emailAddresses[0]?.emailAddress)
        .single()

      if (!patientData || patientData.id !== validatedData.patientId) {
        return { success: false, error: 'You can only book appointments for yourself' }
      }
    } else if (!['ADMIN', 'DOCTOR'].includes(userData.role)) {
      return { success: false, error: 'You do not have permission to create appointments' }
    }

    // Insert appointment
    const { data: appointment, error } = await supabaseAdmin
      .from('appointments')
      .insert({
        patient_id: validatedData.patientId,
        doctor_id: validatedData.doctorId,
        appointment_date: validatedData.appointmentDate,
        reason: validatedData.reason,
        notes: validatedData.notes || null,
        status: 'SCHEDULED',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating appointment:', error)
      return { success: false, error: 'Failed to create appointment' }
    }

    // Log Audit
    await logAuditAction(
      'CREATE_APPOINTMENT',
      'APPOINTMENTS',
      appointment.id,
      {
        patientId: validatedData.patientId,
        doctorId: validatedData.doctorId,
        reason: validatedData.reason,
        createdBy: user.emailAddresses[0]?.emailAddress
      }
    )

    revalidatePath('/dashboard/appointments')
    return { success: true, data: appointment, message: 'Appointment scheduled successfully' }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Validation failed',
        details: error.issues[0].message,
      }
    }

    console.error('Error in createAppointment:', error)
    return { success: false, error: 'Failed to create appointment' }
  }
}

/**
 * Update appointment status
 */
export async function updateAppointmentStatus(id: string, status: AppointmentStatus) {
  try {
    const user = await currentUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Check permissions
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userData || !['ADMIN', 'DOCTOR'].includes(userData.role)) {
      return { success: false, error: 'You do not have permission to update appointments' }
    }

    // Update appointment
    const { error } = await supabaseAdmin
      .from('appointments')
      .update({ status })
      .eq('id', id)

    if (error) {
      console.error('Error updating appointment status:', error)
      return { success: false, error: 'Failed to update appointment' }
    }

    // Log Audit
    await logAuditAction(
      'UPDATE_APPOINTMENT_STATUS',
      'APPOINTMENTS',
      id,
      {
        newStatus: status,
        updatedBy: user.emailAddresses[0]?.emailAddress
      }
    )

    revalidatePath('/dashboard/appointments')
    return { success: true, message: 'Appointment status updated successfully' }
  } catch (error) {
    console.error('Error in updateAppointmentStatus:', error)
    return { success: false, error: 'Failed to update appointment' }
  }
}

/**
 * Delete appointment
 */
export async function deleteAppointment(id: string) {
  try {
    const user = await currentUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Check permissions (Admin only)
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userData || userData.role !== 'ADMIN') {
      return { success: false, error: 'Only admins can delete appointments' }
    }

    const { error } = await supabaseAdmin.from('appointments').delete().eq('id', id)

    if (error) {
      console.error('Error deleting appointment:', error)
      return { success: false, error: 'Failed to delete appointment' }
    }

    await logAuditAction(
      'DELETE_APPOINTMENT',
      'APPOINTMENTS',
      id,
      {
        deletedBy: user.emailAddresses[0]?.emailAddress
      }
    )

    revalidatePath('/dashboard/appointments')
    return { success: true, message: 'Appointment deleted successfully' }
  } catch (error) {
    console.error('Error in deleteAppointment:', error)
    return { success: false, error: 'Failed to delete appointment' }
  }
}

/**
 * Get all doctors for appointment scheduling
 */
export async function getDoctors() {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, first_name, last_name, email, role')
      .eq('role', 'DOCTOR')
      .order('first_name', { ascending: true })

    if (error) {
      console.error('Error fetching doctors:', error)
      return { success: false, error: 'Failed to fetch doctors', data: [] }
    }

    // Format full_name from first_name and last_name
    const formattedDoctors = (data || []).map(doctor => ({
      id: doctor.id,
      full_name: `${doctor.first_name || ''} ${doctor.last_name || ''}`.trim() || doctor.email,
      email: doctor.email,
      role: doctor.role
    }))

    return { success: true, data: formattedDoctors }
  } catch (error) {
    console.error('Error in getDoctors:', error)
    return { success: false, error: 'Failed to fetch doctors', data: [] }
  }
}
