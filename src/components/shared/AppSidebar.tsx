'use client'

import { motion, type HTMLMotionProps } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Calendar,
  Users,
  Settings,
  Activity,
  ChevronLeft,
  ChevronRight,
  Pill,
  ActivitySquare,
  Brain,
  Map,
  UserCheck,
  CalendarClock,
  DollarSign,
  ShieldCheck,
  FileText,
  BarChart3,
  Bed,
  FlaskConical,
  Scissors,
  Package,
  AlertTriangle,
  Receipt,
  Wrench
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { NavItem } from '@/types'
import { useState, useMemo } from 'react'


export const navigationItems: NavItem[] = [
  // Main Section
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Appointments',
    href: '/dashboard/appointments',
    icon: Calendar,
  },
  {
    title: 'Patients',
    href: '/dashboard/patients',
    icon: Users,
  },
  // Clinical Section
  {
    title: 'Bed Management',
    href: '/dashboard/beds',
    icon: Bed,
  },
  {
    title: 'Diagnostic Lab',
    href: '/dashboard/lab',
    icon: FlaskConical,
  },
  {
    title: 'Radiology',
    href: '/dashboard/radiology',
    icon: ActivitySquare,
  },
  {
    title: 'Operation Theatre',
    href: '/dashboard/ot',
    icon: Scissors,
  },
  {
    title: 'Pharmacy',
    href: '/dashboard/pharmacy',
    icon: Pill,
  },
  {
    title: 'Emergency',
    href: '/dashboard/patient/emergency',
    icon: Map,
  },
  {
    title: 'AI Assistant',
    href: '/dashboard/ai',
    icon: Brain,
  },
  // Operations Section
  {
    title: 'Staff Directory',
    href: '/dashboard/admin/staff',
    icon: UserCheck,
  },
  {
    title: 'Duty Roster',
    href: '/dashboard/admin/roster',
    icon: CalendarClock,
  },
  {
    title: 'Inventory & Store',
    href: '/dashboard/admin/inventory',
    icon: Package,
  },
  {
    title: 'Resources',
    href: '/dashboard/admin/resources',
    icon: Wrench,
  },
  {
    title: 'Risk & Safety',
    href: '/dashboard/admin/risk',
    icon: AlertTriangle,
  },
  // Finance Section
  {
    title: 'Billing',
    href: '/dashboard/admin/billing',
    icon: Receipt,
  },
  {
    title: 'Billing & Payments',
    href: '/dashboard/patient/billing',
    icon: Receipt,
  },

  {
    title: 'Revenue & Claims',
    href: '/dashboard/admin/finance',
    icon: DollarSign,
  },
  {
    title: 'Insurance TPA',
    href: '/dashboard/admin/insurance',
    icon: ShieldCheck,
  },
  // System Section
  {
    title: 'Analytics',
    href: '/admin',
    icon: BarChart3,
  },
  {
    title: 'Audit Logs',
    href: '/dashboard/admin/audit',
    icon: FileText,
  },
  {
    title: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
  },
]

// Helper to determine if an item should be shown for a role
const shouldShowItem = (item: NavItem, role?: string) => {
  // Define visibility rules
  const userRole = role?.toUpperCase() || 'PATIENT' // Default to safest role

  // Common items
  if (item.href === '/dashboard') return true
  if (item.href === '/dashboard/settings') return true

  // Admin only items
  const adminItems = [
    '/dashboard/admin',
    '/dashboard/admin/staff',
    '/dashboard/admin/roster',
    '/dashboard/admin/finance',
    '/dashboard/admin/insurance',
    '/dashboard/admin/map',
    '/dashboard/admin/audit',
    '/dashboard/admin/inventory',
    '/dashboard/admin/risk',
    '/dashboard/admin/billing',
    '/dashboard/admin/resources',
    '/admin', // Analytics
  ]

  if (adminItems.some(path => item.href.startsWith(path))) {
    return userRole === 'ADMIN'
  }

  // Doctor items
  if (userRole === 'DOCTOR') {
    return [
      '/dashboard/appointments',
      '/dashboard/patients',
      '/dashboard/radiology',
      '/dashboard/ai',
      '/dashboard/pharmacy',
      '/dashboard/beds',
      '/dashboard/lab',
      '/dashboard/ot'
    ].includes(item.href)
  }

  // Patient items
  if (userRole === 'PATIENT') {
    // Patients see limited view
    return ['/dashboard/appointments', '/dashboard/ai', '/dashboard/patient/emergency', '/dashboard/patient/billing'].includes(item.href)
  }

  // Nurse items
  if (userRole === 'NURSE') {
    return [
      '/dashboard/patients',
      '/dashboard/appointments',
      '/dashboard/pharmacy',
      '/dashboard/ai',
      '/dashboard/beds',
      '/dashboard/lab'
    ].includes(item.href)
  }

  // Default fallback for Admin (sees everything unless explicitly excluded)
  if (userRole === 'ADMIN') return true

  return false
}

interface AppSidebarProps extends HTMLMotionProps<'div'> {
  userRole?: string
}

export function AppSidebar({ className, userRole, ...props }: AppSidebarProps) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Memoize filtered items to ensure consistent rendering during hydration
  const filteredNavItems = useMemo(() => {
    return navigationItems.filter(item => shouldShowItem(item, userRole))
  }, [userRole])

  return (
    <motion.div
      suppressHydrationWarning
      initial={{ width: 256 }}
      animate={{ width: isCollapsed ? 80 : 256 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className={cn(
        'relative flex flex-col border-r border-border bg-card pb-4 pt-6 text-card-foreground',
        className
      )}
      {...props}
    >
      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        suppressHydrationWarning
        className="absolute -right-3 top-6 z-20 h-6 w-6 rounded-full border border-border bg-background shadow-sm hover:bg-accent"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </Button>

      {/* Logo Area */}
      <div className={cn('flex items-center gap-3 px-6 mb-8', isCollapsed && 'justify-center px-2')}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Activity className="h-5 w-5" />
        </div>
        {!isCollapsed && (
          <span className="font-bold text-lg tracking-tight">HIS Core</span>
        )}
      </div>

      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto px-3">
        <nav className="space-y-1.5">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href

            return (
              <div key={`${item.href}-${item.title}`}>
                <Link href={item.href}>
                  <Button
                    variant={isActive ? 'secondary' : 'ghost'}
                    suppressHydrationWarning
                    className={cn(
                      'w-full justify-start gap-3 transition-all duration-200',
                      isActive && 'bg-primary/10 text-primary hover:bg-primary/15',
                      !isActive && 'text-muted-foreground hover:text-foreground',
                      isCollapsed ? 'px-2' : 'px-4'
                    )}
                  >
                    {item.icon && <item.icon className={cn('h-4 w-4 shrink-0', isActive && 'text-primary')} />}
                    {!isCollapsed && <span>{item.title}</span>}
                  </Button>
                </Link>
              </div>
            )
          })}
        </nav>
      </div>



      {/* User Section */}
      <div className="mt-auto px-3">
        <Separator className="my-4" />
        {!isCollapsed && (
          <div className="px-4 text-xs text-muted-foreground text-center">
            v1.0.0 HIS Core
          </div>
        )}
      </div>
    </motion.div>
  )
}
