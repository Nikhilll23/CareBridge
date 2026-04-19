import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Stethoscope, UserPlus, Clock } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase'
import { StaffDirectoryList } from '@/components/modules/staff/StaffDirectoryList'
import { CreateStaffDialog } from '@/components/modules/staff/CreateStaffDialog'
import { BroadcastNotificationDialog } from '@/components/modules/staff/BroadcastNotificationDialog'

export default async function StaffPage() {
  const { count: totalStaff } = await supabaseAdmin
    .from('users')
    .select('*', { count: 'exact', head: true })
    .in('role', ['ADMIN', 'DOCTOR', 'NURSE'])

  const { count: doctors } = await supabaseAdmin
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'DOCTOR')

  const { count: nurses } = await supabaseAdmin
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'NURSE')

  // Helper to get today's date start/end in ISO
  const today = new Date()
  const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString()
  const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString()

  // Fetch users (Doctors, Nurses, Admins)
  const { data: users, error: usersError } = await supabaseAdmin
    .from('users')
    .select('id, first_name, last_name, role, email, phone')
    .in('role', ['DOCTOR', 'NURSE', 'ADMIN'])
    .order('first_name')

  if (usersError) {
    console.error('Error fetching users:', usersError)
  }

  // Fetch today's roster
  const { data: roster } = await supabaseAdmin
    .from('duty_roster')
    .select('*')
    .gte('shift_date', startOfDay)
    .lte('shift_date', endOfDay)

  const onDuty = roster?.filter((r: any) => r.status === 'ON_DUTY' || r.shift_type === 'MORNING').length || 0

  const staffWithShifts = users?.map(u => ({
    ...u,
    shifts: roster?.filter((r: any) => r.staff_id === u.id) || []
  })) || []

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staff Directory</h1>
          <p className="text-muted-foreground mt-2">Hospital staff management and contact information</p>
        </div>
        <div className="flex gap-2">
          <BroadcastNotificationDialog />
          <CreateStaffDialog />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStaff || 0}</div>
            <p className="text-xs text-muted-foreground">All departments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Doctors</CardTitle>
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{doctors || 0}</div>
            <p className="text-xs text-muted-foreground">Active physicians</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nurses</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nurses || 0}</div>
            <p className="text-xs text-muted-foreground">Nursing staff</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Duty</CardTitle>
            <Clock className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{onDuty}</div>
            <p className="text-xs text-muted-foreground">Currently working</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Staff Directory</h2>
        <p className="text-sm text-muted-foreground">View and manage hospital staff profiles, schedules and contact information</p>

        <StaffDirectoryList staff={staffWithShifts} />
      </div>
    </div>
  )
}
