
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

        console.log('--- Step 1: Add FTQtxServiceGroup and FTQtxQueueType to TQUTQueueTxn ---');
        
        // Add Service Group
        const sgCheck = await sql.query`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'TQUTQueueTxn' AND COLUMN_NAME = 'FTQtxServiceGroup'
        `;
        if (sgCheck.recordset.length === 0) {
            await sql.query`ALTER TABLE TQUTQueueTxn ADD FTQtxServiceGroup VARCHAR(50) NULL`;
            console.log('  - Added FTQtxServiceGroup column.');
        } else {
            console.log('  - FTQtxServiceGroup already exists.');
        }

        // Add Queue Type
        const qtCheck = await sql.query`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'TQUTQueueTxn' AND COLUMN_NAME = 'FTQtxQueueType'
        `;
        if (qtCheck.recordset.length === 0) {
            await sql.query`ALTER TABLE TQUTQueueTxn ADD FTQtxQueueType VARCHAR(50) NULL`;
            console.log('  - Added FTQtxQueueType column.');
        } else {
            console.log('  - FTQtxQueueType already exists.');
        }

        console.log('--- Step 2: Migrate Data from JSON ---');
        // Fetch rows where new cols are null but JSON exists
        const txns = await sql.query`
            SELECT FTQtxDocNo, FTQtxDataJson 
            FROM TQUTQueueTxn 
            WHERE FTQtxDataJson IS NOT NULL 
            AND (FTQtxServiceGroup IS NULL OR FTQtxQueueType IS NULL)
        `;
        
        let updatedCount = 0;
        for (const txn of txns.recordset) {
            try {
                const data = JSON.parse(txn.FTQtxDataJson);
                const serviceGroup = data.serviceGroup || null;
                const queueType = data.queueType || data.category || null; // Fallback to category if queueType missing

                if (serviceGroup || queueType) {
                    const request = new sql.Request();
                    request.input('sg', sql.VarChar(50), serviceGroup);
                    request.input('qt', sql.VarChar(50), queueType);
                    request.input('docNo', sql.NVarChar(50), txn.FTQtxDocNo);
                    
                    await request.query(`
                        UPDATE TQUTQueueTxn 
                        SET FTQtxServiceGroup = @sg, FTQtxQueueType = @qt 
                        WHERE FTQtxDocNo = @docNo
                    `);
                    updatedCount++;
                }
            } catch (e) {
                console.warn(`  - Failed to parse JSON for DocNo: ${txn.FTQtxDocNo}`);
            }
        }
        console.log(`  - Updated ${updatedCount} records.`);
        console.log('Migration Complete.');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await sql.close();
    }
}

run();
