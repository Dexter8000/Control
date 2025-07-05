const duckdb = require('@duckdb/node-api');
const util = require('util');
const path = require('path');

console.log('--- Inspección Profunda de la Conexión de DuckDB ---');

try {
    const dbPath = path.join(__dirname, '../attached_assets/inspect.db');
    const db = new duckdb.DuckDBInstance(dbPath);
    const connection = db.connect();

    console.log('--- Objeto de Conexión ---');
    console.log(util.inspect(connection, { showHidden: false, depth: 2, colors: false }));
    console.log('--------------------------');

    connection.close((err) => {
        if (err) console.error('Error cerrando la conexión', err);
    });
    db.close((err) => {
        if (err) console.error('Error cerrando la base de datos', err);
    });

} catch (e) {
    console.error('❌ La inspección falló:', e);
}
