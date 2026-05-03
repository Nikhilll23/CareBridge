const dns = require('node:dns')

// SIMULATE THE PATCH RECENTLY APPLIED in src/lib/supabase.ts
const originalLookup = dns.lookup
dns.lookup = function (hostname, options, callback) {
    if (typeof options === 'function') {
        callback = options
        options = undefined
    }

    if (hostname.endsWith('.supabase.co')) {
        console.log(`[VERIFY] Patching ${hostname}`)
        // dns.resolve4 shim
        const resolve4 = (host, cb) => {
            console.log(`[VERIFY] Resolving ${host}...`)
            // Return empty array to simulate failure/missing record
            setTimeout(() => cb(null, []), 10)
        }

        resolve4(hostname, (err, addresses) => {
            if (err || !addresses || addresses.length === 0 || !addresses[0]) {
                console.log(`[VERIFY] Resolve failed/empty for ${hostname}, falling back to originalLookup`)
                return originalLookup.call(dns, hostname, options, callback)
            }
            return callback(null, addresses[0], 4)
        })
    } else {
        return originalLookup.call(dns, hostname, options, callback)
    }
}

console.log('Testing fetch with STABILIZED DNS patch...')
fetch('https://smtstrrcjihlzxzlwuud.supabase.co')
    .then(r => console.log('✅ SUCCESS! Status:', r.status))
    .catch(e => {
        console.error('❌ STILL FAILING (This is bad):', e.message)
        process.exit(1)
    })
