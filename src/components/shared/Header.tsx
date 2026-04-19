'use client'

import { useState, useEffect } from 'react'
import { UserButton } from '@clerk/nextjs'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { NotificationPanel } from '@/components/shared/NotificationPanel'
import type { UserRole } from '@/types'
import { cn } from '@/lib/utils'
import { navigationItems, shouldShowItem } from './AppSidebar'


interface HeaderProps {
  userRole: UserRole
  userName: string
  onMenuClick?: () => void
}

const roleColors: Record<UserRole | string, string> = {
  ADMIN: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700',
  DOCTOR: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700',
  NURSE: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700',
  PATIENT: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-600',
  RECEPTIONIST: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-700',
  PHARMACIST: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700',
  LAB_TECHNICIAN: 'bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-700',
}

const roleLabels: Record<UserRole | string, string> = {
  ADMIN: 'Administrator',
  DOCTOR: 'Doctor',
  NURSE: 'Nurse',
  PATIENT: 'Patient',
  RECEPTIONIST: 'Receptionist',
  PHARMACIST: 'Pharmacist',
  LAB_TECHNICIAN: 'Lab Technician',
}

export function Header({ userRole, userName, onMenuClick }: HeaderProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="flex h-16 items-center gap-4 px-4 md:px-6">
        {/* Mobile Menu Trigger */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={onMenuClick}
              suppressHydrationWarning
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="flex h-full flex-col bg-card">
              <div className="flex h-16 items-center gap-3 border-b px-4">
                <img src="/carebridge-logo.png" alt="CareBridge" className="h-10 w-auto object-contain rounded-md" />
              </div>
              <div className="flex-1 overflow-auto py-2">
                <nav className="grid gap-1 px-2">
                  {navigationItems.filter(item => shouldShowItem(item, userRole)).map((item, index) => {
                    const Icon = item.icon
                    return (
                      <a
                        key={index}
                        href={item.href}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      >
                        {Icon && <Icon className="h-4 w-4" />}
                        {item.title}
                      </a>
                    )
                  })}
                </nav>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Page Title / Breadcrumb */}
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-foreground md:text-xl">
            Dashboard
          </h1>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-3">
          {/* Role Badge */}
          <div
            className={cn(
              'hidden rounded-full border px-3 py-1 text-xs font-medium md:block',
              roleColors[userRole]
            )}
          >
            {roleLabels[userRole] || userRole}
          </div>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notifications */}
          <NotificationPanel />

          {/* User Profile */}
          <div className="flex items-center gap-3" suppressHydrationWarning>
            <div className="text-right">
              <p className="text-sm font-medium text-foreground max-w-[100px] sm:max-w-none truncate">{userName}</p>
              <p className="text-xs text-muted-foreground hidden sm:block">
                {roleLabels[userRole] || userRole}
              </p>
            </div>
            {mounted && (
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: 'h-10 w-10',
                    userButtonTrigger: 'focus:shadow-none',
                  },
                }}
              />
            )}
            {!mounted && (
              <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
