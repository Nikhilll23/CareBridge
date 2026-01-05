'use server'

import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import type { UserRole, UserProfile } from '@/types'

/**
 * Check if the current user has one of the allowed roles
 * Redirects to /dashboard if unauthorized
 * @param allowedRoles - Array of roles that are allowed to access the resource
 * @returns UserProfile if authorized
 */
export async function checkRole(allowedRoles: UserRole[]): Promise<UserProfile> {
  try {
    // Get current Clerk user
    const clerkUser = await currentUser()
    
    if (!clerkUser) {
      console.error('No authenticated user found')
      redirect('/sign-in')
    }

    const userId = clerkUser.id

    // Query Supabase for user's role
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error || !user) {
      console.error('User not found in database:', error)
      redirect('/dashboard')
    }

    // Check if user has one of the allowed roles
    if (!allowedRoles.includes(user.role)) {
      console.warn(
        `Access denied: User ${user.email} with role ${user.role} attempted to access resource requiring roles: ${allowedRoles.join(', ')}`
      )
      redirect('/dashboard')
    }

    // User is authorized, return profile
    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      fullName: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      role: user.role,
      createdAt: new Date(user.created_at),
    }
  } catch (error) {
    // If the error is a redirect, let it pass through
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
      throw error
    }
    
    console.error('Error in checkRole:', error)
    redirect('/dashboard')
  }
}

/**
 * Check if a user has a specific role
 * @param userId - The user's ID
 * @param role - The role to check
 * @returns boolean indicating if user has the role
 */
export async function hasRole(userId: string, role: UserRole): Promise<boolean> {
  try {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (error || !user) {
      return false
    }

    return user.role === role
  } catch (error) {
    console.error('Error checking role:', error)
    return false
  }
}

// Note: Utility functions moved to rbac-utils.ts to avoid server action conflicts
// Import from '@/lib/rbac-utils' for: getAllRoles, isAdminRole, isMedicalStaff, canViewPatients, canModifyPatients
