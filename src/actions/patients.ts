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
  govtIdType: z.string().optional(),
  govtIdNumber: z.string().optional(),
})

async function generateUHID(): Promise<string> {
  const year = new Date().getFullYear()

  // Get the latest UHID to determine next sequence
  const { data: latest } = await supabaseAdmin
    .from('patients')
    .select('*')
    .ilike('uhid', `HIS-${year}-%`)
    .order('uhid', { ascending: false })
    .limit(1)
    .single()

  let sequence = 1
  if (latest?.uhid) {
    const parts = latest.uhid.split('-')
    if (parts.length === 3) {
      sequence = parseInt(parts[2]) + 1
    }
  }

  // Format: HIS-2024-000001
  return `HIS-${year}-${String(sequence).padStart(6, '0')}`
}

async function checkDuplicate(data: any) {
  // 1. Check Govt ID if provided
  if (data.govtIdNumber) {
    const { data: existing } = await supabaseAdmin
      .from('patients')
      .select('first_name, last_name, uhid')
      .eq('govt_id_number', data.govtIdNumber)
      .single()

    if (existing) return `Patient already exists with this Govt ID (UHID: ${existing.uhid})`
  }

  // 2. Fuzzy Match (Name + DOB) for Safety
  const { data: fuzzy } = await supabaseAdmin
    .from('patients')
    .select('uhid')
    .ilike('first_name', data.firstName)
    .ilike('last_name', data.lastName)
    .eq('date_of_birth', data.dateOfBirth)
    .single()

  if (fuzzy) return `Patient with identical Name and DOB already exists (UHID: ${fuzzy.uhid})`

  return null
}

/**
 * Register a new patient in both Supabase and Metriport
 * @param data - Patient form values
 * @returns Success response with patient data or error
 */
export async function registerPatient(data: PatientFormValues) {
  try {
    // 1. Validate input data
    const validatedData = patientSchema.parse(data)

    // 2. Check for Duplicates
    const duplicateError = await checkDuplicate(validatedData)
    if (duplicateError) {
      return { success: false, error: duplicateError }
    }

    // 3. Generate UHID
    const uhid = await generateUHID()

    // 4. Insert patient into Supabase first (without metriport_id)
    const { data: patient, error: insertError } = await supabaseAdmin
      .from('patients')
      .insert({
        first_name: validatedData.firstName,
        last_name: validatedData.lastName,
        date_of_birth: validatedData.dateOfBirth,
        gender: validatedData.gender,
        contact_number: validatedData.contactNumber,
        address: validatedData.address,
        uhid: uhid,
        govt_id_type: validatedData.govtIdType || null,
        govt_id_number: validatedData.govtIdNumber || null
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
    const user = await currentUser()
    if (!user) return []

    // Check Role
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    let query = supabaseAdmin
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false })

    // If Doctor, filter by appointments
    if (userData?.role === 'DOCTOR') {
      const { data: appts } = await supabaseAdmin
        .from('appointments')
        .select('patient_id')
        .eq('doctor_id', user.id)

      const patientIds = appts?.map(a => a.patient_id) || []

      // If no patients, return empty (otherwise .in() with empty array returns nothing correctly or error?)
      if (patientIds.length === 0) return []

      query = query.in('id', patientIds)
    } else if (userData?.role === 'PATIENT') {
      // If Patient, ONLY return their own record
      query = query.eq('email', user.emailAddresses[0]?.emailAddress)
    }

    const { data, error } = await query

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

/**
 * Update patient details
 */
export async function updatePatient(id: string, data: Partial<PatientFormValues>) {
  try {
    const user = await currentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    // Validate partial data (looser check than creation)
    const updates: any = {
      first_name: data.firstName,
      last_name: data.lastName,
      date_of_birth: data.dateOfBirth,
      gender: data.gender,
      contact_number: data.contactNumber,
      address: data.address,
      govt_id_type: data.govtIdType,
      govt_id_number: data.govtIdNumber,
    }

    // Remove undefined
    Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key])

    const { error } = await supabaseAdmin
      .from('patients')
      .update(updates)
      .eq('id', id)

    if (error) throw error

    // Log Audit
    await logAuditAction(
      'UPDATE_PATIENT',
      'PATIENTS',
      id,
      {
        updatedFields: Object.keys(updates),
        updatedBy: user.emailAddresses[0]?.emailAddress
      }
    )

    revalidatePath('/dashboard/patients')
    revalidatePath(`/dashboard/patients/${id}`)
    return { success: true, message: 'Patient updated successfully' }
  } catch (error) {
    console.error('Update Error:', error)
    return { success: false, error: 'Failed to update patient' }
  }
}

/**
 * Register an Emergency Patient (Rapid Flow)
 * Creates a placeholder record with UHID
 */
export async function registerEmergencyPatient(gender: 'Male' | 'Female' | 'Other', approxAge: number = 30) {
  try {
    const user = await currentUser()

    // 1. Generate Emergency Name
    const randomSuffix = Math.floor(Math.random() * 10000)
    const firstName = 'Unknown'
    const lastName = `Emergency-${randomSuffix}`

    // 2. Estimate DOB from Approx Age
    const year = new Date().getFullYear() - approxAge
    const dob = `${year}-01-01` // Default to Jan 1st

    // 3. Generate UHID
    const uhid = await generateUHID()

    // 4. Create Emergency Patient Record
    const { data: patient, error } = await supabaseAdmin
      .from('patients')
      .insert({
        first_name: firstName,
        last_name: lastName,
        date_of_birth: dob,
        gender: gender,
        contact_number: `999${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`, // Random Mock Number
        address: 'Emergency Admission',
        uhid: uhid
      })
      .select()
      .single()

    if (error) throw error

    // Log Audit
    if (user) {
      await logAuditAction(
        'REGISTER_EMERGENCY_PATIENT',
        'PATIENTS',
        patient.id,
        {
          patientName: `${firstName} ${lastName}`,
          registeredBy: user.emailAddresses[0]?.emailAddress
        }
      )
    }

    revalidatePath('/dashboard/patients')
    return { success: true, data: patient }
  } catch (error: any) {
    console.error('Error in registerEmergencyPatient:', error)
    return { success: false, error: error.message || 'Failed to register emergency patient' }
  }
}

/**
 * Search patients by name or UHID
 */
export async function searchPatients(query: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('patients')
      .select('id, first_name, last_name, uhid')
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,uhid.ilike.%${query}%`)
      .limit(10)

    if (error) {
      console.error('Error searching patients:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in searchPatients:', error)
    return []
  }
}


/**
 * Merge two patient records
 * Moves all data from Secondary -> Primary, then deletes Secondary
 */
export async function mergePatients(primaryId: string, secondaryId: string) {
  try {
    const user = await currentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    if (primaryId === secondaryId) return { success: false, error: 'Cannot merge patient into themselves' }

    // 1. Move Appointments
    const { error: apptError } = await supabaseAdmin
      .from('appointments')
      .update({ patient_id: primaryId })
      .eq('patient_id', secondaryId)
    if (apptError) throw apptError

    // 2. Move Invoices
    const { error: invError } = await supabaseAdmin
      .from('invoices')
      .update({ patient_id: primaryId })
      .eq('patient_id', secondaryId)
    if (invError) throw invError

    // 3. Move Symptoms / Clinical Data (if any generic tables exist)
    // (Assuming patient_symptoms exists from earlier context)
    await supabaseAdmin
      .from('patient_symptoms')
      .update({ patient_id: primaryId })
      .eq('patient_id', secondaryId)

    // 4. Fetch Secondary Data for Archive Log
    const { data: secondary } = await supabaseAdmin.from('patients').select('*').eq('id', secondaryId).single()

    // 5. Delete Secondary Patient
    const { error: kError } = await supabaseAdmin
      .from('patients')
      .delete()
      .eq('id', secondaryId)

    if (kError) throw kError

    // Log Audit
    await logAuditAction(
      'MERGE_PATIENTS',
      'PATIENTS',
      primaryId,
      {
        mergedFrom: secondaryId,
        secondaryData: secondary, // Archive the data just in case
        mergedBy: user.emailAddresses[0]?.emailAddress
      }
    )

    revalidatePath('/dashboard/patients')
    revalidatePath(`/dashboard/patients/${primaryId}`)
    return { success: true, message: 'Patients merged successfully' }

  } catch (error) {
    console.error('Merge Error:', error)
    return { success: false, error: 'Failed to merge records' }
  }
}
