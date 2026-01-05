import type { UserRole } from '@/types'

/**
 * Get a list of all roles
 */
export function getAllRoles(): UserRole[] {
  return ['ADMIN', 'DOCTOR', 'NURSE', 'PATIENT']
}

/**
 * Check if a role has admin privileges
 */
export function isAdminRole(role: UserRole): boolean {
  return role === 'ADMIN'
}

/**
 * Check if a role is medical staff (DOCTOR or NURSE)
 */
export function isMedicalStaff(role: UserRole): boolean {
  return role === 'DOCTOR' || role === 'NURSE'
}

/**
 * Check if a user can view patient data
 */
export function canViewPatients(role: UserRole): boolean {
  return role === 'ADMIN' || role === 'DOCTOR' || role === 'NURSE'
}

/**
 * Check if a user can modify patient data
 */
export function canModifyPatients(role: UserRole): boolean {
  return role === 'ADMIN' || role === 'DOCTOR'
}
