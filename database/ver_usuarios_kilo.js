const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const assetsDir = path.join(__dirname, '../attached_assets');
const dbPath = path.join(assetsDir, 'kilo.db');

console.log('🔍 VERIFICANDO USUARIOS EN KILO.DB');
console.log('==================================');
console.log('📍 Ruta de BD:', dbPath);
console.log('📍 Existe archivo:', fs.existsSync(dbPath) ? 'SÍ' : 'NO');

if (!fs.existsSync(dbPath)) {
  console.log('❌ El archivo kilo.db no existe');
  process.exit(1);
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error conectando:', err.message);
    return;
  }

  console.log('✅ Conectado a kilo.db\n');

  // Ver usuarios
  db.all(
    'SELECT id, usuario, contrasena, rol, activo FROM usuarios ORDER BY id',
    (err, users) => {
      if (err) {
        console.error('❌ Error:', err.message);
        return;
      }

      console.log(`👥 USUARIOS ENCONTRADOS: ${users.length}\n`);

      if (users.length === 0) {
        console.log('⚠️ No hay usuarios en la base de datos');
      } else {
        users.forEach((user) => {
          console.log(`🆔 ID: ${user.id}`);
          console.log(`👤 Usuario: ${user.usuario}`);
          console.log(`🔑 Contraseña: ${user.contrasena}`);
          console.log(`👑 Rol: ${user.rol}`);
          console.log(`✅ Activo: ${user.activo ? 'Sí' : 'No'}`);
          console.log('-----------------------------------');
        });
      }

      db.close();
    }
  );
});
