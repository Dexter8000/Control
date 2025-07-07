const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

class Database {
  constructor() {
    this.db = null;
    const assetsDir = path.join(__dirname, '../attached_assets');
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }
    this.dbPath = path.join(assetsDir, 'kilo.db');
    console.log(' Usando base de datos principal: kilo.db');
  }

  // Conectar a la base de datos
  connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('❌ Error conectando a la base de datos:', err.message);
          return reject(err);
        }
        console.log('✅ Conectado a la base de datos SQLite');
        this.initializeTables()
          .then(() => {
            // Cargar datos iniciales del inventario general de activos
            return this.loadInventarioGeneralActivos();
          })
          .then(() => {
            console.log('✅ Tablas y datos inicializados correctamente.');
            resolve();
          })
          .catch((initErr) => {
            console.error('❌ Error inicializando las tablas:', initErr);
            reject(initErr);
          });
      });
    });
  }

  // Crear todas las tablas del sistema completo
  async initializeTables() {
    return new Promise((resolve, reject) => {
      const createTables = `
                -- Tabla de usuarios (migrada de tu estructura original)
                CREATE TABLE IF NOT EXISTS usuarios (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    usuario TEXT UNIQUE NOT NULL,
                    contrasena TEXT NOT NULL, -- contraseña en texto plano (hash pendiente)
                    rol TEXT DEFAULT 'no administrador',
                    nombre TEXT,
                    apellido TEXT,
                    email TEXT,
                    telefono TEXT,
                    activo BOOLEAN DEFAULT 1,
                    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
                    ultimo_acceso DATETIME,
                    intentos_fallidos INTEGER DEFAULT 0,
                    bloqueado_hasta DATETIME NULL
                );

                -- Tabla de departamentos (migrada exacta)
                CREATE TABLE IF NOT EXISTS departamentos (
                    id TEXT PRIMARY KEY,
                    nombre TEXT NOT NULL
                );

                -- Tabla de empleados (migrada con mejoras y nuevas columnas)
                CREATE TABLE IF NOT EXISTS empleados (
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
                    fecha_vacaciones_inicio DATE NULL,
                    fecha_vacaciones_fin DATE NULL,
                    responsable_actual TEXT,
                    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
                    fecha_adquisicion DATETIME,
                    detalles TEXT,
                    activo BOOLEAN DEFAULT 1,
                    FOREIGN KEY (departamento_id) REFERENCES departamentos(id),
                    FOREIGN KEY (responsable_actual) REFERENCES empleados(id)
                );

                -- Tabla de inventario periférico eliminada para preparar nueva estructura
                -- La nueva tabla se implementará con una estructura mejorada

                -- Tabla de inventario principal eliminada para preparar nueva estructura
                -- La nueva tabla se implementará con una estructura mejorada

                -- Nueva tabla de inventario general de activos
                CREATE TABLE IF NOT EXISTS inventario_general_activos (
                    id INTEGER PRIMARY KEY,
                    nombre TEXT NOT NULL,
                    marca TEXT,
                    modelo TEXT,
                    serie TEXT UNIQUE,
                    categoria TEXT NOT NULL,
                    subcategoria TEXT,
                    estado TEXT,
                    condicion TEXT,
                    tipo_adquisicion TEXT,
                    departamento_asignado TEXT,
                    ubicacion_especifica TEXT,
                    responsable_actual TEXT,
                    fecha_creacion TEXT,
                    fecha_adquisicion TEXT,
                    detalles TEXT,
                    garantia_hasta DATE,
                    id_inventario_principal INTEGER NULL,
                    fecha_asignacion DATETIME,
                    FOREIGN KEY (id_inventario_principal) REFERENCES inventario_general_activos(id)
                        ON DELETE SET NULL
                        ON UPDATE CASCADE
                );

                -- Tabla de sesiones (para el sistema de login)
                CREATE TABLE IF NOT EXISTS sesiones (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    usuario_id INTEGER NOT NULL,
                    session_token VARCHAR(255) UNIQUE NOT NULL,
                    ip_address VARCHAR(45),
                    user_agent TEXT,
                    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
                    fecha_expiracion DATETIME NOT NULL,
                    activa BOOLEAN DEFAULT 1,
                    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
                );

                -- Tabla de configuración del sistema
                CREATE TABLE IF NOT EXISTS configuracion (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    clave VARCHAR(100) UNIQUE NOT NULL,
                    valor TEXT,
                    descripcion TEXT,
                    fecha_modificacion DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                -- Tabla de logs de acceso y cambios
                CREATE TABLE IF NOT EXISTS logs_acceso (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    usuario_id INTEGER,
                    accion VARCHAR(50) NOT NULL,
                    tabla_afectada VARCHAR(50),
                    registro_id TEXT,
                    ip_address VARCHAR(45),
                    user_agent TEXT,
                    exitoso BOOLEAN DEFAULT 1,
                    detalles TEXT,
                    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
                );

                -- Tabla de historial de asignaciones
                CREATE TABLE IF NOT EXISTS historial_asignaciones (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tipo_inventario TEXT NOT NULL, -- 'principal' o 'periferico'
                    inventario_id TEXT NOT NULL,
                    empleado_anterior TEXT,
                    empleado_nuevo TEXT,
                    fecha_cambio DATETIME DEFAULT CURRENT_TIMESTAMP,
                    motivo TEXT,
                    usuario_que_cambio INTEGER,
                    FOREIGN KEY (empleado_anterior) REFERENCES empleados(id),
                    FOREIGN KEY (empleado_nuevo) REFERENCES empleados(id),
                    FOREIGN KEY (usuario_que_cambio) REFERENCES usuarios(id)
                );

                -- Tabla de historial de vacaciones (NUEVA)
                CREATE TABLE IF NOT EXISTS historial_vacaciones (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    empleado_id TEXT NOT NULL,
                    fecha_inicio DATE NOT NULL,
                    fecha_fin DATE NOT NULL,
                    fecha_retorno DATE NOT NULL, -- Primer día de trabajo después de vacaciones
                    dias_totales INTEGER NOT NULL,
                    tipo_vacaciones TEXT DEFAULT 'anuales', -- 'anuales', 'especiales', 'medicas', etc.
                    estado TEXT DEFAULT 'programadas', -- 'programadas', 'activas', 'finalizadas', 'canceladas'
                    motivo TEXT,
                    aprobado_por INTEGER,
                    fecha_solicitud DATETIME DEFAULT CURRENT_TIMESTAMP,
                    fecha_aprobacion DATETIME,
                    notas TEXT,
                    año_periodo INTEGER NOT NULL, -- Año al que pertenecen estas vacaciones
                    activo BOOLEAN DEFAULT 1, -- Para soft delete de registros antiguos
                    FOREIGN KEY (empleado_id) REFERENCES empleados(id),
                    FOREIGN KEY (aprobado_por) REFERENCES usuarios(id)
                );
            `;

      this.db.exec(createTables, (err) => {
        if (err) {
          console.error(' Error creando tablas:', err.message);
          reject(err);
        } else {
          console.log(' Tablas creadas/verificadas correctamente');
          this.insertMigratedData().then(resolve).catch(reject);
        }
      });
    });
  }

  // Insertar datos migrados de tu base de datos original
  async insertMigratedData() {
    return new Promise(async (resolve, reject) => {
      try {
        // Verificar si ya existen datos
        this.db.get(
          'SELECT COUNT(*) as count FROM usuarios',
          async (err, row) => {
            if (err) {
              reject(err);
              return;
            }

            if (row.count === 0) {
              console.log(' Migrando datos de la base de datos original...');

              const dataDir = path.join(__dirname, '../tablas');

              const departamentos = JSON.parse(
                fs.readFileSync(
                  path.join(dataDir, 'departamentos.json'),
                  'utf8'
                )
              );
              for (const dep of departamentos) {
                await new Promise((resolve, reject) => {
                  this.db.run(
                    'INSERT OR REPLACE INTO departamentos (id, nombre) VALUES (?, ?)',
                    [dep.id, dep.nombre],
                    (err) => (err ? reject(err) : resolve())
                  );
                });
              }
              console.log(' Departamentos migrados');

              const usuarios = JSON.parse(
                fs.readFileSync(path.join(dataDir, 'usuarios.json'), 'utf8')
              );
              for (const user of usuarios) {
                const hashed = await bcrypt.hash(user.contrasena, 10);
                await new Promise((resolve, reject) => {
                  this.db.run(
                    'INSERT OR REPLACE INTO usuarios (id, usuario, contrasena, rol, nombre, email) VALUES (?, ?, ?, ?, ?, ?)',
                    [
                      user.id,
                      user.usuario,
                      hashed,
                      user.rol,
                      user.nombre,
                      user.email,
                    ],
                    (err) => (err ? reject(err) : resolve())
                  );
                });
              }
              console.log(' Usuarios migrados');

              const empleados = JSON.parse(
                fs.readFileSync(path.join(dataDir, 'empleados.json'), 'utf8')
              );
              for (const emp of empleados) {
                await new Promise((resolve, reject) => {
                  this.db.run(
                    `INSERT OR REPLACE INTO empleados (id, placa, rango, nombre, apellido, departamento_id, correo_electronico, cedula, telefono, fecha_nacimiento) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                      emp.id,
                      emp.placa,
                      emp.rango,
                      emp.nombre,
                      emp.apellido,
                      emp.departamento_id,
                      emp.correo_electronico,
                      emp.cedula,
                      emp.telefono,
                      emp.fecha_nacimiento,
                    ],
                    (err) => (err ? reject(err) : resolve())
                  );
                });
              }
              console.log(' Empleados migrados');

              const inventarioPrincipal = JSON.parse(
                fs.readFileSync(
                  path.join(dataDir, 'inventario_principal.json'),
                  'utf8'
                )
              );
              for (const item of inventarioPrincipal) {
                await new Promise((resolve, reject) => {
                  this.db.run(
                    `INSERT OR REPLACE INTO inventario_principal (id, nombre, marca, modelo, serie, categoria, subcategoria, estado, condicion, tipo_adquisicion, id_departamento_asignado, ubicacion_especifica, responsable_actual, fecha_creacion, fecha_adquisicion, detalles) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                      item.id,
                      item.nombre,
                      item.marca,
                      item.modelo,
                      item.serie,
                      item.categoria,
                      item.subcategoria,
                      item.estado,
                      item.condicion,
                      item.tipo_adquisicion,
                      item.id_departamento_asignado,
                      item.ubicacion_especifica,
                      item.responsable_actual,
                      item.fecha_creacion,
                      item.fecha_adquisicion,
                      item.detalles,
                    ],
                    (err) => (err ? reject(err) : resolve())
                  );
                });
              }
              console.log(' Inventario principal migrado');

              const inventarioPeriferico = JSON.parse(
                fs.readFileSync(
                  path.join(dataDir, 'inventario_periferico.json'),
                  'utf8'
                )
              );
              for (const per of inventarioPeriferico) {
                await new Promise((resolve, reject) => {
                  this.db.run(
                    `INSERT OR REPLACE INTO inventario_periferico (id_periferico, nombre_periferico, marca_periferico, modelo_periferico, serie_periferico, estado_periferico, condicion_periferico, tipo_adquisicion_periferico, id_departamento_asignado_periferico, ubicacion_especifica_periferico, responsable_actual_periferico, fecha_creacion_periferico, fecha_adquisicion_periferico, detalles_periferico, id_inventario_principal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                      per.id_periferico,
                      per.nombre_periferico,
                      per.marca_periferico,
                      per.modelo_periferico,
                      per.serie_periferico,
                      per.estado_periferico,
                      per.condicion_periferico,
                      per.tipo_adquisicion_periferico,
                      per.id_departamento_asignado_periferico,
                      per.ubicacion_especifica_periferico,
                      per.responsable_actual_periferico,
                      per.fecha_creacion_periferico,
                      per.fecha_adquisicion_periferico,
                      per.detalles_periferico,
                      per.id_inventario_principal,
                    ],
                    (err) => (err ? reject(err) : resolve())
                  );
                });
              }
              console.log(' Inventario periférico migrado');

              // 4. Insertar configuración inicial
              const insertConfig = `
                            INSERT INTO configuracion (clave, valor, descripcion) VALUES
                            ('max_intentos_login', '5', 'Máximo número de intentos de login fallidos'),
                            ('tiempo_bloqueo_minutos', '30', 'Tiempo de bloqueo en minutos tras exceder intentos'),
                            ('session_timeout_hours', '24', 'Tiempo de expiración de sesión en horas'),
                            ('sistema_nombre', 'Sistema de Inventario y Control', 'Nombre del sistema'),
                            ('version', '2.0.0', 'Versión del sistema migrado'),
                            ('empresa_nombre', 'Departamento de Inteligencia', 'Nombre de la organización');
                        `;

              await new Promise((resolve, reject) => {
                this.db.run(insertConfig, (err) => {
                  if (err) reject(err);
                  else {
                    console.log(' Configuración inicial creada');
                    resolve();
                  }
                });
              });

              console.log(' Migración de datos completada exitosamente');
            } else {
              console.log(' Base de datos ya contiene datos migrados');
            }
            resolve();
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  // Obtener usuario por username (adaptado para el campo 'usuario')
  getUser(identifier) {
    return new Promise((resolve, reject) => {
      const query = `
                SELECT id, usuario as username, usuario, contrasena,
                       nombre, apellido, email, telefono, rol, activo, ultimo_acceso,
                       intentos_fallidos, bloqueado_hasta
                FROM usuarios
                WHERE (usuario = ? OR email = ?) AND activo = 1
            `;

      this.db.get(query, [identifier, identifier], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Método para cargar datos iniciales del inventario general de activos
  async loadInventarioGeneralActivos() {
    try {
      // Verificar si ya hay datos en la tabla
      const existingData = await this.getInventarioGeneralActivos();
      if (existingData && existingData.length > 0) {
        console.log('✅ La tabla inventario_general_activos ya tiene datos, no se cargarán datos iniciales.');
        return;
      }

      // Cargar datos desde el archivo JSON
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(__dirname, '..', 'tablas', 'inventario_general_activos.json');
      
      if (!fs.existsSync(filePath)) {
        console.log('⚠ No se encontró el archivo de datos iniciales para inventario_general_activos.');
        return;
      }
      
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      // Insertar datos en la tabla
      await this.beginTransaction();
      
      for (const activo of data) {
        await this.crearActivo(activo);
      }
      
      await this.commitTransaction();
      console.log(`✅ Se cargaron ${data.length} registros iniciales en inventario_general_activos.`);
    } catch (error) {
      await this.rollbackTransaction();
      console.error('❌ Error cargando datos iniciales de inventario_general_activos:', error);
    }
  }

  // Métodos para gestionar el inventario general de activos
  getInventarioGeneralActivos() {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM inventario_general_activos ORDER BY id DESC`;
      this.db.all(query, [], (err, rows) => {
        if (err) {
          console.error('✖ Error obteniendo inventario general de activos:', err);
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  getActivoPorId(id) {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM inventario_general_activos WHERE id = ?`;
      this.db.get(query, [id], (err, row) => {
        if (err) {
          console.error('✖ Error obteniendo activo por ID:', err);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  crearActivo(activoData) {
    return new Promise((resolve, reject) => {
      const {
        nombre, marca, modelo, serie, categoria, subcategoria, estado,
        condicion, tipo_adquisicion, departamento_asignado, ubicacion_especifica,
        responsable_actual, fecha_creacion, fecha_adquisicion, detalles, garantia_hasta,
        id_inventario_principal, fecha_asignacion
      } = activoData;

      const query = `
        INSERT INTO inventario_general_activos (
          nombre, marca, modelo, serie, categoria, subcategoria, estado,
          condicion, tipo_adquisicion, departamento_asignado, ubicacion_especifica,
          responsable_actual, fecha_creacion, fecha_adquisicion, detalles, garantia_hasta,
          id_inventario_principal, fecha_asignacion
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        nombre, marca, modelo, serie, categoria, subcategoria, estado,
        condicion, tipo_adquisicion, departamento_asignado, ubicacion_especifica,
        responsable_actual, fecha_creacion, fecha_adquisicion, detalles, garantia_hasta,
        id_inventario_principal, fecha_asignacion
      ];

      this.db.run(query, params, function(err) {
        if (err) {
          console.error('✖ Error creando activo:', err);
          reject(err);
        } else {
          resolve({ id: this.lastID });
        }
      });
    });
  }

  actualizarActivo(id, activoData) {
    return new Promise((resolve, reject) => {
      // Primero verificamos que el activo exista
      this.getActivoPorId(id)
        .then(activo => {
          if (!activo) {
            reject(new Error('Activo no encontrado'));
            return;
          }

          // Construimos la consulta dinámicamente basada en los campos proporcionados
          const fields = [];
          const values = [];

          Object.keys(activoData).forEach(key => {
            if (activoData[key] !== undefined) {
              fields.push(`${key} = ?`);
              values.push(activoData[key]);
            }
          });

          // Agregamos el ID al final de los valores
          values.push(id);

          const query = `
            UPDATE inventario_general_activos
            SET ${fields.join(', ')}
            WHERE id = ?
          `;

          this.db.run(query, values, function(err) {
            if (err) {
              console.error('✖ Error actualizando activo:', err);
              reject(err);
            } else {
              resolve({ changes: this.changes });
            }
          });
        })
        .catch(err => {
          console.error('✖ Error verificando activo:', err);
          reject(err);
        });
    });
  }

  eliminarActivo(id) {
    return new Promise((resolve, reject) => {
      const query = `DELETE FROM inventario_general_activos WHERE id = ?`;
      this.db.run(query, [id], function(err) {
        if (err) {
          console.error('✖ Error eliminando activo:', err);
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  // Métodos para obtener datos del inventario
  getDepartamentos() {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM departamentos ORDER BY nombre',
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }
  
  // Obtener empleados con información de departamento
  getEmpleadosCompletos() {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT
            e.*
        FROM empleados e
        ORDER BY e.nombre, e.apellido
      `;
      this.db.all(query, [], (err, rows) => {
        if (err) {
          console.error('Error al obtener empleados completos:', err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Crear nuevo departamento
  createDepartamento(nombre) {
    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      const query = 'INSERT INTO departamentos (id, nombre) VALUES (?, ?)';
      this.db.run(query, [id, nombre], function (err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id });
        }
      });
    });
  }

  // Actualizar departamento existente
  updateDepartamento(id, nombre) {
    return new Promise((resolve, reject) => {
      const query = 'UPDATE departamentos SET nombre = ? WHERE id = ?';
      this.db.run(query, [nombre, id], function (err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  // Eliminar departamento
  deleteDepartamento(id) {
    return new Promise((resolve, reject) => {
      const query = 'DELETE FROM departamentos WHERE id = ?';
      this.db.run(query, [id], function (err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  // Métodos para obtener datos para tablas y filtros
  getRangos() {
    return new Promise((resolve, reject) => {
      this.db.all("SELECT DISTINCT rango FROM empleados WHERE rango IS NOT NULL AND rango != '' ORDER BY rango", (err, rows) => {
        if (err) {
          console.error('Error al obtener rangos:', err);
          reject(err);
        } else {
          resolve(rows.map(r => r.rango));
        }
      });
    });
  }

  getEmpleadosCompletos() {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT
            e.*,
            d.nombre AS departamento_nombre
        FROM empleados e
        LEFT JOIN departamentos d ON e.departamento_id = d.id
        ORDER BY e.nombre, e.apellido
      `;
      this.db.all(query, [], (err, rows) => {
        if (err) {
          console.error('Error al obtener empleados completos:', err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Método getInventarioPrincipal eliminado para preparar nueva estructura
  // Los nuevos métodos se implementarán con la nueva estructura mejorada

  // Método getInventarioPeriferico eliminado para preparar nueva estructura
  // Los nuevos métodos se implementarán con la nueva estructura mejorada

  // Método getInventarioCompleto eliminado para preparar nueva estructura
  // Los nuevos métodos se implementarán con la nueva estructura mejorada

  // Crear nuevo empleado
  createEmpleado(empleadoData) {
    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      const query = `
        INSERT INTO empleados (
          id, placa, rango, nombre, apellido, departamento_id, 
          correo_electronico, cedula, telefono, fecha_nacimiento, fecha_ingreso, activo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `;
      const params = [
        id,
        empleadoData.placa,
        empleadoData.rango,
        empleadoData.nombre,
        empleadoData.apellido,
        empleadoData.departamento_id,
        empleadoData.correo_electronico,
        empleadoData.cedula,
        empleadoData.telefono,
        empleadoData.fecha_nacimiento,
        empleadoData.fecha_ingreso
      ];

      this.db.run(query, params, function (err) {
        if (err) {
          console.error('Error en createEmpleado:', err.message);
          reject(err);
        } else {
          resolve({ id });
        }
      });
    });
  }

  // Actualizar empleado existente
  updateEmpleado(id, empleadoData) {
    return new Promise((resolve, reject) => {
      const fields = Object.keys(empleadoData).map(k => `${k} = ?`).join(', ');
      if (!fields) {
          return resolve({ changes: 0 });
      }
      const values = [...Object.values(empleadoData), id];
      const query = `UPDATE empleados SET ${fields} WHERE id = ?`;

      this.db.run(query, values, function (err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  // Eliminar empleado (soft delete)
  deleteEmpleado(id) {
    return new Promise((resolve, reject) => {
      const query = 'UPDATE empleados SET activo = 0 WHERE id = ?';
      this.db.run(query, [id], function (err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  // Resto de métodos existentes...
  updateLoginSuccess(userId) {
    return new Promise((resolve, reject) => {
      const query = `
                UPDATE usuarios 
                SET ultimo_acceso = CURRENT_TIMESTAMP, 
                    intentos_fallidos = 0, 
                    bloqueado_hasta = NULL 
                WHERE id = ?
            `;

      this.db.run(query, [userId], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  incrementFailedAttempts(userId) {
    return new Promise((resolve, reject) => {
      const query = `
                UPDATE usuarios 
                SET intentos_fallidos = intentos_fallidos + 1,
                    bloqueado_hasta = CASE 
                        WHEN intentos_fallidos >= 4 
                        THEN datetime('now', '+30 minutes') 
                        ELSE bloqueado_hasta 
                    END
                WHERE id = ?
            `;

      this.db.run(query, [userId], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  logAccess(userId, accion, ipAddress, userAgent, exitoso, detalles = null) {
    return new Promise((resolve, reject) => {
      const query = `
                INSERT INTO logs_acceso (usuario_id, accion, ip_address, user_agent, exitoso, detalles)
                VALUES (?, ?, ?, ?, ?, ?)
            `;

      this.db.run(
        query,
        [userId, accion, ipAddress, userAgent, exitoso, detalles],
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  // Transaction helpers
  beginTransaction() {
    return new Promise((resolve, reject) => {
      this.db.run('BEGIN TRANSACTION', (err) =>
        err ? reject(err) : resolve()
      );
    });
  }

  commitTransaction() {
    return new Promise((resolve, reject) => {
      this.db.run('COMMIT', (err) => (err ? reject(err) : resolve()));
    });
  }

  rollbackTransaction() {
    return new Promise((resolve, reject) => {
      this.db.run('ROLLBACK', (err) => (err ? reject(err) : resolve()));
    });
  }

  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error(' Error cerrando la base de datos:', err.message);
        } else {
          console.log(' Conexión a la base de datos cerrada');
        }
      });
    }
  }
}

module.exports = Database;
