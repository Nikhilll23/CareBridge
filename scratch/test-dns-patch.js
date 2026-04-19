const dns = require('node:dns')

const originalLookup = dns.lookup
dns.lookup = function (hostname, options, callback) {
    if (typeof options === 'function') {
        callback = options
        options = undefined
    }

    if (hostname.endsWith('.supabase.co')) {
        console.log(`[TEST] Patching ${hostname}`)
        // Simulate a successful resolve but empty addresses (unlikely but let's test)
        // Or a failed resolve
        dns.resolve4(hostname, (err, addresses) => {
            if (err) {
                console.log(`[TEST] Resolve failed for ${hostname}: ${err.message}`)
                return originalLookup.call(dns, hostname, options, callback)
            }
            if (!addresses || addresses.length === 0) {
                console.log(`[TEST] No addresses found for ${hostname}`)
                // THIS IS THE POTENTIAL BUG: returning null/undefined as address
                return callback(null, undefined, 4)
            }
            return callback(null, addresses[0], 4)
        })
    } else {
        return originalLookup.call(dns, hostname, options, callback)
    }
}

console.log('Testing fetch with patched DNS...')
fetch('https://smtstrrcjihlzxzlwuud.supabase.co')
    .then(r => console.log('Response:', r.status))
    .catch(e => console.error('Fetch failed:', e))
