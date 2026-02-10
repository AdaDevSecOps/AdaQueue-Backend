
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

        console.log('--- Step 1: Ensure Data Integrity (Copy ServiceGroup to QueueType if missing) ---');
        
        // Update FTQtxQueueType from FTQtxServiceGroup where QueueType is missing
        const updateResult = await sql.query`
            UPDATE TQUTQueueTxn 
            SET FTQtxQueueType = FTQtxServiceGroup 
            WHERE FTQtxQueueType IS NULL AND FTQtxServiceGroup IS NOT NULL
        `;
        console.log(`  - Updated ${updateResult.rowsAffected[0]} records (Filled missing QueueType from ServiceGroup).`);

        console.log('--- Step 2: Drop FTQtxServiceGroup Column ---');
        
        const checkCol = await sql.query`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'TQUTQueueTxn' AND COLUMN_NAME = 'FTQtxServiceGroup'
        `;

        if (checkCol.recordset.length > 0) {
            await sql.query`ALTER TABLE TQUTQueueTxn DROP COLUMN FTQtxServiceGroup`;
            console.log('  - Dropped FTQtxServiceGroup column.');
        } else {
            console.log('  - FTQtxServiceGroup column does not exist.');
        }

        console.log('Cleanup Complete.');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await sql.close();
    }
}

run();
