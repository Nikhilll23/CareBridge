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
    let role = 'PATIENT' // Default — any unknown email is a patient
    const lowerEmail = email.toLowerCase()

    // Whitelist of Admin Emails
    const ADMIN_EMAILS = [
      'omarhashmi494@gmail.com',
      '210rajdeep@gmail.com',
      'kaustubh.neoge@somaiya.edu',
      'ayush.s1@somaiya.edu',
      'nikhilchandorkar594@gmail.com',
    ]

    // Whitelist of Doctor Emails
    const DOCTOR_EMAILS = [
      'vu1f2223065@pvppcoe.ac.in',
      'vu1f2223139@pvppcoe.ac.in',
      'vu1f2223123@pvppcoe.ac.in',
      'vu1f2223167@pvppcoe.ac.in',
    ]

    if (ADMIN_EMAILS.includes(email)) {
      role = 'ADMIN'
    } else if (DOCTOR_EMAILS.includes(email)) {
      role = 'DOCTOR'
    } else if (lowerEmail.startsWith('nurse.') || lowerEmail.includes('nurse')) {
      role = 'NURSE'
    }

    // Check if user exists in Supabase
    const { data: existingUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = not found, which is expected for new users
      console.error('Error fetching user from Supabase:', fetchError.message, '| code:', fetchError.code)
      // Don't throw - try to create the user anyway
    }

    // If user exists, check if we need to update role (Enforce Admin/Doctor rules)
    if (existingUser) {
      let shouldUpdate = false
      if (ADMIN_EMAILS.includes(email) && existingUser.role !== 'ADMIN') {
        shouldUpdate = true
        existingUser.role = 'ADMIN'
      } else if (DOCTOR_EMAILS.includes(email) && existingUser.role !== 'DOCTOR') {
        shouldUpdate = true
        existingUser.role = 'DOCTOR'
      } else if (!ADMIN_EMAILS.includes(email) && existingUser.role === 'ADMIN') {
        shouldUpdate = true
        existingUser.role = 'DOCTOR'
      }

      if (shouldUpdate) {
        await supabaseAdmin
          .from('users')
          .update({ role: existingUser.role })
          .eq('id', userId)
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

    // User doesn't exist by ID, upsert to handle duplicate email case
    const { data: newUser, error: insertError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: userId,
        email: email,
        first_name: firstName,
        last_name: lastName,
        role: role,
      }, { onConflict: 'email', ignoreDuplicates: false })
      .select()
      .single()

    if (insertError) {
      // Last resort: fetch by email
      const { data: existingByEmail } = await supabaseAdmin
        .from('users').select('*').eq('email', email).single()

      if (existingByEmail) {
        // Update the ID to match current Clerk user
        await supabaseAdmin.from('users').update({ id: userId, role: role }).eq('email', email)
        return {
          id: userId, email: existingByEmail.email,
          firstName: existingByEmail.first_name || '', lastName: existingByEmail.last_name || '',
          fullName: `${existingByEmail.first_name || ''} ${existingByEmail.last_name || ''}`.trim(),
          role: role as any, createdAt: new Date(existingByEmail.created_at),
        }
      }
      // Fallback — return profile from Clerk data so user isn't stuck
      return {
        id: userId, email: email,
        firstName: firstName, lastName: lastName,
        fullName: `${firstName} ${lastName}`.trim(),
        role: role as any, createdAt: new Date(),
      }
    }

    // If new user is a PATIENT, auto-create their patient record
    if (newUser.role === 'PATIENT') {
      const { data: existingPatient } = await supabaseAdmin
        .from('patients')
        .select('id')
        .eq('email', email)
        .single()

      if (!existingPatient) {
        await supabaseAdmin.from('patients').insert({
          first_name: firstName || email.split('@')[0],
          last_name: lastName || '',
          email: email,
          contact_number: '',
          address: '',
          date_of_birth: null,
          gender: 'Other',
        })
      }
    }

    // Audit Login (non-blocking)
    logAuditAction('USER_LOGIN', 'AUTH', newUser.id, { email: newUser.email, role: newUser.role, isNewUser: true })

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
