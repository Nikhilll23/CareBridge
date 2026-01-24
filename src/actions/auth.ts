'use server'

import { currentUser } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import type { UserProfile } from '@/types'
import { logAuditAction } from '@/actions/audit'

import { cache } from 'react';

/**
 * Sync Clerk user to Supabase database
 * This ensures every authenticated user has a profile in our database
 * Cached per request to prevent multiple DB calls
 */
export const syncUser = cache(async (): Promise<UserProfile | null> => {
  try {
    // Get current Clerk user
    const clerkUser = await currentUser()

    if (!clerkUser) {
      // console.error('No authenticated user found') 
      // Reduced log spam
      return null
    }

    const userId = clerkUser.id
    const email = clerkUser.emailAddresses[0]?.emailAddress
    const firstName = clerkUser.firstName || ''
    const lastName = clerkUser.lastName || ''

    if (!email) {
      console.error('User has no email address')
      return null
    }

    // console.log('Syncing user:', { userId, email, firstName, lastName })

    // Determine role based on email rules
    let role = 'PATIENT' // Default
    const lowerEmail = email.toLowerCase()

    // Whitelist of Admin Emails
    // Whitelist of Admin Emails
    const ADMIN_EMAILS = [
      'omarhashmi494@gmail.com',
      '210rajdeep@gmail.com',
      'kaustubh.neoge@somaiya.edu',
      'ayush.s1@somaiya.edu'
    ]

    if (ADMIN_EMAILS.includes(email)) {
      role = 'ADMIN'
    } else if (lowerEmail.startsWith('dr.') && lowerEmail.endsWith('@gmail.com')) {
      role = 'DOCTOR'
    }

    // Check if user exists in Supabase
    const { data: existingUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = not found, which is expected for new users
      console.error('Error fetching user from Supabase:', {
        message: fetchError.message,
        code: fetchError.code,
        details: fetchError.details,
        hint: fetchError.hint
      })
      throw fetchError
    }

    // If user exists, check if we need to update role (Enforce Admin/Doctor rules)
    if (existingUser) {
      // Enforce role updates if email matches critical rules
      let shouldUpdate = false
      // Admin Rule
      // Admin Rule
      if (ADMIN_EMAILS.includes(email) && existingUser.role !== 'ADMIN') {
        shouldUpdate = true
        existingUser.role = 'ADMIN'
      } else if (existingUser.role === 'ADMIN' && !ADMIN_EMAILS.includes(email)) {
        // Demote unauthorized admins
        shouldUpdate = true
        existingUser.role = 'PATIENT'
      }
      // Doctor Rule
      else if (lowerEmail.startsWith('dr.') && lowerEmail.endsWith('@gmail.com') && existingUser.role !== 'DOCTOR') {
        shouldUpdate = true
        existingUser.role = 'DOCTOR'
      }

      if (shouldUpdate) {
        await supabaseAdmin
          .from('users')
          .update({ role: existingUser.role })
          .eq('id', userId)
      }

      // Ensure Patient Record Exists for PATIENT role
      // OPTIMIZATION: Check for patient existence in parallel or skip if we have a robust flow elsewhere
      // For now, keeping it but maybe run it asynchronously/detached if possible? 
      // Server Actions must await, so we keep it but only run if strictly necessary.
      if (existingUser.role === 'PATIENT') {
        // Optimization: Maybe only check if we suspect missing? 
        // Or just keep it as is, but the cache() wrapper prevents this whole block from running 5 times a page load.
        const { data: patientCheck } = await supabaseAdmin.from('patients').select('id').eq('email', email).single()
        if (!patientCheck) {
          const { error: createPatientError } = await supabaseAdmin.from('patients').insert({
            first_name: existingUser.first_name || firstName,
            last_name: existingUser.last_name || lastName,
            email: email,
            gender: 'Other',
            contact_number: 'N/A', // Placeholder
            address: 'N/A',
            date_of_birth: new Date().toISOString() // Placeholder
          })
          if (createPatientError) {
            console.error('Failed to auto-create patient record:', createPatientError)
          } else {
            // Audit the auto-creation
            // Non-blocking log? no need to await strictly if we want speed, but Vercel might kill it. 
            // Best to await.
            await logAuditAction('REGISTER_PATIENT', 'PATIENT', 'SYSTEM', { email, action: 'AUTO_CREATED_ON_LOGIN' })
          }
        }
      }

      return {
        id: existingUser.id,
        email: existingUser.email,
        firstName: existingUser.first_name || '',
        lastName: existingUser.last_name || '',
        fullName: `${existingUser.first_name || ''} ${existingUser.last_name || ''}`.trim(),
        role: existingUser.role,
        createdAt: new Date(existingUser.created_at),
      }
    }

    // User doesn't exist, create new profile
    const { data: newUser, error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        id: userId,  // Clerk ID is used directly as the primary key
        email: email,
        first_name: firstName,
        last_name: lastName,
        role: role,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating user in Supabase:', {
        message: insertError.message,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint
      })

      // If it's a duplicate key error, the user already exists
      if (insertError.code === '23505') {
        // Try fetching the existing user by id or email
        const { data: existingById } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('id', userId)
          .single()

        if (existingById) {
          return {
            id: existingById.id,
            email: existingById.email,
            firstName: existingById.first_name || '',
            lastName: existingById.last_name || '',
            fullName: `${existingById.first_name || ''} ${existingById.last_name || ''}`.trim(),
            role: existingById.role,
            createdAt: new Date(existingById.created_at),
          }
        }

        // Try by email if id lookup failed
        const { data: existingByEmail } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('email', email)
          .single()

        if (existingByEmail) {
          return {
            id: existingByEmail.id,
            email: existingByEmail.email,
            firstName: existingByEmail.first_name || '',
            lastName: existingByEmail.last_name || '',
            fullName: `${existingByEmail.first_name || ''} ${existingByEmail.last_name || ''}`.trim(),
            role: existingByEmail.role,
            createdAt: new Date(existingByEmail.created_at),
          }
        }
      }

      throw insertError
    }

    // Auto-create Patient Record for new PATIENT users
    if (role === 'PATIENT') {
      const { error: createPatientError } = await supabaseAdmin.from('patients').insert({
        first_name: firstName,
        last_name: lastName,
        email: email,
        gender: 'Other',
        contact_number: 'N/A',
        address: 'N/A',
        date_of_birth: new Date().toISOString()
      })
      if (createPatientError) {
        console.error('Failed to auto-create patient record:', createPatientError)
      } else {
        await logAuditAction('REGISTER_PATIENT', 'PATIENT', 'SYSTEM', { email, action: 'AUTO_CREATED_ON_SIGNUP' })
      }
    }

    // Audit Login
    await logAuditAction('USER_LOGIN', 'AUTH', newUser.id, { email: newUser.email, role: newUser.role, isNewUser: true })

    return {
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.first_name || '',
      lastName: newUser.last_name || '',
      fullName: `${newUser.first_name || ''} ${newUser.last_name || ''}`.trim(),
      role: newUser.role,
      createdAt: new Date(newUser.created_at),
    }
  } catch (error) {
    console.error('Sync user error:', error instanceof Error ? error.message : 'Unknown error')
    return null
  }
})

/**
 * Get user profile from Supabase
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching user profile:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
      return null
    }

    return {
      id: data.id,
      email: data.email,
      firstName: data.first_name || '',
      lastName: data.last_name || '',
      fullName: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
      role: data.role,
      createdAt: new Date(data.created_at),
    }
  } catch (error) {
    console.error('Get user profile error:', error instanceof Error ? error.message : 'Unknown error')
    return null
  }
}
