const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'attached_assets', 'kilo.db');
const tableName = 'configuracion';

const db = new sqlite3.Database(dbPath);

// 1. Verificar estructura de la tabla
db.all(`PRAGMA table_info(${tableName})`, [], (err, columns) => {
  if (err) {
    console.error(
      `Error al obtener la estructura de la tabla ${tableName}:`,
      err.message
    );
    db.close();
    return;
  }

  console.log(`\nEstructura de la tabla '${tableName}':`);
  console.log('----------------------------------');
  columns.forEach((col) => {
    console.log(
      `- ${col.name}: ${col.type}${col.pk ? ' (PRIMARY KEY)' : ''}${col.notnull ? ' NOT NULL' : ''}${col.dflt_value ? ` DEFAULT ${col.dflt_value}` : ''}`
    );
  });

  // 2. Ver algunos registros de ejemplo
  db.all(`SELECT * FROM ${tableName} LIMIT 5`, [], (err, rows) => {
    console.log('\nRegistros de ejemplo:');
    console.log('---------------------');
    if (err) {
      console.error(`Error al obtener registros: ${err.message}`);
    } else if (rows.length === 0) {
      console.log('La tabla está vacía');
    } else {
      console.log(JSON.stringify(rows, null, 2));
    }

    // 3. Verificar si hay triggers o índices
    db.all(
      `SELECT name, sql FROM sqlite_master WHERE type IN ('trigger', 'index') AND tbl_name = ?`,
      [tableName],
      (err, objects) => {
        if (objects && objects.length > 0) {
          console.log('\nTriggers/Índices asociados:');
          console.log('---------------------------');
          objects.forEach((obj) => {
            console.log(`${obj.name}: ${obj.sql}`);
          });
        }
        db.close();
      }
    );
  });
});
