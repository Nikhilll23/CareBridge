import { redirect } from 'next/navigation'
import { safeCurrentUser } from '@/lib/auth-safe'
import { syncUser } from '@/actions/auth'
import { AppSidebar } from '@/components/shared/AppSidebar'
import { GlobalAI } from '@/components/shared/GlobalAI'
import { Header } from '@/components/shared/Header'
import { CartProvider } from '@/context/CartContext'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Ensure user is authenticated
  const clerkUser = await safeCurrentUser()

  if (!clerkUser) {
    redirect('/sign-in')
  }

  // Sync user with Supabase database
  const userProfile = await syncUser()

  if (!userProfile) {
    // If sync fails, still allow access with basic clerk info
    console.warn('Failed to sync user profile - check Supabase connection and run MASTER-SETUP.sql')
    redirect('/sign-in')
  }

  const fullName = userProfile.fullName || clerkUser.firstName || 'User'
  const userRole = String(userProfile.role || 'PATIENT')
  const userEmail = clerkUser.primaryEmailAddress?.emailAddress || ''

  return (
    <div className="relative flex min-h-screen" suppressHydrationWarning>
      {/* Sidebar - Fixed on desktop */}
      <AppSidebar
        className="hidden md:flex"
        userRole={userRole}
        userEmail={userEmail}
      />

      {/* Main Content Area */}
      <div className="flex-1">
        {/* Header */}
        <Header
          userRole={userRole as any}
          userName={fullName}
        />

        {/* Page Content */}
        <CartProvider>
          <main suppressHydrationWarning className="flex-1 overflow-y-auto bg-background p-3 md:p-6 lg:p-8">
            {children}
          </main>
        </CartProvider>
      </div>
    </div>
  )
}
