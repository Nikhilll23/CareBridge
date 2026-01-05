/**
 * Metriport API Testing Suite
 * Comprehensive test script for all Metriport endpoints
 * 
 * Usage: node scripts/test-metriport-apis.mjs
 */

import { MetriportMedicalApi } from '@metriport/api-sdk'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables from .env.local
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const METRIPORT_API_KEY = process.env.METRIPORT_API_KEY
const METRIPORT_BASE_URL = 'https://api.sandbox.metriport.com'
const FACILITY_ID = process.env.METRIPORT_FACILITY_ID

if (!METRIPORT_API_KEY) {
  console.error('❌ METRIPORT_API_KEY not found in environment')
  process.exit(1)
}

// Initialize Metriport client
const metriport = new MetriportMedicalApi(METRIPORT_API_KEY, {
  baseAddress: METRIPORT_BASE_URL,
})

console.log('🔬 Metriport API Testing Suite')
console.log('=' .repeat(60))
console.log(`🔑 API Key: ${METRIPORT_API_KEY.substring(0, 20)}...`)
console.log(`🏥 Facility ID: ${FACILITY_ID}`)
console.log(`🌐 Base URL: ${METRIPORT_BASE_URL}`)
console.log('=' .repeat(60))
console.log()

/**
 * Test 1: List all facilities
 */
async function testListFacilities() {
  console.log('📋 Test 1: List Facilities')
  console.log('-'.repeat(40))
  
  try {
    const response = await fetch(`${METRIPORT_BASE_URL}/medical/v1/facility`, {
      method: 'GET',
      headers: {
        'x-api-key': METRIPORT_API_KEY,
      },
    })

    const data = await response.json()
    
    if (response.ok) {
      console.log('✅ Success!')
      console.log(`   Found ${data.facilities?.length || 0} facilities:`)
      data.facilities?.forEach((facility, idx) => {
        console.log(`   ${idx + 1}. ${facility.name} (ID: ${facility.id})`)
        console.log(`      NPI: ${facility.npi} | TIN: ${facility.tin}`)
        console.log(`      Status: ${facility.active ? 'Active' : 'Inactive'}`)
      })
    } else {
      console.log('❌ Failed:', data)
    }
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
  
  console.log()
}

/**
 * Test 2: Get single facility details
 */
async function testGetFacility() {
  console.log('🏥 Test 2: Get Facility Details')
  console.log('-'.repeat(40))
  
  if (!FACILITY_ID) {
    console.log('⚠️  Skipped: No FACILITY_ID found')
    console.log()
    return
  }

  try {
    const response = await fetch(`${METRIPORT_BASE_URL}/medical/v1/facility/${FACILITY_ID}`, {
      method: 'GET',
      headers: {
        'x-api-key': METRIPORT_API_KEY,
      },
    })

    const data = await response.json()
    
    if (response.ok) {
      console.log('✅ Success!')
      console.log(`   Name: ${data.name}`)
      console.log(`   NPI: ${data.npi}`)
      console.log(`   TIN: ${data.tin}`)
      console.log(`   Address: ${data.address.addressLine1}, ${data.address.city}, ${data.address.state}`)
      console.log(`   Active: ${data.active}`)
    } else {
      console.log('❌ Failed:', data)
    }
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
  
  console.log()
}

/**
 * Test 3: List all patients
 */
async function testListPatients() {
  console.log('👥 Test 3: List Patients')
  console.log('-'.repeat(40))
  
  if (!FACILITY_ID) {
    console.log('⚠️  Skipped: No FACILITY_ID found')
    console.log()
    return
  }

  try {
    const response = await fetch(`${METRIPORT_BASE_URL}/medical/v1/patient?facilityId=${FACILITY_ID}`, {
      method: 'GET',
      headers: {
        'x-api-key': METRIPORT_API_KEY,
      },
    })

    const data = await response.json()
    
    if (response.ok) {
      console.log('✅ Success!')
      console.log(`   Found ${data.patients?.length || 0} patients:`)
      data.patients?.forEach((patient, idx) => {
        console.log(`   ${idx + 1}. ${patient.firstName} ${patient.lastName}`)
        console.log(`      ID: ${patient.id}`)
        console.log(`      DOB: ${patient.dob} | Gender: ${patient.genderAtBirth}`)
      })
    } else {
      console.log('❌ Failed:', data)
    }
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
  
  console.log()
}

/**
 * Test 4: Get patient details (using first available patient)
 */
async function testGetPatient() {
  console.log('👤 Test 4: Get Patient Details')
  console.log('-'.repeat(40))
  
  if (!FACILITY_ID) {
    console.log('⚠️  Skipped: No FACILITY_ID found')
    console.log()
    return
  }

  try {
    // First, get list of patients
    const listResponse = await fetch(`${METRIPORT_BASE_URL}/medical/v1/patient?facilityId=${FACILITY_ID}`, {
      method: 'GET',
      headers: {
        'x-api-key': METRIPORT_API_KEY,
      },
    })

    const listData = await listResponse.json()
    
    if (!listData.patients || listData.patients.length === 0) {
      console.log('⚠️  No patients found to test')
      console.log()
      return
    }

    const patientId = listData.patients[0].id
    console.log(`   Testing with patient ID: ${patientId}`)

    // Get patient details
    const response = await fetch(`${METRIPORT_BASE_URL}/medical/v1/patient/${patientId}`, {
      method: 'GET',
      headers: {
        'x-api-key': METRIPORT_API_KEY,
      },
    })

    const data = await response.json()
    
    if (response.ok) {
      console.log('✅ Success!')
      console.log(`   Name: ${data.firstName} ${data.lastName}`)
      console.log(`   DOB: ${data.dob}`)
      console.log(`   Gender: ${data.genderAtBirth}`)
      console.log(`   Address: ${data.address[0].city}, ${data.address[0].state}`)
      console.log(`   Contact: ${data.contact?.[0]?.phone || 'N/A'}`)
    } else {
      console.log('❌ Failed:', data)
    }
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
  
  console.log()
}

/**
 * Test 5: Start document query
 */
async function testStartDocumentQuery() {
  console.log('📄 Test 5: Start Document Query')
  console.log('-'.repeat(40))
  
  if (!FACILITY_ID) {
    console.log('⚠️  Skipped: No FACILITY_ID found')
    console.log()
    return
  }

  try {
    // Get first patient
    const listResponse = await fetch(`${METRIPORT_BASE_URL}/medical/v1/patient?facilityId=${FACILITY_ID}`, {
      method: 'GET',
      headers: {
        'x-api-key': METRIPORT_API_KEY,
      },
    })

    const listData = await listResponse.json()
    
    if (!listData.patients || listData.patients.length === 0) {
      console.log('⚠️  No patients found to test')
      console.log()
      return
    }

    const patientId = listData.patients[0].id
    console.log(`   Querying documents for patient: ${patientId}`)

    const response = await fetch(`${METRIPORT_BASE_URL}/medical/v1/document/query?patientId=${patientId}&facilityId=${FACILITY_ID}`, {
      method: 'POST',
      headers: {
        'x-api-key': METRIPORT_API_KEY,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()
    
    if (response.ok) {
      console.log('✅ Document query started!')
      console.log(`   Query ID: ${data.id || data.queryId || 'N/A'}`)
      console.log(`   Status: ${data.status || 'Processing'}`)
    } else {
      console.log('❌ Failed:', data)
    }
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
  
  console.log()
}

/**
 * Test 6: Start consolidated FHIR data query
 */
async function testConsolidatedQuery() {
  console.log('🔬 Test 6: Consolidated FHIR Query')
  console.log('-'.repeat(40))
  
  if (!FACILITY_ID) {
    console.log('⚠️  Skipped: No FACILITY_ID found')
    console.log()
    return
  }

  try {
    // Get first patient
    const listResponse = await fetch(`${METRIPORT_BASE_URL}/medical/v1/patient?facilityId=${FACILITY_ID}`, {
      method: 'GET',
      headers: {
        'x-api-key': METRIPORT_API_KEY,
      },
    })

    const listData = await listResponse.json()
    
    if (!listData.patients || listData.patients.length === 0) {
      console.log('⚠️  No patients found to test')
      console.log()
      return
    }

    const patientId = listData.patients[0].id
    console.log(`   Querying FHIR data for patient: ${patientId}`)

    // Query specific resources
    const resources = ['AllergyIntolerance', 'Condition', 'MedicationRequest']
    
    const response = await fetch(
      `${METRIPORT_BASE_URL}/medical/v1/patient/${patientId}/consolidated/query?resources=${resources.join(',')}&conversionType=json`,
      {
        method: 'POST',
        headers: {
          'x-api-key': METRIPORT_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    )

    const data = await response.json()
    
    if (response.ok) {
      console.log('✅ Consolidated query started!')
      console.log(`   Requested resources: ${resources.join(', ')}`)
      console.log(`   Query ID: ${data.id || data.queryId || 'N/A'}`)
    } else {
      console.log('❌ Failed:', data)
    }
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
  
  console.log()
}

/**
 * Test 7: Count patient data
 */
async function testCountPatientData() {
  console.log('🔢 Test 7: Count Patient Data')
  console.log('-'.repeat(40))
  
  if (!FACILITY_ID) {
    console.log('⚠️  Skipped: No FACILITY_ID found')
    console.log()
    return
  }

  try {
    // Get first patient
    const listResponse = await fetch(`${METRIPORT_BASE_URL}/medical/v1/patient?facilityId=${FACILITY_ID}`, {
      method: 'GET',
      headers: {
        'x-api-key': METRIPORT_API_KEY,
      },
    })

    const listData = await listResponse.json()
    
    if (!listData.patients || listData.patients.length === 0) {
      console.log('⚠️  No patients found to test')
      console.log()
      return
    }

    const patientId = listData.patients[0].id
    console.log(`   Counting data for patient: ${patientId}`)

    const resources = ['AllergyIntolerance', 'Condition', 'MedicationRequest', 'Observation']
    
    const response = await fetch(
      `${METRIPORT_BASE_URL}/medical/v1/patient/${patientId}/consolidated/count?resources=${resources.join(',')}`,
      {
        method: 'GET',
        headers: {
          'x-api-key': METRIPORT_API_KEY,
        },
      }
    )

    const data = await response.json()
    
    if (response.ok) {
      console.log('✅ Data count retrieved!')
      console.log(`   Total records:`)
      Object.entries(data).forEach(([resource, count]) => {
        console.log(`      ${resource}: ${count}`)
      })
    } else {
      console.log('❌ Failed:', data)
    }
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
  
  console.log()
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🚀 Starting Metriport API tests...\n')
  
  await testListFacilities()
  await testGetFacility()
  await testListPatients()
  await testGetPatient()
  await testStartDocumentQuery()
  await testConsolidatedQuery()
  await testCountPatientData()
  
  console.log('=' .repeat(60))
  console.log('✅ All tests completed!')
  console.log('=' .repeat(60))
}

// Run the tests
runAllTests().catch(error => {
  console.error('❌ Test suite failed:', error)
  process.exit(1)
})
