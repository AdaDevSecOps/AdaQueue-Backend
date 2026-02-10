
import * as sql from 'mssql';

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

        console.log('--- Step 1: Add FTPrfCode to TQUTQueueTxn ---');
        // Check if column exists
        const colCheck = await sql.query`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'TQUTQueueTxn' AND COLUMN_NAME = 'FTPrfCode'
        `;
        
        if (colCheck.recordset.length === 0) {
            await sql.query`ALTER TABLE TQUTQueueTxn ADD FTPrfCode VARCHAR(50) NULL`;
            console.log('  - Added FTPrfCode column.');
        } else {
            console.log('  - FTPrfCode column already exists.');
        }

        console.log('--- Step 2: Migrate Data (Extract profileId from JSON) ---');
        const txns = await sql.query`SELECT FTQtxDocNo, FTQtxDataJson FROM TQUTQueueTxn WHERE FTPrfCode IS NULL AND FTQtxDataJson IS NOT NULL`;
        
        let updatedCount = 0;
        for (const txn of txns.recordset) {
            try {
                const data = JSON.parse(txn.FTQtxDataJson);
                if (data.profileId) {
                    const request = new sql.Request();
                    request.input('profileId', sql.VarChar(50), data.profileId);
                    request.input('docNo', sql.NVarChar(50), txn.FTQtxDocNo);
                    await request.query('UPDATE TQUTQueueTxn SET FTPrfCode = @profileId WHERE FTQtxDocNo = @docNo');
                    updatedCount++;
                }
            } catch (e) {
                console.warn(`  - Failed to parse JSON for DocNo: ${txn.FTQtxDocNo}`);
            }
        }
        console.log(`  - Updated ${updatedCount} records.`);

        console.log('--- Step 3: Drop FTQcfCode from TQUTQueueTxn ---');
        // Only drop if exists
        const qcfCheck = await sql.query`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'TQUTQueueTxn' AND COLUMN_NAME = 'FTQcfCode'
        `;
        if (qcfCheck.recordset.length > 0) {
            // Check constraints/indexes first (optional but good practice)
            await sql.query`ALTER TABLE TQUTQueueTxn DROP COLUMN FTQcfCode`;
            console.log('  - Dropped FTQcfCode from TQUTQueueTxn.');
        } else {
            console.log('  - FTQcfCode already dropped.');
        }

        console.log('--- Step 4: Drop FTQcfCode from TQUMProfile ---');
        const prfQcfCheck = await sql.query`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'TQUMProfile' AND COLUMN_NAME = 'FTQcfCode'
        `;
        if (prfQcfCheck.recordset.length > 0) {
            await sql.query`ALTER TABLE TQUMProfile DROP COLUMN FTQcfCode`;
            console.log('  - Dropped FTQcfCode from TQUMProfile.');
        } else {
            console.log('  - FTQcfCode already dropped from TQUMProfile.');
        }

        console.log('Migration Complete.');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await sql.close();
    }
}

run();
