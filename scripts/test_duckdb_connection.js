const duckdb = require('@duckdb/node-api');
const path = require('path');

console.log('--- DuckDB Module ---');
console.log(duckdb);
console.log('---------------------');

try {
    const dbPath = path.join(__dirname, '../attached_assets/test.db');
    console.log(`Attempting to create new duckdb.Database with path: ${dbPath}`);
    const db = new duckdb.Database(dbPath);
    console.log('✅ duckdb.Database created successfully.');
    
    const connection = db.connect();
    console.log('✅ db.connect() successful.');

    connection.close((err) => {
        if (err) {
            return console.error('Error closing connection', err);
        }
        console.log('Connection closed.');
    });
    db.close((err) => {
        if (err) {
            return console.error('Error closing database', err);
        }
        console.log('Database closed.');
    });

} catch (e) {
    console.error('❌ Test failed:', e);
}
