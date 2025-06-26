import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { migrateDatabase } from "./migration";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize PostgreSQL database with migration
  try {
    await migrateDatabase();
    console.log('✅ Base de datos PostgreSQL inicializada');
  } catch (error) {
    console.error('❌ Error inicializando PostgreSQL:', error);
  }

  // Departamentos routes
  app.get('/api/departamentos', async (req, res) => {
    try {
      const departamentos = await storage.getDepartamentos();
      res.json(departamentos);
    } catch (error) {
      console.error('Error obteniendo departamentos:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // Empleados routes
  app.get('/api/empleados', async (req, res) => {
    try {
      const empleados = await storage.getEmpleadosCompletos();
      res.json(empleados);
    } catch (error) {
      console.error('Error obteniendo empleados:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  app.post('/api/empleados', async (req, res) => {
    try {
      const empleadoData = {
        ...req.body,
        id: `EMP${Date.now()}`, // Generate unique ID
      };
      const empleado = await storage.createEmpleado(empleadoData);
      res.status(201).json(empleado);
    } catch (error) {
      console.error('Error creando empleado:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  app.put('/api/empleados/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const empleado = await storage.updateEmpleado(id, req.body);
      res.json(empleado);
    } catch (error) {
      console.error('Error actualizando empleado:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  app.delete('/api/empleados/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteEmpleado(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error eliminando empleado:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // Inventario routes
  app.get('/api/inventario/principal', async (req, res) => {
    try {
      const inventario = await storage.getInventarioPrincipal();
      res.json(inventario);
    } catch (error) {
      console.error('Error obteniendo inventario principal:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  app.get('/api/inventario/periferico', async (req, res) => {
    try {
      const inventario = await storage.getInventarioPeriferico();
      res.json(inventario);
    } catch (error) {
      console.error('Error obteniendo inventario periférico:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // Legacy auth route compatibility
  app.post('/api/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await storage.getUserByUsername(username);
      
      if (user && user.contrasena === password) {
        req.session.user = {
          id: user.id,
          usuario: user.usuario,
          rol: user.rol
        };
        res.json({ success: true, user: { id: user.id, usuario: user.usuario, rol: user.rol } });
      } else {
        res.status(401).json({ success: false, message: 'Credenciales inválidas' });
      }
    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}