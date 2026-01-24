import { checkRole } from '@/lib/rbac'
import { AppSidebar } from '@/components/shared/AppSidebar'
import { Header } from '@/components/shared/Header'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Check if user is an ADMIN - redirects to /dashboard if not
  const userProfile = await checkRole(['ADMIN'])

  const fullName = userProfile.fullName || 'Admin User'

  return (
    <div className="relative flex min-h-screen">
      {/* Sidebar - Fixed on desktop */}
      <AppSidebar userRole={userProfile.role} className="hidden md:flex" />

      {/* Main Content Area */}
      <div className="flex-1 ">
        {/* Header with Admin Badge */}
        <Header 
          userRole={userProfile.role} 
          userName={fullName}
        />

        {/* Admin Mode Indicator */}
        <div className="bg-purple-600 text-white px-4 py-2 text-sm font-medium flex items-center justify-center gap-2">
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <span>Admin Mode Active</span>
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
