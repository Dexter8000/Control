const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'attached_assets', 'kilo.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err.message);
    return;
  }
  console.log('Conectado a la base de datos SQLite');
});

// Función para verificar un usuario específico
async function verificarUsuario(username) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT id, usuario, contrasena, activo FROM usuarios WHERE usuario = ?',
      [username],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
}

// Verificar el usuario 'juan_perez'
async function main() {
  try {
    const usuario = 'juan_perez';
    const password = 'MiContrasenaParaJuan123!';

    console.log(`Verificando usuario: ${usuario}`);
    const usuarioDB = await verificarUsuario(usuario);

    if (!usuarioDB) {
      console.log('❌ Usuario no encontrado');
      return;
    }

    console.log('\n🔍 Información del usuario:');
    console.log('------------------------');
    console.log(`ID: ${usuarioDB.id}`);
    console.log(`Usuario: ${usuarioDB.usuario}`);
    console.log(`Activo: ${usuarioDB.activo ? 'Sí' : 'No'}`);
    console.log(`Hash en DB: ${usuarioDB.contrasena}`);

    // Verificar la contraseña
    console.log('\n🔑 Verificando contraseña...');
    const esValida = await bcrypt.compare(password, usuarioDB.contrasena);

    console.log('\n🔍 Resultado de la verificación:');
    console.log('------------------------------');
    console.log(`Contraseña válida: ${esValida ? '✅ Sí' : '❌ No'}`);

    if (!esValida) {
      console.log('\nPosibles causas:');
      console.log('1. La contraseña almacenada no está correctamente hasheada');
      console.log('2. El hash en la base de datos está corrupto');
      console.log('3. La contraseña proporcionada no coincide con el hash');

      console.log('\n🔧 Solución recomendada:');
      console.log(
        '1. Asegúrate de que la contraseña en la base de datos esté hasheada correctamente'
      );
      console.log('2. Usa el siguiente comando para actualizar el hash:');
      console.log(
        `   node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('${password}', 10).then(console.log);"`
      );
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    db.close();
  }
}

main();
