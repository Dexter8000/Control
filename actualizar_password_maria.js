const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

// Configuración para María
const USUARIO = 'maria_lopez';
const NUEVA_PASSWORD = 'OtraContrasenaMaria456!'; // La contraseña que proporcionaste

const dbPath = path.join(__dirname, 'attached_assets', 'kilo.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err.message);
    return;
  }
  console.log('Conectado a la base de datos SQLite');
});

// Función para actualizar la contraseña y quitar bloqueo
async function actualizarPassword() {
  try {
    console.log(`\n🔧 Actualizando contraseña para: ${USUARIO}`);

    // Generar el hash de la nueva contraseña
    const hashedPassword = await bcrypt.hash(NUEVA_PASSWORD, 10);

    // Actualizar la base de datos - también reseteamos los intentos fallidos y quitamos el bloqueo
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE usuarios 
                 SET contrasena = ?, 
                     intentos_fallidos = 0, 
                     bloqueado_hasta = NULL,
                     activo = 1
                 WHERE usuario = ?`,
        [hashedPassword, USUARIO],
        function (err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    console.log('✅ Contraseña actualizada exitosamente');
    console.log('✅ Bloqueo de usuario eliminado');
    console.log('✅ Intentos fallidos reiniciados a 0');

    console.log('\n📋 Detalles:');
    console.log('------------');
    console.log(`Usuario: ${USUARIO}`);
    console.log(`Nuevo hash: ${hashedPassword}`);
  } catch (error) {
    console.error('❌ Error al actualizar la contraseña:', error.message);
  } finally {
    db.close();
  }
}

// Verificar el estado actual del usuario
async function verificarUsuario() {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT usuario, activo, intentos_fallidos, bloqueado_hasta FROM usuarios WHERE usuario = ?',
      [USUARIO],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
}

// Ejecutar la verificación y actualización
async function main() {
  try {
    // Primero verificamos el estado actual
    const usuario = await verificarUsuario();
    if (!usuario) {
      console.log('❌ Usuario no encontrado');
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

    // Preguntar si se desea continuar
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    readline.question(
      '\n¿Deseas actualizar la contraseña y desbloquear al usuario? (s/n): ',
      async (respuesta) => {
        if (respuesta.toLowerCase() === 's') {
          await actualizarPassword();
        } else {
          console.log('Operación cancelada');
        }
        readline.close();
        db.close();
      }
    );
  } catch (error) {
    console.error('Error:', error);
    db.close();
  }
}

main();
