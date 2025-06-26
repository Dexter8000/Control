const {
  users,
  departamentos,
  empleados,
  usuariosTable,
  inventarioPrincipal,
  inventarioPeriferico,
} = require("../shared/schema");
const { db } = require("./db");
const { eq } = require("drizzle-orm");

// Interface for storage operations - comentado para simplicidad en CommonJS
// export interface IStorage {
//   // User operations (required for Replit Auth)
//   getUser(id: string): Promise<User | undefined>;
//   upsertUser(user: UpsertUser): Promise<User>;
//   
//   // Legacy user operations (for existing auth system)
//   getUserByUsername(username: string): Promise<Usuario | undefined>;
//   
//   // Department operations
//   getDepartamentos(): Promise<Departamento[]>;
//   
//   // Employee operations
//   getEmpleados(): Promise<Empleado[]>;
//   getEmpleadosCompletos(): Promise<any[]>;
//   createEmpleado(empleadoData: InsertEmpleado): Promise<Empleado>;
//   updateEmpleado(id: string, empleadoData: Partial<InsertEmpleado>): Promise<Empleado>;
//   deleteEmpleado(id: string): Promise<void>;
//   
//   // Inventory operations
//   getInventarioPrincipal(): Promise<InventarioPrincipal[]>;
//   getInventarioPeriferico(): Promise<InventarioPeriferico[]>;
// }

class DatabaseStorage {
  // User operations (required for Replit Auth)
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData) {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Legacy user operations (for existing auth system)
  async getUserByUsername(username) {
    const [user] = await db.select().from(usuariosTable).where(eq(usuariosTable.usuario, username));
    return user;
  }

  // Department operations
  async getDepartamentos() {
    return await db.select().from(departamentos);
  }

  // Employee operations
  async getEmpleados() {
    return await db.select().from(empleados);
  }

  async getEmpleadosCompletos() {
    return await db
      .select({
        id: empleados.id,
        placa: empleados.placa,
        rango: empleados.rango,
        nombre: empleados.nombre,
        apellido: empleados.apellido,
        departamentoId: empleados.departamentoId,
        departamentoNombre: departamentos.nombre,
        correoElectronico: empleados.correoElectronico,
        cedula: empleados.cedula,
        telefono: empleados.telefono,
        fechaNacimiento: empleados.fechaNacimiento,
      })
      .from(empleados)
      .leftJoin(departamentos, eq(empleados.departamentoId, departamentos.id));
  }

  async createEmpleado(empleadoData) {
    const [empleado] = await db
      .insert(empleados)
      .values(empleadoData)
      .returning();
    return empleado;
  }

  async updateEmpleado(id, empleadoData) {
    const [empleado] = await db
      .update(empleados)
      .set(empleadoData)
      .where(eq(empleados.id, id))
      .returning();
    return empleado;
  }

  async deleteEmpleado(id) {
    await db.delete(empleados).where(eq(empleados.id, id));
  }

  // Inventory operations
  async getInventarioPrincipal() {
    return await db.select().from(inventarioPrincipal);
  }

  async getInventarioPeriferico() {
    return await db.select().from(inventarioPeriferico);
  }
}

const storage = new DatabaseStorage();
module.exports = { storage, DatabaseStorage };