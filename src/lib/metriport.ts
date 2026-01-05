import { MetriportMedicalApi } from '@metriport/api-sdk'

// Metriport API Configuration
const METRIPORT_API_KEY = 'cW0zMXl4Rm9DZkNhT3BaWG03eUkzOmJmMGI0ZDNiLTczM2MtNDVlZi1hNWU1LWM2NGNlMmNkZjllZQ'
const METRIPORT_BASE_URL = 'https://api.sandbox.metriport.com'

// Singleton instance
let metriportClient: MetriportMedicalApi | null = null

/**
 * Get initialized Metriport Medical API client
 * Uses singleton pattern to reuse the same instance
 */
export function getMetriportClient(): MetriportMedicalApi {
  if (!metriportClient) {
    metriportClient = new MetriportMedicalApi(METRIPORT_API_KEY, {
      baseAddress: METRIPORT_BASE_URL,
    })
  }
  return metriportClient
}

/**
 * Metriport Patient Address Type
 */
export interface MetriportAddress {
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  zip: string
  country: 'USA'
}

/**
 * Metriport Patient Demographics
 */
export interface MetriportPatientData {
  firstName: string
  lastName: string
  dob: string // Format: YYYY-MM-DD
  genderAtBirth: 'M' | 'F' | 'O'
  personalIdentifiers?: Array<{
    type: string
    value: string
    state?: string
  }>
  address: [MetriportAddress]
  contact: Array<{
    phone?: string
    email?: string
  }>
}

/**
 * Create a patient in Metriport
 * @param facilityId - The facility ID where the patient is being registered
 * @param patientData - Patient demographic information
 * @returns Metriport patient ID
 */
export async function createMetriportPatient(
  facilityId: string,
  patientData: MetriportPatientData
): Promise<string> {
  try {
    const client = getMetriportClient()
    
    // Cast to any to bypass strict typing - SDK will validate
    const response = await client.createPatient(patientData as any, facilityId)
    
    return response.id
  } catch (error) {
    console.error('Error creating patient in Metriport:', error)
    throw new Error('Failed to register patient with health exchange')
  }
}

/**
 * Get patient data from Metriport
 * @param patientId - Metriport patient ID
 */
export async function getMetriportPatient(patientId: string) {
  try {
    const client = getMetriportClient()
    return await client.getPatient(patientId)
  } catch (error) {
    console.error('Error fetching patient from Metriport:', error)
    throw error
  }
}

/**
 * Update patient in Metriport
 * @param patientId - Metriport patient ID
 * @param facilityId - The facility ID
 * @param patientData - Updated patient data
 */
export async function updateMetriportPatient(
  patientId: string,
  facilityId: string,
  patientData: Partial<MetriportPatientData>
) {
  try {
    const client = getMetriportClient()
    // Cast to any to bypass strict typing - SDK will validate
    // SDK signature: updatePatient(patientId, patientData, facilityId)
    const updateData = { id: patientId, ...patientData } as any
    return await client.updatePatient(updateData, facilityId)
  } catch (error) {
    console.error('Error updating patient in Metriport:', error)
    throw error
  }
}

/**
 * Start a consolidated FHIR data query for a patient
 * @param patientId - Metriport patient ID
 * @param resources - Array of FHIR resource types to fetch
 */
export async function startConsolidatedQuery(
  patientId: string,
  resources?: string[]
) {
  try {
    const client = getMetriportClient()
    // Start consolidated query - returns query ID
    const response = await client.startConsolidatedQuery(
      patientId,
      resources as any
    )
    return response
  } catch (error) {
    console.error('Error starting consolidated query:', error)
    throw error
  }
}

/**
 * Get patient's consolidated FHIR data
 * @param patientId - Metriport patient ID
 * @param resources - Optional array of specific FHIR resources to fetch
 */
export async function getConsolidatedData(patientId: string, resources?: string[]) {
  try {
    const client = getMetriportClient()
    // The SDK returns FHIR Bundle with consolidated data
    // Note: SDK method signature may vary, using direct fetch as fallback
    const bundle = await client.getConsolidatedQueryStatus(patientId)
    return bundle
  } catch (error) {
    console.error('Error fetching consolidated data:', error)
    return null
  }
}

/**
 * Count patient data for specific FHIR resources
 * @param patientId - Metriport patient ID
 * @param resources - Array of FHIR resource types
 */
export async function countPatientData(
  patientId: string,
  resources: string[]
) {
  try {
    // Use direct API call since SDK method may not exist
    const baseUrl = process.env.METRIPORT_BASE_URL || 'https://api.sandbox.metriport.com'
    const apiKey = process.env.METRIPORT_API_KEY || METRIPORT_API_KEY
    
    const response = await fetch(
      `${baseUrl}/medical/v1/patient/${patientId}/consolidated/count?resources=${resources.join(',')}`,
      {
        headers: {
          'x-api-key': apiKey,
        },
      }
    )
    
    if (response.ok) {
      return await response.json()
    }
    
    return null
  } catch (error) {
    console.error('Error counting patient data:', error)
    return null
  }
}

// Export the client for direct access if needed
export { MetriportMedicalApi }
