
const url = 'https://smtstrrcjihlzxzlwuud.supabase.co/rest/v1/'
console.log('Fetching:', url)
fetch(url, {
    headers: { 'apikey': 'invalid-but-checks-connection' }
})
.then(r => console.log('Response status:', r.status))
.catch(e => console.error('Fetch failed:', e.message))
