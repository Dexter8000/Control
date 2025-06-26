const {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  date,
  integer,
} = require("drizzle-orm/pg-core");
const { relations } = require("drizzle-orm");
const { createInsertSchema } = require("drizzle-zod");
const { z } = require("zod");

// Session storage table (required for Replit Auth)
const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Departamentos table
const departamentos = pgTable("departamentos", {
  id: varchar("id").primaryKey(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
});

// Empleados table
const empleados = pgTable("empleados", {
  id: varchar("id").primaryKey(),
  placa: varchar("placa"),
  rango: varchar("rango", { length: 50 }),
  nombre: varchar("nombre", { length: 100 }),
  apellido: varchar("apellido", { length: 100 }),
  departamentoId: varchar("departamento_id").references(() => departamentos.id),
  correoElectronico: varchar("correo_electronico", { length: 255 }),
  cedula: varchar("cedula", { length: 20 }),
  telefono: varchar("telefono", { length: 20 }),
  fechaNacimiento: date("fecha_nacimiento"),
});

// Usuarios table
const usuariosTable = pgTable("usuarios", {
  id: integer("id").primaryKey(),
  usuario: varchar("usuario", { length: 50 }),
  contrasena: varchar("contrasena", { length: 255 }),
  rol: varchar("rol", { length: 50 }),
});

// Inventario Principal table
const inventarioPrincipal = pgTable("inventario_principal", {
  id: varchar("id").primaryKey(),
  nombre: varchar("nombre", { length: 255 }),
  marca: varchar("marca", { length: 100 }),
  modelo: varchar("modelo", { length: 100 }),
  serie: varchar("serie", { length: 100 }),
  categoria: varchar("categoria", { length: 100 }),
  subcategoria: varchar("subcategoria", { length: 100 }),
  estado: varchar("estado", { length: 50 }),
  condicion: varchar("condicion", { length: 50 }),
  tipoAdquisicion: varchar("tipo_adquisicion", { length: 50 }),
  idDepartamentoAsignado: varchar("id_departamento_asignado").references(() => departamentos.id),
  ubicacionEspecifica: varchar("ubicacion_especifica", { length: 255 }),
  responsableActual: varchar("responsable_actual").references(() => empleados.id),
  fechaCreacion: timestamp("fecha_creacion"),
  fechaAdquisicion: date("fecha_adquisicion"),
  detalles: text("detalles"),
});

// Inventario Periférico table
const inventarioPeriferico = pgTable("inventario_periferico", {
  idPeriferico: varchar("id_periferico").primaryKey(),
  nombrePeriferico: varchar("nombre_periferico", { length: 255 }),
  marcaPeriferico: varchar("marca_periferico", { length: 100 }),
  modeloPeriferico: varchar("modelo_periferico", { length: 100 }),
  seriePeriferico: varchar("serie_periferico", { length: 100 }),
  estadoPeriferico: varchar("estado_periferico", { length: 50 }),
  condicionPeriferico: varchar("condicion_periferico", { length: 50 }),
  tipoAdquisicionPeriferico: varchar("tipo_adquisicion_periferico", { length: 50 }),
  idDepartamentoAsignadoPeriferico: varchar("id_departamento_asignado_periferico").references(() => departamentos.id),
  ubicacionEspecificaPeriferico: varchar("ubicacion_especifica_periferico", { length: 255 }),
  responsableActualPeriferico: varchar("responsable_actual_periferico").references(() => empleados.id),
  fechaCreacionPeriferico: timestamp("fecha_creacion_periferico"),
  fechaAdquisicionPeriferico: date("fecha_adquisicion_periferico"),
  detallesPeriferico: text("detalles_periferico"),
  idInventarioPrincipal: varchar("id_inventario_principal").references(() => inventarioPrincipal.id),
});

// Relations
const departamentosRelations = relations(departamentos, ({ many }) => ({
  empleados: many(empleados),
  inventarioPrincipal: many(inventarioPrincipal),
  inventarioPeriferico: many(inventarioPeriferico),
}));

const empleadosRelations = relations(empleados, ({ one, many }) => ({
  departamento: one(departamentos, {
    fields: [empleados.departamentoId],
    references: [departamentos.id],
  }),
  inventarioPrincipal: many(inventarioPrincipal),
  inventarioPeriferico: many(inventarioPeriferico),
}));

const inventarioPrincipalRelations = relations(inventarioPrincipal, ({ one }) => ({
  departamento: one(departamentos, {
    fields: [inventarioPrincipal.idDepartamentoAsignado],
    references: [departamentos.id],
  }),
  responsable: one(empleados, {
    fields: [inventarioPrincipal.responsableActual],
    references: [empleados.id],
  }),
}));

const inventarioPerifericoRelations = relations(inventarioPeriferico, ({ one }) => ({
  departamento: one(departamentos, {
    fields: [inventarioPeriferico.idDepartamentoAsignadoPeriferico],
    references: [departamentos.id],
  }),
  responsable: one(empleados, {
    fields: [inventarioPeriferico.responsableActualPeriferico],
    references: [empleados.id],
  }),
}));

// Insert schemas
const insertDepartamentoSchema = createInsertSchema(departamentos);
const insertEmpleadoSchema = createInsertSchema(empleados);
const insertUsuarioSchema = createInsertSchema(usuariosTable);
const insertInventarioPrincipalSchema = createInsertSchema(inventarioPrincipal);
const insertInventarioPerifericoSchema = createInsertSchema(inventarioPeriferico);

// Export all components
module.exports = {
  sessions,
  users,
  departamentos,
  empleados,
  usuariosTable,
  inventarioPrincipal,
  inventarioPeriferico,
  departamentosRelations,
  empleadosRelations,
  inventarioPrincipalRelations,
  inventarioPerifericoRelations,
  insertDepartamentoSchema,
  insertEmpleadoSchema,
  insertUsuarioSchema,
  insertInventarioPrincipalSchema,
  insertInventarioPerifericoSchema
};