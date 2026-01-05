/**
 * Script to insert sample doctors into Supabase
 * Run this once to populate doctors for appointment scheduling
 */

import { supabaseAdmin } from '../src/lib/supabase'

const doctors = [
  {
    id: 'user_doctor1_sample', // Simulating Clerk user ID format
    email: 'dr.sarah.johnson@hospital.com',
    first_name: 'Sarah',
    last_name: 'Johnson',
    role: 'DOCTOR',
  },
  {
    id: 'user_doctor2_sample',
    email: 'dr.michael.chen@hospital.com',
    first_name: 'Michael',
    last_name: 'Chen',
    role: 'DOCTOR',
  },
  {
    id: 'user_doctor3_sample',
    email: 'dr.priya.patel@hospital.com',
    first_name: 'Priya',
    last_name: 'Patel',
    role: 'DOCTOR',
  },
  {
    id: 'user_doctor4_sample',
    email: 'dr.james.williams@hospital.com',
    first_name: 'James',
    last_name: 'Williams',
    role: 'DOCTOR',
  },
  {
    id: 'user_doctor5_sample',
    email: 'dr.emma.martinez@hospital.com',
    first_name: 'Emma',
    last_name: 'Martinez',
    role: 'DOCTOR',
  },
]

async function insertDoctors() {
  console.log('🏥 Inserting sample doctors into Supabase...\n')

  for (const doctor of doctors) {
    console.log(`Adding: Dr. ${doctor.first_name} ${doctor.last_name}`)
    
    const { data, error } = await supabaseAdmin
      .from('users')
      .upsert(doctor, { onConflict: 'id' })

    if (error) {
      console.error(`❌ Error inserting ${doctor.first_name}:`, error.message)
    } else {
      console.log(`✅ Successfully added Dr. ${doctor.first_name} ${doctor.last_name}`)
    }
  }

  console.log('\n🎉 All doctors inserted successfully!')
  console.log('\nYou can now select these doctors when scheduling appointments:')
  doctors.forEach((d, i) => {
    console.log(`${i + 1}. Dr. ${d.first_name} ${d.last_name} (${d.email})`)
  })
}

insertDoctors()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Failed to insert doctors:', error)
    process.exit(1)
  })
