const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const assetsDir = path.join(__dirname, '../attached_assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}
const dbPath = path.join(assetsDir, 'kilo.db');

console.log('🔍 VERIFICANDO ELIMINACIÓN DE USUARIOS');
console.log('=====================================\n');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error conectando:', err.message);
    return;
  }

  console.log('✅ Conectado a la base de datos\n');

  // Ver todos los usuarios actuales
  db.all(
    `
        SELECT id, usuario, rol, activo, fecha_creacion
        FROM usuarios 
        ORDER BY id
    `,
    (err, usuarios) => {
      if (err) {
        console.error('❌ Error:', err.message);
        return;
      }

      console.log(`📊 USUARIOS EN LA BASE DE DATOS: ${usuarios.length}\n`);

      usuarios.forEach((user) => {
        const estado = user.activo ? '✅ ACTIVO' : '❌ INACTIVO';
        console.log(
          `🆔 ID: ${user.id} | Usuario: ${user.usuario} | ${estado} | Rol: ${user.rol}`
        );
      });

      // Buscar usuarios con IDs específicos que pueden estar causando problemas
      const idsProblematicos = [11, 12]; // Los IDs que mencionaste

      console.log('\n🔍 VERIFICANDO USUARIOS PROBLEMÁTICOS:\n');

      idsProblematicos.forEach((id) => {
        db.get('SELECT * FROM usuarios WHERE id = ?', [id], (err, user) => {
          if (err) {
            console.error(`❌ Error verificando ID ${id}:`, err.message);
          } else if (user) {
            console.log(
              `⚠️  ID ${id} ENCONTRADO: ${user.usuario} - Activo: ${user.activo ? 'Sí' : 'No'}`
            );

            // Eliminar este usuario problemático
            db.run('DELETE FROM usuarios WHERE id = ?', [id], function (err) {
              if (err) {
                console.error(`❌ Error eliminando ID ${id}:`, err.message);
              } else {
                console.log(`✅ Usuario con ID ${id} eliminado exitosamente`);
              }
            });
          } else {
            console.log(`✅ ID ${id} ya no existe en la base de datos`);
          }
        });
      });

      // Limpiar cualquier usuario inactivo que pueda estar causando problemas
      setTimeout(() => {
        db.run('DELETE FROM usuarios WHERE activo = 0', function (err) {
          if (err) {
            console.error(
              '❌ Error eliminando usuarios inactivos:',
              err.message
            );
          } else {
            console.log(`\n🧹 ${this.changes} usuarios inactivos eliminados`);
          }

          // Mostrar estado final
          db.all('SELECT COUNT(*) as total FROM usuarios', (err, count) => {
            if (!err) {
              console.log(
                `\n📊 TOTAL DE USUARIOS RESTANTES: ${count[0].total}`
              );
            }
            db.close();
          });
        });
      }, 1000);
    }
  );
});
