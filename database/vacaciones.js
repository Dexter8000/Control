const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class VacacionesManager {
  constructor(database) {
    this.db = database.db;
  }

  // Crear nuevo período de vacaciones
  async crearVacaciones(datosVacaciones) {
    const {
      empleado_id,
      fecha_inicio,
      fecha_fin,
      tipo_vacaciones = 'anuales',
      motivo = '',
      aprobado_por,
      notas = '',
    } = datosVacaciones;

    // Calcular datos automáticamente
    const fechaInicioObj = new Date(fecha_inicio);
    const fechaFinObj = new Date(fecha_fin);
    const fechaRetorno = new Date(fechaFinObj);
    fechaRetorno.setDate(fechaRetorno.getDate() + 1);

    const diasTotales =
      Math.ceil((fechaFinObj - fechaInicioObj) / (1000 * 60 * 60 * 24)) + 1;
    const añoPeriodo = fechaInicioObj.getFullYear();

    const query = `
            INSERT INTO historial_vacaciones (
                empleado_id, fecha_inicio, fecha_fin, fecha_retorno,
                dias_totales, tipo_vacaciones, estado, motivo,
                aprobado_por, fecha_aprobacion, notas, año_periodo
            ) VALUES (?, ?, ?, ?, ?, ?, 'programadas', ?, ?, CURRENT_TIMESTAMP, ?, ?)
        `;

    return new Promise((resolve, reject) => {
      this.db.run(
        query,
        [
          empleado_id,
          fecha_inicio,
          fecha_fin,
          fechaRetorno.toISOString().split('T')[0],
          diasTotales,
          tipo_vacaciones,
          motivo,
          aprobado_por,
          notas,
          añoPeriodo,
        ],
        function (err) {
          if (err) reject(err);
          else
            resolve({
              id: this.lastID,
              diasTotales,
              fechaRetorno: fechaRetorno.toISOString().split('T')[0],
            });
        }
      );
    });
  }

  // Obtener vacaciones activas de un empleado
  async getVacacionesActivas(empleado_id) {
    const hoy = new Date().toISOString().split('T')[0];

    const query = `
            SELECT * FROM historial_vacaciones 
            WHERE empleado_id = ? 
            AND fecha_inicio <= ? 
            AND fecha_fin >= ? 
            AND estado = 'activas'
            AND activo = 1
            ORDER BY fecha_inicio DESC
            LIMIT 1
        `;

    return new Promise((resolve, reject) => {
      this.db.get(query, [empleado_id, hoy, hoy], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  // Obtener próximas vacaciones de un empleado
  async getProximasVacaciones(empleado_id) {
    const hoy = new Date().toISOString().split('T')[0];

    const query = `
            SELECT * FROM historial_vacaciones 
            WHERE empleado_id = ? 
            AND fecha_inicio > ? 
            AND estado IN ('programadas', 'aprobadas')
            AND activo = 1
            ORDER BY fecha_inicio ASC
            LIMIT 1
        `;

    return new Promise((resolve, reject) => {
      this.db.get(query, [empleado_id, hoy], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  // Actualizar estados de vacaciones automáticamente
  async actualizarEstadosVacaciones() {
    const hoy = new Date().toISOString().split('T')[0];

    // Activar vacaciones que empiezan hoy
    const activarQuery = `
            UPDATE historial_vacaciones 
            SET estado = 'activas' 
            WHERE fecha_inicio <= ? 
            AND fecha_fin >= ? 
            AND estado = 'programadas'
            AND activo = 1
        `;

    // Finalizar vacaciones que terminaron
    const finalizarQuery = `
            UPDATE historial_vacaciones 
            SET estado = 'finalizadas' 
            WHERE fecha_fin < ? 
            AND estado = 'activas'
            AND activo = 1
        `;

    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run(activarQuery, [hoy, hoy]);
        this.db.run(finalizarQuery, [hoy], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }

  // Calcular información detallada de vacaciones para un empleado
  async calcularInfoVacaciones(empleado_id) {
    const hoy = new Date();
    const hoyStr = hoy.toISOString().split('T')[0];

    // Vacaciones activas
    const vacacionesActivas = await this.getVacacionesActivas(empleado_id);

    // Próximas vacaciones
    const proximasVacaciones = await this.getProximasVacaciones(empleado_id);

    let info = {
      estado: 'sin_vacaciones',
      diasTranscurridos: 0,
      diasRestantes: 0,
      fechaRetorno: null,
      proximasVacaciones: null,
      diasHastaProximas: 0,
    };

    if (vacacionesActivas) {
      const fechaInicio = new Date(vacacionesActivas.fecha_inicio);
      const fechaFin = new Date(vacacionesActivas.fecha_fin);
      const fechaRetorno = new Date(vacacionesActivas.fecha_retorno);

      info.estado = 'en_vacaciones';
      info.diasTranscurridos =
        Math.ceil((hoy - fechaInicio) / (1000 * 60 * 60 * 24)) + 1;
      info.diasRestantes = Math.ceil(
        (fechaRetorno - hoy) / (1000 * 60 * 60 * 24)
      );
      info.fechaRetorno = vacacionesActivas.fecha_retorno;
      info.diasTotales = vacacionesActivas.dias_totales;
    } else if (proximasVacaciones) {
      const fechaInicio = new Date(proximasVacaciones.fecha_inicio);

      info.estado = 'programadas';
      info.proximasVacaciones = proximasVacaciones;
      info.diasHastaProximas = Math.ceil(
        (fechaInicio - hoy) / (1000 * 60 * 60 * 24)
      );
    }

    return info;
  }

  // Limpiar registros antiguos (ejecutar anualmente)
  async limpiarRegistrosAntiguos() {
    const añoActual = new Date().getFullYear();
    const añoLimite = añoActual - 2; // Mantener solo últimos 2 años

    const query = `
            UPDATE historial_vacaciones 
            SET activo = 0 
            WHERE año_periodo < ? 
            AND estado = 'finalizadas'
        `;

    return new Promise((resolve, reject) => {
      this.db.run(query, [añoLimite], function (err) {
        if (err) reject(err);
        else resolve({ registrosArchivados: this.changes });
      });
    });
  }

  // Obtener historial completo de un empleado
  async getHistorialEmpleado(empleado_id, incluir_archivados = false) {
    let query = `
            SELECT hv.*, u.usuario as aprobado_por_nombre
            FROM historial_vacaciones hv
            LEFT JOIN usuarios u ON hv.aprobado_por = u.id
            WHERE hv.empleado_id = ?
        `;

    if (!incluir_archivados) {
      query += ' AND hv.activo = 1';
    }

    query += ' ORDER BY hv.fecha_inicio DESC';

    return new Promise((resolve, reject) => {
      this.db.all(query, [empleado_id], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}

module.exports = VacacionesManager;
