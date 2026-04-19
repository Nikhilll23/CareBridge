const dns = require('node:dns');

dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const originalLookup = dns.lookup;
dns.lookup = function (hostname, options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options = undefined;
    }

    if (hostname.endsWith('.supabase.co')) {
        console.log(`[DNS PATCH] Intercepting lookup for ${hostname} (options: ${JSON.stringify(options)})`);
        dns.resolve4(hostname, (err, addresses) => {
            if (err) {
                console.warn(`[DNS PATCH] resolve4 failed for ${hostname}:`, err.message);
                return originalLookup(hostname, options, callback);
            }
            console.log(`[DNS PATCH] resolve4 success for ${hostname}: ${addresses[0]}`);
            
            // Return in the format expected by lookup
            if (options && options.all) {
                return callback(null, [{ address: addresses[0], family: 4 }]);
            }
            return callback(null, addresses[0], 4);
        });
    } else {
        return originalLookup(hostname, options, callback);
    }
};

const supabaseUrl = 'https://smtstrrcjihlzxzlwuud.supabase.co';
console.log('Testing fetch with DNS patch to:', supabaseUrl);

fetch(supabaseUrl)
    .then(res => {
        console.log('✅ Fetch successful! Status:', res.status);
    })
    .catch(err => {
        console.error('❌ Fetch failed:', err.message);
        console.error('Cause:', err.cause);
    });
