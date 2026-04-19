
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'
import dns from 'node:dns'

dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1'])
console.log('🌐 DNS Overrides applied for test script')

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('Testing connection to:', supabaseUrl)

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
  const { data, error } = await supabase.from('patients').select('count').single()
  if (error) {
    console.error('Connection failed:', error.message)
    console.error('Full error:', error)
  } else {
    console.log('Connection successful! Patient count:', data)
  }
}

test()
