const duckdb = require('@duckdb/node-api');
const path = require('path');
require('dotenv').config();

const dbPath =
  process.env.DUCKDB_PATH ||
  path.join(__dirname, '../attached_assets/analytics.db');

// Create DuckDB database and connection
const db = new duckdb.Database(dbPath);
const connection = db.connect();

async function createInventoryTables() {
  const statements = [
    `CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario TEXT UNIQUE NOT NULL,
        contrasena TEXT NOT NULL,
        rol TEXT DEFAULT 'no administrador',
        nombre TEXT,
        apellido TEXT,
        email TEXT,
        telefono TEXT,
        activo BOOLEAN DEFAULT 1,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ultimo_acceso TIMESTAMP,
        intentos_fallidos INTEGER DEFAULT 0,
        bloqueado_hasta TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS departamentos (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_departamentos_id ON departamentos(id)`,
    `CREATE TABLE IF NOT EXISTS empleados (
        id TEXT PRIMARY KEY,
        placa TEXT UNIQUE,
        rango TEXT,
        nombre TEXT,
        apellido TEXT,
        departamento_id TEXT,
        correo_electronico TEXT,
        cedula TEXT UNIQUE,
        telefono TEXT,
        fecha_ingreso DATE,
        fecha_nacimiento DATE,
        fecha_vacaciones_inicio DATE,
        fecha_vacaciones_fin DATE,
        responsable_actual TEXT,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_adquisicion TIMESTAMP,
        detalles TEXT,
        activo BOOLEAN DEFAULT 1,
        FOREIGN KEY (departamento_id) REFERENCES departamentos(id),
        FOREIGN KEY (responsable_actual) REFERENCES empleados(id)
    )`,
    `CREATE TABLE IF NOT EXISTS inventario_periferico (
        id_periferico TEXT PRIMARY KEY,
        nombre_periferico TEXT,
        marca_periferico TEXT,
        modelo_periferico TEXT,
        serie_periferico TEXT,
        estado_periferico TEXT DEFAULT 'operativo',
        condicion_periferico TEXT DEFAULT 'nuevo',
        tipo_adquisicion_periferico TEXT,
        id_departamento_asignado_periferico TEXT,
        ubicacion_especifica_periferico TEXT,
        responsable_actual_periferico TEXT,
        fecha_creacion_periferico TEXT,
        fecha_adquisicion_periferico TEXT,
        detalles_periferico TEXT,
        id_inventario_principal TEXT,
        fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_departamento_asignado_periferico) REFERENCES departamentos(id),
        FOREIGN KEY (responsable_actual_periferico) REFERENCES empleados(id),
        FOREIGN KEY (id_inventario_principal) REFERENCES inventario_principal(id)
    )`,
    `CREATE TABLE IF NOT EXISTS inventario_principal (
        id TEXT PRIMARY KEY,
        nombre TEXT,
        marca TEXT,
        modelo TEXT,
        serie TEXT,
        categoria TEXT,
        subcategoria TEXT,
        estado TEXT DEFAULT 'operativo',
        condicion TEXT DEFAULT 'nuevo',
        tipo_adquisicion TEXT,
        id_departamento_asignado TEXT,
        ubicacion_especifica TEXT,
        responsable_actual TEXT,
        fecha_creacion TEXT,
        fecha_adquisicion TEXT,
        detalles TEXT,
        ubicacion TEXT,
        valor_compra DECIMAL(10,2),
        proveedor TEXT,
        garantia_hasta DATE,
        FOREIGN KEY (id_departamento_asignado) REFERENCES departamentos(id),
        FOREIGN KEY (responsable_actual) REFERENCES empleados(id)
    )`,
    `CREATE TABLE IF NOT EXISTS movimientos_prestamos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        inventario_id TEXT NOT NULL,
        tipo_inventario TEXT NOT NULL,
        empleado_id TEXT NOT NULL,
        usuario_id INTEGER,
        fecha_prestamo TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        observaciones TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS movimientos_devoluciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        inventario_id TEXT NOT NULL,
        tipo_inventario TEXT NOT NULL,
        empleado_id TEXT NOT NULL,
        usuario_id INTEGER,
        fecha_devolucion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        observaciones TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS historial_eventos_item (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        inventario_id TEXT NOT NULL,
        tipo_evento TEXT NOT NULL,
        descripcion TEXT,
        usuario_id INTEGER,
        fecha_evento TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  ];

  for (const sql of statements) {
    await new Promise((resolve, reject) => {
      connection.run(sql, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }
}

connection.createInventoryTables = createInventoryTables;

async function listTables() {
  const reader = await connection.runAndReadAll(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='main'"
  );
  return reader.getRows().map((r) => r[0]);
}

async function getTablePreview(tableName, limit = 20) {
  const reader = await connection.runAndReadAll(
    `SELECT * FROM ${tableName} LIMIT ${limit}`
  );
  return {
    columns: reader.columnNames(),
    rows: reader.getRows(),
  };
}

connection.listTables = listTables;
connection.getTablePreview = getTablePreview;
module.exports = connection;
