const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const assetsDir = path.join(__dirname, '../attached_assets');
const dbPath = path.join(assetsDir, 'kilo.db');

console.log('🔍 VERIFICANDO ESTRUCTURA DE TABLA EMPLEADOS');
console.log('============================================');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error conectando:', err.message);
    return;
  }

  console.log('✅ Conectado a kilo.db\n');

  // Ver estructura de la tabla empleados
  db.all('PRAGMA table_info(empleados)', (err, columns) => {
    if (err) {
      console.error('❌ Error obteniendo estructura:', err.message);
      return;
    }

    console.log('📋 ESTRUCTURA DE TABLA EMPLEADOS:');
    console.log('=================================');

    if (columns.length === 0) {
      console.log('⚠️ La tabla empleados no existe o está vacía');
    } else {
      columns.forEach((col) => {
        console.log(
          `📌 ${col.name} (${col.type}) - ${col.notnull ? 'NOT NULL' : 'NULL'} - ${col.pk ? 'PRIMARY KEY' : ''}`
        );
      });
    }

    console.log('\n');

    // Ver algunos registros de ejemplo
    db.all('SELECT * FROM empleados LIMIT 3', (err, empleados) => {
      if (err) {
        console.error('❌ Error consultando empleados:', err.message);
      } else {
        console.log('📄 EJEMPLO DE REGISTROS:');
        console.log('========================');
        empleados.forEach((emp, index) => {
          console.log(`\n--- EMPLEADO ${index + 1} ---`);
          Object.keys(emp).forEach((key) => {
            console.log(`${key}: ${emp[key]}`);
          });
        });
      }

      db.close();
    });
  });
});
