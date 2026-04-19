const dns = require('node:dns');

// THIS REPLICATES src/lib/supabase.ts
if (typeof window === 'undefined') {
  try {
    dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1'])
    const originalLookup = dns.lookup
    dns.lookup = function (hostname, options, callback) {
      if (typeof options === 'function') {
        callback = options
        options = undefined
      }

      if (hostname.endsWith('.supabase.co')) {
        console.log(`[PATCH TEST] Intercepting ${hostname}`);
        dns.resolve4(hostname, (err, addresses) => {
          if (err) {
            return originalLookup(hostname, options, callback)
          }
          if (options && options.all) {
            return callback(null, [{ address: addresses[0], family: 4 }])
          }
          return callback(null, addresses[0], 4)
        })
      } else {
        return originalLookup(hostname, options, callback)
      }
    }
    console.log('🌐 Patch applied in verification script')
  } catch (e) {
    console.error('❌ Fail:', e)
  }
}

const supabaseUrl = 'https://smtstrrcjihlzxzlwuud.supabase.co';

fetch(supabaseUrl)
    .then(res => console.log('✅ SUCCESS! Status:', res.status))
    .catch(err => console.error('❌ STILL FAILING:', err.message, err.cause));
