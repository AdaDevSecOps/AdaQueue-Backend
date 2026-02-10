
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

        // 1. Get a valid Profile ID
        const profile = await sql.query`SELECT TOP 1 FTPrfCode FROM TQUMProfile`;
        if (profile.recordset.length === 0) {
            console.error('No Profile found!');
            return;
        }
        const profileId = profile.recordset[0].FTPrfCode;
        console.log(`Using Profile: ${profileId}`);

        // 2. Insert a Mock Transaction directly (Simulating QueueService)
        const docNo = `TEST-${Date.now()}`;
        const queueNo = 999;
        const now = new Date();
        
        // Note: TQUTQueueTxn now has FTPrfCode, and NO FTQcfCode
        await sql.query`
            INSERT INTO TQUTQueueTxn (FTQtxDocNo, FDQtxDate, FTPrfCode, FNQtxQueueNo, FTQtxStatus, FDQtxCheckIn, FTQtxDataJson)
            VALUES (${docNo}, ${now}, ${profileId}, ${queueNo}, 'WAITING', ${now}, '{}')
        `;
        console.log(`Inserted Test Txn: ${docNo}`);

        // 3. Query the View TQUTPerfBase
        // It should return the record, and verify FTPrfCode (aliased or not)
        const result = await sql.query`
            SELECT FTQtxDocNo, FTPrfCode, FNWaitSec 
            FROM TQUTPerfBase 
            WHERE FTQtxDocNo = ${docNo}
        `;
        
        console.table(result.recordset);

        if (result.recordset.length > 0) {
            console.log('Verification Success: View returned data correctly joined with Profile.');
        } else {
            console.error('Verification Failed: View returned no data.');
        }

        // Clean up
        await sql.query`DELETE FROM TQUTQueueTxn WHERE FTQtxDocNo = ${docNo}`;
        console.log('Test data cleaned up.');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await sql.close();
    }
}

run();
