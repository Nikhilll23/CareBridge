'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import { createMetriportPatient } from '@/lib/metriport'
import type { PatientFormValues, Patient } from '@/types'
import { logAuditAction } from './audit'
import { currentUser } from '@clerk/nextjs/server'

// Validation Schema
const patientSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  gender: z.enum(['Male', 'Female', 'Other']),
  contactNumber: z.string().min(10, 'Valid phone number required'),
  address: z.string().min(5, 'Address is required'),
})

/**
 * Register a new patient in both Supabase and Metriport
 * @param data - Patient form values
 * @returns Success response with patient data or error
 */
export async function registerPatient(data: PatientFormValues) {
  try {
    // 1. Validate input data
    const validatedData = patientSchema.parse(data)

    // 2. Insert patient into Supabase first (without metriport_id)
    const { data: patient, error: insertError } = await supabaseAdmin
      .from('patients')
      .insert({
        first_name: validatedData.firstName,
        last_name: validatedData.lastName,
        date_of_birth: validatedData.dateOfBirth,
        gender: validatedData.gender,
        contact_number: validatedData.contactNumber,
        address: validatedData.address,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting patient into Supabase:', insertError)
      return {
        success: false,
        error: 'Failed to create patient record',
        details: insertError.message,
      }
    }

    // 3. Register patient with Metriport Health Exchange
    // Note: You'll need to create a facility first in Metriport
    // For now, using a placeholder facility ID - replace with actual facility ID
    const FACILITY_ID = process.env.METRIPORT_FACILITY_ID || 'temp-facility-id'

    let metriportId: string | null = null

    try {
      // Parse address into components for Metriport
      const addressParts = validatedData.address.split(',').map(s => s.trim())

      // Clean phone number - extract only digits and use last 10 digits for US format
      const cleanPhone = validatedData.contactNumber.replace(/\D/g, '').slice(-10) || '5551234567'

      metriportId = await createMetriportPatient(FACILITY_ID, {
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        dob: validatedData.dateOfBirth,
        genderAtBirth: validatedData.gender === 'Male' ? 'M' : validatedData.gender === 'Female' ? 'F' : 'O',
        address: [{
          addressLine1: (addressParts[0] || validatedData.address).substring(0, 50),
          city: addressParts[1] || 'San Francisco',
          state: 'CA', // US state required by Metriport
          zip: addressParts[3] || '94101', // US zip code required
          country: 'USA' as const,
        }],
        contact: [{
          phone: cleanPhone, // 10-digit US format required
        }],
      })

      // 4. Update Supabase record with Metriport ID
      const { error: updateError } = await supabaseAdmin
        .from('patients')
        .update({ metriport_id: metriportId })
        .eq('id', patient.id)

      if (updateError) {
        console.error('Error updating patient with Metriport ID:', updateError)
        // Don't fail the whole operation - patient is created, just log the issue
      } else {
        console.log('✅ Patient successfully synced to HIE with Metriport ID:', metriportId)
      }
    } catch (metriportError) {
      console.error('❌ Error registering patient with Metriport HIE:', metriportError)
      if (metriportError instanceof Error) {
        console.error('Error details:', metriportError.message)
      }
    }

    // Log Audit
    const user = await currentUser()
    await logAuditAction(
      'REGISTER_PATIENT',
      'PATIENTS',
      patient.id,
      {
        patientName: `${patient.first_name} ${patient.last_name}`,
        metriportId: metriportId || 'PENDING',
        registeredBy: user?.emailAddresses[0]?.emailAddress
      }
    )

    revalidatePath('/dashboard/patients')
    return {
      success: true,
      data: {
        ...patient,
        metriport_id: metriportId,
      },
      message: metriportId
        ? 'Patient registered and synced with HIE'
        : 'Patient registered (HIE sync pending - please retry later)',
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Validation failed',
        details: error.issues[0].message,
      }
    }

    console.error('Error in registerPatient:', error)
    return { success: false, error: 'Failed to register patient' }
  }
}

/**
 * Manually sync an existing patient to Metriport HIE
 */
export async function syncPatientToHIE(patientId: string) {
  try {
    const user = await currentUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    // 1. Fetch patient data
    const { data: patient, error: fetchError } = await supabaseAdmin
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single()

    if (fetchError || !patient) {
      return { success: false, error: 'Patient not found' }
    }

    if (patient.metriport_id) {
      return { success: true, message: 'Patient is already synced' }
    }

    // 2. Prepare data for Metriport
    const FACILITY_ID = process.env.METRIPORT_FACILITY_ID || 'temp-facility-id'
    const addressParts = patient.address.split(',').map((s: string) => s.trim())
    const cleanPhone = patient.contact_number.replace(/\D/g, '').slice(-10) || '5551234567'

    // 3. Call Metriport API
    const metriportId = await createMetriportPatient(FACILITY_ID, {
      firstName: patient.first_name,
      lastName: patient.last_name,
      dob: patient.date_of_birth,
      genderAtBirth: patient.gender === 'Male' ? 'M' : patient.gender === 'Female' ? 'F' : 'O',
      address: [{
        addressLine1: (addressParts[0] || patient.address).substring(0, 50),
        city: addressParts[1] || 'San Francisco',
        state: 'CA',
        zip: addressParts[3] || '94101',
        country: 'USA',
      }],
      contact: [{
        phone: cleanPhone,
      }],
    })

    // 4. Update Database
    const { error: updateError } = await supabaseAdmin
      .from('patients')
      .update({ metriport_id: metriportId })
      .eq('id', patientId)

    if (updateError) throw updateError

    // 5. Log Audit
    await logAuditAction(
      'SYNC_PATIENT_HIE',
      'PATIENTS',
      patientId,
      {
        patientName: `${patient.first_name} ${patient.last_name}`,
        metriportId: metriportId,
        syncedBy: user.emailAddresses[0]?.emailAddress
      }
    )

    revalidatePath('/dashboard/patients')
    return { success: true, message: 'Patient successfully synced to HIE' }
  } catch (error) {
    console.error('Error syncing patient to HIE:', error)
    return { success: false, error: 'Failed to sync with HIE' }
  }
}

/**
 * Get all patients
 */
export async function getPatients(): Promise<Patient[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching patients:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in getPatients:', error)
    return []
  }
}

/**
 * Get a single patient by ID
 */
export async function getPatient(id: string): Promise<Patient | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('patients')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching patient:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in getPatient:', error)
    return null
  }
}

/**
 * Get a single patient by ID with mock geo-location data
 * Returns patient data with simulated coordinates for map display
 */
export async function getPatientById(id: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('patients')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching patient:', error)
      return null
    }

    if (!data) return null

    // Mock geo-location data based on patient ID
    // In production, you'd geocode the actual address
    const baseLatMumbai = 19.0760
    const baseLngMumbai = 72.8777

    // Generate pseudo-random but consistent coordinates for each patient
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const latOffset = ((hash % 100) - 50) * 0.001 // ±0.05 degrees
    const lngOffset = ((hash % 200) - 100) * 0.001 // ±0.1 degrees

    return {
      ...data,
      coordinates: {
        lat: baseLatMumbai + latOffset,
        lng: baseLngMumbai + lngOffset,
      },
      // Mock vitals data
      vitals: {
        heartRate: 72 + (hash % 20),
        bloodPressure: `${110 + (hash % 30)}/${70 + (hash % 20)}`,
        temperature: 36.5 + ((hash % 15) / 10),
        respiratoryRate: 16 + (hash % 8),
        oxygenSaturation: 95 + (hash % 5),
      },
    }
  } catch (error) {
    console.error('Error in getPatientById:', error)
    return null
  }
}

/**
 * Get nearby ambulances (mock data)
 * In production, this would query a real ambulance tracking system
 */
export async function getNearbyAmbulances(patientLat: number, patientLng: number) {
  // Simulate ambulances near the patient
  const ambulances = [
    {
      id: 'amb-001',
      name: 'Ambulance #101',
      status: 'available' as const,
      lat: patientLat + 0.01,
      lng: patientLng + 0.008,
    },
    {
      id: 'amb-002',
      name: 'Ambulance #102',
      status: 'available' as const,
      lat: patientLat - 0.012,
      lng: patientLng + 0.015,
    },
    {
      id: 'amb-003',
      name: 'Ambulance #103',
      status: 'busy' as const,
      lat: patientLat + 0.018,
      lng: patientLng - 0.01,
    },
    {
      id: 'amb-004',
      name: 'Ambulance #104',
      status: 'available' as const,
      lat: patientLat - 0.008,
      lng: patientLng - 0.012,
    },
    {
      id: 'amb-005',
      name: 'Ambulance #105',
      status: 'offline' as const,
      lat: patientLat + 0.025,
      lng: patientLng + 0.02,
    },
  ]

  // Calculate distances (Haversine formula approximation)
  const ambulancesWithDistance = ambulances.map((amb) => {
    const R = 6371 // Earth's radius in km
    const dLat = ((amb.lat - patientLat) * Math.PI) / 180
    const dLng = ((amb.lng - patientLng) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((patientLat * Math.PI) / 180) *
      Math.cos((amb.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c

    return {
      ...amb,
      distance: parseFloat(distance.toFixed(2)),
    }
  })

  // Sort by distance
  return ambulancesWithDistance.sort((a, b) => a.distance - b.distance)
}

/**
 * Delete a patient
 */
export async function deletePatient(id: string) {
  try {
    const user = await currentUser()
    if (!user) throw new Error('Unauthorized')

    // Fetch patient data before deletion for logging
    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('first_name, last_name, metriport_id')
      .eq('id', id)
      .single()

    const { error } = await supabaseAdmin
      .from('patients')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting patient:', error)
      return { success: false, error: 'Failed to delete patient' }
    }

    // Log the action
    await logAuditAction(
      'DELETE_PATIENT',
      'PATIENT',
      id,
      {
        patientName: `${patient?.first_name} ${patient?.last_name}`,
        metriportId: patient?.metriport_id,
        deletedBy: user.emailAddresses[0]?.emailAddress
      }
    )

    revalidatePath('/dashboard/patients')
    return { success: true, message: 'Patient deleted successfully' }
  } catch (error) {
    console.error('Error in deletePatient:', error)
    return {
      success: false,
      error: 'Failed to delete patient',
      details: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get Patient Clinical Data from Metriport FHIR API
 * Fetches allergies, medications, and conditions
 */
export async function getPatientClinicalData(metriportId: string | null) {
  // Default empty state
  const emptyData = {
    allergies: [],
    medications: [],
    conditions: [],
  }

  if (!metriportId) {
    console.log('No Metriport ID - returning empty clinical data')
    return emptyData
  }

  try {
    const baseUrl = process.env.METRIPORT_BASE_URL || 'https://api.sandbox.metriport.com'
    const apiKey = process.env.METRIPORT_API_KEY

    if (!apiKey) {
      console.error('❌ METRIPORT_API_KEY not configured')
      return emptyData
    }

    console.log('🔍 Fetching clinical data for Metriport ID:', metriportId)

    const allergies: any[] = []
    const medications: any[] = []
    const conditions: any[] = []

    // Start consolidated query to trigger data retrieval
    try {
      const resources = ['AllergyIntolerance', 'Condition', 'MedicationRequest']
      const queryResponse = await fetch(
        `${baseUrl}/medical/v1/patient/${metriportId}/consolidated/query?resources=${resources.join(',')}&conversionType=json`,
        {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
          },
        }
      )

      if (queryResponse.ok) {
        console.log('✅ Consolidated query initiated successfully')
      } else {
        const error = await queryResponse.json()
        console.log('⚠️ Query initiation response:', error)
      }
    } catch (err) {
      console.error('Error starting consolidated query:', err)
    }

    // Fetch consolidated data
    try {
      const consolidatedResponse = await fetch(
        `${baseUrl}/medical/v1/patient/${metriportId}/consolidated?resources=AllergyIntolerance,Condition,MedicationRequest`,
        {
          headers: {
            'x-api-key': apiKey,
          },
        }
      )

      if (consolidatedResponse.ok) {
        const data = await consolidatedResponse.json()

        // Parse FHIR Bundle
        if (data.entry && Array.isArray(data.entry)) {
          data.entry.forEach((entry: any) => {
            const resource = entry.resource

            if (resource?.resourceType === 'AllergyIntolerance') {
              allergies.push({
                id: resource.id,
                substance: resource.code?.text || resource.code?.coding?.[0]?.display || 'Unknown Allergen',
                criticality: resource.criticality || 'unknown',
                reaction: resource.reaction?.[0]?.manifestation?.[0]?.text || 'Not specified',
              })
            }

            if (resource?.resourceType === 'MedicationRequest') {
              medications.push({
                id: resource.id,
                medication: resource.medicationCodeableConcept?.text ||
                  resource.medicationCodeableConcept?.coding?.[0]?.display ||
                  'Unknown Medication',
                status: resource.status || 'unknown',
                dosage: resource.dosageInstruction?.[0]?.text || 'Not specified',
              })
            }

            if (resource?.resourceType === 'Condition') {
              conditions.push({
                id: resource.id,
                condition: resource.code?.text || resource.code?.coding?.[0]?.display || 'Unknown Condition',
                clinicalStatus: resource.clinicalStatus?.coding?.[0]?.code || 'unknown',
                onsetDate: resource.onsetDateTime || resource.recordedDate || 'Unknown',
              })
            }
          })
        }
      } else {
        console.log('⚠️ Consolidated data not yet available (this is normal for new patients)')
      }
    } catch (err) {
      console.error('Error fetching consolidated data:', err)
    }

    console.log(`✅ Clinical data fetched: ${allergies.length} allergies, ${medications.length} medications, ${conditions.length} conditions`)

    return {
      allergies,
      medications,
      conditions,
    }
  } catch (error) {
    console.error('❌ Error fetching clinical data from Metriport:', error)
    return emptyData
  }
}

/**
 * Get Patient Documents from Metriport
 * Fetches medical documents (PDFs, images, etc.)
 */
export async function getPatientDocuments(metriportId: string | null, facilityId: string) {
  if (!metriportId) {
    return []
  }

  try {
    const baseUrl = process.env.METRIPORT_BASE_URL || 'https://api.sandbox.metriport.com'
    const apiKey = process.env.METRIPORT_API_KEY

    if (!apiKey) {
      console.error('❌ METRIPORT_API_KEY not configured')
      return []
    }

    console.log('📄 Fetching documents for Metriport ID:', metriportId)

    // Start document query
    try {
      const queryResponse = await fetch(
        `${baseUrl}/medical/v1/document/query?patientId=${metriportId}&facilityId=${facilityId}`,
        {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
          },
        }
      )

      if (queryResponse.ok) {
        console.log('✅ Document query initiated')
      }
    } catch (err) {
      console.error('Error starting document query:', err)
    }

    // List available documents
    const listResponse = await fetch(
      `${baseUrl}/medical/v1/document?patientId=${metriportId}`,
      {
        headers: {
          'x-api-key': apiKey,
        },
      }
    )

    if (listResponse.ok) {
      const data = await listResponse.json()
      console.log(`✅ Found ${data.documents?.length || 0} documents`)
      return data.documents || []
    }

    return []
  } catch (error) {
    console.error('❌ Error fetching documents from Metriport:', error)
    return []
  }
}

/**
 * Get all patients for selection lists
 * @returns Array of patients with basic info
 */
export async function getAllPatientsForSelect() {
  try {
    const { data, error } = await supabaseAdmin
      .from('patients')
      .select('id, first_name, last_name')
      .order('last_name', { ascending: true })
      .limit(100)

    if (error) {
      console.error('Error fetching patients:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching patients:', error)
    return []
  }
}

/**
 * Manually trigger a synchronization of patient health data from Metriport
 */
export async function syncPatientHealthData(metriportId: string) {
  try {
    const baseUrl = process.env.METRIPORT_BASE_URL || 'https://api.sandbox.metriport.com'
    const apiKey = process.env.METRIPORT_API_KEY

    // 1. Start Consolidated Query
    const consolidatedResponse = await fetch(
      `${baseUrl}/medical/v1/patient/${metriportId}/consolidated/query?resources=AllergyIntolerance,Condition,MedicationRequest&conversionType=json`,
      {
        method: 'POST',
        headers: { 'x-api-key': apiKey! },
      }
    )

    // 2. Start Document Query
    // We get the facility ID from env or use a placeholder if testing
    const facilityId = process.env.METRIPORT_FACILITY_ID || 'temp-facility-id'
    const documentResponse = await fetch(
      `${baseUrl}/medical/v1/document/query?patientId=${metriportId}&facilityId=${facilityId}`,
      {
        method: 'POST',
        headers: { 'x-api-key': apiKey! },
      }
    )

    if (consolidatedResponse.ok && documentResponse.ok) {
      revalidatePath('/dashboard/patients')
      return { success: true }
    } else {
      console.error('Sync failed', await consolidatedResponse.text(), await documentResponse.text())
      return { success: false, error: 'One or more sync queries failed to start' }
    }

  } catch (error) {
    console.error('Error in syncPatientHealthData:', error)
    return { success: false, error: 'Internal server error during sync' }
  }
}
