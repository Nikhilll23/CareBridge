import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

/**
 * Safe wrapper around Clerk's currentUser()
 * Handles ClerkAPIResponseError gracefully instead of crashing the page
 */
export async function safeCurrentUser() {
    try {
        return await currentUser()
    } catch (err: any) {
        console.warn('Clerk currentUser() failed:', err?.message || err)
        return null
    }
}

/**
 * Get current user or redirect to sign-in
 */
export async function requireUser() {
    const user = await safeCurrentUser()
    if (!user) redirect('/sign-in')
    return user
}
