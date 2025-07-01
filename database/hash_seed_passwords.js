const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

async function migrateSeedPasswords() {
  const filePath = path.join(__dirname, '../tablas/usuarios.json');
  const usuarios = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  for (const user of usuarios) {
    const pass = user.contrasena || '';
    if (!pass.startsWith('$2a$') && !pass.startsWith('$2b$') && !pass.startsWith('$2y$')) {
      user.contrasena = await bcrypt.hash(pass, 10);
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(usuarios, null, 2));
  console.log('Contraseñas de usuarios.json migradas a hash.');
}

if (require.main === module) {
  migrateSeedPasswords().catch(err => {
    console.error('Error en migración:', err);
  });
}

module.exports = migrateSeedPasswords;
