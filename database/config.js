const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
    constructor() {
        this.db = null;
        const assetsDir = path.join(__dirname, '../attached_assets');
        if (!fs.existsSync(assetsDir)) {
            fs.mkdirSync(assetsDir, { recursive: true });
        }
        this.dbPath = path.join(assetsDir, 'kilo.db');
        console.log('🎯 Usando base de datos principal: kilo.db');
    }

    // Conectar a la base de datos
    connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('❌ Error conectando a la base de datos:', err.message);
                    reject(err);
                } else {
                    console.log('✅ Conectado a la base de datos SQLite');
                    this.initializeTables().then(resolve).catch(reject);
                }
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

                -- Tabla de inventario periférico (migrada exacta)
                CREATE TABLE IF NOT EXISTS inventario_periferico (
                    id_periferico TEXT PRIMARY KEY,
                    nombre_periferico TEXT,
                    marca_periferico TEXT,
                    modelo_periferico TEXT,
                    serie_periferico TEXT,
                    estado_periferico TEXT DEFAULT 'operativo',
                    condicion_periferico TEXT DEFAULT 'nuevo',
                    id_inventario_principal TEXT,
                    detalles_periferico TEXT,
                    fecha_adquisicion_periferico DATE,
                    responsable_actual TEXT,
                    fecha_asignacion DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (id_inventario_principal) REFERENCES inventario_principal(id),
                    FOREIGN KEY (responsable_actual) REFERENCES empleados(id)
                );

                -- Tabla de inventario principal (migrada exacta)
                CREATE TABLE IF NOT EXISTS inventario_principal (
                    id TEXT PRIMARY KEY,
                    nombre TEXT,
                    marca TEXT,
                    modelo TEXT,
                    serie TEXT,
                    estado TEXT DEFAULT 'operativo',
                    condicion TEXT DEFAULT 'nuevo',
                    responsable_actual TEXT,
                    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
                    fecha_adquisicion DATE,
                    detalles TEXT,
                    ubicacion TEXT,
                    valor_compra DECIMAL(10,2),
                    proveedor TEXT,
                    garantia_hasta DATE,
                    FOREIGN KEY (responsable_actual) REFERENCES empleados(id)
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
                    console.error('❌ Error creando tablas:', err.message);
                    reject(err);
                } else {
                    console.log('✅ Tablas creadas/verificadas correctamente');
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
                this.db.get("SELECT COUNT(*) as count FROM usuarios", async (err, row) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    if (row.count === 0) {
                        console.log('🔄 Migrando datos de la base de datos original...');

                        // 1. Insertar departamentos estandarizados actualizados
                        const insertDepartamentos = `
                            INSERT OR REPLACE INTO departamentos (id, nombre) VALUES
                            ('DEP001', '01-JEFATURA'),
                            ('DEP002', 'JEFATURA'),
                            ('DEP003', 'DEPARTAMENTO ADMINISTRATIVO'),
                            ('DEP004', 'UNIDADES EN OTRA DEPENDENCIA'),
                            ('DEP005', 'DEPARTAMENTO DE ENLACE Y MONITOREO DE INFORMACION AERONAVAL'),
                            ('DEP006', 'DEPARTAMENTO DE OPERACIONES'),
                            ('DEP007', 'TÉCNICOS OPERACIONALES'),
                            ('DEP008', 'Departamento de Fusión Operacional de Inteligencia'),
                            ('DEP009', 'INTELIGENCIA INSULAR'),
                            ('DEP010', 'INTELIGENCIA AÉREA'),
                            ('DEP011', 'Departamento de Análisis de Inteligencia'),
                            ('DEP012', 'DEPARTAMENTO CANINO'),
                            ('DEP013', 'DEPARTAMENTO DE INTELIGENCIA CRIMINAL'),
                            ('DEP014', 'DEPARTAMENTO REGIONAL DE INTELIGENCIA AERONAVAL'),
                            ('DEP015', '[sin departamento]');
                        `;

                        await new Promise((resolve, reject) => {
                            this.db.run(insertDepartamentos, (err) => {
                                if (err) reject(err);
                                else {
                                    console.log('✅ Departamentos migrados');
                                    resolve();
                                }
                            });
                        });

                        // 2. Migrar usuarios con contraseñas hasheadas
                        const usuariosOriginales = [
                            { usuario: 'juan_perez', contrasena: 'contrasena123', rol: 'administrador' },
                            { usuario: 'maria_lopez', contrasena: 'm14523', rol: 'administrador' },
                            { usuario: 'pedro_gomez', contrasena: 'abc12345', rol: 'no administrador' },
                            { usuario: 'admin', contrasena: 'admin', rol: 'administrador' },
                            { usuario: 'dexterl', contrasena: 'Panama21', rol: 'administrador' }
                        ];

                        for (const user of usuariosOriginales) {
                            await new Promise((resolve, reject) => {
                                this.db.run(
                                    'INSERT INTO usuarios (usuario, contrasena, rol, activo) VALUES (?, ?, ?, 1)',
                                    [user.usuario, user.contrasena, user.rol],
                                    (err) => {
                                        if (err) reject(err);
                                        else resolve();
                                    }
                                );
                            });
                        }
                        console.log('✅ Usuarios migrados');

                        // 3. Insertar empleados de muestra con todas las columnas
                        const insertEmpleados = `
                            INSERT INTO empleados (id, placa, rango, nombre, apellido, departamento_id, correo_electronico, cedula, telefono, fecha_ingreso, fecha_nacimiento, fecha_vacaciones_inicio, fecha_vacaciones_fin) VALUES
                            ('EMP001', '10722', 'SUBCOMISIONADO', 'JHONATHAN INDOMAR', 'ALI SANCHEZ', 'DEP002', 'jhonathan.ali@ejemplo.com', '8-123-456', '6123-4567', '2020-03-15', '1985-07-22', '2025-01-01', '2025-01-30'),
                            ('EMP002', '80403', 'COMISIONADO', 'LEE', 'BAZER MELENDEZ', 'DEP002', 'lee.bazer@ejemplo.com', '8-234-567', '6234-5678', '2018-11-08', '1978-12-03', NULL, NULL),
                            ('EMP003', '23456', 'AGENTE', 'ANA SOFIA', 'PEREZ GOMEZ', 'DEP001', 'ana.perez@ejemplo.com', '8-345-678', '6345-6789', '2022-06-12', '1992-04-18', '2025-07-15', '2025-07-29'),
                            ('EMP004', '78901', 'CABO 2DO.', 'MARCO ANTONIO', 'RODRIGUEZ VERA', 'DEP003', 'marco.rodriguez@ejemplo.com', '8-456-789', '6456-7890', '2021-09-20', '1988-10-30', NULL, NULL),
                            ('EMP005', '11223', 'CABO 1RO.', 'LUISA FERNANDA', 'DIAZ ACOSTA', 'DEP004', 'luisa.diaz@ejemplo.com', '8-567-890', '6567-8901', '2019-01-25', '1990-02-14', '2025-12-20', '2026-01-05');
                        `;

                        await new Promise((resolve, reject) => {
                            this.db.run(insertEmpleados, (err) => {
                                if (err) reject(err);
                                else {
                                    console.log('✅ Empleados de muestra insertados');
                                    resolve();
                                }
                            });
                        });

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
                                    console.log('✅ Configuración inicial creada');
                                    resolve();
                                }
                            });
                        });

                        console.log('🎉 Migración de datos completada exitosamente');
                    } else {
                        console.log('✅ Base de datos ya contiene datos migrados');
                    }
                    resolve();
                });
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

    // Métodos para obtener datos del inventario
    getDepartamentos() {
        return new Promise((resolve, reject) => {
            this.db.all("SELECT * FROM departamentos ORDER BY nombre", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // Obtener inventario principal completo (estructura real)
    getInventarioPrincipal() {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT ip.*, 
                       CASE 
                           WHEN ip.responsable_actual IS NOT NULL AND ip.responsable_actual != '' 
                           THEN e.nombre || ' ' || e.apellido 
                           ELSE 'Sin asignar' 
                       END as empleado_asignado,
                       CASE 
                           WHEN ip.estado IS NULL OR ip.estado = '' 
                           THEN 'Disponible' 
                           ELSE ip.estado 
                       END as estado
                FROM inventario_principal ip
                LEFT JOIN empleados e ON ip.responsable_actual = e.id
                ORDER BY ip.fecha_adquisicion DESC, ip.nombre
            `;

            this.db.all(query, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // Obtener inventario periférico completo (estructura real)
    getInventarioPeriferico() {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT iph.*, 
                       ip.nombre as equipo_principal_nombre,
                       ip.marca as equipo_principal_marca,
                       ip.modelo as equipo_principal_modelo,
                       ip.serie as equipo_principal_serie,
                       CASE 
                           WHEN iph.responsable_actual IS NOT NULL AND iph.responsable_actual != '' 
                           THEN e.nombre || ' ' || e.apellido 
                           ELSE 'Sin asignar' 
                       END as responsable_nombre,
                       d.nombre as departamento_nombre
                FROM inventario_periferico iph
                LEFT JOIN inventario_principal ip ON iph.id_inventario_principal = ip.id
                LEFT JOIN empleados e ON iph.responsable_actual = e.id
                LEFT JOIN departamentos d ON e.departamento_id = d.id
                ORDER BY iph.fecha_adquisicion_periferico DESC, iph.nombre_periferico
            `;

            this.db.all(query, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    getEmpleados() {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT e.*, d.nombre as departamento_nombre 
                FROM empleados e 
                LEFT JOIN departamentos d ON e.departamento_id = d.id 
                WHERE e.activo = 1
                ORDER BY e.nombre, e.apellido
            `;
            this.db.all(query, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // Obtener empleados completos con todas las columnas
    getEmpleadosCompletos() {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT e.*, d.nombre as departamento_nombre 
                FROM empleados e 
                LEFT JOIN departamentos d ON e.departamento_id = d.id 
                WHERE e.activo = 1
                ORDER BY e.nombre, e.apellido
            `;
            this.db.all(query, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // Crear nuevo empleado
    createEmpleado(empleadoData) {
        return new Promise((resolve, reject) => {
            // Generar ID único
            const id = 'EMP' + Date.now().toString().slice(-6);

            const query = `
                INSERT INTO empleados (
                    id, placa, rango, nombre, apellido, departamento_id, 
                    correo_electronico, cedula, telefono, fecha_creacion, fecha_ingreso
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const values = [
                id,
                empleadoData.placa || null,
                empleadoData.rango || null,
                empleadoData.nombre,
                empleadoData.apellido,
                empleadoData.departamento_id || null,
                empleadoData.correo_electronico || null,
                empleadoData.cedula || null,
                empleadoData.telefono || null,
                new Date().toISOString(),
                null // fecha_ingreso se establece como NULL por defecto
            ];

            console.log('🔍 Creando empleado con datos:', empleadoData);
            console.log('🔍 Valores SQL:', values);

            this.db.run(query, values, function(err) {
                if (err) {
                    console.error('❌ Error creando empleado:', err);
                    reject(err);
                } else {
                    console.log('✅ Empleado creado exitosamente con ID:', id);
                    resolve({ id: id });
                }
            });
        });
    }

    // Actualizar empleado existente
    updateEmpleado(id, empleadoData) {
        return new Promise((resolve, reject) => {
            // Verificar que el empleado existe antes de actualizar
            const checkQuery = 'SELECT id, nombre, apellido FROM empleados WHERE id = ?';
            
            this.db.get(checkQuery, [id], (err, existingEmpleado) => {
                if (err) {
                    console.error('❌ Error verificando empleado:', err);
                    return reject(err);
                }
                
                if (!existingEmpleado) {
                    console.error('❌ Empleado no encontrado para actualizar:', id);
                    return reject(new Error(`Empleado con ID ${id} no encontrado`));
                }
                
                console.log('✅ Empleado encontrado para actualizar:', existingEmpleado.nombre, existingEmpleado.apellido);
                
                const query = `
                    UPDATE empleados SET 
                        placa = ?, rango = ?, nombre = ?, apellido = ?, 
                        departamento_id = ?, correo_electronico = ?, cedula = ?, 
                        telefono = ?
                    WHERE id = ?
                `;

                const values = [
                    empleadoData.placa || null,
                    empleadoData.rango || null,
                    empleadoData.nombre,
                    empleadoData.apellido,
                    empleadoData.departamento_id || null,
                    empleadoData.correo_electronico || null,
                    empleadoData.cedula || null,
                    empleadoData.telefono || null,
                    id
                ];

                console.log('🔄 Actualizando empleado ID:', id);
                console.log('📝 Nuevos datos:', empleadoData);

                this.db.run(query, values, function(err) {
                    if (err) {
                        console.error('❌ Error SQL actualizando empleado:', err);
                        reject(err);
                    } else {
                        console.log('✅ Empleado actualizado exitosamente. Filas afectadas:', this.changes);
                        if (this.changes === 0) {
                            console.warn('⚠️ No se actualizó ninguna fila - verificar ID');
                        }
                        resolve({ changes: this.changes, id: id });
                    }
                });
            });
        });
    }

    // Eliminar empleado (soft delete)
    deleteEmpleado(id) {
        return new Promise((resolve, reject) => {
            const query = 'UPDATE empleados SET activo = 0 WHERE id = ?';

            this.db.run(query, [id], function(err) {
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

            this.db.run(query, [userId, accion, ipAddress, userAgent, exitoso, detalles], (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('❌ Error cerrando la base de datos:', err.message);
                } else {
                    console.log('✅ Conexión a la base de datos cerrada');
                }
            });
        }
    }
}

module.exports = Database;