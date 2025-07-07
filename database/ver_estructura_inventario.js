const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const assetsDir = path.join(__dirname, '../attached_assets');
const dbPath = path.join(assetsDir, 'kilo.db');

console.log('🔍 VERIFICANDO ESTRUCTURA DE TABLAS INVENTARIO Y DEPARTAMENTOS');
console.log('==============================================================');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error conectando:', err.message);
    return;
  }

  console.log('✅ Conectado a kilo.db\n');

  const tablas = [
    'departamentos',
    'inventario_principal',
    'inventario_periferico',
  ];

  function mostrarEstructuraYDatos(tabla, callback) {
    db.all(`PRAGMA table_info(${tabla})`, (err, columns) => {
      if (err) {
        console.error(`❌ Error obteniendo estructura de ${tabla}:`, err.message);
        callback();
        return;
      }
      console.log(`\n📋 ESTRUCTURA DE TABLA ${tabla.toUpperCase()}:`);
      console.log('========================================');
      if (columns.length === 0) {
        console.log(`⚠️  La tabla ${tabla} no existe o está vacía`);
        callback();
        return;
      }
      columns.forEach((col) => {
        console.log(
          `📌 ${col.name} (${col.type}) - ${col.notnull ? 'NOT NULL' : 'NULL'} - ${col.pk ? 'PRIMARY KEY' : ''}`
        );
      });
      db.all(`SELECT * FROM ${tabla} LIMIT 3`, (err, rows) => {
        if (err) {
          console.error(`❌ Error consultando ${tabla}:`, err.message);
        } else {
          console.log(`\n📄 EJEMPLO DE REGISTROS (${tabla}):`);
          if (rows.length === 0) {
            console.log('   (Sin registros)');
          } else {
            rows.forEach((row, index) => {
              console.log(`\n--- REGISTRO ${index + 1} ---`);
              Object.keys(row).forEach((key) => {
                console.log(`${key}: ${row[key]}`);
              });
            });
          }
        }
        callback();
      });
    });
  }

  // Ejecutar en serie para que la salida sea ordenada
  let i = 0;
  function next() {
    if (i < tablas.length) {
      mostrarEstructuraYDatos(tablas[i], () => {
        i++;
        next();
      });
    } else {
      db.close();
    }
  }
  next();
}); 