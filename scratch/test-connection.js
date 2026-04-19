const dns = require('node:dns');

// Apply DNS overrides same as in the app
try {
    dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
    console.log('🌐 DNS Overrides applied');
} catch (e) {
    console.warn('⚠️ Could not set DNS servers:', e.message);
}

const supabaseUrl = 'https://smtstrrcjihlzxzlwuud.supabase.co';

console.log('Testing fetch to:', supabaseUrl);

fetch(supabaseUrl)
    .then(res => {
        console.log('✅ Fetch successful! Status:', res.status);
        return res.text();
    })
    .catch(err => {
        console.error('❌ Fetch failed:', err.message);
        console.error('Full error:', err);
    });
