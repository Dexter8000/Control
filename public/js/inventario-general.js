/**
 * Inventario General de Activos
 * Script para gestionar el inventario general de activos
 */

document.addEventListener('DOMContentLoaded', function() {
  // Variables globales
  let tabla;
  let departamentos = [];
  let activoActual = null;
  let categorias = new Set();

  // Inicializar componentes
  inicializarTabla();
  cargarDepartamentos();
  cargarInventario();
  configurarEventos();

  /**
   * Inicializa la tabla DataTable
   */
  function inicializarTabla() {
    tabla = $('#tablaInventario').DataTable({
      language: {
        url: 'js/dataTables.spanish.json'
      },
      columns: [
        { data: 'id' },
        { data: 'nombre' },
        { data: 'marca' },
        { data: 'modelo' },
        { data: 'serie' },
        { data: 'categoria' },
        { 
          data: 'estado',
          render: function(data) {
            let badgeClass = 'bg-secondary';
            if (data === 'Activo') badgeClass = 'bg-success';
            if (data === 'Inactivo') badgeClass = 'bg-warning';
            if (data === 'En reparación') badgeClass = 'bg-info';
            if (data === 'Dado de baja') badgeClass = 'bg-danger';
            
            return `<span class="badge ${badgeClass} status-badge">${data || 'No definido'}</span>`;
          }
        },
        { data: 'departamento_asignado' },
        { data: 'responsable_actual' },
        { data: 'fecha_adquisicion' },
        { 
          data: null,
          render: function(data) {
            return `
              <button class="btn btn-sm btn-outline-primary btn-action btn-editar" data-id="${data.id}">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-sm btn-outline-danger btn-action btn-eliminar" data-id="${data.id}">
                <i class="bi bi-trash"></i>
              </button>
            `;
          }
        }
      ],
      responsive: true,
      order: [[0, 'desc']]
    });
  }

  /**
   * Carga los departamentos desde la API
   */
  function cargarDepartamentos() {
    fetch('/api/departamentos')
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          departamentos = data.departamentos;
          
          // Llenar el select de departamentos en el formulario
          const selectDepartamento = document.getElementById('departamento_asignado');
          selectDepartamento.innerHTML = '<option value="">Seleccionar...</option>';
          
          departamentos.forEach(depto => {
            const option = document.createElement('option');
            option.value = depto.nombre;
            option.textContent = depto.nombre;
            selectDepartamento.appendChild(option);
          });
          
          // Llenar el filtro de departamentos
          const filtroDepartamento = document.getElementById('filtroDepartamento');
          filtroDepartamento.innerHTML = '<option value="">Todos</option>';
          
          departamentos.forEach(depto => {
            const option = document.createElement('option');
            option.value = depto.nombre;
            option.textContent = depto.nombre;
            filtroDepartamento.appendChild(option);
          });
        }
      })
      .catch(error => {
        console.error('Error cargando departamentos:', error);
        mostrarAlerta('Error cargando departamentos', 'danger');
      });
  }

  /**
   * Carga el inventario desde la API
   */
  function cargarInventario() {
    fetch('/api/inventario-general-activos')
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          tabla.clear();
          tabla.rows.add(data.inventario).draw();
          
          // Extraer categorías únicas para el filtro
          categorias.clear();
          data.inventario.forEach(item => {
            if (item.categoria) {
              categorias.add(item.categoria);
            }
          });
          
          // Actualizar el filtro de categorías
          const filtroCategoria = document.getElementById('filtroCategoria');
          filtroCategoria.innerHTML = '<option value="">Todas</option>';
          
          categorias.forEach(categoria => {
            const option = document.createElement('option');
            option.value = categoria;
            option.textContent = categoria;
            filtroCategoria.appendChild(option);
          });
        } else {
          mostrarAlerta('Error cargando inventario', 'danger');
        }
      })
      .catch(error => {
        console.error('Error cargando inventario:', error);
        mostrarAlerta('Error cargando inventario', 'danger');
      });
  }

  /**
   * Configura los eventos de la interfaz
   */
  function configurarEventos() {
    // Evento para abrir modal de nuevo activo
    document.getElementById('btnNuevoActivo').addEventListener('click', () => {
      document.getElementById('formActivo').reset();
      document.getElementById('activoId').value = '';
      document.getElementById('modalActivoLabel').textContent = 'Nuevo Activo';
      activoActual = null;
      
      // Establecer fecha de creación como hoy
      const fechaHoy = new Date().toISOString().split('T')[0];
      document.getElementById('fecha_adquisicion').value = fechaHoy;
      
      const modalActivo = new bootstrap.Modal(document.getElementById('modalActivo'));
      modalActivo.show();
    });
    
    // Evento para guardar activo (nuevo o edición)
    document.getElementById('btnGuardarActivo').addEventListener('click', guardarActivo);
    
    // Eventos para botones de editar y eliminar (delegación de eventos)
    document.querySelector('#tablaInventario tbody').addEventListener('click', function(e) {
      const target = e.target.closest('.btn-editar, .btn-eliminar');
      if (!target) return;
      
      const id = target.getAttribute('data-id');
      
      if (target.classList.contains('btn-editar')) {
        editarActivo(id);
      } else if (target.classList.contains('btn-eliminar')) {
        confirmarEliminarActivo(id);
      }
    });
    
    // Evento para confirmar eliminación
    document.getElementById('btnConfirmarEliminar').addEventListener('click', eliminarActivo);
    
    // Eventos para filtros
    document.getElementById('filtroCategoria').addEventListener('change', aplicarFiltros);
    document.getElementById('filtroEstado').addEventListener('change', aplicarFiltros);
    document.getElementById('filtroDepartamento').addEventListener('change', aplicarFiltros);
    
    // Evento para búsqueda general
    document.getElementById('busquedaGeneral').addEventListener('keyup', function() {
      tabla.search(this.value).draw();
    });
  }

  /**
   * Aplica los filtros seleccionados a la tabla
   */
  function aplicarFiltros() {
    const categoriaSeleccionada = document.getElementById('filtroCategoria').value;
    const estadoSeleccionado = document.getElementById('filtroEstado').value;
    const departamentoSeleccionado = document.getElementById('filtroDepartamento').value;
    
    // Limpiar filtros anteriores
    tabla.columns().search('').draw();
    
    // Aplicar nuevos filtros
    if (categoriaSeleccionada) {
      tabla.column(5).search(categoriaSeleccionada).draw();
    }
    
    if (estadoSeleccionado) {
      tabla.column(6).search(estadoSeleccionado).draw();
    }
    
    if (departamentoSeleccionado) {
      tabla.column(7).search(departamentoSeleccionado).draw();
    }
  }

  /**
   * Guarda un activo (nuevo o actualización)
   */
  function guardarActivo() {
    // Validar campos requeridos
    const nombre = document.getElementById('nombre').value.trim();
    const categoria = document.getElementById('categoria').value;
    
    if (!nombre || !categoria) {
      mostrarAlerta('Por favor complete los campos obligatorios', 'warning');
      return;
    }
    
    // Recopilar datos del formulario
    const activoData = {
      nombre: nombre,
      marca: document.getElementById('marca').value.trim(),
      modelo: document.getElementById('modelo').value.trim(),
      serie: document.getElementById('serie').value.trim(),
      categoria: categoria,
      subcategoria: document.getElementById('subcategoria').value.trim(),
      estado: document.getElementById('estado').value,
      condicion: document.getElementById('condicion').value,
      tipo_adquisicion: document.getElementById('tipo_adquisicion').value,
      departamento_asignado: document.getElementById('departamento_asignado').value,
      ubicacion_especifica: document.getElementById('ubicacion_especifica').value.trim(),
      responsable_actual: document.getElementById('responsable_actual').value.trim(),
      fecha_adquisicion: document.getElementById('fecha_adquisicion').value,
      detalles: document.getElementById('detalles').value.trim(),
      garantia_hasta: document.getElementById('garantia_hasta').value,
      fecha_asignacion: document.getElementById('fecha_asignacion').value
    };
    
    // Si es un nuevo activo, agregar fecha de creación
    if (!activoActual) {
      activoData.fecha_creacion = new Date().toISOString().split('T')[0];
    }
    
    const id = document.getElementById('activoId').value;
    const esNuevo = !id;
    
    const url = esNuevo 
      ? '/api/inventario-general-activos' 
      : `/api/inventario-general-activos/${id}`;
    
    const method = esNuevo ? 'POST' : 'PUT';
    
    fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(activoData)
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        mostrarAlerta(esNuevo ? 'Activo creado exitosamente' : 'Activo actualizado exitosamente', 'success');
        
        // Cerrar modal y recargar datos
        const modalActivo = bootstrap.Modal.getInstance(document.getElementById('modalActivo'));
        modalActivo.hide();
        
        cargarInventario();
      } else {
        mostrarAlerta(`Error: ${data.message}`, 'danger');
      }
    })
    .catch(error => {
      console.error('Error guardando activo:', error);
      mostrarAlerta('Error guardando activo', 'danger');
    });
  }

  /**
   * Carga un activo para edición
   */
  function editarActivo(id) {
    fetch(`/api/inventario-general-activos/${id}`)
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          activoActual = data.activo;
          
          // Llenar el formulario con los datos del activo
          document.getElementById('activoId').value = activoActual.id;
          document.getElementById('nombre').value = activoActual.nombre || '';
          document.getElementById('marca').value = activoActual.marca || '';
          document.getElementById('modelo').value = activoActual.modelo || '';
          document.getElementById('serie').value = activoActual.serie || '';
          document.getElementById('categoria').value = activoActual.categoria || '';
          document.getElementById('subcategoria').value = activoActual.subcategoria || '';
          document.getElementById('estado').value = activoActual.estado || 'Activo';
          document.getElementById('condicion').value = activoActual.condicion || '';
          document.getElementById('tipo_adquisicion').value = activoActual.tipo_adquisicion || '';
          document.getElementById('departamento_asignado').value = activoActual.departamento_asignado || '';
          document.getElementById('ubicacion_especifica').value = activoActual.ubicacion_especifica || '';
          document.getElementById('responsable_actual').value = activoActual.responsable_actual || '';
          document.getElementById('fecha_adquisicion').value = activoActual.fecha_adquisicion || '';
          document.getElementById('detalles').value = activoActual.detalles || '';
          document.getElementById('garantia_hasta').value = activoActual.garantia_hasta || '';
          document.getElementById('fecha_asignacion').value = activoActual.fecha_asignacion || '';
          
          // Actualizar título del modal
          document.getElementById('modalActivoLabel').textContent = 'Editar Activo';
          
          // Mostrar modal
          const modalActivo = new bootstrap.Modal(document.getElementById('modalActivo'));
          modalActivo.show();
        } else {
          mostrarAlerta('Error cargando datos del activo', 'danger');
        }
      })
      .catch(error => {
        console.error('Error cargando activo:', error);
        mostrarAlerta('Error cargando datos del activo', 'danger');
      });
  }

  /**
   * Muestra el modal de confirmación para eliminar un activo
   */
  function confirmarEliminarActivo(id) {
    fetch(`/api/inventario-general-activos/${id}`)
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          activoActual = data.activo;
          
          // Mostrar información en el modal de confirmación
          document.getElementById('nombreActivoEliminar').textContent = 
            `${activoActual.nombre} (${activoActual.marca || ''} ${activoActual.modelo || ''})`;
          
          // Guardar el ID para la eliminación
          document.getElementById('btnConfirmarEliminar').setAttribute('data-id', id);
          
          // Mostrar modal de confirmación
          const modalConfirmar = new bootstrap.Modal(document.getElementById('modalConfirmarEliminar'));
          modalConfirmar.show();
        } else {
          mostrarAlerta('Error cargando datos del activo', 'danger');
        }
      })
      .catch(error => {
        console.error('Error cargando activo:', error);
        mostrarAlerta('Error cargando datos del activo', 'danger');
      });
  }

  /**
   * Elimina un activo
   */
  function eliminarActivo() {
    const id = this.getAttribute('data-id');
    
    fetch(`/api/inventario-general-activos/${id}`, {
      method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        mostrarAlerta('Activo eliminado exitosamente', 'success');
        
        // Cerrar modal y recargar datos
        const modalConfirmar = bootstrap.Modal.getInstance(document.getElementById('modalConfirmarEliminar'));
        modalConfirmar.hide();
        
        cargarInventario();
      } else {
        mostrarAlerta(`Error: ${data.message}`, 'danger');
      }
    })
    .catch(error => {
      console.error('Error eliminando activo:', error);
      mostrarAlerta('Error eliminando activo', 'danger');
    });
  }

  /**
   * Muestra una alerta en la parte superior de la página
   */
  function mostrarAlerta(mensaje, tipo) {
    // Crear elemento de alerta
    const alerta = document.createElement('div');
    alerta.className = `alert alert-${tipo} alert-dismissible fade show`;
    alerta.setAttribute('role', 'alert');
    alerta.innerHTML = `
      ${mensaje}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Insertar al inicio del contenedor
    const container = document.querySelector('.container-fluid');
    container.insertBefore(alerta, container.firstChild);
    
    // Auto-cerrar después de 5 segundos
    setTimeout(() => {
      const alertNode = bootstrap.Alert.getOrCreateInstance(alerta);
      alertNode.close();
    }, 5000);
  }
});
