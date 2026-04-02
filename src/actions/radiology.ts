'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import { currentUser } from '@clerk/nextjs/server'
import { logAuditAction } from './audit'


// Validation Schema
const radiologyReportSchema = z.object({
  patientId: z.string().uuid('Invalid patient ID'),
  doctorId: z.string().min(1, 'Doctor is required'),
  modality: z.enum([
    'XRAY',
    'MRI',
    'CT',
    'ULTRASOUND',
    'MAMMOGRAPHY',
    'PET',
    'NUCLEAR_MEDICINE',
    'FLUOROSCOPY',
  ]),
  studyTitle: z.string().min(3, 'Study title is required'),
  studyUrl: z.string().url().optional().or(z.literal('')),
  findings: z.string().optional(),
  impression: z.string().optional(),
  radiopaediaCaseId: z.string().optional(),
})

export type RadiologyStatus = 'PENDING' | 'IN_PROGRESS' | 'FINALIZED' | 'CANCELLED'
export type ImagingModality =
  | 'XRAY'
  | 'MRI'
  | 'CT'
  | 'ULTRASOUND'
  | 'MAMMOGRAPHY'
  | 'PET'
  | 'NUCLEAR_MEDICINE'
  | 'FLUOROSCOPY'

export interface RadiologyReport {
  id: string
  patient_id: string
  doctor_id: string
  modality: ImagingModality
  study_title: string
  study_url: string | null
  findings: string | null
  impression: string | null
  status: RadiologyStatus
  radiopaedia_case_id: string | null
  created_at: string
  updated_at: string
  patient?: {
    id: string
    first_name: string
    last_name: string
    date_of_birth: string
    gender: string
  }
  doctor?: {
    id: string
    full_name: string
    email: string
  }
}

/**
 * Get radiology reports with filtering
 */
export async function getRadiologyReports(filters?: {
  patientId?: string
  doctorId?: string
  modality?: ImagingModality
  status?: RadiologyStatus
}) {
  try {
    const user = await currentUser()
    if (!user) {
      return { success: false, error: 'Unauthorized', data: [] }
    }

    // Check user role
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userData || !['ADMIN', 'DOCTOR'].includes(userData.role)) {
      return { success: false, error: 'Unauthorized access', data: [] }
    }

    let query = supabaseAdmin
      .from('radiology_reports')
      .select(`
        *,
        patient:patients(id, first_name, last_name, date_of_birth, gender)
      `)
      .order('created_at', { ascending: false })

    // Apply filters
    if (filters?.patientId) {
      query = query.eq('patient_id', filters.patientId)
    }
    if (filters?.doctorId) {
      query = query.eq('doctor_id', filters.doctorId)
    }
    if (filters?.modality) {
      query = query.eq('modality', filters.modality)
    }
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    // If user is a doctor (not admin), only show their reports
    if (userData.role === 'DOCTOR') {
      query = query.eq('doctor_id', user.id)
    }

    const { data, error } = await query

    if (error) {
      console.warn('Error fetching radiology reports:', error)
      return { success: false, error: 'Failed to fetch reports', data: [] }
    }

    // Manually fetch doctor details
    if (data && data.length > 0) {
      const doctorIds = [...new Set(data.map((report) => report.doctor_id))]
      const { data: doctors } = await supabaseAdmin
        .from('users')
        .select('id, first_name, last_name, email')
        .in('id', doctorIds)

      const reportsWithDoctors = data.map((report) => ({
        ...report,
        doctor: doctors?.find((doc) => doc.id === report.doctor_id)
          ? {
            id: doctors.find((doc) => doc.id === report.doctor_id)!.id,
            full_name: `${doctors.find((doc) => doc.id === report.doctor_id)!.first_name || ''} ${doctors.find((doc) => doc.id === report.doctor_id)!.last_name || ''}`.trim() ||
              doctors.find((doc) => doc.id === report.doctor_id)!.email,
            email: doctors.find((doc) => doc.id === report.doctor_id)!.email,
          }
          : null,
      }))

      return { success: true, data: reportsWithDoctors as RadiologyReport[] }
    }

    return { success: true, data: data as RadiologyReport[] }
  } catch (error) {
    console.warn('Error in getRadiologyReports:', error)
    return { success: false, error: 'Failed to fetch reports', data: [] }
  }
}

/**
 * Get radiology statistics
 */
export async function getRadiologyStats() {
  try {
    const user = await currentUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userData || !['ADMIN', 'DOCTOR'].includes(userData.role)) {
      return { success: false, error: 'Unauthorized access' }
    }

    let query = supabaseAdmin.from('radiology_reports').select('status, modality')

    if (userData.role === 'DOCTOR') {
      query = query.eq('doctor_id', user.id)
    }

    const { data: reports } = await query

    if (!reports) {
      return { success: false, error: 'Failed to fetch stats' }
    }

    // Calculate stats
    const pending = reports.filter((r) => r.status === 'PENDING').length
    const inProgress = reports.filter((r) => r.status === 'IN_PROGRESS').length
    const finalized = reports.filter((r) => r.status === 'FINALIZED').length
    const cancelled = reports.filter((r) => r.status === 'CANCELLED').length

    // Count by modality
    const byModality: Record<string, number> = {}
    reports.forEach((r) => {
      byModality[r.modality] = (byModality[r.modality] || 0) + 1
    })

    return {
      success: true,
      data: {
        total: reports.length,
        pending,
        inProgress,
        finalized,
        cancelled,
        byModality,
      },
    }
  } catch (error) {
    console.warn('Error in getRadiologyStats:', error)
    return { success: false, error: 'Failed to fetch stats' }
  }
}

/**
 * Create a new radiology report
 */
export async function createRadiologyReport(data: z.infer<typeof radiologyReportSchema>) {
  try {
    const user = await currentUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Validate input
    const validatedData = radiologyReportSchema.parse(data)

    // Check permissions
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userData || !['ADMIN', 'DOCTOR'].includes(userData.role)) {
      return { success: false, error: 'You do not have permission to create reports' }
    }

    // Insert report
    const { data: report, error } = await supabaseAdmin
      .from('radiology_reports')
      .insert({
        patient_id: validatedData.patientId,
        doctor_id: validatedData.doctorId,
        modality: validatedData.modality,
        study_title: validatedData.studyTitle,
        study_url: validatedData.studyUrl || null,
        findings: validatedData.findings || null,
        impression: validatedData.impression || null,
        radiopaedia_case_id: validatedData.radiopaediaCaseId || null,
        status: 'PENDING',
      })
      .select()
      .single()

    if (error) {
      console.warn('Error creating radiology report:', error)
      return { success: false, error: 'Failed to create report' }
    }

    revalidatePath('/dashboard/radiology')
    return { success: true, data: report, message: 'Radiology report created successfully' }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Validation failed',
        details: error.issues[0].message,
      }
    }

    console.warn('Error in createRadiologyReport:', error)
    return { success: false, error: 'Failed to create report' }
  }
}

/**
 * Update radiology report status
 */
export async function updateRadiologyStatus(id: string, status: RadiologyStatus) {
  try {
    const user = await currentUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userData || !['ADMIN', 'DOCTOR'].includes(userData.role)) {
      return { success: false, error: 'Unauthorized access' }
    }

    const { error } = await supabaseAdmin
      .from('radiology_reports')
      .update({ status })
      .eq('id', id)

    if (error) {
      console.warn('Error updating status:', error)
      return { success: false, error: 'Failed to update status' }
    }

    revalidatePath('/dashboard/radiology')
    return { success: true, message: 'Status updated successfully' }
  } catch (error) {
    console.warn('Error in updateRadiologyStatus:', error)
    return { success: false, error: 'Failed to update status' }
  }
}

/**
 * Update radiology report findings
 */
export async function updateRadiologyFindings(
  id: string,
  findings: string,
  impression?: string
) {
  try {
    const user = await currentUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userData || !['ADMIN', 'DOCTOR'].includes(userData.role)) {
      return { success: false, error: 'Unauthorized access' }
    }

    const updateData: any = { findings }
    if (impression !== undefined) {
      updateData.impression = impression
    }

    const { error } = await supabaseAdmin
      .from('radiology_reports')
      .update(updateData)
      .eq('id', id)

    if (error) {
      console.warn('Error updating findings:', error)
      return { success: false, error: 'Failed to update findings' }
    }

    revalidatePath('/dashboard/radiology')
    return { success: true, message: 'Findings updated successfully' }
  } catch (error) {
    console.warn('Error in updateRadiologyFindings:', error)
    return { success: false, error: 'Failed to update findings' }
  }
}



/**
 * Delete a radiology report (Admin only)
 */
export async function deleteRadiologyReport(id: string) {
  try {
    const user = await currentUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userData || userData.role !== 'ADMIN') {
      return { success: false, error: 'Only admins can delete reports' }
    }

    const { error } = await supabaseAdmin.from('radiology_reports').delete().eq('id', id)

    if (error) {
      console.warn('Error deleting report:', error)
      return { success: false, error: 'Failed to delete report' }
    }

    await logAuditAction(
      'DELETE_RADIOLOGY_REPORT',
      'RADIOLOGY',
      id,
      {
        deletedBy: user.emailAddresses[0]?.emailAddress
      }
    )

    revalidatePath('/dashboard/radiology')
    return { success: true, message: 'Report deleted successfully' }
  } catch (error) {
    console.warn('Error in deleteRadiologyReport:', error)
    return { success: false, error: 'Failed to delete report' }
  }
}

/**
 * Get data for creating a new study (patients and doctors)
 */
export async function getStudyFormData() {
  try {
    const user = await currentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    // Check permissions
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userData || !['ADMIN', 'DOCTOR'].includes(userData.role)) {
      return { success: false, error: 'Unauthorized access' }
    }

    const [patientsResult, doctorsResult] = await Promise.all([
      supabaseAdmin.from('patients').select('id, first_name, last_name').order('first_name'),
      supabaseAdmin
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('role', 'DOCTOR')
        .order('first_name'),
    ])

    return {
      success: true,
      data: {
        patients: patientsResult.data || [],
        doctors: doctorsResult.data || []
      }
    }
  } catch (error) {
    console.warn('Error fetching study form data:', error)
    return { success: false, error: 'Failed to load data' }
  }
}

// ... existing code ...

/**
 * TCIA INTEGRATION ACTIONS
 */
import { getCollections, getPatients, getStudies, getSeries, getImages, getDicomUrl, type TCIAStudy } from '@/lib/tcia'

/**
 * Browse available public collections from TCIA
 */
export async function browsePublicCollections() {
  try {
    const collections = await getCollections()
    return { success: true, data: collections.map(c => c.Collection) }
  } catch (error) {
    console.warn('Error fetching TCIA collections:', error)
    return { success: false, error: 'Failed to fetch collections' }
  }
}

/**
 * Search/Browse Studies in a Collection (TCIA)
 * Returns a simplified list of studies with patient info
 */
export async function searchTCIAStudies(collection: string) {
  try {
    // 1. Get Patients in Collection (Limit to first 20 for performance)
    const patients = await getPatients(collection)
    const limitedPatients = patients.slice(0, 15) // Limit to avoid waterfall rate limits

    // 2. Fetch Studies for these patients in parallel
    const studiesPromises = limitedPatients.map(async (p) => {
      const studies = await getStudies(p.PatientId, collection)
      // Attach patient info to study for easy display
      return studies.map(s => ({
        ...s,
        PatientName: p.PatientName,
        PatientSex: p.PatientSex || 'Unknown'
      }))
    })

    const studiesArrays = await Promise.all(studiesPromises)
    const allStudies = studiesArrays.flat()

    return { success: true, data: allStudies }
  } catch (error) {
    console.warn('Error searching TCIA studies:', error)
    return { success: false, error: 'Failed to search studies' }
  }
}

/**
 * Get Full Details for a TCIA Study (Series + First Image for Preview)
 */
export async function getTCIAStudyDetails(studyInstanceUid: string) {
  try {
    // Get Series
    const series = await getSeries(studyInstanceUid)
    if (!series || series.length === 0) return { success: false, error: 'No series found' }

    // Get First Series Images (to show preview)
    const firstSeries = series[0]
    const images = await getImages(firstSeries.SeriesInstanceUID)

    let firstImageUrl = null
    if (images && images.length > 0) {
      firstImageUrl = getDicomUrl(firstSeries.SeriesInstanceUID, images[0].SOPInstanceUID)
    }

    return {
      success: true,
      data: {
        series,
        previewUrl: firstImageUrl,
        seriesCount: series.length,
        imageCount: images.length
      }
    }
  } catch (error) {
    console.warn('Error fetching study details:', error)
    return { success: false, error: 'Failed to load details' }
  }
}

/**
 * Save a TCIA Study to Local Library (radiology_studies)
 */
export async function saveStudyToLocal(study: any, previewUrl?: string) {
  try {
    const user = await currentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    // Use admin client/permissions check
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userData || !['ADMIN', 'DOCTOR'].includes(userData.role)) {
      return { success: false, error: 'Unauthorized' }
    }

    // Insert into radiology_studies
    const { error } = await supabaseAdmin
      .from('radiology_studies')
      .insert({
        title: study.StudyDescription || `TCIA Study ${study.StudyInstanceUID.slice(-6)}`,
        modality: study.Modality || 'Unknown', // TCIA study object might not have modality at root, infer from series or pass it in
        body_part: study.BodyPartExamined || 'Unknown',
        study_date: study.StudyDate ? new Date(study.StudyDate).toISOString() : new Date().toISOString(),
        series_uid: study.StudyInstanceUID,
        preview_url: previewUrl || null,
        patient_id: null // Reference case, no local patient
      })

    if (error) {
      console.warn('DB Insert Error:', error)
      throw error
    }

    revalidatePath('/dashboard/radiology')
    return { success: true }

  } catch (error) {
    console.warn('Error saving study:', error)
    return { success: false, error: 'Failed to save study' }
  }
}

/**
 * Get Saved TCIA Studies
 */
export async function getSavedTCIAStudies() {
  try {
    const user = await currentUser()
    if (!user) return []

    // No strict RBAC for viewing personal saved studies, but let's stick to admin/doctor
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userData || !['ADMIN', 'DOCTOR'].includes(userData.role)) {
      return []
    }

    const { data, error } = await supabaseAdmin
      .from('radiology_studies')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('Error fetching saved studies:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.warn('Error getting saved studies:', error)
    return []
  }
}

/**
 * Delete a Saved Study
 */
export async function deleteSavedStudy(studyId: string) {
  try {
    const user = await currentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    // Use admin client for deletion
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userData || !['ADMIN', 'DOCTOR'].includes(userData.role)) {
      return { success: false, error: 'Unauthorized' }
    }

    const { data: study } = await supabaseAdmin.from('radiology_studies').select('title').eq('id', studyId).single()

    const { error } = await supabaseAdmin
      .from('radiology_studies')
      .delete()
      .eq('id', studyId)

    if (error) {
      console.warn('Error deleting study:', error)
      throw error
    }

    await logAuditAction(
      'DELETE_RADIOLOGY_STUDY',
      'RADIOLOGY',
      studyId,
      {
        studyTitle: study?.title,
        deletedBy: user.emailAddresses[0]?.emailAddress
      }
    )

    revalidatePath('/dashboard/radiology')
    return { success: true }
  } catch (error) {
    console.warn('Error deleting saved study:', error)
    return { success: false, error: 'Failed to delete study' }
  }
}
