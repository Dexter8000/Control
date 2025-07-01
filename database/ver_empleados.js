const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const assetsDir = path.join(__dirname, '../attached_assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}
const dbPath = path.join(assetsDir, 'kilo.db');

console.log('👨‍💼 EMPLEADOS EN LA BASE DE DATOS');
console.log('==================================\n');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error conectando:', err.message);
    return;
  }

  // Ver todos los empleados con sus departamentos
  db.all(
    `
        SELECT e.id, e.placa, e.rango, e.nombre, e.apellido, 
               e.departamento_id, d.nombre as departamento_nombre,
               e.correo_electronico, e.cedula, e.telefono,
               e.responsable_actual, e.activo, e.fecha_creacion
        FROM empleados e 
        LEFT JOIN departamentos d ON e.departamento_id = d.id
        ORDER BY e.id
    `,
    (err, empleados) => {
      if (err) {
        console.error('❌ Error:', err.message);
        return;
      }

      console.log(`📊 Total de empleados: ${empleados.length}\n`);

      empleados.forEach((emp) => {
        console.log(`🆔 ID: ${emp.id}`);
        console.log(`🏅 Placa: ${emp.placa || 'Sin placa'}`);
        console.log(`⭐ Rango: ${emp.rango || 'Sin rango'}`);
        console.log(`👤 Nombre: ${emp.nombre} ${emp.apellido}`);
        console.log(
          `🏢 Departamento: ${emp.departamento_nombre || 'Sin departamento'} (${emp.departamento_id})`
        );
        console.log(`📧 Email: ${emp.correo_electronico || 'Sin email'}`);
        console.log(`🆔 Cédula: ${emp.cedula || 'Sin cédula'}`);
        console.log(`📱 Teléfono: ${emp.telefono || 'Sin teléfono'}`);
        console.log(`✅ Activo: ${emp.activo ? 'Sí' : 'No'}`);
        console.log(`📅 Creado: ${emp.fecha_creacion}`);
        console.log('-'.repeat(50));
      });

      // Estadísticas adicionales
      console.log('\n📈 ESTADÍSTICAS:');
      console.log('==================');

      // Contar por departamento
      db.all(
        `
            SELECT d.nombre as departamento, COUNT(e.id) as total
            FROM empleados e
            LEFT JOIN departamentos d ON e.departamento_id = d.id
            WHERE e.activo = 1
            GROUP BY d.nombre
            ORDER BY total DESC
        `,
        (err, stats) => {
          if (!err) {
            console.log('\n👥 Empleados por departamento:');
            stats.forEach((stat) => {
              console.log(
                `   • ${stat.departamento || 'Sin departamento'}: ${stat.total} empleados`
              );
            });
          }

          // Contar por rango
          db.all(
            `
                SELECT rango, COUNT(*) as total
                FROM empleados
                WHERE activo = 1 AND rango IS NOT NULL AND rango != ''
                GROUP BY rango
                ORDER BY total DESC
            `,
            (err, rangos) => {
              if (!err) {
                console.log('\n🏅 Empleados por rango:');
                rangos.forEach((rango) => {
                  console.log(`   • ${rango.rango}: ${rango.total} empleados`);
                });
              }

              db.close();
            }
          );
        }
      );
    }
  );
});
