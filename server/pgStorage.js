const { Pool } = require('pg');

class PostgreSQLStorage {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }

  async getDepartamentos() {
    const result = await this.pool.query('SELECT * FROM departamentos ORDER BY id');
    return result.rows;
  }

  async getEmpleadosCompletos() {
    const query = `
      SELECT 
        e.id,
        e.placa,
        e.rango,
        e.nombre,
        e.apellido,
        e.departamento_id,
        d.nombre as departamento_nombre,
        e.correo_electronico,
        e.cedula,
        e.telefono,
        e.fecha_nacimiento
      FROM empleados e
      LEFT JOIN departamentos d ON e.departamento_id = d.id
      ORDER BY e.id
    `;
    const result = await this.pool.query(query);
    return result.rows;
  }

  async getUserByUsername(username) {
    const result = await this.pool.query('SELECT * FROM usuarios WHERE usuario = $1', [username]);
    return result.rows[0];
  }

  async getUsers() {
    const result = await this.pool.query('SELECT id, usuario, nombre, email, rol FROM usuarios ORDER BY id');
    return result.rows;
  }

  async createEmpleado(empleadoData) {
    const query = `
      INSERT INTO empleados (id, placa, rango, nombre, apellido, departamento_id, correo_electronico, cedula, telefono, fecha_nacimiento)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    const values = [
      empleadoData.id,
      empleadoData.placa,
      empleadoData.rango,
      empleadoData.nombre,
      empleadoData.apellido,
      empleadoData.departamento_id,
      empleadoData.correo_electronico,
      empleadoData.cedula,
      empleadoData.telefono,
      empleadoData.fecha_nacimiento
    ];
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async updateEmpleado(id, empleadoData) {
    const setClause = Object.keys(empleadoData)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');
    
    const query = `UPDATE empleados SET ${setClause} WHERE id = $1 RETURNING *`;
    const values = [id, ...Object.values(empleadoData)];
    
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async deleteEmpleado(id) {
    await this.pool.query('DELETE FROM empleados WHERE id = $1', [id]);
  }

  async getInventarioPrincipal() {
    const result = await this.pool.query('SELECT * FROM inventario_principal ORDER BY id');
    return result.rows;
  }

  async getInventarioPeriferico() {
    const result = await this.pool.query('SELECT * FROM inventario_periferico ORDER BY id_periferico');
    return result.rows;
  }

  async close() {
    await this.pool.end();
  }
}

module.exports = PostgreSQLStorage;