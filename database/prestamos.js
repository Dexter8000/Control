
const Database = require('./config');

class SistemaPrestamos {
    constructor() {
        this.db = new Database();
    }

    async conectar() {
        await this.db.connect();
    }

    // Registrar préstamo de equipo
    async registrarPrestamo(equipoId, tipoEquipo, empleadoId, usuarioId, observaciones = '') {
        return new Promise((resolve, reject) => {
            // Verificar que el equipo esté disponible
            const verificarDisponibilidad = tipoEquipo === 'principal' 
                ? 'SELECT * FROM inventario_principal WHERE id = ? AND (responsable_actual IS NULL OR responsable_actual = "")'
                : 'SELECT * FROM inventario_periferico WHERE id_periferico = ? AND (responsable_actual IS NULL OR responsable_actual = "")';

            this.db.db.get(verificarDisponibilidad, [equipoId], (err, equipo) => {
                if (err) {
                    reject(err);
                    return;
                }

                if (!equipo) {
                    reject(new Error('Equipo no disponible o no encontrado'));
                    return;
                }

                // Iniciar transacción
                this.db.db.serialize(() => {
                    this.db.db.run('BEGIN TRANSACTION');

                    // 1. Actualizar responsable del equipo
                    const actualizarEquipo = tipoEquipo === 'principal'
                        ? 'UPDATE inventario_principal SET responsable_actual = ? WHERE id = ?'
                        : 'UPDATE inventario_periferico SET responsable_actual = ?, fecha_asignacion = CURRENT_TIMESTAMP WHERE id_periferico = ?';

                    this.db.db.run(actualizarEquipo, [empleadoId, equipoId], (err) => {
                        if (err) {
                            this.db.db.run('ROLLBACK');
                            reject(err);
                            return;
                        }

                        // 2. Registrar en historial
                        this.db.db.run(`
                            INSERT INTO historial_asignaciones 
                            (tipo_inventario, inventario_id, empleado_anterior, empleado_nuevo, motivo, usuario_que_cambio)
                            VALUES (?, ?, NULL, ?, ?, ?)
                        `, [tipoEquipo, equipoId, empleadoId, 'PRÉSTAMO: ' + observaciones, usuarioId], (err) => {
                            if (err) {
                                this.db.db.run('ROLLBACK');
                                reject(err);
                                return;
                            }

                            // 3. Log del sistema
                            this.db.db.run(`
                                INSERT INTO logs_acceso 
                                (usuario_id, accion, tabla_afectada, registro_id, exitoso, detalles)
                                VALUES (?, 'PRESTAMO_EQUIPO', ?, ?, 1, ?)
                            `, [usuarioId, tipoEquipo === 'principal' ? 'inventario_principal' : 'inventario_periferico', 
                                equipoId, `Préstamo a empleado ${empleadoId}: ${observaciones}`], (err) => {
                                
                                if (err) {
                                    this.db.db.run('ROLLBACK');
                                    reject(err);
                                    return;
                                }

                                this.db.db.run('COMMIT');
                                resolve({
                                    success: true,
                                    mensaje: 'Préstamo registrado exitosamente',
                                    equipoId,
                                    empleadoId,
                                    fecha: new Date().toISOString()
                                });
                            });
                        });
                    });
                });
            });
        });
    }

    // Registrar devolución de equipo
    async registrarDevolucion(equipoId, tipoEquipo, empleadoActual, usuarioId, observaciones = '') {
        return new Promise((resolve, reject) => {
            // Verificar que el equipo esté asignado al empleado
            const verificarAsignacion = tipoEquipo === 'principal' 
                ? 'SELECT * FROM inventario_principal WHERE id = ? AND responsable_actual = ?'
                : 'SELECT * FROM inventario_periferico WHERE id_periferico = ? AND responsable_actual = ?';

            this.db.db.get(verificarAsignacion, [equipoId, empleadoActual], (err, equipo) => {
                if (err) {
                    reject(err);
                    return;
                }

                if (!equipo) {
                    reject(new Error('Equipo no asignado a este empleado'));
                    return;
                }

                // Iniciar transacción
                this.db.db.serialize(() => {
                    this.db.db.run('BEGIN TRANSACTION');

                    // 1. Liberar equipo
                    const liberarEquipo = tipoEquipo === 'principal'
                        ? 'UPDATE inventario_principal SET responsable_actual = NULL WHERE id = ?'
                        : 'UPDATE inventario_periferico SET responsable_actual = NULL WHERE id_periferico = ?';

                    this.db.db.run(liberarEquipo, [equipoId], (err) => {
                        if (err) {
                            this.db.db.run('ROLLBACK');
                            reject(err);
                            return;
                        }

                        // 2. Registrar en historial
                        this.db.db.run(`
                            INSERT INTO historial_asignaciones 
                            (tipo_inventario, inventario_id, empleado_anterior, empleado_nuevo, motivo, usuario_que_cambio)
                            VALUES (?, ?, ?, NULL, ?, ?)
                        `, [tipoEquipo, equipoId, empleadoActual, 'DEVOLUCIÓN: ' + observaciones, usuarioId], (err) => {
                            if (err) {
                                this.db.db.run('ROLLBACK');
                                reject(err);
                                return;
                            }

                            // 3. Log del sistema
                            this.db.db.run(`
                                INSERT INTO logs_acceso 
                                (usuario_id, accion, tabla_afectada, registro_id, exitoso, detalles)
                                VALUES (?, 'DEVOLUCION_EQUIPO', ?, ?, 1, ?)
                            `, [usuarioId, tipoEquipo === 'principal' ? 'inventario_principal' : 'inventario_periferico', 
                                equipoId, `Devolución de empleado ${empleadoActual}: ${observaciones}`], (err) => {
                                
                                if (err) {
                                    this.db.db.run('ROLLBACK');
                                    reject(err);
                                    return;
                                }

                                this.db.db.run('COMMIT');
                                resolve({
                                    success: true,
                                    mensaje: 'Devolución registrada exitosamente',
                                    equipoId,
                                    empleadoActual,
                                    fecha: new Date().toISOString()
                                });
                            });
                        });
                    });
                });
            });
        });
    }

    // Obtener equipos disponibles para préstamo
    async obtenerEquiposDisponibles() {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT 'principal' as tipo, id, nombre, marca, modelo, serie, estado, condicion,
                       categoria, subcategoria, ubicacion_especifica
                FROM inventario_principal 
                WHERE (responsable_actual IS NULL OR responsable_actual = '') AND estado = 'operativo'
                
                UNION ALL
                
                SELECT 'periferico' as tipo, id_periferico as id, nombre_periferico as nombre, 
                       marca_periferico as marca, modelo_periferico as modelo, serie_periferico as serie,
                       estado_periferico as estado, condicion_periferico as condicion,
                       '' as categoria, '' as subcategoria, '' as ubicacion_especifica
                FROM inventario_periferico 
                WHERE (responsable_actual IS NULL OR responsable_actual = '') AND estado_periferico = 'operativo'
                
                ORDER BY tipo, nombre
            `;

            this.db.db.all(query, (err, equipos) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(equipos);
                }
            });
        });
    }

    // Obtener equipos asignados (para devolución)
    async obtenerEquiposAsignados() {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT 'principal' as tipo, ip.id, ip.nombre, ip.marca, ip.modelo, ip.serie,
                       ip.responsable_actual, e.nombre as empleado_nombre, e.apellido as empleado_apellido,
                       e.departamento_id, d.nombre as departamento_nombre
                FROM inventario_principal ip
                JOIN empleados e ON ip.responsable_actual = e.id
                LEFT JOIN departamentos d ON e.departamento_id = d.id
                WHERE ip.responsable_actual IS NOT NULL AND ip.responsable_actual != ''
                
                UNION ALL
                
                SELECT 'periferico' as tipo, iph.id_periferico as id, iph.nombre_periferico as nombre,
                       iph.marca_periferico as marca, iph.modelo_periferico as modelo, iph.serie_periferico as serie,
                       iph.responsable_actual, e.nombre as empleado_nombre, e.apellido as empleado_apellido,
                       e.departamento_id, d.nombre as departamento_nombre
                FROM inventario_periferico iph
                JOIN empleados e ON iph.responsable_actual = e.id
                LEFT JOIN departamentos d ON e.departamento_id = d.id
                WHERE iph.responsable_actual IS NOT NULL AND iph.responsable_actual != ''
                
                ORDER BY tipo, nombre
            `;

            this.db.db.all(query, (err, equipos) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(equipos);
                }
            });
        });
    }

    // Generar reporte semanal
    async generarReporteSemanal(fechaInicio, fechaFin) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT ha.*, 
                       e_anterior.nombre as nombre_anterior, e_anterior.apellido as apellido_anterior,
                       e_nuevo.nombre as nombre_nuevo, e_nuevo.apellido as apellido_nuevo,
                       u.usuario as usuario_registro
                FROM historial_asignaciones ha
                LEFT JOIN empleados e_anterior ON ha.empleado_anterior = e_anterior.id
                LEFT JOIN empleados e_nuevo ON ha.empleado_nuevo = e_nuevo.id
                LEFT JOIN usuarios u ON ha.usuario_que_cambio = u.id
                WHERE DATE(ha.fecha_cambio) BETWEEN DATE(?) AND DATE(?)
                ORDER BY ha.fecha_cambio DESC
            `;

            this.db.db.all(query, [fechaInicio, fechaFin], (err, movimientos) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(movimientos);
                }
            });
        });
    }

    cerrar() {
        this.db.close();
    }
}

module.exports = SistemaPrestamos;
