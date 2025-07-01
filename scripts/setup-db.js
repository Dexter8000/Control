const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

// Configuración de rutas
const dbPath =
  process.env.DB_PATH || path.join(__dirname, '../attached_assets/kilo.db');

// Crear directorio si no existe
const dbDir = path.dirname(dbPath);
if (!require('fs').existsSync(dbDir)) {
  require('fs').mkdirSync(dbDir, { recursive: true });
}

// Conectar a la base de datos SQLite
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err.message);
    process.exit(1);
  }
  console.log('✅ Conectado a la base de datos SQLite');
});

// Scripts SQL para crear las tablas
const sqlScripts = [
  // Tabla inventario_principal
  `CREATE TABLE IF NOT EXISTS inventario_principal (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        marca TEXT,
        modelo TEXT,
        serie TEXT UNIQUE NOT NULL,
        categoria TEXT,
        subcategoria TEXT,
        estado TEXT,
        condicion TEXT,
        tipo_adquisicion TEXT,
        id_departamento INTEGER,
        ubicacion_especifica TEXT,
        responsable_actual INTEGER,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_adquisicion DATE,
        valor_compra DECIMAL(10,2),
        proveedor TEXT,
        garantia_hasta DATE,
        detalles TEXT,
        especificaciones_tecnicas JSON
    )`,

  // Tabla perifericos
  `CREATE TABLE IF NOT EXISTS perifericos (
        id_periferico INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre_periferico TEXT NOT NULL,
        marca_periferico TEXT,
        modelo_periferico TEXT,
        serie_periferico TEXT UNIQUE NOT NULL,
        estado_periferico TEXT,
        condicion_periferico TEXT,
        tipo_adquisicion_periferico TEXT,
        id_departamento_asignado INTEGER,
        ubicacion_especifica_periferico TEXT,
        responsable_actual INTEGER,
        fecha_creacion_periferico TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_adquisicion_periferico DATE,
        fecha_asignacion DATE,
        detalles_periferico TEXT,
        id_inventario_principal INTEGER,
        especificaciones_tecnicas JSON,
        FOREIGN KEY (id_inventario_principal) REFERENCES inventario_principal(id)
    )`,

  // Índices para mejorar el rendimiento
  'CREATE INDEX IF NOT EXISTS idx_perifericos_principal ON perifericos(id_inventario_principal)',
  'CREATE INDEX IF NOT EXISTS idx_principal_serie ON inventario_principal(serie)',
  'CREATE INDEX IF NOT EXISTS idx_periferico_serie ON perifericos(serie_periferico)',
];

// Ejecutar los scripts SQL
async function setupDatabase() {
  for (const sql of sqlScripts) {
    try {
      await new Promise((resolve, reject) => {
        db.run(sql, function(err) {
          if (err) {
            console.error(`❌ Error ejecutando SQL: ${sql}`, err.message);
            reject(err);
          } else {
            console.log(`✅ Script ejecutado correctamente: ${sql.substring(0, 40)}...`);
            resolve();
          }
        });
      });
    } catch (err) {
      // Si un script falla, cerramos la DB y salimos
      db.close();
      throw err;
    }
  }
}

// Iniciar la configuración de forma asíncrona
async function main() {
  try {
    await setupDatabase();
    console.log('\n✨ Base de datos configurada exitosamente');
  } catch (err) {
    console.error('Error durante la configuración:', err.message);
    process.exit(1);
  } finally {
    db.close((err) => {
      if (err) {
        console.error('❌ Error al cerrar la base de datos:', err.message);
      }
    });
  }
}

main();
