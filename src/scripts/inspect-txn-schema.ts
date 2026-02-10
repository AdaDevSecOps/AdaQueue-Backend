
const { Connection } = require('tedious');
const { Request: TediousRequest } = require('tedious');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load env
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

const config = {
    server: process.env.DB_HOST,
    authentication: {
        type: 'default',
        options: {
            userName: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD
        }
    },
    options: {
        encrypt: false,
        database: process.env.DB_DATABASE,
        port: parseInt(process.env.DB_PORT),
        trustServerCertificate: true,
        rowCollectionOnRequestCompletion: true
    }
};

const connection = new Connection(config);

connection.on('connect', (err) => {
    if (err) {
        console.error('Connection failed:', err);
        process.exit(1);
    }
    console.log('Connected to Database');
    inspectTables();
});

connection.connect();

function inspectTables() {
    console.log('--- Inspecting TQUTQueueTxn V2 ---');
    const queryTxn = `
        SELECT COUNT(*) as Count FROM TQUTQueueTxn;
        SELECT TOP 5 FTQtxDocNo, FTPrfCode, FTQtxQueueType FROM TQUTQueueTxn;
    `;
    
    // We execute queries sequentially for clarity
    execQuery(queryTxn, () => {
        console.log('\n--- Inspecting TQUMProfile V2 ---');
        const queryProfile = `
            SELECT TOP 5 FTPrfCode, FTPrfName FROM TQUMProfile;
        `;
        execQuery(queryProfile, () => {
            connection.close();
        });
    });
}

function execQuery(sql, callback) {
    const request = new TediousRequest(sql, (err, rowCount) => {
        if (err) {
            console.error('Query failed:', err);
        }
        if (callback) callback();
    });

    request.on('row', (columns) => {
        const row = {};
        columns.forEach((column) => {
            row[column.metadata.colName] = column.value;
        });
        console.log(row);
    });

    connection.execSql(request);
}
