const duckdb = require('@duckdb/node-api');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const dbPath =
  process.env.DUCKDB_PATH ||
  path.join(__dirname, '../attached_assets/analytics.db');

async function createAllTables(connection) {
  const statements = [
    `CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY,
        usuario TEXT UNIQUE NOT NULL,
        contrasena TEXT NOT NULL,
        rol TEXT DEFAULT 'no administrador',
        nombre TEXT,
        apellido TEXT,
        email TEXT,
        telefono TEXT,
        activo BOOLEAN DEFAULT true,
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
        activo BOOLEAN DEFAULT true,
        FOREIGN KEY (departamento_id) REFERENCES departamentos(id),
        FOREIGN KEY (responsable_actual) REFERENCES empleados(id)
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
    `CREATE TABLE IF NOT EXISTS movimientos_prestamos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        inventario_id TEXT NOT NULL,
        tipo_inventario TEXT NOT NULL,
        empleado_id TEXT NOT NULL,
        usuario_id INTEGER,
        fecha_prestamo TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        observaciones TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS sesiones (
        id INTEGER PRIMARY KEY,
        usuario_id INTEGER NOT NULL,
        session_token VARCHAR(255) UNIQUE NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_expiracion TIMESTAMP NOT NULL,
        activa BOOLEAN DEFAULT true,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    )`,
    `CREATE TABLE IF NOT EXISTS configuracion (
        id INTEGER PRIMARY KEY,
        clave VARCHAR(100) UNIQUE NOT NULL,
        valor TEXT,
        descripcion TEXT,
        fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS logs_acceso (
        id INTEGER PRIMARY KEY,
        usuario_id INTEGER,
        accion VARCHAR(50) NOT NULL,
        tabla_afectada VARCHAR(50),
        registro_id TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        exitoso BOOLEAN DEFAULT true,
        detalles TEXT,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    )`,
    `CREATE TABLE IF NOT EXISTS historial_asignaciones (
        id INTEGER PRIMARY KEY,
        tipo_inventario TEXT NOT NULL,
        inventario_id TEXT NOT NULL,
        empleado_anterior TEXT,
        empleado_nuevo TEXT,
        fecha_cambio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        motivo TEXT,
        usuario_que_cambio INTEGER,
        FOREIGN KEY (empleado_anterior) REFERENCES empleados(id),
        FOREIGN KEY (empleado_nuevo) REFERENCES empleados(id),
        FOREIGN KEY (usuario_que_cambio) REFERENCES usuarios(id)
    )`,
    `CREATE TABLE IF NOT EXISTS historial_vacaciones (
        id INTEGER PRIMARY KEY,
        empleado_id TEXT NOT NULL,
        fecha_inicio DATE NOT NULL,
        fecha_fin DATE NOT NULL,
        fecha_retorno DATE NOT NULL,
        dias_totales INTEGER NOT NULL,
        tipo_vacaciones TEXT DEFAULT 'anuales',
        estado TEXT DEFAULT 'programadas',
        motivo TEXT,
        aprobado_por INTEGER,
        fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_aprobacion TIMESTAMP,
        notas TEXT,
        anio_periodo INTEGER NOT NULL,
        activo BOOLEAN DEFAULT true,
        FOREIGN KEY (empleado_id) REFERENCES empleados(id),
        FOREIGN KEY (aprobado_por) REFERENCES usuarios(id)
    )`
  ];

  try {
    for (const sql of statements) {
      await connection.run(sql);
    }
    console.log('🎉 Todas las tablas han sido creadas exitosamente.');
  } catch (err) {
    console.error('❌ Error al crear las tablas:', err);
    throw err;
  }
}

async function initializeDuckDB() {
  const { DuckDBInstance } = duckdb;
  const assetsDir = path.dirname(dbPath);
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }
  
  let instance;
  let connection;

  try {
    console.log(`🦆 Conectando a DuckDB en: ${dbPath}`);
    instance = await DuckDBInstance.create(dbPath);
    connection = await instance.connect();
    console.log('✅ Conexión a DuckDB establecida.');

    await createAllTables(connection);
    
    return { connection, instance };
  } catch (err) {
    console.error('❌ Fallo al inicializar DuckDB:', err);
    if (connection) {
      connection.closeSync();
    }
    if (instance) {
      instance.closeSync();
    }
    throw err;
  }
}

module.exports = { initializeDuckDB };
