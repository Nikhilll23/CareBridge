import { redirect } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'
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
  const clerkUser = await currentUser()

  if (!clerkUser) {
    redirect('/sign-in')
  }

  // Sync user with Supabase database
  const userProfile = await syncUser()

  if (!userProfile) {
    // If sync fails, redirect to sign-in
    console.error('Failed to sync user profile')
    redirect('/sign-in')
  }

  const fullName = userProfile.fullName || clerkUser.firstName || 'User'

  return (
    <div className="relative flex min-h-screen">
      {/* Sidebar - Fixed on desktop */}
      <AppSidebar
        className="hidden md:flex"
        userRole={userProfile.role}
        userEmail={clerkUser.primaryEmailAddress?.emailAddress || ''}
      />

      {/* Main Content Area */}
      <div className="flex-1">
        {/* Header */}
        <Header
          userRole={userProfile.role}
          userName={fullName}
        />

        {/* Page Content */}
        <CartProvider>
          <main className="flex-1 overflow-y-auto bg-background p-3 md:p-6 lg:p-8">
            {children}
          </main>
        </CartProvider>
      </div>
    </div>
  )
}
