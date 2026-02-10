
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

        console.log('--- Inspect TQUMProfile Columns ---');
        const result = await sql.query`
            SELECT COLUMN_NAME, IS_NULLABLE, DATA_TYPE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'TQUMProfile'
        `;
        console.table(result.recordset);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await sql.close();
    }
}

run();
