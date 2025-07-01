const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const assetsDir = path.join(__dirname, '../attached_assets');
const dbPath = path.join(assetsDir, 'kilo.db');

console.log('🔍 BUSCANDO EMPLEADO ESPECÍFICO');
console.log('===============================');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error conectando:', err.message);
    return;
  }

  console.log('✅ Conectado a kilo.db\n');

  // Buscar empleado con ID 267291
  console.log('🎯 BUSCANDO EMPLEADO ID: 267291');
  db.get('SELECT * FROM empleados WHERE id = 267291', (err, empleado) => {
    if (err) {
      console.error('❌ Error buscando por ID:', err.message);
    } else if (empleado) {
      console.log('✅ ENCONTRADO POR ID:');
      Object.keys(empleado).forEach((key) => {
        console.log(`   ${key}: ${empleado[key]}`);
      });
    } else {
      console.log('❌ NO ENCONTRADO por ID 267291');
    }

    console.log('\n🎯 BUSCANDO POR PLACA: 99999');
    db.get("SELECT * FROM empleados WHERE placa = '99999'", (err, empleado) => {
      if (err) {
        console.error('❌ Error buscando por placa:', err.message);
      } else if (empleado) {
        console.log('✅ ENCONTRADO POR PLACA:');
        Object.keys(empleado).forEach((key) => {
          console.log(`   ${key}: ${empleado[key]}`);
        });
      } else {
        console.log('❌ NO ENCONTRADO por placa 99999');
      }

      console.log('\n🎯 BUSCANDO POR NOMBRE: LEE Morales');
      db.get(
        "SELECT * FROM empleados WHERE nombre LIKE '%LEE%' AND nombre LIKE '%Morales%'",
        (err, empleado) => {
          if (err) {
            console.error('❌ Error buscando por nombre:', err.message);
          } else if (empleado) {
            console.log('✅ ENCONTRADO POR NOMBRE:');
            Object.keys(empleado).forEach((key) => {
              console.log(`   ${key}: ${empleado[key]}`);
            });
          } else {
            console.log('❌ NO ENCONTRADO por nombre LEE Morales');
          }

          // Ver los últimos 10 empleados por ID
          console.log('\n📋 ÚLTIMOS 10 EMPLEADOS POR ID:');
          console.log('===============================');
          db.all(
            'SELECT id, placa, nombre, rango FROM empleados ORDER BY id DESC LIMIT 10',
            (err, empleados) => {
              if (err) {
                console.error('❌ Error:', err.message);
              } else {
                empleados.forEach((emp) => {
                  console.log(
                    `ID: ${emp.id} | Placa: ${emp.placa} | ${emp.nombre} | ${emp.rango}`
                  );
                });
              }

              // Ver el rango de IDs
              console.log('\n📊 RANGO DE IDs:');
              console.log('================');
              db.get(
                'SELECT MIN(id) as min_id, MAX(id) as max_id, COUNT(*) as total FROM empleados',
                (err, stats) => {
                  if (!err) {
                    console.log(`ID Mínimo: ${stats.min_id}`);
                    console.log(`ID Máximo: ${stats.max_id}`);
                    console.log(`Total empleados: ${stats.total}`);
                  }

                  db.close();
                }
              );
            }
          );
        }
      );
    });
  });
});
