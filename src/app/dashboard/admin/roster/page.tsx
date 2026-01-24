import { getDutyRoster, getRosterStats } from '@/actions/roster'
import { RosterManager } from '@/components/modules/roster/RosterManager'
import { supabaseAdmin } from '@/lib/supabase'
import { currentUser } from '@clerk/nextjs/server'

export default async function DutyRosterPage({ searchParams }: { searchParams: { date?: string } }) {
  const user = await currentUser()
  const dateStr = searchParams?.date
  const queryDate = dateStr ? new Date(dateStr) : new Date()

  // Check admin status for edit permission
  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('role, email')
    .eq('id', user?.id || '')
    .single()

  // Explicitly allowing omarhashmi494@gmail.com as requested by user
  const isAdmin = userData?.role === 'ADMIN' || (user?.emailAddresses.some(e => e.emailAddress === 'omarhashmi494@gmail.com') ?? false)

  const stats = await getRosterStats()
  const { data: roster } = await getDutyRoster(queryDate)

  // Fetch staff list for the dropdown
  const { data: staffList } = await supabaseAdmin
    .from('users')
    .select('id, first_name, last_name, role')
    .in('role', ['DOCTOR', 'NURSE'])
    .order('first_name')

  return (
    <RosterManager
      roster={roster}
      stats={stats}
      staffList={staffList || []}
      isAdmin={isAdmin}
    />
  )
}
