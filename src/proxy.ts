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
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  // 2. Clerk Protection Logic
  if (!isPublicRoute(request)) {
    await auth.protect()
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