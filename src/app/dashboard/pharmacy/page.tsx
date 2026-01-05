import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'
import { PharmacyDashboard } from '@/app/dashboard/pharmacy/PharmacyDashboard'
import { supabaseAdmin } from '@/lib/supabase'
import {
  getInventory,
  getLowStockItems,
  getExpiringItems,
} from '@/actions/inventory'

export const dynamic = 'force-dynamic'

export default async function PharmacyPage() {
  const user = await currentUser()

  if (!user) {
    redirect('/sign-in')
  }

  // Check user role
  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!userData || !['ADMIN', 'DOCTOR', 'NURSE'].includes(userData.role)) {
    redirect('/dashboard')
  }

  // Fetch all patients for dispense dialog
  const { data: patients } = await supabaseAdmin
    .from('patients')
    .select('id, first_name, last_name')
    .order('first_name', { ascending: true })

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <Suspense fallback={<LoadingSkeleton />}>
        <PharmacyContent patients={patients || []} userRole={userData.role} />
      </Suspense>
    </div>
  )
}

async function PharmacyContent({
  patients,
  userRole,
}: {
  patients: any[]
  userRole: string
}) {
  const [inventoryResult, lowStockResult, expiringResult] = await Promise.all([
    getInventory(),
    getLowStockItems(),
    getExpiringItems(),
  ])

  const inventory = inventoryResult.data || []
  const lowStock = lowStockResult.data || []
  const expiring = expiringResult.data || []

  // Calculate stats
  const totalItems = inventory.length
  const totalValue = inventory.reduce(
    (sum, item) => sum + item.stock_quantity * item.unit_price,
    0
  )
  const outOfStock = inventory.filter((item) => item.stock_quantity === 0).length

  return (
    <PharmacyDashboard
      inventory={inventory}
      lowStock={lowStock}
      expiring={expiring}
      patients={patients}
      userRole={userRole}
      stats={{
        totalItems,
        totalValue,
        lowStockCount: lowStock.length,
        outOfStock,
        expiringCount: expiring.length,
      }}
    />
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-10 w-32 bg-muted animate-pulse rounded" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded" />
        ))}
      </div>
      <div className="h-96 bg-muted animate-pulse rounded" />
    </div>
  )
}
