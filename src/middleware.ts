import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/features',
  '/solution',
  '/pricing',
  '/about',
  '/testimonials',
  '/integration',
  '/faqs',
  '/privacy',
  '/terms',
  '/blog',
  '/changelog',
  '/brand',
  '/help',
])

export default clerkMiddleware(async (auth, request) => {
  // 1. Supabase Session Refresh Logic
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: DO NOT REMOVE auth.getUser() - it refreshes the auth token!
  await supabase.auth.getUser()

  // 2. Clerk Protection & Role-Based Redirects
  if (!isPublicRoute(request)) {
    const authState = await auth()
    
    // Protect the route
    if (!authState.userId) {
      await auth.protect()
    }

    // 2. Role-Based Redistribution & Policing
    const url = new URL(request.url)
    if (url.pathname.startsWith('/dashboard')) {
      const authState = await auth()
      let userEmail = authState.sessionClaims?.email as string || ''
      
      // If email is not in session claims, we MUST fetch it from the backend to ensure correct routing
      if (!userEmail && authState.userId) {
        try {
          // Internal fetch to avoid blocking if possible, but for /dashboard landing we need it
          const response = await fetch(`https://api.clerk.com/v1/users/${authState.userId}`, {
            headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` }
          })
          const userData = await response.json()
          userEmail = userData.email_addresses?.find((e: any) => e.id === userData.primary_email_address_id)?.email_address || ''
        } catch (e) {
          console.error('Middleware: Failed to fetch user email', e)
        }
      }

      const lowerEmail = userEmail.toLowerCase()

      // Whitelists (Synchronized with auth.ts)
      const ADMIN_EMAILS = ['omarhashmi494@gmail.com', '210rajdeep@gmail.com', 'kaustubh.neoge@somaiya.edu', 'ayush.s1@somaiya.edu', 'nikhilchandorkar594@gmail.com']
      const DOCTOR_EMAILS = ['vu1f2223065@pvppcoe.ac.in', 'vu1f2223139@pvppcoe.ac.in', 'vu1f2223123@pvppcoe.ac.in', 'vu1f2223167@pvppcoe.ac.in', 'linmaysvkr@gmail.com', 'vu1f2223067@pvppcoe.ac.in']

      let role: 'ADMIN' | 'DOCTOR' | 'NURSE' | 'RECEPTIONIST' | 'PATIENT' = 'PATIENT'
      if (ADMIN_EMAILS.includes(lowerEmail)) role = 'ADMIN'
      else if (DOCTOR_EMAILS.includes(lowerEmail)) role = 'DOCTOR'
      else if (lowerEmail.startsWith('nurse.') || lowerEmail.includes('nurse')) role = 'NURSE'
      else if (lowerEmail.includes('recep')) role = 'RECEPTIONIST'

      const rolePaths: Record<string, string> = {
        ADMIN: '/dashboard/admin',
        DOCTOR: '/dashboard/doctor',
        NURSE: '/dashboard/nurse',
        RECEPTIONIST: '/dashboard/receptionist',
        PATIENT: '/dashboard/patient'
      }

      const targetPath = rolePaths[role]
      const currentPath = url.pathname

      // POLICING: Enforce the correct dashboard prefix
      const isIncorrectDashboard = Object.values(rolePaths).some(p => currentPath.startsWith(p) && p !== targetPath)
      
      if (currentPath === '/dashboard' || isIncorrectDashboard) {
        return NextResponse.redirect(new URL(targetPath, request.url))
      }
    }
  }

  return supabaseResponse
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files INCLUDING VIDEOS, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|mp4|webm|ogg|avi|mov)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}