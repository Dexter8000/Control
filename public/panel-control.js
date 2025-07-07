let dataTable;
let editingDepartamentoId = null;
let deletingDepartamentoId = null;
let currentTableRequest = 0;

function parseRows(res) {
  // Si la respuesta es nula o indefinida, devolver array vacío
  if (!res) return [];
  
  // Si la respuesta ya es un array, devolverla directamente
  if (Array.isArray(res)) return res;
  
  // Casos comunes de respuestas API
  if (res.data && Array.isArray(res.data)) return res.data;
  if (res.rows && Array.isArray(res.rows)) return res.rows;
  if (res.items && Array.isArray(res.items)) return res.items;
  if (res.results && Array.isArray(res.results)) return res.results;
  
  // Buscar cualquier propiedad que sea un array (departamentos, empleados, etc.)
  if (typeof res === 'object' && res !== null) {
    // Casos específicos conocidos
    if (res.departamentos && Array.isArray(res.departamentos)) return res.departamentos;
    if (res.empleados && Array.isArray(res.empleados)) return res.empleados;
    if (res.usuarios && Array.isArray(res.usuarios)) return res.usuarios;
    if (res.inventario && Array.isArray(res.inventario)) return res.inventario;
    
    // Buscar cualquier propiedad que sea un array
    const key = Object.keys(res).find(k => Array.isArray(res[k]));
    if (key) return res[key];
  }
  
  // Si no se encuentra ningún array, devolver array vacío
  console.warn('No se pudo extraer datos de la respuesta:', res);
  return [];
}

async function loadTable(tableName) {
  const requestToken = ++currentTableRequest;
  const $table = $('#control-table');
  const $tableContainer = $('#table-container');
  const $errorMessage = $('#table-error-message');
  
  // Mostrar indicador de carga
  if ($tableContainer) {
    $tableContainer.addClass('loading');
    if ($errorMessage) $errorMessage.hide();
  }
  
  try {
    const response = await fetch(`/api/${tableName}`);
    if (!response.ok) {
      console.error(`Error en la petición: ${response.status} ${response.statusText}`);
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    if (requestToken !== currentTableRequest) return;
    
    const rows = parseRows(result);
    // Verificar que rows sea un array
    if (!Array.isArray(rows)) {
      throw new Error('La respuesta no contiene un array de datos válido');
    }
    
    // Determinar las columnas a partir del primer elemento o crear columnas vacías
    let columns = [];
    if (rows.length > 0 && rows[0]) {
      columns = Object.keys(rows[0]).map((k) => ({ title: k, data: k }));
    }

    if (tableName === 'departamentos') {
      columns.push({
        title: 'Acciones',
        data: null,
        orderable: false,
        render: (_, __, row) => {
          return `
                        <div class="table-actions">
                            <i class="fas fa-edit edit-depto" data-id="${row.id}" data-nombre="${row.nombre}"></i>
                            <i class="fas fa-trash delete-depto" data-id="${row.id}" data-nombre="${row.nombre}"></i>
                        </div>`;
        },
      });
    } else if (tableName === 'inventario_general_activos') {
      columns.push({
        title: 'Acciones',
        data: null,
        orderable: false,
        render: (_, __, row) => {
          return `
                        <div class="table-actions">
                            <i class="fas fa-edit edit-activo" data-id="${row.id}" data-nombre="${row.nombre}"></i>
                            <i class="fas fa-trash delete-activo" data-id="${row.id}" data-nombre="${row.nombre}"></i>
                        </div>`;
        },
      });
    } else if (tableName === 'usuarios') {
      columns.push({
        title: 'Acciones',
        data: null,
        orderable: false,
        render: (_, __, row) => {
          return `
                        <div class="table-actions">
                            <i class="fas fa-eye btn-view-user" data-id="${row.id}" title="Ver detalles"></i>
                        </div>`;
        },
      });
    }
    // Limpiar tabla existente si hay una
    try {
      if ($.fn.dataTable.isDataTable($table)) {
        $table.DataTable().clear().destroy();
        $table.empty();
      }
    } catch (err) {
      console.warn('Error al limpiar la tabla existente:', err);
      // Intentar limpiar de manera más segura
      $table.empty();
    }
    
    if (requestToken !== currentTableRequest) return;
    
    // Verificar que tengamos columnas válidas
    if (!columns || columns.length === 0) {
      // Si no hay columnas, crear al menos una columna vacía para evitar errores
      columns = [{ title: 'No hay datos disponibles', data: null }];
      rows = [];
    }
    
    // Inicializar DataTable con los datos
    try {
      dataTable = $table.DataTable({
        data: rows,
        columns,
        scrollX: true, // Habilita el desplazamiento horizontal
        scrollCollapse: true, // Mejora el comportamiento del desplazamiento
        autoWidth: false, // Desactiva el ajuste automático de ancho para mejor control
        language: {
          emptyTable: 'No hay datos disponibles',
          zeroRecords: 'No se encontraron registros coincidentes',
          info: 'Mostrando _START_ a _END_ de _TOTAL_ registros',
          infoEmpty: 'Mostrando 0 a 0 de 0 registros',
          search: 'Buscar:',
          paginate: {
            first: 'Primero',
            last: 'Último',
            next: 'Siguiente',
            previous: 'Anterior'
          }
        }
      });
    } catch (err) {
      console.error('Error al inicializar DataTable:', err);
      // Mostrar mensaje de error en la tabla
      $table.html('<tr><td colspan="100%" class="text-center">Error al cargar la tabla. Por favor, intente nuevamente.</td></tr>');
    }

    // Agregar listeners específicos para cada tipo de tabla
    if (tableName === 'departamentos') {
      addDepartamentoListeners();
    } else if (tableName === 'inventario_general_activos') {
      addActivoListeners();
    } else if (tableName === 'usuarios') {
      addUsuarioListeners();
      // Ejecutar el reemplazo de botones una vez después de cargar la tabla
      if (window.replaceEditDeleteButtons) {
        console.log('Ejecutando replaceEditDeleteButtons desde loadTable');
        setTimeout(window.replaceEditDeleteButtons, 500);
      }
    }
    
    // Quitar indicador de carga
    if ($tableContainer) {
      $tableContainer.removeClass('loading');
    }
  } catch (err) {
    console.error('Error cargando tabla', err);
    
    // Mostrar mensaje de error al usuario
    if ($errorMessage) {
      $errorMessage.html(`<div class="alert alert-danger">
        <i class="fas fa-exclamation-triangle"></i> 
        Error al cargar la tabla: ${err.message || 'Error desconocido'}
      </div>`).show();
    }
    
    try {
      // Limpiar tabla existente en caso de error
      if ($.fn.dataTable.isDataTable($table)) {
        $table.DataTable().clear().destroy();
        $table.empty();
      }
      
      // Inicializar tabla vacía para mantener la estructura
      dataTable = $table.DataTable({
        data: [],
        columns: [{ title: 'No hay datos', data: null }],
        language: {
          emptyTable: 'No se pudieron cargar los datos. Por favor, intente nuevamente.',
        }
      });
    } catch (dtError) {
      // Si falla la inicialización de DataTable, mostrar mensaje simple
      console.error('Error secundario al inicializar DataTable vacía:', dtError);
      $table.html('<thead><tr><th>No hay datos disponibles</th></tr></thead><tbody><tr><td>No se pudieron cargar los datos. Por favor, intente nuevamente.</td></tr></tbody>');
    }
    
    // Quitar indicador de carga
    if ($tableContainer) {
      $tableContainer.removeClass('loading');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const empleadosActions = document.getElementById('empleados-actions');
  const usuariosActions = document.getElementById('usuarios-actions');
  const departamentosActions = document.getElementById('departamentos-actions');
  const inventarioGeneralActions = document.getElementById('inventario_general_activos-actions');
  
  // Botones para departamentos
  const btnAddDepartamento = document.getElementById('btn-add-departamento');
  if (btnAddDepartamento) {
    btnAddDepartamento.addEventListener('click', () => openDepartamentoModal());
  }
  
  // Botones para usuarios
  const btnViewUsuarios = document.getElementById('btn-view-usuarios');
  if (btnViewUsuarios) {
    btnViewUsuarios.addEventListener('click', () => {
      // Solo cargamos la tabla de usuarios para visualización
      loadTable('usuarios');
    });
  }
  // Botones para empleados
  const btnAddEmpleado = document.getElementById('btn-add-empleado');
  const btnMassUploadEmpleados = document.getElementById('btn-mass-upload-empleados');
  
  if (btnAddEmpleado) {
    btnAddEmpleado.addEventListener('click', showNuevoEmpleadoModal);
  }
  
  if (btnMassUploadEmpleados) {
    btnMassUploadEmpleados.addEventListener('click', showMassUploadModal);
  }
  
  // Configurar botones para inventario general de activos
  const btnAddActivo = document.getElementById('btn-add-activo');
  const btnMassUploadActivos = document.getElementById('btn-mass-upload-activos');
  
  if (btnAddActivo) {
    btnAddActivo.addEventListener('click', showNuevoActivoModal);
  }
  
  if (btnMassUploadActivos) {
    btnMassUploadActivos.addEventListener('click', showMassUploadActivosModal);
  }
  
  document.querySelectorAll('.pc-card').forEach((card) => {
    card.addEventListener('click', () => {
      const table = card.getAttribute('data-table');
      if (table) {
        document.querySelectorAll('.pc-card').forEach((c) => c.classList.remove('active'));
        card.classList.add('active');
        
        document.querySelectorAll('.pc-actions').forEach((a) => (a.style.display = 'none'));
        const actions = document.getElementById(`${table}-actions`);
        if (actions) actions.style.display = 'flex';
        
        loadTable(table);
      }
    });
  });
  
  // Cargar tabla por defecto (primera tarjeta)
  const defaultCard = document.querySelector('.pc-card');
  if (defaultCard) {
    defaultCard.click();
  }
  
  // Función para cargar una tabla específica
  window.loadTable = loadTable;
  
  // Cerrar modales con clic fuera del contenido
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      if (e.target.id === 'departamento-modal') {
        closeDepartamentoModal();
      } else if (e.target.id === 'departamento-delete-modal') {
        closeDeleteDepartamentoModal();
      } else if (e.target.id === 'user-modal') {
        closeUserModal();
      } else if (e.target.id === 'empleado-modal') {
        closeEmpleadoModal();
      } else if (e.target.id === 'mass-upload-modal') {
        closeMassUploadModal();
      } else if (e.target.id === 'activo-modal') {
        closeActivoModal();
      } else if (e.target.id === 'activo-delete-modal') {
        closeDeleteActivoModal();
      } else if (e.target.id === 'activos-mass-upload-modal') {
        closeMassUploadActivosModal();
      }
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDepartamentoModal();
      closeDeleteDepartamentoModal();
      closeUserModal();
      closeEmpleadoModal();
      closeMassUploadModal();
      closeActivoModal();
      closeDeleteActivoModal();
      closeMassUploadActivosModal();
    }
  });
});

function addDepartamentoListeners() {
  $('#control-table').off('click', '.edit-depto');
  $('#control-table').off('click', '.delete-depto');

  $('#control-table').on('click', '.edit-depto', function () {
    const id = this.dataset.id;
    const nombreActual = this.dataset.nombre || '';
    openDepartamentoModal(nombreActual, id);
  });

  $('#control-table').on('click', '.delete-depto', function () {
    const id = this.dataset.id;
    const nombre = this.dataset.nombre || '';
    openDeleteDepartamentoModal(id, nombre);
  });
}

function addActivoListeners() {
  $('#control-table').off('click', '.edit-activo');
  $('#control-table').off('click', '.delete-activo');

  $('#control-table').on('click', '.edit-activo', function () {
    const id = this.dataset.id;
    showEditarActivoModal(id);
  });

  $('#control-table').on('click', '.delete-activo', function () {
    const id = this.dataset.id;
    const nombre = this.dataset.nombre || '';
    showDeleteActivoModal(id, nombre);
  });
}

function addUsuarioListeners() {
  console.log('Configurando listeners para botones de visualización de usuarios');
  
  // Eliminar listeners previos
  $('#control-table').off('click', '.btn-view-user');
  
  // Agregar listener para botones de visualización
  $('#control-table').on('click', '.btn-view-user', function () {
    const id = this.dataset.id;
    if (id && window.showUserDetails) {
      console.log('Mostrando detalles del usuario ID:', id);
      window.showUserDetails(id);
    } else {
      console.error('No se pudo mostrar los detalles del usuario. ID:', id);
    }
  });
}

async function saveDepartamento() {
  const nombre = document.getElementById('departamento-nombre').value.trim();
  const id = document.getElementById('departamento-id').value;
  if (!nombre) return;

  if (id) {
    await fetch(`/api/departamentos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre }),
    });
  } else {
    await fetch('/api/departamentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre }),
    });
  }
  closeDepartamentoModal();
  loadTable('departamentos');
}

function openDepartamentoModal(nombre = '', id = '') {
  editingDepartamentoId = id || null;
  document.getElementById('departamento-modal-title').textContent = id
    ? 'Editar Departamento'
    : 'Nuevo Departamento';
  document.getElementById('departamento-nombre').value = nombre;
  document.getElementById('departamento-id').value = id;
  document.getElementById('departamento-modal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeDepartamentoModal() {
  document.getElementById('departamento-modal').style.display = 'none';
  document.body.style.overflow = 'auto';
  editingDepartamentoId = null;
}

// Exportar funciones de departamentos al ámbito global
window.openDepartamentoModal = openDepartamentoModal;
window.closeDepartamentoModal = closeDepartamentoModal;
window.saveDepartamento = saveDepartamento;

function openDeleteDepartamentoModal(id, nombre = '') {
  deletingDepartamentoId = id;
  document.getElementById('delete-depto-text').textContent =
    `¿Eliminar el departamento "${nombre}" (ID ${id})?`;
  document.getElementById('confirm-delete-depto').value = '';
  document.getElementById('departamento-delete-modal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeDeleteDepartamentoModal() {
  document.getElementById('departamento-delete-modal').style.display = 'none';
  document.body.style.overflow = 'auto';
  deletingDepartamentoId = null;
}

async function confirmDeleteDepartamento() {
  const confirmInput = document
    .getElementById('confirm-delete-depto')
    .value.trim();
  if (String(deletingDepartamentoId) !== confirmInput) return;
  await fetch(`/api/departamentos/${deletingDepartamentoId}`, {
    method: 'DELETE',
  });
  closeDeleteDepartamentoModal();
  loadTable('departamentos');
}

window.saveDepartamento = saveDepartamento;
window.closeDepartamentoModal = closeDepartamentoModal;
window.closeDeleteDepartamentoModal = closeDeleteDepartamentoModal;
window.confirmDeleteDepartamento = confirmDeleteDepartamento;

// === Gestión de Usuarios ===
let currentEditingUserId = null;

function showNewUserModal() {
  const modal = document.getElementById('user-modal');
  if (!modal) return;
  
  const form = document.getElementById('user-form');
  const title = document.querySelector('#user-modal .modal-header h2');
  
  title.textContent = 'Nuevo Usuario';
  currentEditingUserId = null;
  form.reset();

  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

window.showNewUserModal = showNewUserModal;

function closeUserModal(e) {
  if (e) {
    if (typeof e.preventDefault === 'function') e.preventDefault();
    if (typeof e.stopPropagation === 'function') e.stopPropagation();
  }
  const modal = document.getElementById('user-modal');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    currentEditingUserId = null;
  }
}

async function saveUser(event) {
  if (event) event.preventDefault();
  const form = document.getElementById('user-form');
  if (!form) return;

  const formData = new FormData(form);
  const userData = {
    usuario: formData.get('username'),
    password: formData.get('password'),
    rol: formData.get('role'),
    nombre: formData.get('name'),
    email: formData.get('email'),
  };

  if (!userData.usuario || !userData.password || !userData.rol) {
    showNotification('Usuario, contraseña y rol son requeridos', 'error');
    return;
  }

  try {
    const response = await fetch('/api/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      let msg = 'Error guardando usuario';
      try {
        const errData = await response.json();
        msg = errData.message || msg;
      } catch {}
      throw new Error(msg);
    }

    const result = await response.json();
    if (result.success) {
      showNotification('Usuario creado exitosamente', 'success');
      closeUserModal();
    } else {
      throw new Error(result.message || 'Error guardando usuario');
    }
  } catch (err) {
    console.error('Error guardando usuario:', err);
    showNotification(err.message || 'Error guardando usuario', 'error');
  }
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.classList.add('show');
  }, 100);
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 5000);
}

window.showNewUserModal = showNewUserModal;
window.closeUserModal = closeUserModal;
window.saveUser = saveUser;

// ==== Gestión Rápida de Empleados ====
async function openDepartamentoModal(nombre = '', id = '') {
  const modal = document.getElementById('departamento-modal');
  if (!modal) return;
  
  document.getElementById('departamento-nombre').value = nombre;
  document.getElementById('departamento-id').value = id;
  editingDepartamentoId = id;
  
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

window.openDepartamentoModal = openDepartamentoModal;

async function showNuevoEmpleadoModal() {
  const modal = document.getElementById('empleado-modal');
  if (!modal) return;
  document.getElementById('empleado-form').reset();
  document.getElementById('empleado-id').value = '';
  await updateEmpleadoDepartmentSelector();
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  if (window.feather) feather.replace();
}

window.showNuevoEmpleadoModal = showNuevoEmpleadoModal;

function closeEmpleadoModal() {
  const modal = document.getElementById('empleado-modal');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
  }
}

// Exportar funciones de empleados al ámbito global
window.showNuevoEmpleadoModal = showNuevoEmpleadoModal;
window.closeEmpleadoModal = closeEmpleadoModal;
window.saveEmpleado = saveEmpleado;

// Agregar event listeners para los botones del modal de empleados
document.addEventListener('DOMContentLoaded', () => {
  // Botón de cierre del modal
  const btnCloseEmpleadoModal = document.getElementById('btn-close-empleado-modal');
  if (btnCloseEmpleadoModal) {
    btnCloseEmpleadoModal.addEventListener('click', closeEmpleadoModal);
  }
  
  // Botón de cancelar
  const btnCancelEmpleado = document.getElementById('btn-cancel-empleado');
  if (btnCancelEmpleado) {
    btnCancelEmpleado.addEventListener('click', closeEmpleadoModal);
  }
  
  // Botón de guardar
  const btnSaveEmpleado = document.getElementById('btn-save-empleado');
  if (btnSaveEmpleado) {
    btnSaveEmpleado.addEventListener('click', saveEmpleado);
  }
});

async function updateEmpleadoDepartmentSelector(selected = '') {
  const select = document.querySelector(
    '#empleado-modal select[name="departamento"]'
  );
  if (!select || typeof getDepartamentosList !== 'function') return;
  let departamentos = await getDepartamentosList();
  const options = departamentos
    .map((d) => {
      const sel = d.nombre === selected ? 'selected' : '';
      return `<option value="${d.nombre}" ${sel}>${d.nombre}</option>`;
    })
    .join('');
  select.innerHTML =
    '<option value="">Seleccionar departamento</option>' + options;
  if (selected) select.value = selected;
}

async function saveEmpleado() {
  const form = document.getElementById('empleado-form');
  const data = Object.fromEntries(new FormData(form));
  if (
    !data.nombre ||
    !data.apellido ||
    !data.correo_electronico ||
    !data.rango ||
    !data.departamento
  ) {
    showNotification('Complete los campos obligatorios', 'error');
    return;
  }
  const btn = document.querySelector('#empleado-modal .btn-save');
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando';
  try {
    const res = await fetch('/api/empleados', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Error creando empleado');
    const result = await res.json();
    if (result.success) {
      showNotification('Empleado creado exitosamente', 'success');
      closeEmpleadoModal();
      await loadTable('empleados');
    } else {
      throw new Error(result.message || 'Error');
    }
  } catch (err) {
    console.error(err);
    showNotification(err.message || 'Error', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = original;
  }
}

function showMassUploadModal() {
  const existing = document.getElementById('mass-upload-modal');
  if (existing) existing.remove();
  const modalHTML = `
        <div id="mass-upload-modal" class="modal" style="display:flex;">
            <div class="modal-content modal-large">
                <div class="modal-header">
                    <h2><i class="fas fa-upload"></i> Carga Masiva de Empleados</h2>
                    <span class="close" onclick="closeMassUploadModal()">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="upload-section">
                        <div class="upload-info">
                            <h3><i class="fas fa-info-circle"></i> Instrucciones</h3>
                            <ul>
                                <li>El archivo debe estar en formato CSV</li>
                                <li>La primera fila debe contener los encabezados</li>
                                <li>Columnas requeridas: nombre, apellido, correo_electronico, rango, departamento_id, fecha_ingreso</li>
                                <li>Columnas opcionales: cedula, telefono, placa, fecha_nacimiento</li>
                            </ul>
                        </div>
                        <div class="upload-controls">
                            <div class="form-group">
                                <label>Seleccionar archivo CSV:</label>
                                <input type="file" id="csv-file" accept=".csv" onchange="previewCSV()">
                            </div>
                            <div class="template-download">
                                <button type="button" class="btn-info" onclick="downloadTemplate()">
                                    <i class="fas fa-download"></i> Descargar Plantilla
                                </button>
                            </div>
                        </div>
                        <div id="upload-preview" style="display:none;">
                            <h4>Vista Previa:</h4>
                            <div id="preview-content"></div>
                        </div>
                        <div id="upload-results" style="display:none;">
                            <h4>Resultados:</h4>
                            <div id="results-content"></div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-secondary" onclick="closeMassUploadModal()">Cancelar</button>
                    <button type="button" class="btn-primary" id="upload-btn" onclick="uploadCSV()" style="display:none;">
                        <i class="fas fa-upload"></i> Subir Empleados
                    </button>
                </div>
            </div>
        </div>`;
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  document.body.style.overflow = 'hidden';
}

function closeMassUploadModal() {
  const modal = document.getElementById('mass-upload-modal');
  if (modal) {
    modal.remove();
    document.body.style.overflow = 'auto';
  }
}

// Exportar funciones de carga masiva al ámbito global
window.showMassUploadModal = showMassUploadModal;
window.closeMassUploadModal = closeMassUploadModal;
window.downloadTemplate = downloadTemplate;
window.previewCSV = previewCSV;
window.uploadCSV = uploadCSV;

function downloadTemplate() {
  const csvContent =
    `nombre,apellido,cedula,telefono,correo_electronico,placa,rango,departamento_id,fecha_ingreso,fecha_nacimiento\n` +
    `Juan,Pérez,12345678,555-1234,juan.perez@ejemplo.com,P001,AGENTE,1,2023-01-15,1990-05-20\n` +
    `María,González,87654321,555-5678,maria.gonzalez@ejemplo.com,P002,CABO 1RO.,2,2023-02-10,1988-08-12`;
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('hidden', '');
  a.href = url;
  a.download = 'plantilla_empleados.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showNotification('Plantilla descargada exitosamente', 'success');
}

function previewCSV() {
  const fileInput = document.getElementById('csv-file');
  const file = fileInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    const csv = e.target.result;
    const lines = csv.split('\n');
    const headers = lines[0].split(',');
    let previewHTML = '<div class="upload-preview">';
    previewHTML += `<p><strong>Archivo:</strong> ${file.name}</p>`;
    previewHTML += `<p><strong>Filas detectadas:</strong> ${lines.length - 1}</p>`;
    previewHTML +=
      '<table class="preview-table"><thead><tr>' +
      headers.map((h) => `<th>${h.trim()}</th>`).join('') +
      '</tr></thead><tbody>';
    for (let i = 1; i <= Math.min(3, lines.length - 1); i++) {
      if (lines[i].trim()) {
        const cells = lines[i].split(',');
        previewHTML +=
          '<tr>' + cells.map((c) => `<td>${c.trim()}</td>`).join('') + '</tr>';
      }
    }
    previewHTML += '</tbody></table></div>';
    document.getElementById('preview-content').innerHTML = previewHTML;
    document.getElementById('upload-preview').style.display = 'block';
    document.getElementById('upload-btn').style.display = 'inline-flex';
  };
  reader.readAsText(file);
}

async function uploadCSV() {
  const fileInput = document.getElementById('csv-file');
  const file = fileInput.files[0];
  if (!file) {
    showNotification('Por favor seleccione un archivo', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = async function (e) {
    const csv = e.target.result;
    const lines = csv.split('\n');
    const headers = lines[0].split(',').map((h) => h.trim());
    let successCount = 0;
    let errorCount = 0;
    let errors = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const cells = lines[i].split(',').map((c) => c.trim());
      const data = {};
      headers.forEach((h, idx) => {
        data[h] = cells[idx] || '';
      });
      try {
        const res = await fetch('/api/empleados', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          successCount++;
        } else {
          errorCount++;
          const err = await res.json();
          errors.push(`Fila ${i}: ${err.message}`);
        }
      } catch {
        errorCount++;
        errors.push(`Fila ${i}: Error de conexión`);
      }
    }
    let resultHTML = `<div class="upload-success"><p><strong>✅ Empleados creados exitosamente:</strong> ${successCount}</p></div>`;
    if (errorCount > 0) {
      resultHTML += `<div class="upload-error"><p><strong>❌ Errores encontrados:</strong> ${errorCount}</p><div class="error-list"><ul>${errors.map((e) => `<li>${e}</li>`).join('')}</ul></div></div>`;
    }
    document.getElementById('results-content').innerHTML = resultHTML;
    document.getElementById('upload-results').style.display = 'block';
    if (successCount > 0) {
      await loadTable('empleados');
      showNotification(
        `${successCount} empleados cargados exitosamente`,
        'success'
      );
    }
  };
  reader.readAsText(file);
}

// ==== Gestión de Inventario General de Activos ====

// Mostrar modal para crear nuevo activo
function showNuevoActivoModal() {
  // Crear modal dinámicamente si no existe
  if (!document.getElementById('activo-modal')) {
    const modalHTML = `
      <div id="activo-modal" class="modal">
        <div class="modal-content">
          <div class="modal-header">
            <div class="modal-title" id="activo-modal-title">
              <i class="fas fa-box"></i>
              Nuevo Activo
            </div>
            <button class="modal-close" onclick="closeActivoModal()">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="modal-body">
            <form id="activo-form" class="form-grid" onsubmit="event.preventDefault(); saveActivo();">
              <div class="form-section">
                <div class="form-section-title">
                  <i class="fas fa-info-circle"></i>
                  Información Básica
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Nombre *</label>
                    <input type="text" class="form-input" name="nombre" required />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Categoría *</label>
                    <select class="form-select" name="categoria" required>
                      <option value="">Seleccionar categoría</option>
                      <option value="HARDWARE">HARDWARE</option>
                      <option value="SOFTWARE">SOFTWARE</option>
                      <option value="MOBILIARIO">MOBILIARIO</option>
                      <option value="EQUIPO">EQUIPO</option>
                      <option value="OTRO">OTRO</option>
                    </select>
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Marca</label>
                    <input type="text" class="form-input" name="marca" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Modelo</label>
                    <input type="text" class="form-input" name="modelo" />
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Número de Serie</label>
                    <input type="text" class="form-input" name="serie" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Subcategoría</label>
                    <input type="text" class="form-input" name="subcategoria" />
                  </div>
                </div>
              </div>

              <div class="form-section">
                <div class="form-section-title">
                  <i class="fas fa-clipboard-check"></i>
                  Estado y Ubicación
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Estado</label>
                    <select class="form-select" name="estado">
                      <option value="">Seleccionar estado</option>
                      <option value="ACTIVO">ACTIVO</option>
                      <option value="INACTIVO">INACTIVO</option>
                      <option value="EN_REPARACION">EN REPARACIÓN</option>
                      <option value="BAJA">BAJA</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Condición</label>
                    <select class="form-select" name="condicion">
                      <option value="">Seleccionar condición</option>
                      <option value="NUEVO">NUEVO</option>
                      <option value="BUENO">BUENO</option>
                      <option value="REGULAR">REGULAR</option>
                      <option value="MALO">MALO</option>
                    </select>
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Departamento Asignado</label>
                    <select class="form-select" name="departamento_asignado">
                      <option value="">Seleccionar departamento</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Ubicación Específica</label>
                    <input type="text" class="form-input" name="ubicacion_especifica" />
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">Responsable Actual</label>
                  <input type="text" class="form-input" name="responsable_actual" />
                </div>
              </div>

              <div class="form-section">
                <div class="form-section-title">
                  <i class="fas fa-calendar-alt"></i>
                  Fechas y Detalles
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Fecha de Adquisición</label>
                    <input type="date" class="form-input" name="fecha_adquisicion" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Garantía Hasta</label>
                    <input type="date" class="form-input" name="garantia_hasta" />
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">Tipo de Adquisición</label>
                  <select class="form-select" name="tipo_adquisicion">
                    <option value="">Seleccionar tipo</option>
                    <option value="COMPRA">COMPRA</option>
                    <option value="DONACION">DONACIÓN</option>
                    <option value="PRESTAMO">PRÉSTAMO</option>
                    <option value="LEASING">LEASING</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Detalles Adicionales</label>
                  <textarea class="form-textarea" name="detalles" rows="3"></textarea>
                </div>
              </div>
              <input type="hidden" name="id" id="activo-id" />
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn-modern btn-cancel" type="button" onclick="closeActivoModal()">
              <i class="fas fa-times"></i>
              Cancelar
            </button>
            <button class="btn-modern btn-save" type="submit" form="activo-form">
              <i class="fas fa-save"></i>
              Guardar Activo
            </button>
          </div>
        </div>
      </div>
    `;
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer.firstElementChild);
    
    // Cargar departamentos en el select
    updateActivoDepartmentSelector();
  }
  
  // Mostrar el modal
  document.getElementById('activo-modal').style.display = 'block';
  document.getElementById('activo-modal-title').textContent = 'Nuevo Activo';
  document.getElementById('activo-id').value = '';
  document.getElementById('activo-form').reset();
}

// Cerrar el modal de activo
function closeActivoModal() {
  document.getElementById('activo-modal').style.display = 'none';
}

// Exportar funciones de inventario general de activos al ámbito global
window.showNuevoActivoModal = showNuevoActivoModal;
window.closeActivoModal = closeActivoModal;
window.saveActivo = saveActivo;
window.showEditarActivoModal = showEditarActivoModal;
window.showDeleteActivoModal = showDeleteActivoModal;
window.closeDeleteActivoModal = closeDeleteActivoModal;
window.confirmDeleteActivo = confirmDeleteActivo;
window.showMassUploadActivosModal = showMassUploadActivosModal;
window.closeMassUploadActivosModal = closeMassUploadActivosModal;
window.downloadActivosTemplate = downloadActivosTemplate;
window.previewActivosCSV = previewActivosCSV;
window.uploadActivosCSV = uploadActivosCSV;

// Actualizar el selector de departamentos en el formulario de activos
async function updateActivoDepartmentSelector(selected = '') {
  try {
    const response = await fetch('/api/departamentos');
    if (!response.ok) throw new Error('Error cargando departamentos');
    
    const data = await response.json();
    const departamentos = data.departamentos || [];
    
    const select = document.querySelector('#activo-form select[name="departamento_asignado"]');
    if (!select) return;
    
    // Mantener la opción por defecto
    select.innerHTML = '<option value="">Seleccionar departamento</option>';
    
    // Agregar opciones de departamentos
    departamentos.forEach(depto => {
      const option = document.createElement('option');
      option.value = depto.nombre;
      option.textContent = depto.nombre;
      if (depto.nombre === selected) option.selected = true;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error cargando departamentos:', error);
  }
}

// Guardar un activo (crear nuevo o actualizar existente)
async function saveActivo() {
  const form = document.getElementById('activo-form');
  const formData = new FormData(form);
  const id = formData.get('id');
  
  // Validar campos requeridos
  if (!formData.get('nombre') || !formData.get('categoria')) {
    alert('Por favor complete los campos obligatorios (Nombre y Categoría)');
    return;
  }
  
  // Construir objeto de datos
  const activo = {};
  formData.forEach((value, key) => {
    if (value) activo[key] = value;
  });
  
  try {
    const url = id ? `/api/inventario_general_activos/${id}` : '/api/inventario_general_activos';
    const method = id ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(activo)
    });
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    closeActivoModal();
    loadTable('inventario_general_activos');
    showNotification(`Activo ${id ? 'actualizado' : 'creado'} correctamente`, 'success');
    
  } catch (error) {
    console.error('❌ Error guardando activo:', error);
    showNotification(`Error guardando activo: ${error.message}`, 'error');
  }
}

// Mostrar modal para editar un activo existente
function showEditarActivoModal(id) {
  showNuevoActivoModal(); // Reutilizamos el modal de creación
  
  // Cambiar título y cargar datos del activo
  document.getElementById('activo-modal-title').textContent = 'Editar Activo';
  document.getElementById('activo-id').value = id;
  
  // Cargar datos del activo desde la API
  fetch(`/api/inventario_general_activos/${id}`)
    .then(response => {
      if (!response.ok) throw new Error(`Error ${response.status}`);
      return response.json();
    })
    .then(data => {
      const activo = data.activo || data;
      
      // Llenar el formulario con los datos del activo
      const form = document.getElementById('activo-form');
      
      // Para cada campo en el formulario, establecer su valor
      Object.keys(activo).forEach(key => {
        const input = form.elements[key];
        if (input) {
          if (key === 'departamento_asignado') {
            // Para el departamento, actualizar el selector
            updateActivoDepartmentSelector(activo[key]);
          } else {
            input.value = activo[key] || '';
          }
        }
      });
    })
    .catch(error => {
      console.error('Error cargando datos del activo:', error);
      showNotification(`Error cargando datos: ${error.message}`, 'error');
      closeActivoModal();
    });
}

// Mostrar modal para confirmar eliminación de un activo
function showDeleteActivoModal(id, nombre) {
  // Crear modal dinámicamente si no existe
  if (!document.getElementById('activo-delete-modal')) {
    const modalHTML = `
      <div id="activo-delete-modal" class="modal">
        <div class="modal-content" style="max-width: 450px">
          <div class="modal-header">
            <h2>
              <i class="fas fa-exclamation-triangle"></i> Confirmar Eliminación
            </h2>
            <button class="close" onclick="closeDeleteActivoModal()">
              &times;
            </button>
          </div>
          <div class="modal-body">
            <p id="delete-activo-text"></p>
            <div class="form-group">
              <label for="confirm-delete-activo">Escriba el ID para confirmar</label>
              <input type="text" id="confirm-delete-activo" placeholder="ID" />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-modern btn-secondary" onclick="closeDeleteActivoModal()">
              Cancelar
            </button>
            <button class="btn-modern btn-danger" onclick="confirmDeleteActivo()">
              Eliminar
            </button>
          </div>
        </div>
      </div>
    `;
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer.firstElementChild);
  }
  
  // Configurar modal
  document.getElementById('delete-activo-text').textContent = 
    `¿Está seguro que desea eliminar el activo "${nombre}" (ID: ${id})?`;
  document.getElementById('confirm-delete-activo').value = '';
  document.getElementById('confirm-delete-activo').dataset.id = id;
  
  // Mostrar modal
  document.getElementById('activo-delete-modal').style.display = 'block';
}

// Cerrar modal de eliminación
function closeDeleteActivoModal() {
  document.getElementById('activo-delete-modal').style.display = 'none';
}

// Confirmar y ejecutar eliminación de activo
async function confirmDeleteActivo() {
  const confirmInput = document.getElementById('confirm-delete-activo');
  const id = confirmInput.dataset.id;
  const confirmValue = confirmInput.value;
  
  if (confirmValue !== id) {
    alert('El ID ingresado no coincide. Por favor verifique.');
    return;
  }
  
  try {
    const response = await fetch(`/api/inventario_general_activos/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    closeDeleteActivoModal();
    loadTable('inventario_general_activos');
    showNotification('Activo eliminado correctamente', 'success');
    
  } catch (error) {
    console.error('❌ Error eliminando activo:', error);
    showNotification(`Error eliminando activo: ${error.message}`, 'error');
  }
}

// Mostrar modal para carga masiva de activos
function showMassUploadActivosModal() {
  // Crear modal dinámicamente si no existe
  if (!document.getElementById('activos-mass-upload-modal')) {
    const modalHTML = `
      <div id="activos-mass-upload-modal" class="modal">
        <div class="modal-content">
          <div class="modal-header">
            <h2>
              <i class="fas fa-upload"></i> Carga Masiva de Activos
            </h2>
            <button class="close" onclick="closeMassUploadActivosModal()">
              &times;
            </button>
          </div>
          <div class="modal-body">
            <div class="upload-instructions">
              <h3>Instrucciones:</h3>
              <ol>
                <li>Descargue la plantilla CSV</li>
                <li>Complete los datos de los activos</li>
                <li>Suba el archivo para importar los activos</li>
              </ol>
              <button class="btn-modern btn-secondary" onclick="downloadActivosTemplate()">
                <i class="fas fa-download"></i> Descargar Plantilla
              </button>
            </div>
            
            <div class="upload-section">
              <div class="form-group">
                <label>Seleccione archivo CSV:</label>
                <input type="file" id="activos-csv-file" accept=".csv" />
              </div>
              
              <button class="btn-modern btn-info" onclick="previewActivosCSV()">
                <i class="fas fa-eye"></i> Previsualizar
              </button>
            </div>
            
            <div id="activos-preview-container" style="display: none;">
              <h3>Previsualización:</h3>
              <div class="preview-table-container">
                <table id="activos-preview-table" class="display" style="width: 100%"></table>
              </div>
              <div class="preview-stats">
                <span id="activos-preview-count">0</span> activos encontrados
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-modern btn-secondary" onclick="closeMassUploadActivosModal()">
              Cancelar
            </button>
            <button class="btn-modern btn-primary" id="btn-upload-activos-csv" onclick="uploadActivosCSV()">
              <i class="fas fa-upload"></i> Importar Activos
            </button>
          </div>
        </div>
      </div>
    `;
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer.firstElementChild);
  }
  
  // Mostrar modal
  document.getElementById('activos-mass-upload-modal').style.display = 'block';
  document.getElementById('activos-preview-container').style.display = 'none';
  document.getElementById('btn-upload-activos-csv').disabled = true;
}

// Cerrar modal de carga masiva
function closeMassUploadActivosModal() {
  document.getElementById('activos-mass-upload-modal').style.display = 'none';
}

// Descargar plantilla CSV para activos
function downloadActivosTemplate() {
  const headers = [
    'nombre', 'marca', 'modelo', 'serie', 'categoria', 'subcategoria',
    'estado', 'condicion', 'tipo_adquisicion', 'departamento_asignado',
    'ubicacion_especifica', 'responsable_actual', 'fecha_adquisicion',
    'garantia_hasta', 'detalles'
  ];
  
  let csvContent = headers.join(',') + '\n';
  csvContent += 'Computadora Portátil,Dell,Latitude 5420,ABC123456,HARDWARE,LAPTOP,ACTIVO,BUENO,COMPRA,SISTEMAS,Oficina 101,Juan Pérez,2023-01-15,2025-01-15,"Equipo nuevo con Windows 11"';
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', 'plantilla_activos.csv');
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Previsualizar archivo CSV de activos
function previewActivosCSV() {
  const fileInput = document.getElementById('activos-csv-file');
  const previewContainer = document.getElementById('activos-preview-container');
  const previewCount = document.getElementById('activos-preview-count');
  const btnUpload = document.getElementById('btn-upload-activos-csv');
  
  if (!fileInput.files || fileInput.files.length === 0) {
    alert('Por favor seleccione un archivo CSV');
    return;
  }
  
  const file = fileInput.files[0];
  const reader = new FileReader();
  
  reader.onload = function(e) {
    const csvData = e.target.result;
    const lines = csvData.split('\n');
    const headers = lines[0].split(',');
    
    // Extraer datos (máximo 10 filas para previsualización)
    const rows = [];
    const maxRows = Math.min(lines.length, 11); // Encabezado + 10 filas
    
    for (let i = 1; i < maxRows; i++) {
      if (!lines[i].trim()) continue;
      
      const values = parseCSVLine(lines[i]);
      const row = {};
      
      headers.forEach((header, index) => {
        row[header.trim()] = values[index] ? values[index].trim() : '';
      });
      
      rows.push(row);
    }
    
    // Mostrar previsualización
    if (rows.length > 0) {
      // Destruir tabla existente si hay una
      if ($.fn.DataTable.isDataTable('#activos-preview-table')) {
        $('#activos-preview-table').DataTable().destroy();
      }
      
      // Crear columnas
      const columns = headers.map(header => ({
        title: header.trim(),
        data: header.trim()
      }));
      
      // Inicializar DataTable
      $('#activos-preview-table').DataTable({
        data: rows,
        columns: columns,
        scrollX: true,
        paging: false,
        searching: false,
        info: false
      });
      
      previewCount.textContent = lines.length - 1;
      previewContainer.style.display = 'block';
      btnUpload.disabled = false;
    } else {
      alert('No se encontraron datos válidos en el archivo CSV');
      previewContainer.style.display = 'none';
      btnUpload.disabled = true;
    }
  };
  
  reader.onerror = function() {
    alert('Error al leer el archivo');
  };
  
  reader.readAsText(file);
}

// Función auxiliar para parsear líneas CSV (maneja comillas)
function parseCSVLine(line) {
  const result = [];
  let startPos = 0;
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      inQuotes = !inQuotes;
    } else if (line[i] === ',' && !inQuotes) {
      result.push(line.substring(startPos, i).replace(/^"|"$/g, ''));
      startPos = i + 1;
    }
  }
  
  // Añadir el último valor
  result.push(line.substring(startPos).replace(/^"|"$/g, ''));
  
  return result;
}

// Subir e importar archivo CSV de activos
async function uploadActivosCSV() {
  const fileInput = document.getElementById('activos-csv-file');
  
  if (!fileInput.files || fileInput.files.length === 0) {
    alert('Por favor seleccione un archivo CSV');
    return;
  }
  
  const file = fileInput.files[0];
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await fetch('/api/inventario_general_activos/mass-upload', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Error ${response.status}`);
    }
    
    const result = await response.json();
    
    closeMassUploadActivosModal();
    loadTable('inventario_general_activos');
    showNotification(`${result.insertados || 0} activos importados correctamente`, 'success');
    
  } catch (error) {
    console.error('❌ Error en la carga masiva:', error);
    showNotification(`Error en la carga masiva: ${error.message}`, 'error');
  }
}

// Exportar funciones para uso global
window.showNuevoEmpleadoModal = showNuevoEmpleadoModal;
window.closeEmpleadoModal = closeEmpleadoModal;
window.saveEmpleado = saveEmpleado;
window.showMassUploadModal = showMassUploadModal;
window.closeMassUploadModal = closeMassUploadModal;
window.downloadTemplate = downloadTemplate;
window.previewCSV = previewCSV;
window.uploadCSV = uploadCSV;
window.showNuevoActivoModal = showNuevoActivoModal;
window.closeActivoModal = closeActivoModal;
window.saveActivo = saveActivo;
window.showEditarActivoModal = showEditarActivoModal;
window.showDeleteActivoModal = showDeleteActivoModal;
window.closeDeleteActivoModal = closeDeleteActivoModal;
window.confirmDeleteActivo = confirmDeleteActivo;
window.showMassUploadActivosModal = showMassUploadActivosModal;
window.closeMassUploadActivosModal = closeMassUploadActivosModal;
window.downloadActivosTemplate = downloadActivosTemplate;
window.previewActivosCSV = previewActivosCSV;
window.uploadActivosCSV = uploadActivosCSV;
