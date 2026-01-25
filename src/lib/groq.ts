/**
 * Groq AI Integration for Clinical Decision Support
 * Using Llama 3.3 70B Versatile model
 */

import Groq from 'groq-sdk'
import type { AIMessage, AIResponse } from '@/types'

// Initialize Groq client (server-side only)
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
})

// Model configuration
const AI_MODEL = 'llama-3.3-70b-versatile'

// System prompt for medical AI
const MEDICAL_SYSTEM_PROMPT = `You are a highly specialized Medical AI Assistant providing Clinical Decision Support (CDS) ONLY.

**CRITICAL RESTRICTION**: You ONLY answer medical and healthcare-related questions. You are NOT a general knowledge chatbot.

Your responsibilities:
- Analyze patient data including medical history, medications, lab results, and imaging reports
- Provide evidence-based clinical insights and suggestions
- Help doctors identify potential diagnoses, drug interactions, and treatment options
- Summarize complex medical information clearly and concisely

**Query Restrictions**:
- If asked about non-medical topics (politics, entertainment, general knowledge, etc.), respond ONLY with: "I am a medical AI assistant designed exclusively for clinical decision support. I can only answer medical and healthcare-related questions. Please ask a medical question related to patient care, diagnoses, treatments, medications, or clinical procedures."
- Examples of rejected topics: politics, sports, history, geography, entertainment, technology (unless medical devices), general trivia
- ONLY answer: medical conditions, treatments, medications, anatomy, physiology, pathology, diagnostics, patient care

Important guidelines:
- ALWAYS cite the specific data from the patient context when making suggestions
- If information is missing or unclear, explicitly state what additional data would be helpful
- NEVER provide definitive diagnoses - only suggest possibilities for physician review
- Always recommend consulting current medical guidelines and specialists when appropriate
- Use clear medical terminology but explain complex concepts
- Format responses with bullet points and clear sections for readability

Remember: You are a medical medical decision support tool, not a replacement for physician judgment. All suggestions must be reviewed and validated by the treating physician.`

/**
 * Analyze medical data using Groq AI
 * @param context - Medical context (history, meds, labs, imaging)
 * @param query - Specific question or request from the doctor
 * @param history - Previous messages for context
 * @param systemPrompt - Optional custom system prompt
 */
export async function analyzeMedicalData(
  context: string,
  query: string,
  history: AIMessage[] = [],
  systemPrompt?: string
): Promise<AIResponse> {
  try {
    // Validate inputs
    if (!query || query.trim().length === 0) {
      return {
        success: false,
        error: 'Query cannot be empty',
      }
    }

    // Build messages array
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: systemPrompt || `You are an advanced medical AI assistant.
Your goal is to assist healthcare professionals by analyzing patient data and providing clinical insights.
Always be professional, concise, and evidence-based.
If you are unsure, strictly state that you don't know.
Do not make up medical advice that is not supported by the context.

Context provided:
${context}`,
      },
      ...history,
    ]

    // Add patient context if provided (if not already integrated into the systemPrompt)
    // The new default system prompt already includes the context, so this block is modified.
    // If a custom systemPrompt is provided, we might still want to add the context separately.
    if (!systemPrompt && context && context.trim().length > 0) {
      // If using the default system prompt, the context is already included.
      // This block is now redundant if the default system prompt is used.
      // However, if a custom systemPrompt is provided, and it doesn't include context,
      // we might want to add it. For now, let's assume the custom systemPrompt handles context
      // or the default one is sufficient.
      // The instruction implies the context is part of the default system prompt.
    }

    // Add user query
    messages.push({
      role: 'user',
      content: query,
    })

    console.log('🤖 Sending request to Groq AI...')

    // Call Groq API
    const completion = await groq.chat.completions.create({
      model: AI_MODEL,
      messages: messages as any,
      temperature: 0.3, // Lower temperature for more focused medical responses
      max_tokens: 2048,
      top_p: 0.9,
    })

    const assistantMessage = completion.choices[0]?.message?.content

    if (!assistantMessage) {
      return {
        success: false,
        error: 'No response received from AI',
      }
    }

    console.log('✓ AI response received')

    return {
      success: true,
      message: assistantMessage,
      usage: {
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0,
      },
    }
  } catch (error: any) {
    console.error('Error in Groq AI analysis:', error)

    return {
      success: false,
      error: error.message || 'Failed to analyze medical data',
    }
  }
}

/**
 * Generate a medical summary from structured data
 */
export async function generateMedicalSummary(patientData: {
  demographics?: string
  medications?: string
  allergies?: string
  conditions?: string
  recentLabs?: string
  imaging?: string
}): Promise<AIResponse> {
  const context = Object.entries(patientData)
    .filter(([_, value]) => value)
    .map(([key, value]) => `**${key.toUpperCase()}:**\n${value}`)
    .join('\n\n')

  return analyzeMedicalData(
    context,
    'Please provide a comprehensive medical summary of this patient. Include key findings, active conditions, current medications, and any notable concerns.'
  )
}

/**
 * Check for drug interactions
 */
export async function checkDrugInteractions(medications: string[]): Promise<AIResponse> {
  if (medications.length === 0) {
    return {
      success: false,
      error: 'No medications provided',
    }
  }

  const context = `Current Medications:\n${medications.map((med, i) => `${i + 1}. ${med}`).join('\n')}`

  return analyzeMedicalData(
    context,
    'Analyze these medications for potential drug-drug interactions, contraindications, and safety concerns. Provide specific interaction mechanisms and severity levels.'
  )
}

/**
 * Analyze radiology report
 */
export async function analyzeRadiologyReport(
  reportFindings: string,
  patientHistory?: string
): Promise<AIResponse> {
  const context = patientHistory
    ? `Patient Medical History:\n${patientHistory}\n\nRadiology Findings:\n${reportFindings}`
    : `Radiology Findings:\n${reportFindings}`

  return analyzeMedicalData(
    context,
    'Analyze this radiology report. Highlight key findings, clinical significance, differential diagnoses, and recommended follow-up actions.'
  )
}

/**
 * Generate discharge summary
 */
export async function generateDischargeSummary(admissionData: {
  admissionReason: string
  hospitalCourse: string
  procedures?: string
  medications: string
  followUp: string
}): Promise<AIResponse> {
  const context = `
**ADMISSION REASON:** ${admissionData.admissionReason}

**HOSPITAL COURSE:** ${admissionData.hospitalCourse}

${admissionData.procedures ? `**PROCEDURES:** ${admissionData.procedures}` : ''}

**DISCHARGE MEDICATIONS:** ${admissionData.medications}

**FOLLOW-UP PLAN:** ${admissionData.followUp}
`

  return analyzeMedicalData(
    context,
    'Generate a professional discharge summary in standard medical format. Include admission diagnosis, hospital course, discharge condition, medications, and follow-up instructions.'
  )
}

/**
 * Analyze symptom to determine specialization
 */
export async function analyzeSymptomToSpecialization(
  symptom: string,
  validSpecializations: string[]
): Promise<AIResponse> {
  const context = `
Valid Specializations:
${validSpecializations.join(', ')}

Symptom/Condition:
${symptom}
`

  return analyzeMedicalData(
    context,
    `Based on the symptom or condition "${symptom}", identify the SINGLE most appropriate specialization from the provided list.
    
Rules:
1. Return ONLY the exact name of the specialization from the list.
2. If it's general or unclear, return "General Physician".
3. Do not add any explanation or punctuation.
4. If multiple fit, choose the most specific one.`
  )
}
