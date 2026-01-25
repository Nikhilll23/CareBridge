'use server'

import { currentUser } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import type { AIMessage, AIResponse } from '@/types'
import {
  analyzeMedicalData,
  generateMedicalSummary,
  checkDrugInteractions,
  analyzeRadiologyReport,
  generateDischargeSummary,
} from '@/lib/groq'

/**
 * Main AI chat action
 */
export async function chatWithAI(
  query: string,
  patientContext?: string,
  chatHistory?: AIMessage[],
  systemPrompt?: string
): Promise<AIResponse> {
  try {
    const user = await currentUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Verify user is doctor or admin
    // Removing strict role check for now as Patient Portal also uses this
    /*
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userData || !['ADMIN', 'DOCTOR'].includes(userData.role)) {
      return { success: false, error: 'Unauthorized access' }
    }
    */

    return await analyzeMedicalData(patientContext || '', query, chatHistory, systemPrompt)
  } catch (error: any) {
    console.error('Error in chatWithAI:', error)
    return { success: false, error: error.message || 'Failed to process request' }
  }
}

/**
 * Get patient context for AI
 */
export async function getPatientAIContext(patientId: string): Promise<string> {
  try {
    // Get patient demographics
    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single()

    if (!patient) {
      return 'Patient not found'
    }

    let context = `**PATIENT DEMOGRAPHICS:**
- Name: ${patient.first_name} ${patient.last_name}
- Date of Birth: ${patient.date_of_birth}
- Gender: ${patient.gender}
- Contact: ${patient.contact_number}
- Address: ${patient.address}
`

    // Get radiology reports
    const { data: radiologyReports } = await supabaseAdmin
      .from('radiology_reports')
      .select('modality, study_title, findings, impression, status, created_at')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(5)

    if (radiologyReports && radiologyReports.length > 0) {
      context += `\n**RECENT IMAGING STUDIES:**\n`
      radiologyReports.forEach((report, i) => {
        context += `\n${i + 1}. ${report.modality} - ${report.study_title} (${new Date(report.created_at).toLocaleDateString()})
   Status: ${report.status}
   Findings: ${report.findings || 'Pending'}
   Impression: ${report.impression || 'Pending'}
`
      })
    }

    // Get appointments
    const { data: appointments } = await supabaseAdmin
      .from('appointments')
      .select('appointment_date, reason, notes, status')
      .eq('patient_id', patientId)
      .order('appointment_date', { ascending: false })
      .limit(5)

    if (appointments && appointments.length > 0) {
      context += `\n**RECENT APPOINTMENTS:**\n`
      appointments.forEach((apt, i) => {
        context += `\n${i + 1}. ${new Date(apt.appointment_date).toLocaleDateString()} - ${apt.reason}
   Status: ${apt.status}
   ${apt.notes ? `Notes: ${apt.notes}` : ''}
`
      })
    }

    return context
  } catch (error) {
    console.error('Error getting patient context:', error)
    return 'Error loading patient data'
  }
}

/**
 * Quick action: Summarize patient
 */
export async function summarizePatient(patientId: string): Promise<AIResponse> {
  try {
    const user = await currentUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const context = await getPatientAIContext(patientId)
    return await generateMedicalSummary({ demographics: context })
  } catch (error: any) {
    console.error('Error in summarizePatient:', error)
    return { success: false, error: error.message || 'Failed to summarize patient' }
  }
}

/**
 * Quick action: Check drug interactions
 */
export async function checkPatientDrugInteractions(medications: string[]): Promise<AIResponse> {
  try {
    const user = await currentUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    return await checkDrugInteractions(medications)
  } catch (error: any) {
    console.error('Error in checkPatientDrugInteractions:', error)
    return { success: false, error: error.message || 'Failed to check interactions' }
  }
}

/**
 * Quick action: Analyze radiology
 */
export async function analyzePatientRadiology(
  reportId: string,
  patientId: string
): Promise<AIResponse> {
  try {
    const user = await currentUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Get radiology report
    const { data: report } = await supabaseAdmin
      .from('radiology_reports')
      .select('*')
      .eq('id', reportId)
      .single()

    if (!report || !report.findings) {
      return { success: false, error: 'Report not found or has no findings' }
    }

    // Get patient history for context
    const patientContext = await getPatientAIContext(patientId)

    return await analyzeRadiologyReport(report.findings, patientContext)
  } catch (error: any) {
    console.error('Error in analyzePatientRadiology:', error)
    return { success: false, error: error.message || 'Failed to analyze radiology' }
  }
}
/**
 * Bulk action: Get context for multiple patients (Admin/Doctor)
 */
export async function getBulkPatientContext(): Promise<{ success: boolean, context?: string, count?: number, error?: string }> {
  try {
    const user = await currentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    // Fetch top 50 patients (Simulating "All" for demo)
    const { data: patients } = await supabaseAdmin
      .from('patients')
      .select('id, first_name, last_name, date_of_birth, gender')
      .limit(50)

    if (!patients || patients.length === 0) {
      return { success: true, context: 'No patients found.', count: 0 }
    }

    let summary = "**HOSPITAL PATIENT DATABASE (Snapshot):**\n"

    // Create a compact list for the AI
    patients.forEach(p => {
      let age = 'N/A'
      if (p.date_of_birth) {
        age = (new Date().getFullYear() - new Date(p.date_of_birth).getFullYear()).toString()
      }
      summary += `- ${p.first_name} ${p.last_name} (Age: ${age}, ${p.gender})\n`
    })

    summary += `\n**INSTRUCTIONS:** Use this patient list to answer queries about demographics, distribution, or specific patient lookup. Do NOT say you don't have this information.`

    return { success: true, context: summary, count: patients.length }
  } catch (error: any) {
    console.error('Error in bulk context:', error)
    return { success: false, error: 'Failed to load bulk context' }
  }
}

/**
 * Get simple list of patients for dropdown
 */
export async function getPatientListForSelector() {
  try {
    const { data: patients } = await supabaseAdmin
      .from('patients')
      .select('id, first_name, last_name')
      .limit(50)
      .order('first_name', { ascending: true })

    return { success: true, patients: patients || [] }
  } catch (error) {
    return { success: false, patients: [] }
  }
}

/**
 * AI Automapping: Map symptom to specialization
 */
import { analyzeSymptomToSpecialization } from '@/lib/groq'

export async function mapSymptomToSpecialization(
  symptom: string,
  specializations: string[]
): Promise<{ success: boolean; specialization?: string; error?: string }> {
  try {
    const user = await currentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const response = await analyzeSymptomToSpecialization(symptom, specializations)

    if (response.success && response.message) {
      // Clean up the response to ensure it matches strictly
      const mappedSpec = response.message.trim()

      // Verify if it exists in the list (fuzzy match could be added here if needed, but we asked for strict)
      const exactMatch = specializations.find(s => s.toLowerCase() === mappedSpec.toLowerCase())

      return {
        success: true,
        specialization: exactMatch || 'General Physician'
      }
    }

    return { success: false, error: response.error || 'Failed to map symptom' }
  } catch (error: any) {
    console.error('Error in mapSymptomToSpecialization:', error)
    return { success: false, error: error.message }
  }
}
