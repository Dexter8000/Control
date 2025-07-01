const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
require('dotenv').config();

// Configuración de rutas
const dbPath =
  process.env.DB_PATH || path.join(__dirname, '../attached_assets/kilo.db');

// Crear una conexión a la base de datos SQLite
async function getDbConnection() {
  return open({
    filename: dbPath,
    driver: sqlite3.Database,
  });
}

// Inicializar la base de datos
async function initDb() {
  try {
    const db = await getDbConnection();

    // Verificar si las tablas existen
    const tables = await db.all(
      "SELECT name FROM sqlite_master WHERE type='table'"
    );

    console.log(
      '📊 Tablas en la base de datos:',
      tables.map((t) => t.name).join(', ')
    );

    return db;
  } catch (error) {
    console.error('❌ Error al inicializar la base de datos:', error);
    throw error;
  }
}

// Ejemplo de consulta
async function getInventorySummary() {
  const db = await getDbConnection();
  try {
    const summary = await db.all(`
            SELECT 
                (SELECT COUNT(*) FROM inventario_principal) as total_equipos,
                (SELECT COUNT(*) FROM perifericos) as total_perifericos,
                (SELECT COUNT(*) FROM inventario_principal WHERE estado = 'disponible') as equipos_disponibles,
                (SELECT COUNT(*) FROM perifericos WHERE estado_periferico = 'disponible') as perifericos_disponibles
        `);
    return summary[0];
  } finally {
    await db.close();
  }
}

module.exports = {
  getDbConnection,
  initDb,
  getInventorySummary,
};
