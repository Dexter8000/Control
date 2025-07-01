const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'attached_assets', 'kilo.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err.message);
    return;
  }
  console.log('Conectado a la base de datos SQLite');
});

db.all(
  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';",
  [],
  (err, tables) => {
    if (err) {
      console.error('Error al obtener las tablas:', err.message);
      return;
    }

    console.log('\nTablas en la base de datos:');
    console.log('----------------------------');
    tables.forEach((table, index) => {
      console.log(`${index + 1}. ${table.name}`);
    });

    db.close();
  }
);
