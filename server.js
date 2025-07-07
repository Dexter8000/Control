require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const http = require('http');
const WebSocket = require('ws');
const Database = require('./database/config');
const VacacionesManager = require('./database/vacaciones');

let wss; // WebSocket server (solo cuando se ejecuta directamente)



const app = express();
const PORT = process.env.PORT || 5001;

if (!process.env.SESSION_SECRET) {
  console.error(
    'âŒ La variable de entorno SESSION_SECRET es requerida para la seguridad de las sesiones.'
  );
  process.exit(1);
}

function broadcast(event, data) {
  if (!wss) return;
  const message = JSON.stringify({ event, data });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public')); // Para servir archivos estÃ¡ticos
app.use('/attached_assets', express.static('attached_assets')); // Para servir videos e imÃ¡genes

// Configurar sesiones
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // true en producciÃ³n con HTTPS
      maxAge: 24 * 60 * 60 * 1000, // 24 horas
    },
  })
);

// Inicializar base de datos y sistema de prÃ©stamos
const db = new Database();
const SistemaPrestamos = require('./database/prestamos');
const prestamos = new SistemaPrestamos();

(async () => {
  try {
    await db.connect();
    await prestamos.conectar();
    console.log('âœ… Todos los sistemas inicializados y listos.');
  } catch (err) {
    console.error('âŒ Error fatal durante la inicializaciÃ³n. El servidor no puede arrancar.', err);
    process.exit(1);
  }
})();

// Sistema RBAC - Middleware de permisos
function requireRole(roles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res
        .status(401)
        .json({ success: false, message: 'No autenticado' });
    }

    const userRole = req.session.user.rol;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Permisos insuficientes',
        requiredRoles: allowedRoles,
        userRole: userRole,
      });
    }

    next();
  };
}

// RUTAS

// Ruta principal - servir pÃ¡gina de login
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

// API de autenticaciÃ³n (compatible con migraciÃ³n)
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const clientIP = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent');

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Username y password son requeridos',
    });
  }

  try {
    // Buscar usuario en la base de datos
    const usuario = await db.getUser(username);

    if (!usuario) {
      // Log intento fallido sin usuario vÃ¡lido
      await db.logAccess(
        null,
        'LOGIN_FAILED',
        clientIP,
        userAgent,
        false,
        'Usuario no encontrado'
      );
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    // Verificar si el usuario estÃ¡ bloqueado
    if (
      usuario.bloqueado_hasta &&
      new Date(usuario.bloqueado_hasta) > new Date()
    ) {
      await db.logAccess(
        usuario.id,
        'LOGIN_BLOCKED',
        clientIP,
        userAgent,
        false,
        'Usuario bloqueado temporalmente'
      );
      return res.status(423).json({
        success: false,
        message: 'Usuario temporalmente bloqueado. Intente mÃ¡s tarde.',
      });
    }

    // Comparar contraseÃ±a usando bcrypt
    const passwordValido = await bcrypt.compare(password, usuario.contrasena);

    if (!passwordValido) {
      // Incrementar intentos fallidos
      await db.incrementFailedAttempts(usuario.id);
      await db.logAccess(
        usuario.id,
        'LOGIN_FAILED',
        clientIP,
        userAgent,
        false,
        'ContraseÃ±a incorrecta'
      );

      return res.status(401).json({
        success: false,
        message: 'Password incorrecto',
      });
    }

    // Login exitoso - actualizar base de datos
    await db.updateLoginSuccess(usuario.id);
    await db.logAccess(
      usuario.id,
      'LOGIN_SUCCESS',
      clientIP,
      userAgent,
      true,
      'Login exitoso'
    );

    // Crear sesiÃ³n
    req.session.user = {
      id: usuario.id,
      username: usuario.usuario || usuario.username,
      email: usuario.email,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      rol: usuario.rol,
    };

    res.json({
      success: true,
      message: 'Login exitoso',
      user: req.session.user,
    });
  } catch (error) {
    console.error('âŒ Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
});

// Dashboard (despuÃ©s del login) - Redirigir al dashboard ejecutivo
app.get('/dashboard', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  // Servir el dashboard ejecutivo mejorado
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Panel completo de anÃ¡lisis
app.get('/panel-completo', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  res.sendFile(path.join(__dirname, 'public', 'panel-completo.html'));
});

// Ruta para el panel de control
app.get('/panel-control', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'panel-control.html'));
});

// Ruta para el nuevo panel de control
app.get('/panel-control-nuevo', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'panel-control-nuevo.html'));
});

// Ruta para acceder a la interfaz de empleados
app.get('/empleados', requireAuth, (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'empleados.html'))
);

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
    SELECT e.rango AS rango_nombre, 'General' AS departamento_nombre, COUNT(*) AS cantidad
    FROM empleados e
    WHERE e.rango IS NOT NULL AND e.rango != ''
    GROUP BY e.rango
    ORDER BY cantidad DESC, rango_nombre;
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
    SELECT id, nombre, rango
    FROM empleados
    WHERE nombre IS NULL OR nombre = ''
       OR rango IS NULL OR rango = '';
  `;
  db.db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Error al obtener datos incompletos:', err);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
    res.json({
      ids: rows.map((row) => row.id),
      detalle: rows,
      count: rows.length,
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
      await db.logAccess(
        userId,
        'LOGOUT',
        clientIP,
        userAgent,
        true,
        'Logout exitoso'
      );
    }

    req.session.destroy((err) => {
      if (err) {
        return res
          .status(500)
          .json({ success: false, message: 'Error al cerrar sesiÃ³n' });
      }
      res.json({ success: true, message: 'SesiÃ³n cerrada' });
    });
  } catch (error) {
    console.error('âŒ Error en logout:', error);
    res.status(500).json({ success: false, message: 'Error al cerrar sesiÃ³n' });
  }
});

// Middleware para verificar autenticaciÃ³n
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
}

// RUTAS API PARA PRÃ‰STAMOS Y DEVOLUCIONES

// Obtener equipos disponibles para prÃ©stamo
app.get('/api/equipos-disponibles', requireAuth, async (req, res) => {
  try {
    const equipos = await prestamos.obtenerEquiposDisponibles();
    res.json({ success: true, equipos });
  } catch (error) {
    console.error('âŒ Error obteniendo equipos disponibles:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo equipos disponibles',
    });
  }
});

// Obtener equipos asignados para devoluciÃ³n
app.get('/api/equipos-asignados', requireAuth, async (req, res) => {
  try {
    const equipos = await prestamos.obtenerEquiposAsignados();
    res.json({ success: true, equipos });
  } catch (error) {
    console.error('âŒ Error obteniendo equipos asignados:', error);
    res
      .status(500)
      .json({ success: false, message: 'Error obteniendo equipos asignados' });
  }
});

// Obtener empleados para asignaciÃ³n
app.get('/api/empleados-asignacion', requireAuth, async (req, res) => {
  try {
    console.log('ðŸ” Obteniendo empleados desde la base de datos...');
    const empleados = await db.getEmpleadosCompletos();
    console.log(`âœ… Obtenidos ${empleados.length} empleados`);
    // Transformar datos para compatibilidad con frontend
    const empleadosFormateados = empleados.map((emp) => ({
      ...emp,
      departamento_nombre: emp.departamento_nombre || 'Sin departamento',
    }));
    console.log('âœ… Datos transformados, enviando respuesta...');
    res.json(empleadosFormateados);
  } catch (error) {
    console.error('âŒ Error obteniendo empleados:', error.message);
    console.error('âŒ Stack trace:', error.stack);
    res
      .status(500)
      .json({ error: 'Error obteniendo empleados', details: error.message });
  }
});

// Obtener estadÃ­sticas de empleados para el dashboard
app.get('/api/empleados-estadisticas', requireAuth, async (req, res) => {
  console.log('ðŸ“Š Calculando estadÃ­sticas de empleados...');

  try {
    const queries = {
      totalEmpleados: 'SELECT COUNT(*) as total FROM empleados',
      totalRangosUnicos:
        'SELECT COUNT(DISTINCT rango) as total FROM empleados WHERE rango IS NOT NULL AND rango != ""',
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
            `,
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
      rango_mas_comun: resultados.rangoMasComun || {
        rango: 'N/A',
        cantidad: 0,
      },
      rangos_por_departamento: resultados.rangosPorDepartamento || [],
    };

    console.log('âœ… EstadÃ­sticas calculadas:', estadisticas);
    res.json({ success: true, estadisticas });
  } catch (error) {
    console.error('âŒ Error calculando estadÃ­sticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculando estadÃ­sticas de empleados',
    });
  }
});

// Endpoint para carga masiva de empleados (solo administradores)
app.post(
  '/api/empleados/mass-upload',
  requireAuth,
  requireRole('administrador'),
  async (req, res) => {
    const { empleados } = req.body;

    if (!empleados || !Array.isArray(empleados)) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de empleados',
      });
    }

    const resultados = {
      exitosos: 0,
      errores: 0,
      detalles: [],
    };

    // Cargar departamentos para validaciÃ³n
    const departamentos = await db.getDepartamentos();

    for (let i = 0; i < empleados.length; i++) {
      const empleado = empleados[i];
      const fila = i + 2;

      try {
        // Validaciones bÃ¡sicas
        if (!empleado.nombre || !empleado.apellido || !empleado.rango) {
          resultados.errores++;
          resultados.detalles.push(
            `Fila ${fila}: Nombre, apellido y rango son requeridos`
          );
          continue;
        }

        // Buscar departamento_id si se proporcionÃ³ nombre de departamento
        if (empleado.departamento && !empleado.departamento_id) {
          const deptoEncontrado = departamentos.find(
            (d) => d.nombre === empleado.departamento
          );
          if (deptoEncontrado) {
            empleado.departamento_id = deptoEncontrado.id;
          } else {
            resultados.errores++;
            resultados.detalles.push(
              `Fila ${fila}: Departamento '${empleado.departamento}' no encontrado`
            );
            continue;
          }
        }

        // Crear empleado
        const resultado = await db.createEmpleado(empleado);

        resultados.exitosos++;
        resultados.detalles.push(
          `Fila ${fila}: Empleado '${empleado.nombre} ${empleado.apellido}' creado con ID ${resultado.id}`
        );
      } catch (error) {
        resultados.errores++;
        resultados.detalles.push(`Fila ${fila}: Error - ${error.message}`);
      }
    }

    console.log(
      `ðŸ“Š Carga masiva empleados completada: ${resultados.exitosos} exitosos, ${resultados.errores} errores`
    );

    res.json({
      success: true,
      message: `Carga masiva completada: ${resultados.exitosos} empleados creados, ${resultados.errores} errores`,
      resultados,
    });
  }
);

// Crear nuevo empleado
app.post('/api/empleados', requireAuth, async (req, res) => {
  const empleadoData = req.body;

  // Validar campos requeridos y tipos
  if (
    !empleadoData.nombre ||
    typeof empleadoData.nombre !== 'string' ||
    !empleadoData.apellido ||
    typeof empleadoData.apellido !== 'string' ||
    !empleadoData.rango ||
    typeof empleadoData.rango !== 'string'
  ) {
    return res.status(400).json({
      success: false,
      message: 'Nombre, apellido y rango son requeridos y deben ser texto',
    });
  }

  try {
    // Buscar departamento_id si se enviÃ³ nombre de departamento
    if (empleadoData.departamento && !empleadoData.departamento_id) {
      const departamentos = await db.getDepartamentos();
      const deptoEncontrado = departamentos.find(
        (d) => d.nombre === empleadoData.departamento
      );
      if (deptoEncontrado) {
        empleadoData.departamento_id = deptoEncontrado.id;
      }
    }

    // Validar unicidad de placa y cÃ©dula
    if (empleadoData.placa) {
      const placaExists = await new Promise((resolve, reject) => {
        db.db.get(
          'SELECT id FROM empleados WHERE placa = ?',
          [empleadoData.placa],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });
      if (placaExists) {
        return res
          .status(409)
          .json({ success: false, message: 'La placa ya estÃ¡ registrada' });
      }
    }
    if (empleadoData.cedula) {
      const cedulaExists = await new Promise((resolve, reject) => {
        db.db.get(
          'SELECT id FROM empleados WHERE cedula = ?',
          [empleadoData.cedula],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });
      if (cedulaExists) {
        return res
          .status(409)
          .json({ success: false, message: 'La cÃ©dula ya estÃ¡ registrada' });
      }
    }

    await db.beginTransaction();
    const resultado = await db.createEmpleado(empleadoData);
    await db.commitTransaction();
    broadcast('employees-changed');
    res.status(201).json({
      success: true,
      message: 'Empleado creado exitosamente',
      empleadoId: resultado.id,
    });
  } catch (error) {
    await db.rollbackTransaction();
    console.error('âŒ Error creando empleado:', error);
    res.status(500).json({
      success: false,
      message: 'Error creando empleado',
      details: error.message,
    });
  }
});

// Actualizar empleado existente
// Obtener todos los empleados (para la tabla principal de GestiÃ³n de Personal)
app.get('/api/empleados', requireAuth, async (req, res) => {
  try {
    const empleados = await db.getEmpleadosCompletos();
    console.log(`âœ… Enviando ${empleados.length} empleados completos con todas las columnas correctas`);
    res.json({ success: true, empleados });
  } catch (error) {
    console.error('--- DETAILED ERROR in /api/empleados ---');
    console.error('Timestamp:', new Date().toISOString());
    console.error('Error Object:', error);
    console.error('--- END DETAILED ERROR ---');
    res.status(500).json({ success: false, message: 'Error interno del servidor al obtener empleados.' });
  }
});

// Endpoint para obtener la lista de rangos para filtros
app.get('/api/rangos', requireAuth, async (req, res) => {
  try {
    const rangos = await db.getRangos();
    res.json(rangos);
  } catch (error) {
    console.error('Error al obtener rangos:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// Endpoint para obtener el inventario principal
app.get('/api/inventario_principal', requireAuth, async (req, res) => {
  try {
    const inventario = await db.getInventarioPrincipal();
    res.json(inventario);
  } catch (error) {
    console.error('--- DETAILED ERROR in /api/inventario_principal ---');
    console.error('Timestamp:', new Date().toISOString());
    console.error('Error Object:', error);
    console.error('--- END DETAILED ERROR ---');
    res.status(500).json({ success: false, message: 'Error interno del servidor al obtener inventario principal.' });
  }
});

// Endpoint para obtener el inventario perifÃ©rico
app.get('/api/inventario_periferico', requireAuth, async (req, res) => {
  try {
    const inventario = await db.getInventarioPeriferico();
    res.json(inventario);
  } catch (error) {
    console.error('--- DETAILED ERROR in /api/inventario_periferico ---');
    console.error('Timestamp:', new Date().toISOString());
    console.error('Error Object:', error);
    console.error('--- END DETAILED ERROR ---');
    res.status(500).json({ success: false, message: 'Error interno del servidor al obtener inventario perifÃ©rico.' });
  }
});

app.put('/api/empleados/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const empleadoData = req.body;

  // Validar campos bÃ¡sicos
  if (
    !empleadoData.nombre ||
    typeof empleadoData.nombre !== 'string' ||
    !empleadoData.apellido ||
    typeof empleadoData.apellido !== 'string' ||
    !empleadoData.rango ||
    typeof empleadoData.rango !== 'string'
  ) {
    return res.status(400).json({
      success: false,
      message: 'Nombre, apellido y rango son requeridos y deben ser texto',
    });
  }

  try {
    // Buscar departamento_id si se enviÃ³ nombre de departamento
    if (empleadoData.departamento && !empleadoData.departamento_id) {
      const departamentos = await db.getDepartamentos();
      const deptoEncontrado = departamentos.find(
        (d) => d.nombre === empleadoData.departamento
      );
      if (deptoEncontrado) {
        empleadoData.departamento_id = deptoEncontrado.id;
      }
    }

    // Validar unicidad de placa y cÃ©dula
    if (empleadoData.placa) {
      const placaExists = await new Promise((resolve, reject) => {
        db.db.get(
          'SELECT id FROM empleados WHERE placa = ? AND id != ?',
          [empleadoData.placa, id],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });
      if (placaExists) {
        return res
          .status(409)
          .json({ success: false, message: 'La placa ya estÃ¡ registrada' });
      }
    }
    if (empleadoData.cedula) {
      const cedulaExists = await new Promise((resolve, reject) => {
        db.db.get(
          'SELECT id FROM empleados WHERE cedula = ? AND id != ?',
          [empleadoData.cedula, id],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });
      if (cedulaExists) {
        return res
          .status(409)
          .json({ success: false, message: 'La cÃ©dula ya estÃ¡ registrada' });
      }
    }

    await db.beginTransaction();
    await db.updateEmpleado(id, empleadoData);
    await db.commitTransaction();
    broadcast('employees-changed');

    res.json({ success: true, message: 'Empleado actualizado exitosamente' });
  } catch (error) {
    await db.rollbackTransaction();
    console.error('âŒ Error actualizando empleado:', error);
    res.status(500).json({
      success: false,
      message: 'Error actualizando empleado',
      details: error.message,
    });
  }
});

// Eliminar empleado
app.delete('/api/empleados/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    await db.deleteEmpleado(id);
    broadcast('employees-changed');
    res.json({ success: true, message: 'Empleado eliminado exitosamente' });
  } catch (error) {
    console.error('âŒ Error eliminando empleado:', error);
    res
      .status(500)
      .json({ error: 'Error eliminando empleado: ' + error.message });
  }
});

// Limpiar empleados duplicados
app.post('/api/empleados/limpiar-duplicados', requireAuth, async (req, res) => {
  try {
    console.log('ðŸ§¹ Iniciando limpieza de empleados duplicados...');

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
      // Mantener el primero (mÃ¡s antiguo) y eliminar los demÃ¡s
      const toDelete = ids.slice(1);

      for (const idToDelete of toDelete) {
        await new Promise((resolve, reject) => {
          db.db.run(
            'DELETE FROM empleados WHERE id = ?',
            [idToDelete],
            function (err) {
              if (err) reject(err);
              else {
                console.log(
                  `ðŸ—‘ï¸ Eliminado duplicado: ${duplicate.nombre} ${duplicate.apellido} (ID: ${idToDelete})`
                );
                eliminados++;
                resolve();
              }
            }
          );
        });
      }
    }

    console.log(`âœ… Limpieza completada. Eliminados ${eliminados} duplicados`);

    res.json({
      success: true,
      message: `Limpieza completada. Se eliminaron ${eliminados} empleados duplicados`,
      eliminados: eliminados,
    });
  } catch (error) {
    console.error('âŒ Error limpiando duplicados:', error);
    res.status(500).json({
      success: false,
      message: 'Error limpiando duplicados: ' + error.message,
    });
  }
});

// Obtener inventario principal completo
// Endpoints de inventario eliminados para preparar nueva estructura
// Los nuevos endpoints se implementarÃ¡n con la nueva estructura mejorada

app.get('/api/inventario-principal-deprecado', requireAuth, async (req, res) => {
  try {
    const inventario = await db.getInventarioPrincipal();
    res.json({ success: true, inventario });
  } catch (error) {
    console.error('âŒ Error obteniendo inventario principal:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo inventario principal',
    });
  }
});

app.get('/api/inventario_periferico', requireAuth, async (req, res) => {
  try {
    const inventario = await db.getInventarioPeriferico();
    res.json({ success: true, inventario });
  } catch (error) {
    console.error('âŒ Error obteniendo inventario de perifÃ©ricos:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo inventario de perifÃ©ricos',
    });
  }
});

// Obtener inventario perifÃ©rico completo
app.get('/api/inventario-periferico', requireAuth, async (req, res) => {
  try {
    const inventario = await db.getInventarioPeriferico();
    res.json({ success: true, inventario });
  } catch (error) {
    console.error('âœ– Error obteniendo inventario perifÃ©rico:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo inventario perifÃ©rico',
    });
  }
});

// Endpoints de inventario eliminados para preparar nueva estructura
// Los nuevos endpoints se implementarÃ¡n con la nueva estructura mejorada


// Obtener usuarios
app.get('/api/usuarios', requireAuth, requireRole('administrador'), async (req, res) => {
  try {
    const query = `
      SELECT id, usuario, rol, nombre, apellido, email, telefono, activo, fecha_creacion, ultimo_acceso, intentos_fallidos, bloqueado_hasta
      FROM usuarios
      ORDER BY fecha_creacion DESC
    `;
    
    const usuarios = await new Promise((resolve, reject) => {
      db.db.all(query, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    
    res.json({ success: true, usuarios });
  } catch (error) {
    console.error('❌ Error obteniendo usuarios:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo usuarios' });
  }
});

// Obtener un usuario específico por ID
app.get('/api/usuarios/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT id, usuario, rol, nombre, apellido, email, telefono, activo, fecha_creacion, ultimo_acceso, intentos_fallidos, bloqueado_hasta
      FROM usuarios
      WHERE id = ?
    `;
    
    const usuario = await new Promise((resolve, reject) => {
      db.db.get(query, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!usuario) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }
    
    res.json({ success: true, usuario });
  } catch (error) {
    console.error('❌ Error obteniendo usuario:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo usuario' });
  }
});

// Obtener empleados
app.get('/api/empleados', async (req, res) => {
  try {
    const empleados = await db.getEmpleadosCompletos();
    res.json({ success: true, empleados });
  } catch (error) {
    console.error('âŒ Error obteniendo empleados:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo empleados' });
  }
});

// Endpoint de inventario principal eliminado para preparar nueva estructura
// Los nuevos endpoints se implementarÃ¡n con la nueva estructura mejorada

// Obtener rangos por departamento para el dashboard
app.get('/api/dashboard/rangos-por-departamento', async (req, res) => {
  try {
    const query = `
      SELECT e.rango AS rango_nombre, d.nombre AS departamento_nombre, COUNT(*) AS cantidad
      FROM empleados e
      LEFT JOIN departamentos d ON e.departamento_id = d.id
      WHERE e.rango IS NOT NULL AND e.rango != ''
      GROUP BY e.rango, d.nombre
      ORDER BY cantidad DESC, rango_nombre, departamento_nombre
    `;
    
    const rangos = await new Promise((resolve, reject) => {
      db.db.all(query, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    
    // El frontend espera un array directamente, no un objeto con success
    res.json(rangos);
  } catch (error) {
    console.error('âŒ Error obteniendo rangos por departamento:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo rangos por departamento' });
  }
});

// Obtener cantidad de rangos para el dashboard
app.get('/api/dashboard/cantidad-rangos', async (req, res) => {
  try {
    const query = `
      SELECT rango as rango_nombre, COUNT(*) as cantidad
      FROM empleados
      GROUP BY rango
      ORDER BY COUNT(*) DESC
    `;
    
    const rangos = await new Promise((resolve, reject) => {
      db.db.all(query, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    
    // El frontend espera un array directamente
    res.json(rangos);
  } catch (error) {
    console.error('âŒ Error obteniendo cantidad de rangos:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo cantidad de rangos' });
  }
});

// Obtener total de departamentos para el dashboard
app.get('/api/dashboard/total-departamentos', async (req, res) => {
  try {
    const query = `
      SELECT COUNT(DISTINCT departamento) as total
      FROM empleados
    `;
    
    const resultado = await new Promise((resolve, reject) => {
      db.db.get(query, [], (err, row) => {
        if (err) reject(err);
        else resolve(row || { total: 0 });
      });
    });
    
    res.json(resultado);
  } catch (error) {
    console.error('âŒ Error obteniendo total de departamentos:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo total de departamentos' });
  }
});

// Obtener configuraciÃ³n del sistema
app.get('/api/configuracion', async (req, res) => {
  try {
    const query = `
      SELECT * FROM configuracion
    `;
    
    const configuracion = await new Promise((resolve, reject) => {
      db.db.all(query, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    
    res.json({ success: true, configuracion });
  } catch (error) {
    console.error('âŒ Error obteniendo configuraciÃ³n:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo configuraciÃ³n' });
  }
});

// Obtener logs de acceso
app.get('/api/logs_acceso', requireAuth, requireRole('administrador'), async (req, res) => {
  try {
    const query = `
      SELECT l.*, u.usuario as usuario_nombre
      FROM logs_acceso l
      LEFT JOIN usuarios u ON l.usuario_id = u.id
      ORDER BY l.fecha DESC
      LIMIT 1000
    `;
    
    const logs = await new Promise((resolve, reject) => {
      db.db.all(query, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    
    res.json({ success: true, logs });
  } catch (error) {
    console.error('âŒ Error obteniendo logs de acceso:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo logs de acceso' });
  }
});

// ===== NUEVOS ENDPOINTS PARA INVENTARIO GENERAL DE ACTIVOS =====

// Obtener todos los activos del inventario general
app.get('/api/inventario_general_activos', requireAuth, async (req, res) => {
  try {
    const inventario = await db.getInventarioGeneralActivos();
    res.json({ success: true, inventario });
  } catch (error) {
    console.error('❌ Error obteniendo inventario general de activos:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo inventario general de activos',
    });
  }
});

// Obtener un activo por su ID
app.get('/api/inventario_general_activos/:id', requireAuth, async (req, res) => {
  try {
    const activo = await db.getActivoPorId(req.params.id);
    if (!activo) {
      return res.status(404).json({ success: false, message: 'Activo no encontrado' });
    }
    res.json({ success: true, activo });
  } catch (error) {
    console.error('❌ Error obteniendo activo por ID:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo activo por ID',
    });
  }
});

// Crear un nuevo activo
app.post('/api/inventario_general_activos', requireAuth, async (req, res) => {
  try {
    await db.beginTransaction();
    const result = await db.crearActivo(req.body);
    await db.commitTransaction();
    res.status(201).json({
      success: true,
      message: 'Activo creado exitosamente',
      activoId: result.id,
    });
  } catch (error) {
    await db.rollbackTransaction();
    console.error('❌ Error creando activo:', error);
    res.status(500).json({ success: false, message: 'Error creando activo' });
  }
});

// Actualizar un activo existente
app.put('/api/inventario_general_activos/:id', requireAuth, async (req, res) => {
  try {
    await db.beginTransaction();
    const result = await db.actualizarActivo(req.params.id, req.body);
    await db.commitTransaction();
    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Activo no encontrado' });
    }
    res.json({ success: true, message: 'Activo actualizado exitosamente' });
  } catch (error) {
    await db.rollbackTransaction();
    console.error('❌ Error actualizando activo:', error);
    res.status(500).json({ success: false, message: 'Error actualizando activo' });
  }
});

// Eliminar un activo
app.delete('/api/inventario_general_activos/:id', requireAuth, async (req, res) => {
  try {
    const result = await db.eliminarActivo(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Activo no encontrado' });
    }
    res.json({ success: true, message: 'Activo eliminado exitosamente' });
  } catch (error) {
    console.error('❌ Error eliminando activo:', error);
    res.status(500).json({ success: false, message: 'Error eliminando activo' });
  }
});

// API para Dashboard - Estadísticas

// Total de empleados
app.get('/api/dashboard/total-empleados', requireAuth, async (req, res) => {
  try {
    const result = await db.db.get('SELECT COUNT(*) as total FROM empleados');
    res.json({ total: result ? result.total : 0 });
  } catch (error) {
    console.error('âŒ Error obteniendo total de empleados:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo total de empleados', total: 0 });
  }
});

// Rangos por departamento
app.get('/api/dashboard/rangos-por-departamento', requireAuth, async (req, res) => {
  try {
    const query = `
      SELECT e.rango as rango_nombre, COUNT(*) as cantidad
      FROM empleados e
      WHERE e.rango IS NOT NULL AND e.rango != ''
      GROUP BY e.rango
      ORDER BY cantidad DESC
      LIMIT 10
    `;
    
    const result = await new Promise((resolve, reject) => {
      db.db.all(query, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    
    res.json(result);
  } catch (error) {
    console.error('âŒ Error obteniendo rangos por departamento:', error);
    res.status(500).json([]);
  }
});

// Cantidad de rangos
app.get('/api/dashboard/cantidad-rangos', requireAuth, async (req, res) => {
  try {
    const query = `
      SELECT rango as rango_nombre, COUNT(*) as cantidad
      FROM empleados
      WHERE rango IS NOT NULL AND rango != ''
      GROUP BY rango
      ORDER BY cantidad DESC
      LIMIT 10
    `;
    
    const result = await new Promise((resolve, reject) => {
      db.db.all(query, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    
    res.json(result);
  } catch (error) {
    console.error('âŒ Error obteniendo cantidad de rangos:', error);
    res.status(500).json([]);
  }
});

// Total de departamentos
app.get('/api/dashboard/total-departamentos', requireAuth, async (req, res) => {
  try {
    const result = await db.db.get('SELECT COUNT(*) as total FROM departamentos');
    res.json({ total: result ? result.total : 0 });
  } catch (error) {
    console.error('âŒ Error obteniendo total de departamentos:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo total de departamentos', total: 0 });
  }
});

// Datos incompletos
app.get('/api/dashboard/datos-incompletos', requireAuth, async (req, res) => {
  try {
    // Contar empleados con datos incompletos (sin nombre, apellido, rango o departamento)
    const query = `
      SELECT COUNT(*) as total
      FROM empleados
      WHERE nombre IS NULL OR nombre = '' OR
            apellido IS NULL OR apellido = '' OR
            rango IS NULL OR rango = '' OR
            departamento_id IS NULL
    `;
    
    const result = await db.db.get(query);
    res.json({ total: result ? result.total : 0 });
  } catch (error) {
    console.error('âŒ Error obteniendo datos incompletos:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo datos incompletos', total: 0 });
  }
});

// Detalles de datos incompletos
app.get('/api/dashboard/detalles-incompletos', requireAuth, async (req, res) => {
  try {
    // Obtener IDs de empleados con datos incompletos
    const query = `
      SELECT id
      FROM empleados
      WHERE nombre IS NULL OR nombre = '' OR
            apellido IS NULL OR apellido = '' OR
            rango IS NULL OR rango = '' OR
            departamento_id IS NULL
      LIMIT 20
    `;
    
    const rows = await new Promise((resolve, reject) => {
      db.db.all(query, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    
    // Contar el total de registros incompletos
    const countQuery = `
      SELECT COUNT(*) as count
      FROM empleados
      WHERE nombre IS NULL OR nombre = '' OR
            apellido IS NULL OR apellido = '' OR
            rango IS NULL OR rango = '' OR
            departamento_id IS NULL
    `;
    
    const countResult = await db.db.get(countQuery);
    const ids = rows.map(row => row.id);
    
    res.json({ 
      count: countResult ? countResult.count : 0,
      ids: ids
    });
  } catch (error) {
    console.error('âŒ Error obteniendo detalles de datos incompletos:', error);
    res.status(500).json({ count: 0, ids: [] });
  }
});

// Endpoint para obtener rangos Ãºnicos
app.get('/api/rangos', requireAuth, (req, res) => {
  db.all('SELECT DISTINCT rango FROM empleados WHERE rango IS NOT NULL AND rango != "" ORDER BY rango', [], (err, rows) => {
    if (err) {
      console.error('Error fetching rangos:', err);
      res.status(500).json({ success: false, message: 'Error interno del servidor' });
      return;
    }
    const rangos = rows.map(row => row.rango);
    res.json({ success: true, rangos });
  });
});

// Obtener departamentos
app.get('/api/departamentos', requireAuth, async (req, res) => {
  try {
    const departamentos = await db.getDepartamentos();
    res.json({ success: true, departamentos });
  } catch (error) {
    console.error('Error obteniendo departamentos:', error);
    res
      .status(500)
      .json({ success: false, message: 'Error obteniendo departamentos' });
  }
});

// Obtener un departamento por ID
app.get('/api/departamentos/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const departamento = await db.get('SELECT * FROM departamentos WHERE id = ?', [id]);
    if (!departamento) {
      return res.status(404).json({ success: false, message: 'Departamento no encontrado' });
    }
    res.json({ success: true, departamento });
  } catch (error) {
    console.error('Error obteniendo departamento:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo departamento' });
  }
});

// Crear departamento
app.post('/api/departamentos', requireAuth, async (req, res) => {
  const { nombre } = req.body;

  if (!nombre || typeof nombre !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Nombre de departamento es requerido y debe ser texto',
    });
  }

  try {
    const existente = await new Promise((resolve, reject) => {
      db.db.get(
        'SELECT id FROM departamentos WHERE nombre = ?',
        [nombre],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (existente) {
      return res
        .status(409)
        .json({ success: false, message: 'El departamento ya existe' });
    }

    await db.beginTransaction();
    const resultado = await db.createDepartamento(nombre);
    await db.commitTransaction();

    res.status(201).json({
      success: true,
      message: 'Departamento creado',
      departamentoId: resultado.id,
    });
  } catch (error) {
    await db.rollbackTransaction();
    console.error('âŒ Error creando departamento:', error);
    res.status(500).json({
      success: false,
      message: 'Error creando departamento',
      details: error.message,
    });
  }
});

// Actualizar departamento
app.put('/api/departamentos/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { nombre } = req.body;

  if (!nombre || typeof nombre !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Nombre de departamento es requerido y debe ser texto',
    });
  }

  try {
    const existente = await new Promise((resolve, reject) => {
      db.db.get(
        'SELECT id FROM departamentos WHERE nombre = ? AND id != ?',
        [nombre, id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    if (existente) {
      return res
        .status(409)
        .json({ success: false, message: 'El departamento ya existe' });
    }

    await db.beginTransaction();
    const resultado = await db.updateDepartamento(id, nombre);
    if (resultado.changes === 0) {
      await db.rollbackTransaction();
      return res
        .status(404)
        .json({ success: false, message: 'Departamento no encontrado' });
    }
    await db.commitTransaction();
    res.json({ success: true, message: 'Departamento actualizado' });
  } catch (error) {
    await db.rollbackTransaction();
    console.error('âŒ Error actualizando departamento:', error);
    res.status(500).json({
      success: false,
      message: 'Error actualizando departamento',
      details: error.message,
    });
  }
});

// Eliminar departamento
app.delete('/api/departamentos/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    const resultado = await db.deleteDepartamento(id);
    if (resultado.changes === 0) {
      return res
        .status(404)
        .json({ success: false, message: 'Departamento no encontrado' });
    }
    res.json({ success: true, message: 'Departamento eliminado' });
  } catch (error) {
    console.error('âŒ Error eliminando departamento:', error);
    res
      .status(500)
      .json({ success: false, message: 'Error eliminando departamento' });
  }
});


app.get('/api/configuracion', requireAuth, (req, res) => {
  db.db.all('SELECT * FROM configuracion', [], (err, rows) => {
    if (err) {
      console.error('âŒ Error obteniendo configuracion:', err);
      return res
        .status(500)
        .json({ success: false, message: 'Error obteniendo configuracion' });
    }
    res.json({ success: true, data: rows });
  });
});

app.get('/api/logs_acceso', requireAuth, (req, res) => {
  db.db.all(
    'SELECT * FROM logs_acceso ORDER BY fecha DESC',
    [],
    (err, rows) => {
      if (err) {
        console.error('âŒ Error obteniendo logs:', err);
        return res
          .status(500)
          .json({ success: false, message: 'Error obteniendo logs' });
      }
      res.json({ success: true, data: rows });
    }
  );
});

app.get('/api/historial_asignaciones', requireAuth, (req, res) => {
  db.db.all(
    'SELECT * FROM historial_asignaciones ORDER BY fecha_cambio DESC',
    [],
    (err, rows) => {
      if (err) {
        console.error('âŒ Error obteniendo historial asignaciones:', err);
        return res.status(500).json({
          success: false,
          message: 'Error obteniendo historial asignaciones',
        });
      }
      res.json({ success: true, data: rows });
    }
  );
});



// Registrar prÃ©stamo de equipo
app.post('/api/prestamo', requireAuth, async (req, res) => {
  const { equipoId, tipoEquipo, empleadoId, observaciones } = req.body;

  if (!equipoId || !tipoEquipo || !empleadoId) {
    return res.status(400).json({
      success: false,
      message: 'Faltan datos requeridos (equipoId, tipoEquipo, empleadoId)',
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
    console.error('âŒ Error registrando prÃ©stamo:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error registrando prÃ©stamo',
    });
  }
});

// Registrar devoluciÃ³n de equipo
app.post('/api/devolucion', requireAuth, async (req, res) => {
  const { equipoId, tipoEquipo, empleadoActual, observaciones } = req.body;

  if (!equipoId || !tipoEquipo || !empleadoActual) {
    return res.status(400).json({
      success: false,
      message: 'Faltan datos requeridos (equipoId, tipoEquipo, empleadoActual)',
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
    console.error('âŒ Error registrando devoluciÃ³n:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error registrando devoluciÃ³n',
    });
  }
});

// Generar reporte semanal
app.get('/api/reporte-semanal', requireAuth, async (req, res) => {
  const { fechaInicio, fechaFin } = req.query;

  if (!fechaInicio || !fechaFin) {
    return res.status(400).json({
      success: false,
      message: 'Faltan fechas requeridas (fechaInicio, fechaFin)',
    });
  }

  try {
    const movimientos = await prestamos.generarReporteSemanal(
      fechaInicio,
      fechaFin
    );
    res.json({ success: true, movimientos });
  } catch (error) {
    console.error('âŒ Error generando reporte:', error);
    res.status(500).json({
      success: false,
      message: 'Error generando reporte semanal',
    });
  }
});

// === APIS PARA GESTIÃ“N DE USUARIOS ===

// Obtener todos los usuarios
app.get('/api/usuarios', requireAuth, async (req, res) => {
  try {
    const usuarios = await new Promise((resolve, reject) => {
      db.db.all(
        `
        SELECT id, usuario, rol, nombre, email
        FROM usuarios
        ORDER BY id ASC
      `,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json({ success: true, usuarios });
  } catch (error) {
    console.error('âŒ Error obteniendo usuarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo usuarios',
    });
  }
});

// Crear nuevo usuario (solo administradores)
app.post(
  '/api/usuarios',
  requireAuth,
  requireRole('administrador'),
  async (req, res) => {
    const { usuario, password, rol, nombre, email } = req.body;

    if (
      !usuario ||
      !password ||
      !rol ||
      typeof usuario !== 'string' ||
      typeof password !== 'string' ||
      typeof rol !== 'string'
    ) {
      return res.status(400).json({
        success: false,
        message: 'Usuario, contraseÃ±a y rol son requeridos y deben ser texto',
      });
    }
    if (nombre && typeof nombre !== 'string') {
      return res
        .status(400)
        .json({ success: false, message: 'Nombre debe ser texto' });
    }
    if (email && typeof email !== 'string') {
      return res
        .status(400)
        .json({ success: false, message: 'Email debe ser texto' });
    }

    try {
      // Verificar si el usuario ya existe (cualquier estado)
      const existingUser = await new Promise((resolve, reject) => {
        db.db.get(
          'SELECT * FROM usuarios WHERE usuario = ?',
          [usuario],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      if (existingUser) {
        console.log(
          `âš ï¸ Usuario ${usuario} ya existe. ID: ${existingUser.id}, Activo: ${existingUser.activo}`
        );
        return res.status(409).json({
          success: false,
          message: `El usuario '${usuario}' ya estÃ¡ registrado en el sistema. Por favor, elija otro nombre de usuario.`,
        });
      }

      await db.beginTransaction();

      // Hash de la contraseÃ±a antes de insertar
      const hashedPassword = await bcrypt.hash(password, 10);

      const newUserId = await new Promise((resolve, reject) => {
        db.db.run(
          `
        INSERT INTO usuarios (usuario, contrasena, rol, nombre, email, activo, fecha_creacion)
        VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
        `,
          [usuario, hashedPassword, rol, nombre || null, email || null],
          function (err) {
            if (err) {
              reject(err);
            } else {
              resolve(this.lastID);
            }
          }
        );
      });

      // Log de creaciÃ³n
      await db.logAccess(
        req.session.user.id,
        'USER_CREATED',
        req.ip,
        req.get('User-Agent'),
        true,
        `Usuario creado: ${usuario}`
      );
      await db.commitTransaction();
      broadcast('users-changed');

      res.json({
        success: true,
        message: 'Usuario creado exitosamente',
        userId: newUserId,
      });
    } catch (error) {
      await db.rollbackTransaction();
      console.error('âŒ Error creando usuario:', error);

      // Manejar errores especÃ­ficos
      if (error.message === 'El usuario ya existe') {
        return res.status(409).json({
          success: false,
          message: 'El usuario ya existe',
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno al crear usuario',
        details: error.message,
      });
    }
  }
);

// Actualizar usuario existente
app.put('/api/usuarios/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { usuario, password, rol, nombre, email } = req.body;

  if (
    !usuario ||
    !rol ||
    typeof usuario !== 'string' ||
    typeof rol !== 'string'
  ) {
    return res.status(400).json({
      success: false,
      message: 'Usuario y rol son requeridos y deben ser texto',
    });
  }
  if (password && typeof password !== 'string') {
    return res
      .status(400)
      .json({ success: false, message: 'La contraseÃ±a debe ser texto' });
  }
  if (nombre && typeof nombre !== 'string') {
    return res
      .status(400)
      .json({ success: false, message: 'Nombre debe ser texto' });
  }
  if (email && typeof email !== 'string') {
    return res
      .status(400)
      .json({ success: false, message: 'Email debe ser texto' });
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
        message: 'Usuario no encontrado',
      });
    }

    // Verificar si el nombre de usuario estÃ¡ en uso por otro usuario
    if (usuario !== existingUser.usuario) {
      const duplicateUser = await db.getUser(usuario);
      if (duplicateUser && duplicateUser.id !== parseInt(id)) {
        return res.status(409).json({
          success: false,
          message: 'El nombre de usuario ya estÃ¡ en uso',
        });
      }
    }

    // Preparar datos de actualizaciÃ³n
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

    // Si se proporciona nueva contraseÃ±a
    if (password && password.trim() !== '') {
      const hashed = await bcrypt.hash(password, 10);
      updateFields.push('contrasena = ?');
      updateValues.push(hashed);
    }

    updateValues.push(id);

    await db.beginTransaction();
    // Actualizar usuario
    await new Promise((resolve, reject) => {
      db.db.run(
        `
        UPDATE usuarios
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `,
        updateValues,
        function (err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });

    // Log de actualizaciÃ³n
    await db.logAccess(
      req.session.user.id,
      'USER_UPDATED',
      req.ip,
      req.get('User-Agent'),
      true,
      `Usuario actualizado: ${usuario}`
    );
    await db.commitTransaction();
    broadcast('users-changed');

    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
    });
  } catch (error) {
    await db.rollbackTransaction();
    console.error('âŒ Error actualizando usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno al actualizar usuario',
      details: error.message,
    });
  }
});

// Endpoint para carga masiva de usuarios (solo administradores)
app.post(
  '/api/usuarios/mass-upload',
  requireAuth,
  requireRole('administrador'),
  async (req, res) => {
    const { usuarios } = req.body;

    if (!usuarios || !Array.isArray(usuarios)) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de usuarios',
      });
    }

    const resultados = {
      exitosos: 0,
      errores: 0,
      detalles: [],
    };

    for (let i = 0; i < usuarios.length; i++) {
      const usuario = usuarios[i];
      const fila = i + 2; // +2 porque el array empieza en 0 y la fila 1 son headers

      try {
        // Validaciones bÃ¡sicas
        if (!usuario.usuario || !usuario.password || !usuario.rol) {
          resultados.errores++;
          resultados.detalles.push(
            `Fila ${fila}: Usuario, contraseÃ±a y rol son requeridos`
          );
          continue;
        }

        // Verificar si el usuario ya existe
        const existingUser = await new Promise((resolve, reject) => {
          db.db.get(
            'SELECT * FROM usuarios WHERE usuario = ?',
            [usuario.usuario],
            (err, row) => {
              if (err) reject(err);
              else resolve(row);
            }
          );
        });

        if (existingUser) {
          resultados.errores++;
          resultados.detalles.push(
            `Fila ${fila}: Usuario '${usuario.usuario}' ya existe`
          );
          continue;
        }

        const hashed = await bcrypt.hash(usuario.password, 10);
        // Insertar usuario
        await new Promise((resolve, reject) => {
          db.db.run(
            `
          INSERT INTO usuarios (usuario, contrasena, rol, nombre, email, activo, fecha_creacion)
          VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
        `,
            [
              usuario.usuario,
              hashed,
              usuario.rol,
              usuario.nombre || null,
              usuario.email || null,
            ],
            function (err) {
              if (err) reject(err);
              else resolve(this.lastID);
            }
          );
        });

        resultados.exitosos++;
        resultados.detalles.push(
          `Fila ${fila}: Usuario '${usuario.usuario}' creado exitosamente`
        );
      } catch (error) {
        resultados.errores++;
        resultados.detalles.push(`Fila ${fila}: Error - ${error.message}`);
      }
    }

    console.log(
      `ðŸ“Š Carga masiva completada: ${resultados.exitosos} exitosos, ${resultados.errores} errores`
    );

    res.json({
      success: true,
      message: `Carga masiva completada: ${resultados.exitosos} usuarios creados, ${resultados.errores} errores`,
      resultados,
    });
  }
);

// Eliminar usuario (solo administradores)
app.delete(
  '/api/usuarios/:id',
  requireAuth,
  requireRole('administrador'),
  async (req, res) => {
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
          message: 'Usuario no encontrado',
        });
      }

      // No permitir que el usuario se elimine a sÃ­ mismo
      if (parseInt(id) === req.session.user.id) {
        return res.status(400).json({
          success: false,
          message: 'No puedes eliminar tu propia cuenta',
        });
      }

      // Eliminar completamente de la base de datos con verificaciÃ³n
      const deletedRows = await new Promise((resolve, reject) => {
        db.db.run('DELETE FROM usuarios WHERE id = ?', [id], function (err) {
          if (err) {
            console.error('âŒ Error SQL eliminando usuario:', err);
            reject(err);
          } else {
            console.log(
              `ðŸ—‘ï¸ Filas eliminadas: ${this.changes} para usuario ID: ${id}`
            );
            resolve(this.changes);
          }
        });
      });

      if (deletedRows === 0) {
        return res.status(404).json({
          success: false,
          message:
            'No se pudo eliminar el usuario - puede que ya haya sido eliminado',
        });
      }

      // Verificar que realmente se eliminÃ³
      const verification = await new Promise((resolve, reject) => {
        db.db.get('SELECT * FROM usuarios WHERE id = ?', [id], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (verification) {
        console.error(
          `âš ï¸ ADVERTENCIA: Usuario ${id} aÃºn existe despuÃ©s de la eliminaciÃ³n`
        );
        return res.status(500).json({
          success: false,
          message: 'Error: El usuario no se eliminÃ³ correctamente',
        });
      }

      // Log de eliminaciÃ³n
      await db.logAccess(
        req.session.user.id,
        'USER_DELETED',
        req.ip,
        req.get('User-Agent'),
        true,
        `Usuario eliminado permanentemente: ${existingUser.usuario} (ID: ${id})`
      );

      console.log(
        `âœ… Usuario eliminado y verificado: ${existingUser.usuario} (ID: ${id})`
      );

      broadcast('users-changed');

      res.json({
        success: true,
        message: 'Usuario eliminado exitosamente',
        verificado: true,
      });
    } catch (error) {
      console.error('âŒ Error eliminando usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno al eliminar usuario: ' + error.message,
      });
    }
  }
);

// Ruta protegida de ejemplo
app.get('/profile', requireAuth, (req, res) => {
  res.json({
    message: 'PÃ¡gina protegida',
    user: req.session.user,
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
    console.log('ðŸŽ¯ Sistema de vacaciones inicializado correctamente');

    // Actualizar estados de vacaciones al iniciar
    await vacacionesManager.actualizarEstadosVacaciones();
    console.log('âœ… Estados de vacaciones actualizados');
  } catch (error) {
    console.error('âŒ Error inicializando sistema de vacaciones:', error);
  }
}

// === APIS PARA GESTIÃ“N DE VACACIONES ===

// Obtener informaciÃ³n detallada de vacaciones de un empleado
app.get('/api/empleado/:id/vacaciones', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    if (!vacacionesManager) {
      await initializeVacacionesSystem();
    }
    const vacaciones = await vacacionesManager.calcularInfoVacaciones(id);
    res.json({ success: true, vacaciones });
  } catch (error) {
    console.error('âŒ Error obteniendo vacaciones del empleado:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo informaciÃ³n de vacaciones',
    });
  }
});

// Crear nuevo perÃ­odo de vacaciones
app.post('/api/vacaciones', requireAuth, async (req, res) => {
  const datosVacaciones = req.body;

  if (
    !datosVacaciones.empleado_id ||
    !datosVacaciones.fecha_inicio ||
    !datosVacaciones.fecha_fin
  ) {
    return res.status(400).json({
      success: false,
      message: 'Empleado, fecha de inicio y fecha de fin son requeridos',
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
      message: 'PerÃ­odo de vacaciones creado exitosamente',
      vacaciones: resultado,
    });
  } catch (error) {
    console.error('âŒ Error creando perÃ­odo de vacaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error creando perÃ­odo de vacaciones: ' + error.message,
    });
  }
});

// Obtener historial de vacaciones de un empleado
app.get(
  '/api/empleado/:id/historial-vacaciones',
  requireAuth,
  async (req, res) => {
    const { id } = req.params;
    const incluirArchivados = req.query.incluir_archivados === 'true';

    try {
      if (!vacacionesManager) {
        await initializeVacacionesSystem();
      }
      const historial = await vacacionesManager.getHistorialEmpleado(
        id,
        incluirArchivados
      );
      res.json({ success: true, historial });
    } catch (error) {
      console.error('âŒ Error obteniendo historial de vacaciones:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo historial de vacaciones',
      });
    }
  }
);

// Limpiar registros antiguos de vacaciones (ejecutar manualmente o programado)
app.post('/api/vacaciones/limpiar-antiguos', requireAuth, async (req, res) => {
  // Solo administradores pueden ejecutar esta limpieza
  if (req.session.user.rol !== 'administrador') {
    return res.status(403).json({
      success: false,
      message: 'Solo administradores pueden ejecutar la limpieza de registros',
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
      registrosArchivados: resultado.registrosArchivados,
    });
  } catch (error) {
    console.error('âŒ Error limpiando registros antiguos:', error);
    res.status(500).json({
      success: false,
      message: 'Error limpiando registros antiguos: ' + error.message,
    });
  }
});

// === RUTAS DE VACACIONES ===
app.put('/api/vacaciones/actualizar', requireAuth, async (req, res) => {
  const { empleado_id, fecha_inicio, fecha_fin, observaciones } = req.body;

  console.log('ðŸ“ Actualizando vacaciones para empleado ID:', empleado_id);

  if (!empleado_id || !fecha_inicio || !fecha_fin) {
    return res.status(400).json({
      success: false,
      message:
        'ID del empleado, fecha de inicio y fecha de fin son obligatorios',
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
      db.db.run(query, values, function (err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });

    if (result.changes > 0) {
      console.log('âœ… Vacaciones actualizadas correctamente');
      res.json({
        success: true,
        message: 'Vacaciones actualizadas correctamente',
        changes: result.changes,
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Empleado no encontrado',
      });
    }
  } catch (error) {
    console.error('âŒ Error actualizando vacaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor: ' + error.message,
    });
  }
});

app.delete(
  '/api/vacaciones/eliminar/:empleadoId',
  requireAuth,
  async (req, res) => {
    const empleadoId = req.params.empleadoId;

    console.log('ðŸ—‘ï¸ Eliminando vacaciones para empleado ID:', empleadoId);

    try {
      const query = `
            UPDATE empleados 
            SET fecha_vacaciones_inicio = NULL, fecha_vacaciones_fin = NULL
            WHERE id = ?
        `;

      const result = await new Promise((resolve, reject) => {
        db.db.run(query, [empleadoId], function (err) {
          if (err) {
            reject(err);
          } else {
            resolve({ changes: this.changes });
          }
        });
      });

      if (result.changes > 0) {
        console.log('âœ… Vacaciones eliminadas correctamente');
        res.json({
          success: true,
          message: 'Vacaciones eliminadas correctamente',
          changes: result.changes,
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Empleado no encontrado',
        });
      }
    } catch (error) {
      console.error('âŒ Error eliminando vacaciones:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor: ' + error.message,
      });
    }
  }
);

// === RUTAS DE EMPLEADOS ===
// Obtener empleados completos con informaciÃ³n de departamentos
app.get('/api/empleados-completos', requireAuth, async (req, res) => {
  try {
    const query = `
            SELECT 
                e.*,
                'Sin Departamento' as departamento_nombre
            FROM empleados e
            ORDER BY e.id ASC
        `;

    const empleados = await new Promise((resolve, reject) => {
      db.db.all(query, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          // AÃ±adir ID numÃ©rico a cada empleado
          const empleadosConIdNumerico = rows.map((empleado) => ({
            ...empleado,
            id_numerico: parseInt(empleado.id) || empleado.id,
          }));
          resolve(empleadosConIdNumerico);
        }
      });
    });

    console.log(
      `ðŸ“Š Enviando ${empleados.length} empleados completos con IDs numÃ©ricos`
    );
    res.json({
      success: true,
      empleados: empleados,
    });
  } catch (error) {
    console.error('âŒ Error obteniendo empleados completos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor: ' + error.message,
    });
  }
});

// Obtener empleado especÃ­fico por ID
app.get('/api/empleado/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  console.log('ðŸ” Buscando empleado con ID:', id);

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
      console.log(
        'âœ… Empleado encontrado:',
        empleado.nombre,
        empleado.apellido
      );
      res.json({
        success: true,
        empleado: empleado,
      });
    } else {
      console.log('âŒ Empleado no encontrado para ID:', id);
      res.status(404).json({
        success: false,
        message: 'Empleado no encontrado',
      });
    }
  } catch (error) {
    console.error('âŒ Error obteniendo empleado:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor: ' + error.message,
    });
  }
});

// Inicializar sistema de vacaciones y arrancar servidor solo cuando este
// archivo se ejecuta directamente. Esto facilita su uso en pruebas.
if (require.main === module) {
  db.connect()
    .then(() => {
      console.log('ðŸŽ¯ Sistema de base de datos inicializado correctamente');
      return prestamos.conectar();
    })
    .then(() => {
      console.log('ðŸ“¦ Sistema de prÃ©stamos inicializado');
      return initializeVacacionesSystem();
    })
    .catch((err) => {
      console.error('âŒ Error inicializando el sistema:', err);
    });

  // Iniciar servidor HTTP y WebSocket
  const server = http.createServer(app);
  wss = new WebSocket.Server({ server });
  app.set('wss', wss);

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`ðŸš€ Servidor Express ejecutÃ¡ndose en http://0.0.0.0:${PORT}`);
    console.log('âœ… Sesiones configuradas');
    console.log('âœ… AutenticaciÃ³n lista');
    console.log('âœ… Archivos estÃ¡ticos en /public');
    console.log('ðŸ“£ WebSocket listo');
  });
}

module.exports = app;

