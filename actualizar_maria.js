const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'attached_assets', 'kilo.db');
const db = new sqlite3.Database(dbPath);

// Configuración
const USUARIO = 'maria_lopez';
const NUEVA_CONTRASENA = 'Salayer*109';

async function actualizarContrasena() {
  try {
    // Generar hash de la nueva contraseña
    const hash = await bcrypt.hash(NUEVA_CONTRASENA, 10);

    // Actualizar en la base de datos
    db.run(
      `UPDATE usuarios 
             SET contrasena = ?,
                 intentos_fallidos = 0,
                 bloqueado_hasta = NULL,
                 activo = 1
             WHERE usuario = ?`,
      [hash, USUARIO],
      function (err) {
        if (err) {
          console.error('❌ Error al actualizar la contraseña:', err.message);
        } else if (this.changes > 0) {
          console.log('✅ Contraseña actualizada exitosamente');
          console.log('\n🔑 Credenciales actualizadas:');
          console.log('---------------------------');
          console.log(`👤 Usuario: ${USUARIO}`);
          console.log(`🔑 Nueva contraseña: ${NUEVA_CONTRASENA}`);
          console.log(
            '\n✅ La cuenta ha sido desbloqueada y la contraseña ha sido actualizada.'
          );
        } else {
          console.log('⚠️  No se encontró el usuario para actualizar');
        }
        db.close();
      }
    );
  } catch (error) {
    console.error('❌ Error al generar el hash:', error.message);
    db.close();
  }
}

// Verificar el estado actual del usuario primero
console.log('🔍 Verificando estado del usuario...');
db.get(
  'SELECT usuario, activo, intentos_fallidos, bloqueado_hasta FROM usuarios WHERE usuario = ?',
  [USUARIO],
  (err, usuario) => {
    if (err) {
      console.error('❌ Error al verificar el usuario:', err.message);
      db.close();
      return;
    }

    if (!usuario) {
      console.error('❌ Usuario no encontrado');
      db.close();
      return;
    }

    console.log('\n🔍 Estado actual del usuario:');
    console.log('---------------------------');
    console.log(`Usuario: ${usuario.usuario}`);
    console.log(`Activo: ${usuario.activo ? '✅ Sí' : '❌ No'}`);
    console.log(`Intentos fallidos: ${usuario.intentos_fallidos || 0}`);
    console.log(
      `Bloqueado hasta: ${usuario.bloqueado_hasta || 'No bloqueado'}`
    );

    // Preguntar confirmación
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    readline.question(
      '\n¿Deseas continuar con la actualización? (s/n): ',
      (respuesta) => {
        if (respuesta.toLowerCase() === 's') {
          console.log('\n🔄 Actualizando contraseña...');
          actualizarContrasena();
        } else {
          console.log('❌ Operación cancelada');
          db.close();
        }
        readline.close();
      }
    );
  }
);
