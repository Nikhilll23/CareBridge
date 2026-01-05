/**
 * Metriport Facility Setup Script
 * 
 * This script helps you create a facility in Metriport
 * Run this once before registering patients
 * 
 * Usage: node scripts/create-facility.js
 */

import { MetriportMedicalApi, USState } from '@metriport/api-sdk'

const METRIPORT_API_KEY = 'cW0zMXl4Rm9DZkNhT3BaWG03eUkzOmJmMGI0ZDNiLTczM2MtNDVlZi1hNWU1LWM2NGNlMmNkZjllZQ'
const METRIPORT_BASE_URL = 'https://api.sandbox.metriport.com'

async function createFacility() {
  try {
    const metriport = new MetriportMedicalApi(METRIPORT_API_KEY, {
      baseAddress: METRIPORT_BASE_URL,
    })

    console.log('Creating facility in Metriport...\n')

    const facility = await metriport.createFacility({
      name: 'Hospital Information System Facility',
      npi: '1234567893', // National Provider Identifier (10 digits) - Valid Luhn checksum
      tin: '123456789',  // Tax Identification Number (9 digits)
      active: true,
      address: {
        addressLine1: '123 Medical Center Drive',
        addressLine2: 'Suite 100',
        city: 'San Francisco',
        state: USState.CA,
        zip: '94114',
        country: 'USA',
      },
    })

    console.log('✅ Facility created successfully!')
    console.log('\nFacility Details:')
    console.log('----------------------------------')
    console.log('ID:', facility.id)
    console.log('Name:', facility.name)
    console.log('NPI:', facility.npi)
    console.log('Active:', facility.active)
    console.log('\n⚠️  IMPORTANT: Copy the Facility ID above')
    console.log('Add it to your .env.local file as:')
    console.log(`METRIPORT_FACILITY_ID=${facility.id}`)
    console.log('\n----------------------------------')

    return facility
  } catch (error) {
    console.error('❌ Error creating facility:', error)
    throw error
  }
}

// Run the script
createFacility()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
