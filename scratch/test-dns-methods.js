const dns = require('node:dns');

try {
    dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
    console.log('🌐 DNS Overrides applied');
} catch (e) {
    console.warn('⚠️ Could not set DNS servers:', e.message);
}

const hostname = 'smtstrrcjihlzxzlwuud.supabase.co';

console.log('Testing dns.resolve4 for:', hostname);
dns.resolve4(hostname, (err, addresses) => {
    if (err) {
        console.error('❌ dns.resolve4 failed:', err.message);
    } else {
        console.log('✅ dns.resolve4 successful! Addresses:', addresses);
    }
});

console.log('Testing dns.lookup for:', hostname);
dns.lookup(hostname, (err, address, family) => {
    if (err) {
        console.error('❌ dns.lookup failed:', err.message);
    } else {
        console.log('✅ dns.lookup successful! Address:', address);
    }
});
