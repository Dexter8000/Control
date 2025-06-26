const { db } = require('./db.ts');
const { 
  departamentos, 
  empleados, 
  usuariosTable, 
  inventarioPrincipal, 
  inventarioPeriferico 
} = require('../shared/schema');

// Datos de departamentos
const departamentosData = [
  { id: 'DEP001', nombre: '01-JEFATURA' },
  { id: 'DEP002', nombre: 'JEFATURA' },
  { id: 'DEP003', nombre: 'DEPARTAMENTO ADMINISTRATIVO' },
  { id: 'DEP004', nombre: 'UNIDADES EN OTRA DEPENDENCIA' },
  { id: 'DEP005', nombre: 'DEPARTAMENTO DE ENLACE Y MONITOREO DE INFORMACION AERONAVAL' },
  { id: 'DEP006', nombre: 'DEPARTAMENTO DE OPERACIONES' },
  { id: 'DEP007', nombre: 'TÉCNICOS OPERACIONALES' },
  { id: 'DEP008', nombre: 'Departamento de Fusión Operacional de Inteligencia' },
  { id: 'DEP009', nombre: 'INTELIGENCIA INSULAR' },
  { id: 'DEP010', nombre: 'INTELIGENCIA AÉREA' },
  { id: 'DEP011', nombre: 'Departamento de Análisis de Inteligencia' },
  { id: 'DEP012', nombre: 'DEPARTAMENTO CANINO' },
  { id: 'DEP013', nombre: 'DEPARTAMENTO DE INTELIGENCIA CRIMINAL' },
  { id: 'DEP014', nombre: 'DEPARTAMENTO REGIONAL DE INTELIGENCIA AERONAVAL' },
  { id: 'DEP015', nombre: '[sin departamento]' },
  { id: 'DEP016', nombre: 'DEPARTAMENTO sin recurso' }
];

// Datos de empleados
const empleadosData = [
  { id: 'EMP001', placa: '10722', rango: 'SUBCOMISIONADO', nombre: 'JHONATHAN INDOMAR', apellido: 'ALI SANCHEZ', departamentoId: 'DEP001', correoElectronico: 'jhonathan.ali@ejemplo.com', cedula: '8-123-456', telefono: '6123-4567', fechaNacimiento: new Date('1978-05-15') },
  { id: 'EMP002', placa: '80040', rango: 'SUBCOMISIONADO', nombre: 'LEE', apellido: 'BAZER MELENDEZ', departamentoId: 'DEP002', correoElectronico: 'lee.bazer@ejemplo.com', cedula: '8-234-567', telefono: '6234-5678', fechaNacimiento: new Date('1980-03-20') },
  { id: 'EMP003', placa: '23456', rango: 'AGENTE', nombre: 'ANA', apellido: 'SOFIA PEREZ GOMEZ', departamentoId: 'DEP003', correoElectronico: 'ana.perez@ejemplo.com', cedula: '8-345-678', telefono: '6345-6789', fechaNacimiento: new Date('1990-11-01') },
  { id: 'EMP004', placa: '78901', rango: 'CABO 1RO.', nombre: 'MARCO ANTONIO', apellido: 'RODRIGUEZ VERA', departamentoId: 'DEP004', correoElectronico: 'marco.rodriguez@ejemplo.com', cedula: '8-456-789', telefono: '6456-7890', fechaNacimiento: new Date('1985-07-22') },
  { id: 'EMP005', placa: '11223', rango: 'CABO 2DO.', nombre: 'LUISA FERNANDA', apellido: 'DIAZ ACOSTA', departamentoId: 'DEP005', correoElectronico: 'luisa.diaz@ejemplo.com', cedula: '8-567-890', telefono: '6567-8901', fechaNacimiento: new Date('1992-09-08') },
  { id: 'EMP006', placa: '33445', rango: 'SGTO. 2DO.', nombre: 'PEDRO JOSE', apellido: 'MORALES CASTRO', departamentoId: 'DEP006', correoElectronico: 'pedro.morales@ejemplo.com', cedula: '8-678-901', telefono: '6678-9012', fechaNacimiento: new Date('1988-02-28') },
  { id: 'EMP007', placa: '55667', rango: 'SGTO. 1RO.', nombre: 'MARIA ELENA', apellido: 'VARGAS RIOS', departamentoId: 'DEP007', correoElectronico: 'maria.vargas@ejemplo.com', cedula: '8-789-012', telefono: '6789-0123', fechaNacimiento: new Date('1983-04-10') },
  { id: 'EMP008', placa: '77889', rango: 'TENIENTE', nombre: 'CARLOS ALBERTO', apellido: 'TORRES MENDEZ', departamentoId: 'DEP008', correoElectronico: 'carlos.torres@ejemplo.com', cedula: '8-890-123', telefono: '6890-1234', fechaNacimiento: new Date('1975-12-05') },
  { id: 'EMP009', placa: '99001', rango: 'CAPITÁN', nombre: 'LAURA PATRICIA', apellido: 'JIMENEZ ORTIZ', departamentoId: 'DEP009', correoElectronico: 'laura.jimenez@ejemplo.com', cedula: '8-012-345', telefono: '6012-3456', fechaNacimiento: new Date('1970-06-18') },
  { id: 'EMP010', placa: '22334', rango: 'MAYOR', nombre: 'ROBERTO CARLOS', apellido: 'JIMENEZ LOPEZ', departamentoId: 'DEP010', correoElectronico: 'roberto.sanchez@ejemplo.com', cedula: '8-012-345', telefono: '6012-3456', fechaNacimiento: new Date('1968-01-25') },
  { id: 'EMP011', placa: '44556', rango: 'CORONEL', nombre: 'SOFIA ALEJANDRA', apellido: 'MARTINEZ RUIZ', departamentoId: 'DEP011', correoElectronico: 'sofia.martinez@ejemplo.com', cedula: '8-123-457', telefono: '7123-4567', fechaNacimiento: new Date('1965-03-03') },
  { id: 'EMP012', placa: '66778', rango: 'CORONEL', nombre: 'JUAN CARLOS', apellido: 'GONZALEZ HERRERA', departamentoId: 'DEP012', correoElectronico: 'juan.gonzalez@ejemplo.com', cedula: '8-234-568', telefono: '7234-5678', fechaNacimiento: new Date('1967-08-01') },
  { id: 'EMP013', placa: '38990', rango: 'COMISIONADO', nombre: 'PATRICIA ELENA', apellido: 'RAMIREZ FLORES', departamentoId: 'DEP013', correoElectronico: 'patricia.ramirez@ejemplo.com', cedula: '8-345-679', telefono: '7345-6789', fechaNacimiento: new Date('1972-09-12') },
  { id: 'EMP014', placa: '11124', rango: 'SUBCOMISIONADO', nombre: 'MIGUEL ANGEL', apellido: 'HERNANDEZ GARCIA', departamentoId: 'DEP001', correoElectronico: 'miguel.hernandez@ejemplo.com', cedula: '8-456-790', telefono: '7456-7890', fechaNacimiento: new Date('1979-04-04') },
  { id: 'EMP015', placa: '33346', rango: 'AGENTE', nombre: 'DIANA CAROLINA', apellido: 'LOPEZ PEREZ', departamentoId: 'DEP002', correoElectronico: 'diana.lopez@ejemplo.com', cedula: '8-567-891', telefono: '7567-8901', fechaNacimiento: new Date('1991-01-20') },
  { id: 'EMP016', placa: '55568', rango: 'CABO 2DO.', nombre: 'FERNANDO JOSE', apellido: 'DIAZ RODRIGUEZ', departamentoId: 'DEP003', correoElectronico: 'fernando.diaz@ejemplo.com', cedula: '8-678-902', telefono: '7678-9012', fechaNacimiento: new Date('1986-10-30') },
  { id: 'EMP017', placa: '77790', rango: 'CABO 1RO.', nombre: 'GABRIELA ANDREA', apellido: 'MARTINEZ GOMEZ', departamentoId: 'DEP004', correoElectronico: 'gabriela.martinez@ejemplo.com', cedula: '8-789-013', telefono: '7789-0123', fechaNacimiento: new Date('1984-06-07') },
  { id: 'EMP018', placa: '99902', rango: 'SGTO. 2DO.', nombre: 'ALEJANDRO DAVID', apellido: 'PEREZ VARGAS', departamentoId: 'DEP005', correoElectronico: 'alejandro.perez@ejemplo.com', cedula: '8-890-124', telefono: '7890-1234', fechaNacimiento: new Date('1989-03-17') },
  { id: 'EMP019', placa: '22235', rango: 'SGTO. 1RO.', nombre: 'CAROLINA ISABEL', apellido: 'RODRIGUEZ TORRES', departamentoId: 'DEP006', correoElectronico: 'carolina.rodriguez@ejemplo.com', cedula: '8-901-235', telefono: '7901-2345', fechaNacimiento: new Date('1982-05-25') },
  { id: 'EMP020', placa: '44457', rango: 'TENIENTE', nombre: 'JAVIER EDUARDO', apellido: 'GOMEZ JIMENEZ', departamentoId: 'DEP007', correoElectronico: 'javier.gomez@ejemplo.com', cedula: '8-012-346', telefono: '7012-3456', fechaNacimiento: new Date('1977-02-14') },
  { id: 'EMP021', placa: '66679', rango: 'CAPITÁN', nombre: 'VALERIA SOFIA', apellido: 'SANCHEZ ORTIZ', departamentoId: 'DEP008', correoElectronico: 'valeria.sanchez@ejemplo.com', cedula: '8-123-458', telefono: '7123-4567', fechaNacimiento: new Date('1973-09-01') },
  { id: 'EMP022', placa: '88901', rango: 'MAYOR', nombre: 'RICARDO ALBERTO', apellido: 'TORRES LOPEZ', departamentoId: 'DEP009', correoElectronico: 'ricardo.torres@ejemplo.com', cedula: '8-234-569', telefono: '6234-5678', fechaNacimiento: new Date('1970-04-29') },
  { id: 'EMP023', placa: '00013', rango: 'TENIENTE CORONEL', nombre: 'MONICA ALEJANDRA', apellido: 'JIMENEZ GOMEZ', departamentoId: 'DEP010', correoElectronico: 'monica.jimenez@ejemplo.com', cedula: '8-345-680', telefono: '6345-6789', fechaNacimiento: new Date('1969-07-11') },
  { id: 'EMP024', placa: '23336', rango: 'CORONEL', nombre: 'HECTOR MANUEL', apellido: 'LOPEZ GONZALEZ', departamentoId: 'DEP011', correoElectronico: 'hector.lopez@ejemplo.com', cedula: '8-456-791', telefono: '6456-7890', fechaNacimiento: new Date('1966-10-02') },
  { id: 'EMP025', placa: '44558', rango: 'COMISIONADO', nombre: 'NATALIA ANDREA', apellido: 'MARTINEZ RAMIREZ', departamentoId: 'DEP012', correoElectronico: 'natalia.martinez@ejemplo.com', cedula: '8-567-892', telefono: '6567-8901', fechaNacimiento: new Date('1974-03-19') },
  { id: 'EMP026', placa: '55669', rango: 'AGENTE', nombre: 'LUIS MIGUEL', apellido: 'HERNANDEZ PAEZ', departamentoId: 'DEP003', correoElectronico: 'luis.hernandez@ejemplo.com', cedula: '8-678-903', telefono: '6678-9013', fechaNacimiento: new Date('1993-06-01') },
  { id: 'EMP027', placa: '77791', rango: 'CABO 2DO.', nombre: 'CRISTINA JOSE', apellido: 'GOMEZ RUIZ', departamentoId: 'DEP004', correoElectronico: 'cristina.gomez@ejemplo.com', cedula: '8-789-014', telefono: '6789-0124', fechaNacimiento: new Date('1987-12-24') },
  { id: 'EMP028', placa: '99903', rango: 'CABO 1RO.', nombre: 'PABLO ANDRES', apellido: 'DIAZ MELENDEZ', departamentoId: 'DEP005', correoElectronico: 'pablo.diaz@ejemplo.com', cedula: '8-890-125', telefono: '7890-1235', fechaNacimiento: new Date('1981-08-09') },
  { id: 'EMP029', placa: '22236', rango: 'SGTO. 2DO.', nombre: 'SANDRA LILIANA', apellido: 'VARGAS SOTO', departamentoId: 'DEP006', correoElectronico: 'sandra.vargas@ejemplo.com', cedula: '8-901-236', telefono: '7901-2346', fechaNacimiento: new Date('1980-01-16') },
  { id: 'EMP030', placa: '44458', rango: 'SGTO. 1RO.', nombre: 'GUSTAVO ADOLFO', apellido: 'SANCHEZ MORALES', departamentoId: 'DEP007', correoElectronico: 'gustavo.sanchez@ejemplo.com', cedula: '8-012-347', telefono: '7012-3457', fechaNacimiento: new Date('1976-11-20') }
];

// Datos de usuarios
const usuariosData = [
  { id: 1, usuario: 'juan_perez', contrasena: 'contrasenal123', rol: 'administrador' },
  { id: 2, usuario: 'maria_lopez', contrasena: 'mi4523', rol: 'administrador' },
  { id: 3, usuario: 'pedro_gomez', contrasena: 'abc12345', rol: 'no administrador' },
  { id: 4, usuario: 'admin', contrasena: 'admin', rol: 'administrador' },
  { id: 5, usuario: 'dexterl', contrasena: 'Panama21', rol: 'administrador' },
  { id: 6, usuario: 'ana_montes', contrasena: 'segur4psswd', rol: 'no administrador' },
  { id: 7, usuario: 'luis_bravo', contrasena: 'Lb.2025!', rol: 'administrador' },
  { id: 8, usuario: 'sara_rojas', contrasena: 'SR_Pass123', rol: 'no administrador' },
  { id: 9, usuario: 'carlo_diaz', contrasena: 'cdiaz_adm', rol: 'administrador' },
  { id: 10, usuario: 'elena_flores', contrasena: 'EF@2025xyz', rol: 'no administrador' }
];

// Datos de inventario principal
const inventarioPrincipalData = [
  { id: 'PC0001', nombre: 'Monitor Dell UltraSharp 27"', marca: 'Dell', modelo: 'U2721DE', serie: 'DELMON02721D', categoria: 'Computadoras y Accesorios', subcategoria: 'Monitores', estado: 'operativo', condicion: 'nuevo', tipoAdquisicion: 'compra', idDepartamentoAsignado: 'DEP001', ubicacionEspecifica: 'Oficina 101', responsableActual: 'EMP001', fechaCreacion: new Date('2024-03-01T10:00:00'), fechaAdquisicion: new Date('2024-02-28'), detalles: null },
  { id: 'PC0002', nombre: 'Teclado Mecánico', marca: 'Logitech', modelo: 'G Pro X', serie: 'LOGPROXON01', categoria: 'Computadoras y Accesorios', subcategoria: 'Teclados', estado: 'operativo', condicion: 'nuevo', tipoAdquisicion: 'compra', idDepartamentoAsignado: 'DEP002', ubicacionEspecifica: 'Cubículo B-5', responsableActual: 'EMP002', fechaCreacion: new Date('2024-03-05T11:30:00'), fechaAdquisicion: new Date('2024-03-01'), detalles: null },
  { id: 'PC0008', nombre: 'Computadora de Torre Dell OptiPlex', marca: 'Dell', modelo: 'OptiPlex 7000', serie: 'DELLOPT000A', categoria: 'Computadoras y Accesorios', subcategoria: 'PCs de Escritorio', estado: 'operativo', condicion: 'nuevo', tipoAdquisicion: 'compra', idDepartamentoAsignado: 'DEP001', ubicacionEspecifica: 'Oficina 101', responsableActual: 'EMP001', fechaCreacion: new Date('2024-06-20T09:00:00'), fechaAdquisicion: new Date('2024-06-18'), detalles: 'Para diseño gráfico' },
  { id: 'PC0009', nombre: 'Computadora de Torre HP ProDesk', marca: 'HP', modelo: 'ProDesk 600 G9', serie: 'HPPRO000B', categoria: 'Computadoras y Accesorios', subcategoria: 'PCs de Escritorio', estado: 'operativo', condicion: 'nuevo', tipoAdquisicion: 'compra', idDepartamentoAsignado: 'DEP002', ubicacionEspecifica: 'Cubículo B-6', responsableActual: 'EMP002', fechaCreacion: new Date('2024-06-21T10:00:00'), fechaAdquisicion: new Date('2024-06-19'), detalles: 'Para desarrollo de software' }
];

// Datos de inventario periférico (actualizado con id_inventario_principal)
const inventarioPerifericoData = [
  { idPeriferico: 'PERI001', nombrePeriferico: 'Monitor Dell UltraSharp 27"', marcaPeriferico: 'Dell', modeloPeriferico: 'U2721DE', seriePeriferico: 'DELMON02721D', estadoPeriferico: 'operativo', condicionPeriferico: 'nuevo', tipoAdquisicionPeriferico: 'compra', idDepartamentoAsignadoPeriferico: 'DEP001', ubicacionEspecificaPeriferico: 'Oficina 101', responsableActualPeriferico: 'EMP001', fechaCreacionPeriferico: new Date('2024-06-18T00:00:00'), fechaAdquisicionPeriferico: new Date('2024-06-18'), detallesPeriferico: null },
  { idPeriferico: 'PERI002', nombrePeriferico: 'Teclado Mecánico', marcaPeriferico: 'Logitech', modeloPeriferico: 'G Pro X', seriePeriferico: 'LOGPROXON01', estadoPeriferico: 'operativo', condicionPeriferico: 'nuevo', tipoAdquisicionPeriferico: 'compra', idDepartamentoAsignadoPeriferico: 'DEP001', ubicacionEspecificaPeriferico: 'Oficina 101', responsableActualPeriferico: 'EMP001', fechaCreacionPeriferico: new Date('2024-06-18T00:00:00'), fechaAdquisicionPeriferico: new Date('2024-06-18'), detallesPeriferico: null }
];

async function migrateDatabase() {
  try {
    console.log('🚀 Iniciando migración de base de datos PostgreSQL...');

    // Insertar departamentos
    console.log('📁 Insertando departamentos...');
    await db.insert(departamentos).values(departamentosData).onConflictDoNothing();

    // Insertar usuarios
    console.log('👤 Insertando usuarios...');
    await db.insert(usuariosTable).values(usuariosData).onConflictDoNothing();

    // Insertar empleados
    console.log('👥 Insertando empleados...');
    await db.insert(empleados).values(empleadosData).onConflictDoNothing();

    // Insertar inventario principal
    console.log('💻 Insertando inventario principal...');
    await db.insert(inventarioPrincipal).values(inventarioPrincipalData).onConflictDoNothing();

    // Insertar inventario periférico
    console.log('🖱️ Insertando inventario periférico...');
    await db.insert(inventarioPeriferico).values(inventarioPerifericoData).onConflictDoNothing();

    console.log('✅ Migración completada exitosamente');
    return true;
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  }
}

module.exports = { migrateDatabase };

// Ejecutar migración si se llama directamente
if (require.main === module) {
  migrateDatabase()
    .then(() => {
      console.log('🎯 Migración ejecutada exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en migración:', error);
      process.exit(1);
    });
}