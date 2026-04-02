'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { currentUser } from '@clerk/nextjs/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { revalidatePath } from 'next/cache'
import { analyzeMedicalData } from '@/lib/groq'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

// OCR Processing using Gemini Vision
export async function processImageOCR(imageBase64: string) {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

        const prompt = `You are a medical assistant. Extract all medical information from this image and structure it in the following JSON format:
{
  "patientSymptoms": ["symptom1", "symptom2"],
  "observations": ["observation1", "observation2"],
  "vitalSigns": {
    "bloodPressure": "",
    "heartRate": "",
    "temperature": "",
    "other": ""
  },
  "diagnosis": "",
  "recommendations": ["recommendation1", "recommendation2"],
  "prescriptions": [
    {
      "medication": "",
      "dosage": "",
      "frequency": "",
      "duration": ""
    }
  ],
  "additionalNotes": ""
}

If any field is not present in the image, leave it as empty string or empty array. Extract text exactly as written.`

        const imagePart = {
            inlineData: {
                data: imageBase64.split(',')[1], // Remove data:image/...;base64, prefix
                mimeType: 'image/jpeg'
            }
        }

        const result = await model.generateContent([prompt, imagePart])
        const response = await result.response
        const text = response.text()

        // Try to parse JSON
        let parsedData = null
        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
                parsedData = JSON.parse(jsonMatch[0])
            }
        } catch (e) {
            console.warn('JSON Parse Error:', e)
        }

        // Format with Groq if we have data
        let formattedText = text
        if (parsedData) {
            try {
                // Determine context from data
                const context = JSON.stringify(parsedData, null, 2)
                const groqResponse = await analyzeMedicalData(
                    context,
                    `Convert this structured medical data into a clean, professional, and easy-to-read text report.
                    Use Markdown formatting.
                    Create sections for Symptoms, Observations, Vital Signs, Diagnosis, Recommendations, etc.
                    Do not output JSON. Output only the formatted text.
                    Make it look like a standard medical report.`
                )

                if (groqResponse.success && groqResponse.message) {
                    formattedText = groqResponse.message
                }
            } catch (groqError) {
                console.warn('Groq Formatting Error:', groqError)
            }
        }

        return {
            success: true,
            data: parsedData,
            rawText: formattedText, // Use the formatted text as the primary rawText for display
            originalJson: parsedData // Keep original structure if needed
        }

    } catch (error: any) {
        console.warn('OCR Error:', error)
        return {
            success: false,
            error: error.message || 'Failed to process image'
        }
    }
}

// Voice to Text using Gemini
export async function transcribeAudio(audioBase64: string, language: string = 'en') {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

        const prompt = `Transcribe this medical consultation audio in ${language}. 
Provide a clean, accurate transcription of the conversation. 
Format it as a medical consultation note with clear sections if possible.`

        const audioPart = {
            inlineData: {
                data: audioBase64.split(',')[1],
                mimeType: 'audio/webm'
            }
        }

        const result = await model.generateContent([prompt, audioPart])
        const response = await result.response
        const text = response.text()

        return {
            success: true,
            transcript: text
        }
    } catch (error: any) {
        console.warn('Transcription Error:', error)
        return {
            success: false,
            error: error.message || 'Failed to transcribe audio'
        }
    }
}

// Create Medical Report
export async function createMedicalReport(data: {
    patientId: string
    appointmentId?: string
    reportType: 'OCR_SCAN' | 'VOICE_NOTE' | 'MANUAL'
    title: string
    content: any
    rawText?: string
    images?: string[]
    audioUrl?: string
    language?: string
}) {
    try {
        const user = await currentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const { data: userData } = await supabaseAdmin
            .from('users')
            .select('id, role')
            .eq('id', user.id)
            .single()

        if (!userData || userData.role !== 'DOCTOR') {
            return { success: false, error: 'Only doctors can create reports' }
        }

        const { data: report, error } = await supabaseAdmin
            .from('medical_reports')
            .insert({
                patient_id: data.patientId,
                doctor_id: user.id,
                appointment_id: data.appointmentId,
                report_type: data.reportType,
                title: data.title,
                content: data.content,
                raw_text: data.rawText,
                images: data.images,
                audio_url: data.audioUrl,
                language: data.language || 'en',
                status: 'DRAFT'
            })
            .select()
            .single()

        if (error) throw error

        revalidatePath('/dashboard/doctor/reports')
        return { success: true, report }
    } catch (error: any) {
        console.warn('Create Report Error:', error)
        return { success: false, error: error.message }
    }
}

// Get Reports by Doctor
export async function getDoctorReports() {
    try {
        const user = await currentUser()
        if (!user) return []

        const { data: reports } = await supabaseAdmin
            .from('medical_reports')
            .select(`
                *,
                patient:patients(first_name, last_name, uhid),
                appointment:appointments(appointment_date, reason)
            `)
            .eq('doctor_id', user.id)
            .order('created_at', { ascending: false })

        return reports || []
    } catch (error) {
        console.warn('Get Doctor Reports Error:', error)
        return []
    }
}

// Get Reports by Patient
export async function getPatientReports() {
    try {
        const user = await currentUser()
        if (!user) return []

        const userEmail = user.emailAddresses[0]?.emailAddress
        const { data: patient } = await supabaseAdmin
            .from('patients')
            .select('id')
            .eq('email', userEmail)
            .single()

        if (!patient) return []

        const { data: reports } = await supabaseAdmin
            .from('medical_reports')
            .select(`
                *,
                doctor:users!medical_reports_doctor_id_fkey(first_name, last_name)
            `)
            .eq('patient_id', patient.id)
            .eq('status', 'SENT')
            .order('created_at', { ascending: false })

        return reports || []
    } catch (error) {
        console.warn('Get Patient Reports Error:', error)
        return []
    }
}

// Send Report to Patient
export async function sendReportToPatient(reportId: string) {
    try {
        const user = await currentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const { error } = await supabaseAdmin
            .from('medical_reports')
            .update({
                status: 'SENT',
                sent_to_patient_at: new Date().toISOString()
            })
            .eq('id', reportId)
            .eq('doctor_id', user.id)

        if (error) throw error

        revalidatePath('/dashboard/doctor/reports')
        revalidatePath('/dashboard/patient/reports')
        return { success: true }
    } catch (error: any) {
        console.warn('Send Report Error:', error)
        return { success: false, error: error.message }
    }
}

// Update Report
export async function updateMedicalReport(reportId: string, updates: {
    title?: string
    content?: any
    rawText?: string
    status?: 'DRAFT' | 'FINALIZED' | 'SENT'
}) {
    try {
        const user = await currentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const { error } = await supabaseAdmin
            .from('medical_reports')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', reportId)
            .eq('doctor_id', user.id)

        if (error) throw error

        revalidatePath('/dashboard/doctor/reports')
        return { success: true }
    } catch (error: any) {
        console.warn('Update Report Error:', error)
        return { success: false, error: error.message }
    }
}
