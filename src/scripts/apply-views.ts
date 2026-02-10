
import * as sql from 'mssql';
import * as fs from 'fs';
import * as path from 'path';

const config = {
    user: 'sa',
    password: 'GvFhk@61',
    server: '27.254.239.245',
    port: 33433,
    database: 'AdaKDS',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function run() {
    try {
        await sql.connect(config);
        console.log('Connected to DB');

        const sqlFilePath = path.join('c:\\example\\IDE\\10.Project\\2026\\03.AdaQueue\\database\\performance_views.sql');
        const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

        console.log('--- Applying Updated Views ---');
        
        // Split by GO is naive, but MSSQL driver usually needs explicit execution per block or handles batch if using sql-cli. 
        // mssql library doesn't support GO separator directly in one query call.
        // We will split by GO manually.
        const batches = sqlContent.split(/^GO\s*$/m);

        for (const batch of batches) {
            const cleanBatch = batch.trim();
            if (cleanBatch.length > 0) {
                try {
                    await sql.query(cleanBatch);
                    console.log('  - Batch Executed Successfully');
                } catch (e: any) {
                    console.error('  - Batch Execution Failed:', e.message);
                    console.error('    Batch Start:', cleanBatch.substring(0, 100));
                    // It might fail if dependent views exist. In that case, we might need to drop them first (the script does that).
                }
            }
        }

        console.log('View Update Complete.');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await sql.close();
    }
}

run();
