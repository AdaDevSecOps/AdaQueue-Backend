
async function testPreview() {
    const qs = new URLSearchParams({
        agnCode: 'AGN',
        profileCode: 'PF-REST-001',
        displayCode: 'K-01',
        name: 'Q-NEW-1'
    }).toString();
    
    // Change port to 3000 and prefix 'api' is set in main.ts?
    // main.ts says: app.setGlobalPrefix(prefix); prefix default 'api'
    // So path is /api/api/queue-sequence/preview IF controller has 'api/...' AND global prefix is 'api'.
    // Controller: @Controller('api/queue-sequence')
    // Global Prefix: 'api'
    // Result: /api/api/queue-sequence/preview ??
    // Or did I misread main.ts?
    // configService.get('API_PREFIX') || 'api'
    
    // Let's try standard conventions. usually global prefix 'api' + controller 'queue-sequence' = /api/queue-sequence
    // BUT controller has 'api/queue-sequence'.
    // So it might be /api/api/queue-sequence.
    
    // Let's try both 3000 and 3333.
    // And paths.
    
    const ports = [3000, 3333, 4000];
    const paths = [
        '/api/queue-sequence/preview',
        '/api/api/queue-sequence/preview',
        '/queue-sequence/preview'
    ];
    
    for (const port of ports) {
        for (const p of paths) {
             const url = `http://localhost:${port}${p}?${qs}`;
             console.log("Trying:", url);
             try {
                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    console.log("SUCCESS at", url);
                    console.log("Result:", data);
                    return;
                } else {
                     // console.log("Failed", res.status);
                }
             } catch (e) {
                 // console.log("Conn Refused");
             }
        }
    }
    console.log("All attempts failed");
}

testPreview();
