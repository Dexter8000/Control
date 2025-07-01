const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'attached_assets', 'kilo.db');
const tableName = process.argv[2] || 'sesiones'; // Usa 'sesiones' por defecto si no se especifica

const db = new sqlite3.Database(dbPath);

// Obtener la estructura de la tabla
console.log(`\nEstructura de la tabla '${tableName}':`);
console.log('----------------------------------');

db.all(`PRAGMA table_info(${tableName})`, [], (err, columns) => {
  if (err) {
    console.error(
      `Error al obtener la estructura de la tabla ${tableName}:`,
      err.message
    );
    db.close();
    return;
  }

  console.log('Columnas:');
  console.log('---------');
  columns.forEach((col) => {
    console.log(
      `- ${col.name}: ${col.type}${col.pk ? ' (PRIMARY KEY)' : ''}${col.notnull ? ' NOT NULL' : ''}${col.dflt_value ? ` DEFAULT ${col.dflt_value}` : ''}`
    );
  });

  // Mostrar algunos registros de ejemplo
  console.log('\nAlgunos registros de ejemplo:');
  console.log('-----------------------------');
  db.all(`SELECT * FROM ${tableName} LIMIT 3`, [], (err, rows) => {
    if (err) {
      console.error(`Error al obtener registros de ${tableName}:`, err.message);
      db.close();
      return;
    }

    if (rows.length === 0) {
      console.log('La tabla está vacía');
    } else {
      console.log(JSON.stringify(rows, null, 2));
    }

    db.close();
  });
});
