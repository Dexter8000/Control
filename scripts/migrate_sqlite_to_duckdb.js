const { initializeDuckDB } = require('../database/duckdb');
const path = require('path');

const sqliteDbPath = path.join(__dirname, '../attached_assets/kilo.db');

// Helper to run async SQL commands that don't return rows
function runAsync(connection, sql) {
    return new Promise((resolve, reject) => {
        connection.run(sql, (err) => {
            if (err) return reject(err);
            resolve();
        });
    });
}

// Helper to run async SQL commands that return rows
function allAsync(connection, sql) {
    return new Promise((resolve, reject) => {
        connection.all(sql, (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}

const tablesToMigrate = [
    'usuarios',
    'departamentos',
    'empleados',
    'inventario_principal',
    'inventario_periferico',
    'sesiones',
    'configuracion',
    'logs_acceso',
    'historial_asignaciones',
    'historial_vacaciones'
];

async function migrate() {
    console.log('🦆 Iniciando migración de SQLite a DuckDB...');
    let db, connection;

    try {
        const dbObjects = await initializeDuckDB();
        db = dbObjects.db;
        connection = dbObjects.connection;
        console.log('✅ Conexión con DuckDB establecida.');

        await runAsync(connection, 'INSTALL sqlite; LOAD sqlite;');
        console.log('✅ Extensión de SQLite cargada.');

        // Sanitize path for Windows
        const sanitizedSqlitePath = sqliteDbPath.replace(/\\/g, '/');
        await runAsync(connection, `ATTACH '${sanitizedSqlitePath}' AS sqlite_db (TYPE SQLITE);`);
        console.log('✅ Base de datos SQLite adjuntada.');

        for (const tableName of tablesToMigrate) {
            console.log(`  -> Migrando tabla: ${tableName}...`);
            
            const insertQuery = `INSERT OR REPLACE INTO ${tableName} SELECT * FROM sqlite_db.${tableName};`;

            try {
                await runAsync(connection, `DELETE FROM ${tableName};`);
                await runAsync(connection, insertQuery);
                const newCountResult = await allAsync(connection, `SELECT COUNT(*) as count FROM ${tableName}`);
                console.log(`  ✅ Tabla '${tableName}' migrada. Se insertaron ${newCountResult[0].count} filas.`);
            } catch (e) {
                console.warn(`  ⚠️  No se pudo migrar la tabla '${tableName}': ${e.message}. Omitiendo.`);
            }
        }

        console.log('🎉 ¡Migración completada exitosamente!');

    } catch (err) {
        console.error('❌ Error durante la migración:', err);
    } finally {
        if (connection) {
            connection.close((err) => {
                if (err) console.error('Error cerrando la conexión de DuckDB', err);
            });
        }
        if (db) {
            db.close((err) => {
                if (err) console.error('Error cerrando la instancia de DuckDB', err);
            });
        }
        console.log('🔌 Conexiones a DuckDB cerradas.');
    }
}

migrate();

