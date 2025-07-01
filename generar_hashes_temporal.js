const bcrypt = require('bcryptjs');

// DEFINE AQUÍ LAS NUEVAS CONTRASEÑAS EN TEXTO PLANO
// ¡Asegúrate de que sean seguras y anótalas en un lugar SEGURO!
const nuevaPassJuan = 'MiContrasenaParaJuan123!'; // <-- ¡Aquí van tus contraseñas reales!
const nuevaPassMaria = 'OtraContrasenaMaria456!'; // <-- ¡Aquí van tus contraseñas reales!

console.log('Generando hashes de contraseñas...');

Promise.all([
  bcrypt.hash(nuevaPassJuan, 10), // El '10' son las rondas de salt, como en tu config.js
  bcrypt.hash(nuevaPassMaria, 10),
])
  .then(([hashJuan, hashMaria]) => {
    console.log('\n--- ¡CONTRSEÑAS Y HASHES GENERADOS! ---');
    console.log('USUARIO: juan_perez');
    console.log('  Contraseña PLANA (para iniciar sesión):', nuevaPassJuan); // CORRECTO: Usa la variable definida
    console.log('  Hash generado (para la base de datos):', hashJuan);
    console.log('\nUSUARIO: maria_lopez');
    console.log('  Contraseña PLANA (para iniciar sesión):', nuevaPassMaria); // CORRECTO: Usa la variable definida
    console.log('  Hash generado (para la base de datos):', hashMaria);
    console.log(
      '\n--- ¡GUARDA ESTA INFORMACIÓN Y ÚSALA PARA ACTUALIZAR LA BASE DE DATOS! ---\n'
    );
  })
  .catch((err) => {
    console.error('Error al generar los hashes:', err);
    console.error(
      'Asegúrate de que "bcryptjs" esté correctamente instalado. Mensaje de error:',
      err.message
    );
  });
