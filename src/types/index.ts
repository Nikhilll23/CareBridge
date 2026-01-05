// =====================================================
// Global Type Definitions for Hospital Information System
// =====================================================

// User Role Enum (matches Supabase enum)
export type UserRole = 'ADMIN' | 'DOCTOR' | 'NURSE' | 'PATIENT'

// User Interface (matches Supabase users table)
export interface User {
  id: string // UUID matching Clerk User ID
  email: string
  first_name: string | null
  last_name: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

// User Profile Response
export interface UserProfile {
  id: string
  email: string
  firstName: string
  lastName: string
  fullName: string
  role: UserRole
  createdAt: Date
}

// Navigation Item Type
export interface NavItem {
  title: string
  href: string
  icon?: React.ComponentType<{ className?: string }>
  badge?: string | number
  disabled?: boolean
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Common Error Type
export interface AppError {
  code: string
  message: string
}

// AI Assistant Types
export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AIResponse {
  success: boolean
  message?: string
  error?: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  details?: any
}

// =====================================================
// Patient Management Types
// =====================================================

// Patient Gender Type
export type PatientGender = 'Male' | 'Female' | 'Other'

// Patient Interface (matches Supabase patients table)
export interface Patient {
  id: string // UUID
  email?: string // Added via migration (optional for legacy)
  first_name: string
  last_name: string
  date_of_birth: string // ISO date string
  gender: PatientGender
  contact_number: string
  address: string
  metriport_id: string | null
  created_at: string
  updated_at: string
}

// Patient Display Type (for UI)
export interface PatientDisplay extends Patient {
  fullName: string
  age: number
}

// Patient Form Values (for forms)
export interface PatientFormValues {
  firstName: string
  lastName: string
  dateOfBirth: string // Format: YYYY-MM-DD
  gender: PatientGender
  contactNumber: string
  address: string
}
