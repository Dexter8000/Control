require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const Database = require('./database/config');
const VacacionesManager = require('./database/vacaciones');

// Verificar si se proporcionó la cadena de conexión a PostgreSQL
const HAS_DATABASE_URL = Boolean(process.env.DATABASE_URL);
if (!HAS_DATABASE_URL) {
  console.error('⚠️  DATABASE_URL no está definido. Se omitirá la inicialización de PostgreSQL y se usará únicamente SQLite.');
} else {
  console.log('🔌 Conexión de PostgreSQL detectada a través de DATABASE_URL');
  // Aquí se inicializaría PostgreSQL cuando esté disponible
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public')); // Para servir archivos estáticos
app.use('/attached_assets', express.static('attached_assets')); // Para servir videos e imágenes

// Configurar sesiones
app.use(session({
  secret: process.env.SESSION_SECRET || 'mi-secreto-super-seguro-123',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // true en producción con HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}));

// Inicializar base de datos y sistema de préstamos
const db = new Database();
const SistemaPrestamos = require('./database/prestamos');
const prestamos = new SistemaPrestamos();


db.connect().then(() => {
  console.log('🎯 Sistema SQLite de base de datos inicializado correctamente');
  return prestamos.conectar();
}).then(() => {
  console.log('📦 Sistema de préstamos inicializado');
}).catch(err => {
  console.error('❌ Error inicializando el sistema:', err);
});

// Sistema RBAC - Middleware de permisos
function requireRole(roles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ success: false, message: 'No autenticado' });
    }

    const userRole = req.session.user.rol;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Permisos insuficientes',
        requiredRoles: allowedRoles,
        userRole: userRole
      });
    }

    next();
  };
}

// RUTAS

// Ruta principal - servir página de login
app.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Ruta de login
app.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// API de autenticación (compatible con migración)
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const clientIP = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent');

  if (!username || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Username y password son requeridos' 
    });
  }

  try {
    // Buscar usuario en la base de datos
    const usuario = await db.getUser(username);

    if (!usuario) {
      // Log intento fallido sin usuario válido
      await db.logAccess(null, 'LOGIN_FAILED', clientIP, userAgent, false, 'Usuario no encontrado');
      return res.status(401).json({ 
        success: false, 
        message: 'Usuario no encontrado'
      });
    }

    // Verificar si el usuario está bloqueado
    if (usuario.bloqueado_hasta && new Date(usuario.bloqueado_hasta) > new Date()) {
      await db.logAccess(usuario.id, 'LOGIN_BLOCKED', clientIP, userAgent, false, 'Usuario bloqueado temporalmente');
      return res.status(423).json({ 
        success: false, 
        message: 'Usuario temporalmente bloqueado. Intente más tarde.'
      });
    }

    // Verificar password directamente (sin hashing por ahora)
    const passwordValido = (password === usuario.contrasena);

    if (!passwordValido) {
      // Incrementar intentos fallidos
      await db.incrementFailedAttempts(usuario.id);
      await db.logAccess(usuario.id, 'LOGIN_FAILED', clientIP, userAgent, false, 'Contraseña incorrecta');

      return res.status(401).json({ 
        success: false, 
        message: 'Password incorrecto'
      });
    }

    // Login exitoso - actualizar base de datos
    await db.updateLoginSuccess(usuario.id);
    await db.logAccess(usuario.id, 'LOGIN_SUCCESS', clientIP, userAgent, true, 'Login exitoso');

    // Crear sesión
    req.session.user = {
      id: usuario.id,
      username: usuario.usuario || usuario.username,
      email: usuario.email,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      rol: usuario.rol
    };

    res.json({ 
      success: true, 
      message: 'Login exitoso',
      user: req.session.user
    });
  } catch (error) {
    console.error('❌ Error en login:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor'
    });
  }
});

// Dashboard (después del login) - Redirigir al dashboard ejecutivo
app.get('/dashboard', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  // Servir el dashboard ejecutivo mejorado
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// === Endpoints de Dashboard (SQLite) ===
app.get('/api/dashboard/total-empleados', (req, res) => {
  db.db.get('SELECT COUNT(*) as total FROM empleados', [], (err, row) => {
    if (err) {
      console.error('Error al obtener total de empleados:', err);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
    res.json({ total: row.total });
  });
});

app.get('/api/dashboard/rangos-por-departamento', (req, res) => {
  const query = `
    SELECT e.rango AS rango_nombre, d.nombre AS departamento_nombre, COUNT(*) AS cantidad
    FROM empleados e
    LEFT JOIN departamentos d ON e.departamento_id = d.id
    WHERE e.rango IS NOT NULL AND e.rango != ''
    GROUP BY e.rango, d.nombre
    ORDER BY cantidad DESC, rango_nombre, departamento_nombre;
  `;
  db.db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Error al obtener rangos por departamento:', err);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
    res.json({ detalle: rows });
  });
});

app.get('/api/dashboard/cantidad-rangos', (req, res) => {
  const query = `
    SELECT rango AS rango_nombre, COUNT(*) as cantidad
    FROM empleados
    WHERE rango IS NOT NULL AND rango != ''
    GROUP BY rango
    ORDER BY cantidad DESC;
  `;
  db.db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Error al obtener cantidad de rangos:', err);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
    res.json({ detalle: rows });
  });
});

app.get('/api/dashboard/total-departamentos', (req, res) => {
  db.db.get('SELECT COUNT(*) as total FROM departamentos', [], (err, row) => {
    if (err) {
      console.error('Error al obtener total de departamentos:', err);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
    res.json({ total: row.total });
  });
});

app.get('/api/dashboard/datos-incompletos', (req, res) => {
  const query = `
    SELECT id, nombre, rango, departamento_id
    FROM empleados
    WHERE nombre IS NULL OR nombre = ''
       OR rango IS NULL OR rango = ''
       OR departamento_id IS NULL OR departamento_id = '';
  `;
  db.db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Error al obtener datos incompletos:', err);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
    res.json({
      ids: rows.map(row => row.id),
      detalle: rows,
      count: rows.length
    });
  });
});

// API de logout
app.post('/api/logout', async (req, res) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent');
  const userId = req.session.user ? req.session.user.id : null;

  try {
    if (userId) {
      await db.logAccess(userId, 'LOGOUT', clientIP, userAgent, true, 'Logout exitoso');
    }

    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error al cerrar sesión' });
      }
      res.json({ success: true, message: 'Sesión cerrada' });
    });
  } catch (error) {
    console.error('❌ Error en logout:', error);
    res.status(500).json({ success: false, message: 'Error al cerrar sesión' });
  }
});

// Middleware para verificar autenticación
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
}

// RUTAS API PARA PRÉSTAMOS Y DEVOLUCIONES

// Obtener equipos disponibles para préstamo
app.get('/api/equipos-disponibles', requireAuth, async (req, res) => {
  try {
    const equipos = await prestamos.obtenerEquiposDisponibles();
    res.json({ success: true, equipos });
  } catch (error) {
    console.error('❌ Error obteniendo equipos disponibles:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo equipos disponibles' });
  }
});

// Obtener equipos asignados para devolución
app.get('/api/equipos-asignados', requireAuth, async (req, res) => {
  try {
    const equipos = await prestamos.obtenerEquiposAsignados();
    res.json({ success: true, equipos });
  } catch (error) {
    console.error('❌ Error obteniendo equipos asignados:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo equipos asignados' });
  }
});

// Obtener empleados para asignación
app.get('/api/empleados', requireAuth, async (req, res) => {
  try {
    console.log('🔍 Obteniendo empleados desde la base de datos...');
    const empleados = await db.getEmpleadosCompletos();
    console.log(`✅ Obtenidos ${empleados.length} empleados`);
    // Transformar datos para compatibilidad con frontend
    const empleadosFormateados = empleados.map(emp => ({
      ...emp,
      departamento: emp.departamento_nombre || emp.departamento || 'Sin departamento'
    }));
    console.log('✅ Datos transformados, enviando respuesta...');
    res.json(empleadosFormateados);
  } catch (error) {
    console.error('❌ Error obteniendo empleados:', error.message);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({ error: 'Error obteniendo empleados', details: error.message });
  }
});

// Obtener empleados completos con cálculos de vacaciones
app.get('/api/empleados-completos', requireAuth, async (req, res) => {
    console.log('🔍 Obteniendo empleados completos con información de departamentos...');

    const query = `
        SELECT 
            e.*,
            d.nombre as departamento_nombre
        FROM empleados e
        LEFT JOIN departamentos d ON e.departamento_id = d.id
        ORDER BY e.id ASC
    `;

    db.db.all(query, [], (err, rows) => {
        if (err) {
            console.error('❌ Error obteniendo empleados completos:', err);
            res.status(500).json({ 
                success: false, 
                message: 'Error en la base de datos',
                error: err.message 
            });
        } else {
            console.log(`✅ Empleados completos obtenidos: ${rows.length} registros`);
            res.json({ 
                success: true, 
                empleados: rows,
                total: rows.length
            });
        }
    });
});

// Obtener estadísticas de empleados para el dashboard
app.get('/api/empleados-estadisticas', requireAuth, async (req, res) => {
    console.log('📊 Calculando estadísticas de empleados...');

    try {
        const queries = {
            totalEmpleados: 'SELECT COUNT(*) as total FROM empleados',
            totalRangosUnicos: 'SELECT COUNT(DISTINCT rango) as total FROM empleados WHERE rango IS NOT NULL AND rango != ""',
            totalDepartamentos: 'SELECT COUNT(*) as total FROM departamentos',
            rangoMasComun: `
                SELECT rango, COUNT(*) as cantidad 
                FROM empleados 
                WHERE rango IS NOT NULL AND rango != ""
                GROUP BY rango 
                ORDER BY cantidad DESC 
                LIMIT 1
            `,
            rangosPorDepartamento: `
                SELECT d.nombre as departamento, e.rango, COUNT(*) as cantidad
                FROM empleados e
                JOIN departamentos d ON e.departamento_id = d.id
                WHERE e.rango IS NOT NULL AND e.rango != ""
                GROUP BY d.nombre, e.rango
                ORDER BY d.nombre, cantidad DESC
            `
        };

        const resultados = {};

        // Ejecutar consultas en paralelo
        const promesas = Object.entries(queries).map(([key, query]) => {
            return new Promise((resolve, reject) => {
                if (key === 'rangosPorDepartamento') {
                    db.db.all(query, [], (err, rows) => {
                        if (err) reject(err);
                        else resolve([key, rows]);
                    });
                } else {
                    db.db.get(query, [], (err, row) => {
                        if (err) reject(err);
                        else resolve([key, row]);
                    });
                }
            });
        });

        const resultadosArray = await Promise.all(promesas);
        resultadosArray.forEach(([key, value]) => {
            resultados[key] = value;
        });

        const estadisticas = {
            total_empleados: resultados.totalEmpleados?.total || 0,
            total_rangos_unicos: resultados.totalRangosUnicos?.total || 0,
            total_departamentos: resultados.totalDepartamentos?.total || 0,
            rango_mas_comun: resultados.rangoMasComun || { rango: 'N/A', cantidad: 0 },
            rangos_por_departamento: resultados.rangosPorDepartamento || []
        };

        console.log('✅ Estadísticas calculadas:', estadisticas);
        res.json({ success: true, estadisticas });

    } catch (error) {
        console.error('❌ Error calculando estadísticas:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error calculando estadísticas de empleados' 
        });
    }
});

// Obtener empleado individual
app.get('/api/empleado/:id', requireAuth, (req, res) => {
    const empleadoId = req.params.id;
    console.log('🔍 Obteniendo empleado individual ID:', empleadoId);

    const query = `
        SELECT 
            e.*,
            d.nombre as departamento_nombre
        FROM empleados e
        LEFT JOIN departamentos d ON e.departamento_id = d.id
        WHERE e.id = ?
    `;

    db.db.get(query, [empleadoId], (err, row) => {
        if (err) {
            console.error('❌ Error obteniendo empleado:', err);
            res.status(500).json({ 
                success: false, 
                message: 'Error en la base de datos',
                error: err.message 
            });
        } else if (!row) {
            console.log('❌ Empleado no encontrado:', empleadoId);
            res.status(404).json({ 
                success: false, 
                message: 'Empleado no encontrado'
            });
        } else {
            console.log('✅ Empleado encontrado:', row.nombre, row.apellido);
            res.json({ 
                success: true, 
                empleado: row
            });
        }
    });
});

// Endpoint para carga masiva de empleados (solo administradores)
app.post('/api/empleados/mass-upload', requireAuth, requireRole('administrador'), async (req, res) => {
  const { empleados } = req.body;

  if (!empleados || !Array.isArray(empleados)) {
    return res.status(400).json({
      success: false,
      message: 'Se requiere un array de empleados'
    });
  }

  const resultados = {
    exitosos: 0,
    errores: 0,
    detalles: []
  };

  // Cargar departamentos para validación
  const departamentos = await db.getDepartamentos();

  for (let i = 0; i < empleados.length; i++) {
    const empleado = empleados[i];
    const fila = i + 2;

    try {
      // Validaciones básicas
      if (!empleado.nombre || !empleado.apellido || !empleado.rango) {
        resultados.errores++;
        resultados.detalles.push(`Fila ${fila}: Nombre, apellido y rango son requeridos`);
        continue;
      }

      // Buscar departamento_id si se proporcionó nombre de departamento
      if (empleado.departamento && !empleado.departamento_id) {
        const deptoEncontrado = departamentos.find(d => d.nombre === empleado.departamento);
        if (deptoEncontrado) {
          empleado.departamento_id = deptoEncontrado.id;
        } else {
          resultados.errores++;
          resultados.detalles.push(`Fila ${fila}: Departamento '${empleado.departamento}' no encontrado`);
          continue;
        }
      }

      // Crear empleado
      const resultado = await db.createEmpleado(empleado);
      
      resultados.exitosos++;
      resultados.detalles.push(`Fila ${fila}: Empleado '${empleado.nombre} ${empleado.apellido}' creado con ID ${resultado.id}`);

    } catch (error) {
      resultados.errores++;
      resultados.detalles.push(`Fila ${fila}: Error - ${error.message}`);
    }
  }

  console.log(`📊 Carga masiva empleados completada: ${resultados.exitosos} exitosos, ${resultados.errores} errores`);

  res.json({
    success: true,
    message: `Carga masiva completada: ${resultados.exitosos} empleados creados, ${resultados.errores} errores`,
    resultados
  });
});

// Crear nuevo empleado
app.post('/api/empleados', requireAuth, async (req, res) => {
  const empleadoData = req.body;

  try {
    // Buscar departamento_id si se envió nombre de departamento
    if (empleadoData.departamento && !empleadoData.departamento_id) {
      const departamentos = await db.getDepartamentos();
      const deptoEncontrado = departamentos.find(d => d.nombre === empleadoData.departamento);
      if (deptoEncontrado) {
        empleadoData.departamento_id = deptoEncontrado.id;
      }
    }

    const resultado = await db.createEmpleado(empleadoData);
    res.status(201).json({ success: true, message: 'Empleado creado exitosamente', empleadoId: resultado.id });
  } catch (error) {
    console.error('❌ Error creando empleado:', error);
    res.status(500).json({ error: 'Error creando empleado: ' + error.message });
  }
});

// Actualizar empleado existente
app.put('/api/empleados/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const empleadoData = req.body;

  try {
    // Buscar departamento_id si se envió nombre de departamento
    if (empleadoData.departamento && !empleadoData.departamento_id) {
      const departamentos = await db.getDepartamentos();
      const deptoEncontrado = departamentos.find(d => d.nombre === empleadoData.departamento);
      if (deptoEncontrado) {
        empleadoData.departamento_id = deptoEncontrado.id;
      }
    }

    await db.updateEmpleado(id, empleadoData);
    res.json({ success: true, message: 'Empleado actualizado exitosamente' });
  } catch (error) {
    console.error('❌ Error actualizando empleado:', error);
    res.status(500).json({ error: 'Error actualizando empleado: ' + error.message });
  }
});

// Eliminar empleado
app.delete('/api/empleados/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    await db.deleteEmpleado(id);
    res.json({ success: true, message: 'Empleado eliminado exitosamente' });
  } catch (error) {
    console.error('❌ Error eliminando empleado:', error);
    res.status(500).json({ error: 'Error eliminando empleado: ' + error.message });
  }
});

// Limpiar empleados duplicados
app.post('/api/empleados/limpiar-duplicados', requireAuth, async (req, res) => {
  try {
    console.log('🧹 Iniciando limpieza de empleados duplicados...');

    const duplicatesQuery = `
      SELECT nombre, apellido, COUNT(*) as count, GROUP_CONCAT(id) as ids
      FROM empleados 
      GROUP BY nombre, apellido 
      HAVING COUNT(*) > 1
    `;

    const duplicates = await new Promise((resolve, reject) => {
      db.db.all(duplicatesQuery, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    let eliminados = 0;

    for (const duplicate of duplicates) {
      const ids = duplicate.ids.split(',');
      // Mantener el primero (más antiguo) y eliminar los demás
      const toDelete = ids.slice(1);

      for (const idToDelete of toDelete) {
        await new Promise((resolve, reject) => {
          db.db.run('DELETE FROM empleados WHERE id = ?', [idToDelete], function(err) {
            if (err) reject(err);
            else {
              console.log(`🗑️ Eliminado duplicado: ${duplicate.nombre} ${duplicate.apellido} (ID: ${idToDelete})`);
              eliminados++;
              resolve();
            }
          });
        });
      }
    }

    console.log(`✅ Limpieza completada. Eliminados ${eliminados} duplicados`);

    res.json({ 
      success: true, 
      message: `Limpieza completada. Se eliminaron ${eliminados} empleados duplicados`,
      eliminados: eliminados
    });

  } catch (error) {
    console.error('❌ Error limpiando duplicados:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error limpiando duplicados: ' + error.message 
    });
  }
});

// Obtener inventario principal completo
app.get('/api/inventario-principal', requireAuth, async (req, res) => {
  try {
    const inventario = await db.getInventarioPrincipal();
    res.json({ success: true, inventario });
  } catch (error) {
    console.error('❌ Error obteniendo inventario principal:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo inventario principal' });
  }
});

// Obtener inventario periférico completo
app.get('/api/inventario-periferico', requireAuth, async (req, res) => {
  try {
    const inventario = await db.getInventarioPeriferico();
    res.json({ success: true, inventario });
  } catch (error) {
    console.error('❌ Error obteniendo inventario periférico:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo inventario periférico' });
  }
});

// Obtener departamentos
app.get('/api/departamentos', requireAuth, async (req, res) => {
  try {
    const departamentos = await db.getDepartamentos();
    res.json({ success: true, departamentos });
  } catch (error) {
    console.error('❌ Error obteniendo departamentos:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo departamentos' });
  }
});

// Registrar préstamo de equipo
app.post('/api/prestamo', requireAuth, async (req, res) => {
  const { equipoId, tipoEquipo, empleadoId, observaciones } = req.body;

  if (!equipoId || !tipoEquipo || !empleadoId) {
    return res.status(400).json({ 
      success: false, 
      message: 'Faltan datos requeridos (equipoId, tipoEquipo, empleadoId)' 
    });
  }

  try {
    const resultado = await prestamos.registrarPrestamo(
      equipoId, 
      tipoEquipo, 
      empleadoId, 
      req.session.user.id, 
      observaciones || ''
    );

    res.json(resultado);
  } catch (error) {
    console.error('❌ Error registrando préstamo:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Error registrando préstamo' 
    });
  }
});

// Registrar devolución de equipo
app.post('/api/devolucion', requireAuth, async (req, res) => {
  const { equipoId, tipoEquipo, empleadoActual, observaciones } = req.body;

  if (!equipoId || !tipoEquipo || !empleadoActual) {
    return res.status(400).json({ 
      success: false, 
      message: 'Faltan datos requeridos (equipoId, tipoEquipo, empleadoActual)' 
    });
  }

  try {
    const resultado = await prestamos.registrarDevolucion(
      equipoId, 
      tipoEquipo, 
      empleadoActual, 
      req.session.user.id, 
      observaciones || ''
    );

    res.json(resultado);
  } catch (error) {
    console.error('❌ Error registrando devolución:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Error registrando devolución' 
    });
  }
});

// Generar reporte semanal
app.get('/api/reporte-semanal', requireAuth, async (req, res) => {
  const { fechaInicio, fechaFin } = req.query;

  if (!fechaInicio || !fechaFin) {
    return res.status(400).json({ 
      success: false, 
      message: 'Faltan fechas requeridas (fechaInicio, fechaFin)' 
    });
  }

  try {
    const movimientos = await prestamos.generarReporteSemanal(fechaInicio, fechaFin);
    res.json({ success: true, movimientos });
  } catch (error) {
    console.error('❌ Error generando reporte:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error generando reporte semanal' 
    });
  }
});

// === APIS PARA GESTIÓN DE USUARIOS ===

// Obtener todos los usuarios
app.get('/api/usuarios', requireAuth, async (req, res) => {
  try {
    const usuarios = await new Promise((resolve, reject) => {
      db.db.all(`
        SELECT id, usuario, rol, nombre, email
        FROM usuarios
        ORDER BY id ASC
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json({ success: true, usuarios });
  } catch (error) {
    console.error('❌ Error obteniendo usuarios:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error obteniendo usuarios' 
    });
  }
});

// Crear nuevo usuario (solo administradores)
app.post('/api/usuarios', requireAuth, requireRole('administrador'), async (req, res) => {
  const { usuario, password, rol, nombre, email } = req.body;

  if (!usuario || !password || !rol) {
    return res.status(400).json({ 
      success: false, 
      message: 'Usuario, contraseña y rol son requeridos' 
    });
  }

  try {
    // Verificar si el usuario ya existe (cualquier estado)
    const existingUser = await new Promise((resolve, reject) => {
      db.db.get('SELECT * FROM usuarios WHERE usuario = ?', [usuario], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existingUser) {
      console.log(`⚠️ Usuario ${usuario} ya existe. ID: ${existingUser.id}, Activo: ${existingUser.activo}`);
      return res.status(409).json({ 
        success: false, 
        message: `El usuario '${usuario}' ya está registrado en el sistema. Por favor, elija otro nombre de usuario.` 
      });
    }

    // Insertar nuevo usuario con contraseña sin hash
    const newUserId = await new Promise((resolve, reject) => {
      db.db.run(`
        INSERT INTO usuarios (usuario, contrasena, rol, nombre, email, activo, fecha_creacion)
        VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
      `, [usuario, password, rol, nombre || null, email || null], function(err) {
        if (err) {
          console.error('❌ Error SQL creando usuario:', err);
          // Verificar si es error de usuario duplicado
          if (err.code === 'SQLITE_CONSTRAINT' && err.message.includes('usuarios.usuario')) {
            reject(new Error(`El usuario '${usuario}' ya existe en el sistema`));
          } else if (err.code === 'SQLITE_CONSTRAINT') {
            reject(new Error('Violación de restricción de base de datos'));
          } else {
            reject(new Error('Error de base de datos: ' + err.message));
          }
        } else {
          console.log(`✅ Usuario creado exitosamente: ${usuario} (ID: ${this.lastID})`);
          resolve(this.lastID);
        }
      });
    });

    // Log de creación
    await db.logAccess(req.session.user.id, 'USER_CREATED', req.ip, req.get('User-Agent'), true, `Usuario creado: ${usuario}`);

    res.json({ 
      success: true, 
      message: 'Usuario creado exitosamente',
      userId: newUserId
    });

  } catch (error) {
    console.error('❌ Error creando usuario:', error);

    // Manejar errores específicos
    if (error.message === 'El usuario ya existe') {
      return res.status(409).json({ 
        success: false, 
        message: 'El usuario ya existe' 
      });
    }

    res.status(500).json({ 
      success: false, 
      message: 'Error interno al crear usuario: ' + error.message 
    });
  }
});

// Actualizar usuario existente
app.put('/api/usuarios/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { usuario, password, rol, nombre, email } = req.body;

  if (!usuario || !rol) {
    return res.status(400).json({ 
      success: false, 
      message: 'Usuario y rol son requeridos' 
    });
  }

  try {
    // Verificar que el usuario existe
    const existingUser = await new Promise((resolve, reject) => {
      db.db.get('SELECT * FROM usuarios WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!existingUser) {
      return res.status(404).json({ 
        success: false, 
        message: 'Usuario no encontrado' 
      });
    }

    // Verificar si el nombre de usuario está en uso por otro usuario
    if (usuario !== existingUser.usuario) {
      const duplicateUser = await db.getUser(usuario);
      if (duplicateUser && duplicateUser.id !== parseInt(id)) {
        return res.status(409).json({ 
          success: false, 
          message: 'El nombre de usuario ya está en uso' 
        });
      }
    }

    // Preparar datos de actualización
    let updateFields = [];
    let updateValues = [];

    updateFields.push('usuario = ?');
    updateValues.push(usuario);

    updateFields.push('rol = ?');
    updateValues.push(rol);

    if (nombre !== undefined) {
      updateFields.push('nombre = ?');
      updateValues.push(nombre || null);
    }

    if (email !== undefined) {
      updateFields.push('email = ?');
      updateValues.push(email || null);
    }

    // Si se proporciona nueva contraseña
    if (password && password.trim() !== '') {
      updateFields.push('contrasena = ?');
      updateValues.push(password);
    }

    updateValues.push(id);

    // Actualizar usuario
    await new Promise((resolve, reject) => {
      db.db.run(`
        UPDATE usuarios 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `, updateValues, function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });

    // Log de actualización
    await db.logAccess(req.session.user.id, 'USER_UPDATED', req.ip, req.get('User-Agent'), true, `Usuario actualizado: ${usuario}`);

    res.json({ 
      success: true, 
      message: 'Usuario actualizado exitosamente' 
    });

  } catch (error) {
    console.error('❌ Error actualizando usuario:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno al actualizar usuario' 
    });
  }
});

// Endpoint para carga masiva de usuarios (solo administradores)
app.post('/api/usuarios/mass-upload', requireAuth, requireRole('administrador'), async (req, res) => {
  const { usuarios } = req.body;

  if (!usuarios || !Array.isArray(usuarios)) {
    return res.status(400).json({
      success: false,
      message: 'Se requiere un array de usuarios'
    });
  }

  const resultados = {
    exitosos: 0,
    errores: 0,
    detalles: []
  };

  for (let i = 0; i < usuarios.length; i++) {
    const usuario = usuarios[i];
    const fila = i + 2; // +2 porque el array empieza en 0 y la fila 1 son headers

    try {
      // Validaciones básicas
      if (!usuario.usuario || !usuario.password || !usuario.rol) {
        resultados.errores++;
        resultados.detalles.push(`Fila ${fila}: Usuario, contraseña y rol son requeridos`);
        continue;
      }

      // Verificar si el usuario ya existe
      const existingUser = await new Promise((resolve, reject) => {
        db.db.get('SELECT * FROM usuarios WHERE usuario = ?', [usuario.usuario], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (existingUser) {
        resultados.errores++;
        resultados.detalles.push(`Fila ${fila}: Usuario '${usuario.usuario}' ya existe`);
        continue;
      }

      // Insertar usuario
      await new Promise((resolve, reject) => {
        db.db.run(`
          INSERT INTO usuarios (usuario, contrasena, rol, nombre, email, activo, fecha_creacion)
          VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
        `, [
          usuario.usuario,
          usuario.password,
          usuario.rol,
          usuario.nombre || null,
          usuario.email || null
        ], function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        });
      });

      resultados.exitosos++;
      resultados.detalles.push(`Fila ${fila}: Usuario '${usuario.usuario}' creado exitosamente`);

    } catch (error) {
      resultados.errores++;
      resultados.detalles.push(`Fila ${fila}: Error - ${error.message}`);
    }
  }

  console.log(`📊 Carga masiva completada: ${resultados.exitosos} exitosos, ${resultados.errores} errores`);

  res.json({
    success: true,
    message: `Carga masiva completada: ${resultados.exitosos} usuarios creados, ${resultados.errores} errores`,
    resultados
  });
});

// Eliminar usuario (solo administradores)
app.delete('/api/usuarios/:id', requireAuth, requireRole('administrador'), async (req, res) => {
  const { id } = req.params;

  try {
    // Verificar que el usuario existe (sin filtro de activo)
    const existingUser = await new Promise((resolve, reject) => {
      db.db.get('SELECT * FROM usuarios WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!existingUser) {
      return res.status(404).json({ 
        success: false, 
        message: 'Usuario no encontrado' 
      });
    }

    // No permitir que el usuario se elimine a sí mismo
    if (parseInt(id) === req.session.user.id) {
      return res.status(400).json({ 
        success: false, 
        message: 'No puedes eliminar tu propia cuenta' 
      });
    }

    // Eliminar completamente de la base de datos con verificación
    const deletedRows = await new Promise((resolve, reject) => {
      db.db.run('DELETE FROM usuarios WHERE id = ?', [id], function(err) {
        if (err) {
          console.error('❌ Error SQL eliminando usuario:', err);
          reject(err);
        } else {
          console.log(`🗑️ Filas eliminadas: ${this.changes} para usuario ID: ${id}`);
          resolve(this.changes);
        }
      });
    });

    if (deletedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No se pudo eliminar el usuario - puede que ya haya sido eliminado' 
      });
    }

    // Verificar que realmente se eliminó
    const verification = await new Promise((resolve, reject) => {
      db.db.get('SELECT * FROM usuarios WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (verification) {
      console.error(`⚠️ ADVERTENCIA: Usuario ${id} aún existe después de la eliminación`);
      return res.status(500).json({ 
        success: false, 
        message: 'Error: El usuario no se eliminó correctamente' 
      });
    }

    // Log de eliminación
    await db.logAccess(req.session.user.id, 'USER_DELETED', req.ip, req.get('User-Agent'), true, `Usuario eliminado permanentemente: ${existingUser.usuario} (ID: ${id})`);

    console.log(`✅ Usuario eliminado y verificado: ${existingUser.usuario} (ID: ${id})`);

    res.json({ 
      success: true, 
      message: 'Usuario eliminado exitosamente',
      verificado: true
    });

  } catch (error) {
    console.error('❌ Error eliminando usuario:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno al eliminar usuario: ' + error.message 
    });
  }
});

// Ruta protegida de ejemplo
app.get('/profile', requireAuth, (req, res) => {
  res.json({
    message: 'Página protegida',
    user: req.session.user
  });
});

// Crear carpeta public si no existe
if (!fs.existsSync('public')) {
  fs.mkdirSync('public');
}

// Inicializar base de datos y sistema de vacaciones
let vacacionesManager;

async function initializeVacacionesSystem() {
    try {
        vacacionesManager = new VacacionesManager(db);
        console.log('🎯 Sistema de vacaciones inicializado correctamente');

        // Actualizar estados de vacaciones al iniciar
        await vacacionesManager.actualizarEstadosVacaciones();
        console.log('✅ Estados de vacaciones actualizados');
    } catch (error) {
        console.error('❌ Error inicializando sistema de vacaciones:', error);
    }
}

// === APIS PARA GESTIÓN DE VACACIONES ===

// Obtener información detallada de vacaciones de un empleado
app.get('/api/empleado/:id/vacaciones', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    if (!vacacionesManager) {
      await initializeVacacionesSystem();
    }
    const vacaciones = await vacacionesManager.calcularInfoVacaciones(id);
    res.json({ success: true, vacaciones });
  } catch (error) {
    console.error('❌ Error obteniendo vacaciones del empleado:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error obteniendo información de vacaciones' 
    });
  }
});

// Crear nuevo período de vacaciones
app.post('/api/vacaciones', requireAuth, async (req, res) => {
  const datosVacaciones = req.body;

  if (!datosVacaciones.empleado_id || !datosVacaciones.fecha_inicio || !datosVacaciones.fecha_fin) {
    return res.status(400).json({ 
      success: false, 
      message: 'Empleado, fecha de inicio y fecha de fin son requeridos' 
    });
  }

  try {
    if (!vacacionesManager) {
      await initializeVacacionesSystem();
    }
    datosVacaciones.aprobado_por = req.session.user.id;
    const resultado = await vacacionesManager.crearVacaciones(datosVacaciones);

    res.json({ 
      success: true, 
      message: 'Período de vacaciones creado exitosamente',
      vacaciones: resultado
    });
  } catch (error) {
    console.error('❌ Error creando período de vacaciones:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error creando período de vacaciones: ' + error.message 
    });
  }
});

// Obtener historial de vacaciones de un empleado
app.get('/api/empleado/:id/historial-vacaciones', requireAuth, async (req, res) => {
  const { id } = req.params;
  const incluirArchivados = req.query.incluir_archivados === 'true';

  try {
    if (!vacacionesManager) {
      await initializeVacacionesSystem();
    }
    const historial = await vacacionesManager.getHistorialEmpleado(id, incluirArchivados);
    res.json({ success: true, historial });
  } catch (error) {
    console.error('❌ Error obteniendo historial de vacaciones:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error obteniendo historial de vacaciones' 
    });
  }
});

// Limpiar registros antiguos de vacaciones (ejecutar manualmente o programado)
app.post('/api/vacaciones/limpiar-antiguos', requireAuth, async (req, res) => {
  // Solo administradores pueden ejecutar esta limpieza
  if (req.session.user.rol !== 'administrador') {
    return res.status(403).json({ 
      success: false, 
      message: 'Solo administradores pueden ejecutar la limpieza de registros' 
    });
  }

  try {
    if (!vacacionesManager) {
      await initializeVacacionesSystem();
    }
    const resultado = await vacacionesManager.limpiarRegistrosAntiguos();

    // Log de la limpieza
    await db.logAccess(
      req.session.user.id, 
      'VACACIONES_CLEANUP', 
      req.ip, 
      req.get('User-Agent'), 
      true, 
      `Registros archivados: ${resultado.registrosArchivados}`
    );

    res.json({ 
      success: true, 
      message: `Se archivaron ${resultado.registrosArchivados} registros antiguos`,
      registrosArchivados: resultado.registrosArchivados
    });
  } catch (error) {
    console.error('❌ Error limpiando registros antiguos:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error limpiando registros antiguos: ' + error.message 
    });
  }
});

// === RUTAS DE VACACIONES ===
app.put('/api/vacaciones/actualizar', requireAuth, async (req, res) => {
    const { empleado_id, fecha_inicio, fecha_fin, observaciones } = req.body;

    console.log('📝 Actualizando vacaciones para empleado ID:', empleado_id);

    if (!empleado_id || !fecha_inicio || !fecha_fin) {
        return res.status(400).json({
            success: false,
            message: 'ID del empleado, fecha de inicio y fecha de fin son obligatorios'
        });
    }

    try {
        const query = `
            UPDATE empleados 
            SET fecha_vacaciones_inicio = ?, fecha_vacaciones_fin = ?
            WHERE id = ?
        `;

        const values = [fecha_inicio, fecha_fin, empleado_id];

        const result = await new Promise((resolve, reject) => {
            db.db.run(query, values, function(err){
                if (err) {                    reject(err);
                } else {
                    resolve({ changes: this.changes });
                }
            });
        });

        if (result.changes > 0) {
            console.log('✅ Vacaciones actualizadas correctamente');
            res.json({
                success: true,
                message: 'Vacaciones actualizadas correctamente',
                changes: result.changes
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Empleado no encontrado'
            });
        }

    } catch (error) {
        console.error('❌ Error actualizando vacaciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor: ' + error.message
        });
    }
});

app.delete('/api/vacaciones/eliminar/:empleadoId', requireAuth, async (req, res) => {
    const empleadoId = req.params.empleadoId;

    console.log('🗑️ Eliminando vacaciones para empleado ID:', empleadoId);

    try {
        const query = `
            UPDATE empleados 
            SET fecha_vacaciones_inicio = NULL, fecha_vacaciones_fin = NULL
            WHERE id = ?
        `;

        const result = await new Promise((resolve, reject) => {
            db.db.run(query, [empleadoId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ changes: this.changes });
                }
            });
        });

        if (result.changes > 0) {
            console.log('✅ Vacaciones eliminadas correctamente');
            res.json({
                success: true,
                message: 'Vacaciones eliminadas correctamente',
                changes: result.changes
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Empleado no encontrado'
            });
        }

    } catch (error) {
        console.error('❌ Error eliminando vacaciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor: ' + error.message
        });
    }
});

// === RUTAS DE EMPLEADOS ===
// Obtener empleados completos con información de departamentos
app.get('/api/empleados-completos', requireAuth, async (req, res) => {
    try {
        const query = `
            SELECT 
                e.*,
                d.nombre as departamento_nombre
            FROM empleados e
            LEFT JOIN departamentos d ON e.departamento_id = d.id
            ORDER BY e.id ASC
        `;

        const empleados = await new Promise((resolve, reject) => {
            db.db.all(query, [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    // Añadir ID numérico a cada empleado
                    const empleadosConIdNumerico = rows.map(empleado => ({
                        ...empleado,
                        id_numerico: parseInt(empleado.id.toString().replace('EMP', '')) || empleado.id
                    }));
                    resolve(empleadosConIdNumerico);
                }
            });
        });

        console.log(`📊 Enviando ${empleados.length} empleados completos con IDs numéricos`);
        res.json({
            success: true,
            empleados: empleados
        });

    } catch (error) {
        console.error('❌ Error obteniendo empleados completos:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor: ' + error.message
        });
    }
});

// Obtener todos los empleados básico
app.get('/api/empleados', requireAuth, async (req, res) => {
  try {
    console.log('🔍 Obteniendo empleados desde la base de datos...');
    const empleados = await db.getEmpleadosCompletos();
    console.log(`✅ Obtenidos ${empleados.length} empleados`);
    // Transformar datos para compatibilidad con frontend
    const empleadosFormateados = empleados.map(emp => ({
      ...emp,
      departamento: emp.departamento_nombre || emp.departamento || 'Sin departamento'
    }));
    console.log('✅ Datos transformados, enviando respuesta...');
    res.json(empleadosFormateados);
  } catch (error) {
    console.error('❌ Error obteniendo empleados:', error.message);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({ error: 'Error obteniendo empleados', details: error.message });
  }
});

// Obtener empleado específico por ID
app.get('/api/empleado/:id', requireAuth, async (req, res) => {
    const { id } = req.params;

    console.log('🔍 Buscando empleado con ID:', id);

    try {
        const query = `
            SELECT 
                e.*,
                d.nombre as departamento_nombre
            FROM empleados e
            LEFT JOIN departamentos d ON e.departamento_id = d.id
            WHERE e.id = ?
        `;

        const empleado = await new Promise((resolve, reject) => {
            db.db.get(query, [id], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });

        if (empleado) {
            console.log('✅ Empleado encontrado:', empleado.nombre, empleado.apellido);
            res.json({
                success: true,
                empleado: empleado
            });
        } else {
            console.log('❌ Empleado no encontrado para ID:', id);
            res.status(404).json({
                success: false,
                message: 'Empleado no encontrado'
            });
        }

    } catch (error) {
        console.error('❌ Error obteniendo empleado:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor: ' + error.message
        });
    }
});

// Inicializar sistema de vacaciones y arrancar servidor solo cuando este
// archivo se ejecuta directamente. Esto facilita su uso en pruebas.
if (require.main === module) {
  db.connect()
    .then(() => {
      console.log('🎯 Sistema de base de datos inicializado correctamente');
      return prestamos.conectar();
    })
    .then(() => {
      console.log('📦 Sistema de préstamos inicializado');
      return initializeVacacionesSystem();
    })
    .catch((err) => {
      console.error('❌ Error inicializando el sistema:', err);
    });

  // Iniciar servidor
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor Express ejecutándose en http://0.0.0.0:${PORT}`);
    console.log('✅ Sesiones configuradas');
    console.log('✅ Autenticación lista');
    console.log('✅ Archivos estáticos en /public');
  });
}

module.exports = app;
