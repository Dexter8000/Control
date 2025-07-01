const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const dbPath = process.env.DB_PATH || path.join(__dirname, '../attached_assets/kilo.db');
const logPath = path.join(__dirname, 'verify-db.log');

// Limpiar el log anterior
if (fs.existsSync(logPath)) {
  fs.unlinkSync(logPath);
}

function writeLog(message) {
  fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${message}\n`, 'utf-8');
}

writeLog('--- INICIO DE LA VERIFICACIÓN ---');
writeLog(`[INFO] Verificando el contenido de: ${dbPath}`);

if (!fs.existsSync(dbPath)) {
  writeLog('[FATAL] El archivo de base de datos no existe.');
  process.exit(1);
}

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    writeLog(`[FATAL] Error al conectar a la base de datos: ${err.message}`);
    process.exit(1);
  }
  writeLog('[OK] Conectado a la base de datos SQLite en modo solo lectura.');
});

db.serialize(() => {
  writeLog('[INFO] Listando todas las tablas encontradas...');
  db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
    if (err) {
      writeLog(`[FATAL] Error al consultar las tablas: ${err.message}`);
      return db.close();
    }
    
    if (tables.length === 0) {
        writeLog('[WARN] No se encontraron tablas en la base de datos.');
    } else {
        writeLog('[OK] Tablas encontradas:');
        tables.forEach((table) => {
            writeLog(`  - ${table.name}`);
        });
    }
    
    db.close((err) => {
        if (err) {
            writeLog(`[FATAL] Error al cerrar la conexión: ${err.message}`);
        } else {
            writeLog('[OK] Conexión cerrada.');
        }
        writeLog('--- FIN DE LA VERIFICACIÓN ---');
    });
  });
});
