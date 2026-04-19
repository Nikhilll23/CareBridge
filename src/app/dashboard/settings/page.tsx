import { safeCurrentUser } from '@/lib/auth-safe'
import { redirect } from 'next/navigation'
import { SettingsManager } from '@/components/modules/settings/SettingsManager'
import { supabaseAdmin } from '@/lib/supabase'

export default async function SettingsPage() {
  const user = await safeCurrentUser()

  if (!user) {
    redirect('/sign-in')
  }

  // Get extended profile from Supabase
  const { data: dbUser } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  // Merge Clerk and DB data into a plain object to avoid serialization issues
  const userData = {
    id: user.id,
    firstName: dbUser?.first_name || user.firstName || '',
    lastName: dbUser?.last_name || user.lastName || '',
    phone: dbUser?.phone || '',
    email: user.emailAddresses?.[0]?.emailAddress || '',
  }

  return <SettingsManager user={userData} />
}
