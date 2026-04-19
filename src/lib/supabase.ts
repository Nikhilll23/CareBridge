import { createClient } from '@supabase/supabase-js'
// import dns from 'node:dns' // Removed to fix browser build errors

// DNS Workaround for ISPs that block/fail on Supabase domains
if (typeof window === 'undefined') {
  try {
    // Dynamic require hidden from the bundler to allow client-side compilation
    const dns = eval('require')('node:dns')
    dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1'])
    
    // Monkey-patch dns.lookup to use dns.resolve4 for Supabase domains.
    // This is required because modern fetch (undici) ignores setServers and uses the system resolver.
    const originalLookup = dns.lookup
    // @ts-ignore - patching internal dns lookup
    dns.lookup = function (hostname: string, options: any, callback: any) {
      if (typeof options === 'function') {
        callback = options
        options = undefined
      }

      if (hostname.endsWith('.supabase.co')) {
        dns.resolve4(hostname, (err, addresses) => {
          if (err) {
            return originalLookup.call(dns, hostname, options, callback)
          }
          if (options && options.all) {
            return callback(null, [{ address: addresses[0], family: 4 }])
          }
          return callback(null, addresses[0], 4)
        })
      } else {
        return originalLookup.call(dns, hostname, options, callback)
      }
    }
    
    console.log('🌐 DNS Overrides & Lookup Patch applied (Google/Cloudflare)')
  } catch (e) {
    console.warn('⚠️ Could not set custom DNS servers/patch:', e)
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Warn if service key is missing
if (!supabaseServiceKey) {
  console.warn('❌ SUPABASE_SERVICE_ROLE_KEY is missing. Admin operations will fail due to RLS policies.')
} else {
  // console.log('✅ SUPABASE_SERVICE_ROLE_KEY detected')
}

// Client for browser/client-side operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

// Admin client for server-side operations (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

// Browser-safe client creation function
export function createSupabaseBrowserClient() {
  if (typeof window === 'undefined') {
    return supabase
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    }
  )
}

// Type-safe database types will be defined here as we create tables
export type Database = {
  public: {
    Tables: {
      // Tables will be defined here
    }
    Views: {
      // Views will be defined here
    }
    Functions: {
      // Functions will be defined here
    }
  }
}
