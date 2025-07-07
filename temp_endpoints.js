// ===== NUEVOS ENDPOINTS PARA INVENTARIO GENERAL DE ACTIVOS =====

// Obtener todos los activos del inventario general
app.get('/api/inventario-general-activos', requireAuth, async (req, res) => {
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
app.get('/api/inventario-general-activos/:id', requireAuth, async (req, res) => {
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
app.post('/api/inventario-general-activos', requireAuth, async (req, res) => {
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
app.put('/api/inventario-general-activos/:id', requireAuth, async (req, res) => {
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
app.delete('/api/inventario-general-activos/:id', requireAuth, async (req, res) => {
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
