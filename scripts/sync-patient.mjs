/**
 * Manual Metriport Sync Script
 * Run this to sync an existing patient to Metriport HIE
 * 
 * Usage: node scripts/sync-patient.mjs <patient-id>
 * Example: node scripts/sync-patient.mjs c27f08cd-8e75-4b96-af56-70142a498568
 */

import { createClient } from '@supabase/supabase-js'
import { MetriportMedicalApi } from '@metriport/api-sdk'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const METRIPORT_API_KEY = process.env.METRIPORT_API_KEY
const METRIPORT_FACILITY_ID = process.env.METRIPORT_FACILITY_ID

async function syncPatientToMetriport(patientId) {
  try {
    console.log(`\n🔄 Syncing patient ${patientId} to Metriport HIE...\n`)

    // 1. Fetch patient from Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    const { data: patient, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single()

    if (error || !patient) {
      console.error('❌ Patient not found in database')
      return
    }

    console.log('✅ Patient found:', patient.first_name, patient.last_name)

    // 2. Check if already synced
    if (patient.metriport_id) {
      console.log('⚠️  Patient already has Metriport ID:', patient.metriport_id)
      console.log('Skipping sync...')
      return
    }

    // 3. Create Metriport client
    const metriport = new MetriportMedicalApi(METRIPORT_API_KEY, {
      baseAddress: 'https://api.sandbox.metriport.com',
    })

    // 4. Parse address
    const addressParts = patient.address.split(',').map(s => s.trim())
    
    // 5. Create patient in Metriport
    console.log('\n📤 Sending patient data to Metriport...')
    
    // Clean phone number - extract only digits and use last 10 digits
    const cleanPhone = patient.contact_number.replace(/\D/g, '').slice(-10)
    
    const patientData = {
      firstName: patient.first_name,
      lastName: patient.last_name,
      dob: patient.date_of_birth.split('T')[0], // Format: YYYY-MM-DD
      genderAtBirth: patient.gender === 'Male' ? 'M' : patient.gender === 'Female' ? 'F' : 'O',
      address: [{
        addressLine1: addressParts[0] || patient.address.substring(0, 50),
        city: addressParts[1] || 'Mumbai',
        state: 'CA', // US state required
        zip: '94101', // US zip code required
        country: 'USA',
      }],
      contact: [{
        phone: cleanPhone || '5551234567', // 10-digit US format
      }],
    }
    
    console.log('Patient data:', JSON.stringify(patientData, null, 2))
    
    const metriportPatient = await metriport.createPatient(patientData, METRIPORT_FACILITY_ID)

    console.log('✅ Patient created in Metriport!')
    console.log('Metriport ID:', metriportPatient.id)

    // 6. Update Supabase with Metriport ID
    const { error: updateError } = await supabase
      .from('patients')
      .update({ metriport_id: metriportPatient.id })
      .eq('id', patientId)

    if (updateError) {
      console.error('❌ Error updating Supabase:', updateError)
      return
    }

    console.log('\n✅ SUCCESS! Patient synced to HIE')
    console.log('----------------------------------')
    console.log('Patient ID:', patientId)
    console.log('Metriport ID:', metriportPatient.id)
    console.log('----------------------------------')
    console.log('\n🎉 Refresh your browser to see the green "Synced" badge!')
    
  } catch (error) {
    console.error('\n❌ Error during sync:', error.message)
    if (error.response?.data) {
      console.error('API Error Details:', JSON.stringify(error.response.data, null, 2))
    }
  }
}

// Get patient ID from command line
const patientId = process.argv[2]

if (!patientId) {
  console.error('❌ Please provide a patient ID')
  console.log('Usage: node scripts/sync-patient.mjs <patient-id>')
  console.log('Example: node scripts/sync-patient.mjs c27f08cd-8e75-4b96-af56-70142a498568')
  process.exit(1)
}

// Run sync
syncPatientToMetriport(patientId)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
