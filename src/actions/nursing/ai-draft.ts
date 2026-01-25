'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'

// NOTE: Ideally this key should be in process.env. 
// For now, we unfortunately will need the user to provide it or set it up.
// However, I will check if the user environment happens to have it.
// If not, I will mock the response or return a specific error telling them to add the key.

export async function generateNursingNoteDraft(prompt: string, patientInfo: string) {
    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
        return {
            success: false,
            error: 'AI configuration missing. Please add GEMINI_API_KEY to .env'
        }
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

        const fullPrompt = `
            You are an expert nursing assistant. Draft a professional nursing note based on the following input:
            
            Patient Context: ${patientInfo}
            Input Notes/Observations: ${prompt}
            
            Format the output as a clean, professional nursing note (SBAR or SOA format preferred). 
            Do not include any "Here is your note" preamble. Just the note content.
        `

        const result = await model.generateContent(fullPrompt)
        const response = await result.response
        const text = response.text()

        return { success: true, text }
    } catch (error: any) {
        console.error('AI draft error:', error)
        return { success: false, error: 'Failed to generate draft' }
    }
}
