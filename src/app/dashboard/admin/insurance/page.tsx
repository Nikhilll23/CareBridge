import { supabaseAdmin } from '@/lib/supabase'
import { ClaimsManager } from '@/components/modules/insurance/ClaimsManager'

export default async function InsurancePage() {
  const { data: claims } = await supabaseAdmin
    .from('insurance_claims')
    .select('*')
    .order('submission_date', { ascending: false })

  // Fetch simple patient list for the dropdown
  const { data: patients } = await supabaseAdmin
    .from('patients')
    .select('id, first_name, last_name')
    .limit(50) // Limit for performance

  const patientList = patients?.map(p => ({
    id: p.id,
    name: `${p.first_name} ${p.last_name}`
  })) || []

  return (
    <ClaimsManager
      claims={claims || []}
      patients={patientList}
    />
  )
}
