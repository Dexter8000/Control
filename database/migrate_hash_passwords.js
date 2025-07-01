const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const assetsDir = path.join(__dirname, '../attached_assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}
const dbPath = path.join(assetsDir, 'kilo.db');

async function migrate() {
  const db = new sqlite3.Database(dbPath);

  const users = await new Promise((resolve, reject) => {
    db.all('SELECT id, contrasena FROM usuarios', (err, rows) => {
      if (err) reject(err); else resolve(rows);
    });
  });

  for (const user of users) {
    const pass = user.contrasena || '';
    if (!pass.startsWith('$2a$') && !pass.startsWith('$2b$') && !pass.startsWith('$2y$')) {
      const hash = await bcrypt.hash(pass, 10);
      await new Promise((resolve, reject) => {
        db.run('UPDATE usuarios SET contrasena = ? WHERE id = ?', [hash, user.id], err => {
          if (err) reject(err); else resolve();
        });
      });
      console.log(`Hashed password for user ${user.id}`);
    }
  }

  db.close();
}

if (require.main === module) {
  migrate().then(() => {
    console.log('Migración de contraseñas completada');
  }).catch(err => {
    console.error('Error en migración:', err);
  });
}

module.exports = migrate;
