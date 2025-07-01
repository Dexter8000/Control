// Dashboard JavaScript - Sistema de Inventario y Control
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard().then(() => {
        if (window.location.hash === '#nuevo_usuario') {
            showNewUserModal();
        }
    });
});

// Variables globales
let currentUser = null;
let allUsers = [];
let filteredUsers = [];
let currentEditingUserId = null;
let currentDeletingUserId = null;

let ws;

function setupWebSocket() {
    try {
        ws = new WebSocket(`ws://${location.host}`);
        ws.addEventListener('message', ev => {
            try {
                const msg = JSON.parse(ev.data);
                if (msg.event === 'users-changed') {
                    loadUsers();
                }
                if (msg.event === 'employees-changed') {
                    loadEmployeesData();
                }
            } catch (err) {
                console.error('WS message error', err);
            }
        });
    } catch (err) {
        console.error('WebSocket connection failed', err);
    }
}

// Cache de departamentos para evitar solicitudes repetidas
// Obtener lista de departamentos utilizando utilidades compartidas
async function fetchDepartamentos() {
    return await getDepartamentosList();
}

// Inicializar el dashboard
async function initializeDashboard() {
    try {
        // Verificar autenticación
        const authResponse = await fetch('/profile');
        if (!authResponse.ok) {
            window.location.href = '/login';
            return;
        }

        const authData = await authResponse.json();
        currentUser = authData.user;
        console.log('Usuario autenticado:', {
            usuario: currentUser.username,
            email: currentUser.email,
            id: currentUser.id,
            login_time: new Date().toISOString()
        });

        // Cargar datos del dashboard
        await loadDashboardData();
        setupWebSocket();
        console.log('🎯 Dashboard inicializado exitosamente');
    } catch (error) {
        console.error('❌ Error inicializando dashboard:', error);
        window.location.href = '/login';
    }
}

// Cargar todos los datos del dashboard
async function loadDashboardData() {
    try {
        await Promise.all([
            loadUsers(),
            loadInventoryData(),
            loadEmployeesData()
        ]);
        console.log('✅ Datos del dashboard cargados exitosamente');
    } catch (error) {
        console.error('❌ Error cargando datos del dashboard:', error);
    }
}

// === GESTIÓN DE USUARIOS ===

// Cargar usuarios
async function loadUsers() {
    try {
        const response = await fetch('/api/usuarios');
        if (!response.ok) {
            throw new Error('Error cargando usuarios');
        }

        const data = await response.json();
        allUsers = data.usuarios || [];
        filteredUsers = [...allUsers];
        renderUsers();
        updateUsersCount();
    } catch (error) {
        console.error('❌ Error cargando usuarios:', error);
        showNotification('Error cargando usuarios', 'error');
    }
}

// Renderizar tabla de usuarios
function renderUsers() {
    const tbody = document.getElementById('users-tbody');
    if (!tbody) {
        console.error('Elemento users-table-body no encontrado');
        return;
    }

    if (filteredUsers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <i class="fas fa-users"></i>
                    <h3>No hay usuarios para mostrar</h3>
                    <p>No se encontraron usuarios con los filtros aplicados</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filteredUsers.map(user => `
        <tr>
            <td>${user.id}</td>
            <td>${user.usuario}</td>
            <td>
                <span class="role-badge ${user.rol === 'administrador' ? 'role-administrador' : 'role-usuario'}">
                    ${user.rol}
                </span>
            </td>
            <td>${user.nombre || 'Sin nombre'}</td>
            <td>${user.email || 'Sin email'}</td>
            <td class="action-buttons">
                <button class="action-btn btn-edit" onclick="editUser(${user.id})" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn btn-delete" onclick="deleteUser(${user.id})" title="Eliminar">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');

    console.log(`Renderizados ${filteredUsers.length} usuarios de ${allUsers.length} total`);
}

// Actualizar contador de usuarios
function updateUsersCount() {
    const counter = document.getElementById('users-count');
    if (counter) {
        counter.textContent = `${filteredUsers.length} de ${allUsers.length} usuarios`;
    }
}

// Filtrar usuarios
function filterUsers() {
    const searchTerm = document.getElementById('users-search')?.value.toLowerCase() || '';
    const roleFilter = document.getElementById('users-role-filter')?.value || 'todos';

    filteredUsers = allUsers.filter(user => {
        const matchesSearch = !searchTerm || 
            user.usuario.toLowerCase().includes(searchTerm) ||
            (user.nombre && user.nombre.toLowerCase().includes(searchTerm)) ||
            (user.email && user.email.toLowerCase().includes(searchTerm));

        const matchesRole = roleFilter === 'todos' || user.rol === roleFilter;

        return matchesSearch && matchesRole;
    });

    renderUsers();
    updateUsersCount();
}

// Mostrar modal de nuevo usuario
function showNewUserModal() {
    const modal = document.getElementById('user-modal');
    const title = document.getElementById('user-modal-title');
    const form = document.getElementById('user-form');

    if (!modal || !title || !form) return;

    title.textContent = 'Nuevo Usuario';
    currentEditingUserId = null;

    // Limpiar formulario
    form.reset();

    // Mostrar modal
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Editar usuario
function editUser(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) {
        console.error('Usuario no encontrado:', userId);
        return;
    }

    const modal = document.getElementById('user-modal');
    const title = document.getElementById('user-modal-title');
    const form = document.getElementById('user-form');

    if (!modal || !title || !form) {
        console.error('Elementos del modal no encontrados');
        return;
    }

    title.textContent = 'Editar Usuario';
    currentEditingUserId = userId;

    // Llenar formulario con datos del usuario
    const usernameField = document.getElementById('user-username');
    const passwordField = document.getElementById('user-password');
    const roleField = document.getElementById('user-role');
    const nameField = document.getElementById('user-name');
    const emailField = document.getElementById('user-email');

    if (usernameField) usernameField.value = user.usuario;
    if (passwordField) passwordField.value = ''; // No mostrar contraseña
    if (roleField) roleField.value = user.rol;
    if (nameField) nameField.value = user.nombre || '';
    if (emailField) emailField.value = user.email || '';

    // Mostrar modal
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    console.log('Modal de edición abierto para usuario:', user.usuario);
}

// Guardar usuario (crear o editar)
async function saveUser(event) {
    if (event) {
        event.preventDefault();
    }

    const form = document.getElementById('user-form');
    if (!form) {
        console.error('Formulario no encontrado');
        return;
    }

    const formData = new FormData(form);
    const userData = {
        usuario: formData.get('username'),
        password: formData.get('password'),
        rol: formData.get('role'),
        nombre: formData.get('name'),
        email: formData.get('email')
    };

    // Validar datos requeridos
    if (!userData.usuario || !userData.rol) {
        showNotification('Usuario y rol son requeridos', 'error');
        return;
    }

    if (!currentEditingUserId && !userData.password) {
        showNotification('La contraseña es requerida para nuevos usuarios', 'error');
        return;
    }

    try {
        let response;

        if (currentEditingUserId) {
            // Editar usuario existente
            response = await fetch(`/api/usuarios/${currentEditingUserId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData)
            });
        } else {
            // Crear nuevo usuario
            response = await fetch('/api/usuarios', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData)
            });
        }

        if (!response.ok) {
            let errorMessage = 'Error guardando usuario';
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
            } catch (parseError) {
                // Si no se puede parsear el JSON, usar mensaje por defecto
                console.error('Error parseando respuesta del servidor:', parseError);
            }
            throw new Error(errorMessage);
        }

        const result = await response.json();

        if (result.success) {
            showNotification(
                currentEditingUserId ? 'Usuario actualizado exitosamente' : 'Usuario creado exitosamente',
                'success'
            );
            closeUserModal();
            await loadUsers(); // Recargar la lista de usuarios
        } else {
            throw new Error(result.message || 'Error guardando usuario');
        }

    } catch (error) {
        console.error('❌ Error guardando usuario:', error);

        if (error.message.includes('ya está registrado') || error.message.includes('ya existe')) {
            showNotification('El nombre de usuario ya está en uso. Por favor, elija otro nombre.', 'error');
        } else {
            showNotification('Error al guardar usuario. Intente nuevamente.', 'error');
        }
    }
}

// Eliminar usuario
function deleteUser(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;

    // No permitir eliminar el usuario actual
    if (userId === currentUser.id) {
        showNotification('No puedes eliminar tu propia cuenta', 'error');
        return;
    }

    currentDeletingUserId = userId;

    // Mostrar modal de confirmación
    const modal = document.getElementById('confirm-modal');
    const message = document.getElementById('confirm-message');

    if (modal && message) {
        message.innerHTML = `
            <p>¿Está seguro de que desea eliminar el usuario <strong>${user.usuario}</strong>?</p>
            <p><strong>Esta acción no se puede deshacer.</strong></p>
        `;
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

// Confirmar eliminación de usuario
async function confirmDeleteUser() {
    if (!currentDeletingUserId) return;

    try {
        const response = await fetch(`/api/usuarios/${currentDeletingUserId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error eliminando usuario');
        }

        const result = await response.json();

        if (result.success) {
            showNotification('Usuario eliminado exitosamente', 'success');
            closeConfirmModal();
            await loadUsers(); // Recargar la lista de usuarios
        } else {
            throw new Error(result.message || 'Error eliminando usuario');
        }

    } catch (error) {
        console.error('❌ Error eliminando usuario:', error);
        showNotification('Error de conexión al eliminar usuario: ' + error.message, 'error');
    }
}

// Cerrar modal de usuario
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

// Cerrar modal de confirmación
function closeConfirmModal() {
    const modal = document.getElementById('confirm-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        currentDeletingUserId = null;
    }
}

// === OTRAS FUNCIONES DEL DASHBOARD ===

// Cargar datos de inventario
async function loadInventoryData() {
    try {
        const response = await fetch('/api/inventario-completo');

        if (response.ok) {
            const data = await response.json();

            const principalData = data.inventario || [];
            const perifericoData = principalData.flatMap(item => item.perifericos || []);

            // Actualizar contadores del dashboard
            updateInventoryCounters(principalData, perifericoData);
        }
    } catch (error) {
        console.error('❌ Error cargando inventario:', error);
    }
}

// === REDIRECCIÓN A GESTIÓN MODERNA ===

// La gestión de empleados ahora se maneja completamente en /empleados.html
// Esta sección del dashboard solo muestra la redirección

// Función para mostrar modal de carga masiva
function showMassUploadModal() {
    console.log('📤 Mostrando modal de carga masiva');

    const modalHTML = `
        <div id="mass-upload-modal" class="modal" style="display: flex;">
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

                        <div id="upload-preview" style="display: none;">
                            <h4>Vista Previa:</h4>
                            <div id="preview-content"></div>
                        </div>

                        <div id="upload-results" style="display: none;">
                            <h4>Resultados:</h4>
                            <div id="results-content"></div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-secondary" onclick="closeMassUploadModal()">Cancelar</button>
                    <button type="button" class="btn-primary" id="upload-btn" onclick="uploadCSV()" style="display: none;">
                        <i class="fas fa-upload"></i> Subir Empleados
                    </button>
                </div>
            </div>
        </div>
    `;

    const modalExistente = document.getElementById('mass-upload-modal');
    if (modalExistente) {
        modalExistente.remove();
    }

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.body.style.overflow = 'hidden';
}

// Función para cerrar modal de carga masiva
function closeMassUploadModal() {
    const modal = document.getElementById('mass-upload-modal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = 'auto';
    }
}

// Función para descargar plantilla CSV
function downloadTemplate() {
    const csvContent = `nombre,apellido,cedula,telefono,correo_electronico,placa,rango,departamento_id,fecha_ingreso,fecha_nacimiento
Juan,Pérez,12345678,555-1234,juan.perez@ejemplo.com,P001,AGENTE,1,2023-01-15,1990-05-20
María,González,87654321,555-5678,maria.gonzalez@ejemplo.com,P002,CABO 1RO.,2,2023-02-10,1988-08-12`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'plantilla_empleados.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    showNotification('Plantilla descargada exitosamente', 'success');
}

// Función para previsualizar CSV
function previewCSV() {
    const fileInput = document.getElementById('csv-file');
    const file = fileInput.files[0];

    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const csv = e.target.result;
        const lines = csv.split('\n');
        const headers = lines[0].split(',');

        let previewHTML = `
            <div class="upload-preview">
                <p><strong>Archivo:</strong> ${file.name}</p>
                <p><strong>Filas detectadas:</strong> ${lines.length - 1}</p>
                <table class="preview-table">
                    <thead>
                        <tr>${headers.map(h => `<th>${h.trim()}</th>`).join('')}</tr>
                    </thead>
                    <tbody>
        `;

        // Mostrar solo las primeras 3 filas como ejemplo
        for (let i = 1; i <= Math.min(3, lines.length - 1); i++) {
            if (lines[i].trim()) {
                const cells = lines[i].split(',');
                previewHTML += `<tr>${cells.map(c => `<td>${c.trim()}</td>`).join('')}</tr>`;
            }
        }

        previewHTML += `
                    </tbody>
                </table>
            </div>
        `;

        document.getElementById('preview-content').innerHTML = previewHTML;
        document.getElementById('upload-preview').style.display = 'block';
        document.getElementById('upload-btn').style.display = 'inline-flex';
    };

    reader.readAsText(file);
}

// Función para subir CSV
async function uploadCSV() {
    const fileInput = document.getElementById('csv-file');
    const file = fileInput.files[0];

    if (!file) {
        showNotification('Por favor seleccione un archivo', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = async function(e) {
        const csv = e.target.result;
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());

        let sucessCount = 0;
        let errorCount = 0;
        let errors = [];

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;

            const cells = lines[i].split(',').map(c => c.trim());
            const empleadoData = {};

            headers.forEach((header, index) => {
                empleadoData[header] = cells[index] || '';
            });

            try {
                const response = await fetch('/api/empleados', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(empleadoData)
                });

                if (response.ok) {
                    sucessCount++;
                } else {
                    errorCount++;
                    const error = await response.json();
                    errors.push(`Fila ${i}: ${error.message}`);
                }
            } catch (error) {
                errorCount++;
                errors.push(`Fila ${i}: Error de conexión`);
            }
        }

        let resultHTML = `
            <div class="upload-success">
                <p><strong>✅ Empleados creados exitosamente:</strong> ${sucessCount}</p>
            </div>
        `;

        if (errorCount > 0) {
            resultHTML += `
                <div class="upload-error">
                    <p><strong>❌ Errores encontrados:</strong> ${errorCount}</p>
                    <div class="error-list">
                        <ul>${errors.map(e => `<li>${e}</li>`).join('')}</ul>
                    </div>
                </div>
            `;
        }

        document.getElementById('results-content').innerHTML = resultHTML;
        document.getElementById('upload-results').style.display = 'block';

        if (sucessCount > 0) {
            await loadEmployeesData();
            await loadDashboardData();
            showNotification(`${sucessCount} empleados cargados exitosamente`, 'success');
        }
    };

    reader.readAsText(file);
}

// Variable global para empleado en edición
let empleadoEnEdicion = null;

// Función para editar empleado (disponible globalmente)
window.editarEmpleado = async function editarEmpleado(empleadoId) {
    // Usar el ID tal como viene
    console.log('Editando empleado ID:', empleadoId);

    try {
        // Obtener datos del empleado específico usando ID completo
        const response = await fetch(`/api/empleado/${empleadoId}`);

        if (!response.ok) {
            console.error('Error HTTP:', response.status, response.statusText);
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.success && data.empleado) {
            empleadoEnEdicion = data.empleado;
            await mostrarModalEdicionEmpleado(data.empleado);
        } else {
            console.error('Respuesta sin datos válidos:', data);
            showNotification('Error: No se encontraron datos del empleado', 'error');
        }
    } catch (error) {
        console.error('Error completo cargando empleado:', error);
        showNotification('Error de conexión: ' + error.message, 'error');
    }
}

// Mostrar modal de edición de empleado
async function mostrarModalEdicionEmpleado(empleado) {
    console.log('Mostrando modal para empleado:', empleado);

    let departamentos = await fetchDepartamentos();
    if (departamentos.length !== 16) {
        clearDepartamentosCache();
        departamentos = await fetchDepartamentos();
    }
    const departamentoOptions = departamentos.map(dep =>
        `<option value="${dep.id}" ${empleado.departamento_id === dep.id ? 'selected' : ''}>${dep.nombre}</option>`
    ).join('');

    // Crear modal simple
    const modalHTML = `
        <div id="empleado-edit-modal" class="modal" style="display: flex;">
            <div class="modal-content modal-large">
                <div class="modal-header">
                    <h2><i class="fas fa-user-edit"></i> Editar Empleado</h2>
                    <span class="close" onclick="cerrarModalEdicionEmpleado()">&times;</span>
                </div>
                <div class="modal-body">
                    <form id="empleado-edit-form">
                        <div class="form-grid">
                            <div class="form-section">
                                <h3><i class="fas fa-user"></i> Información Personal</h3>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Nombre *</label>
                                        <input type="text" name="nombre" value="${empleado.nombre || ''}" required>
                                    </div>
                                    <div class="form-group">
                                        <label>Apellido *</label>
                                        <input type="text" name="apellido" value="${empleado.apellido || ''}" required>
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Cédula</label>
                                        <input type="text" name="cedula" value="${empleado.cedula || ''}">
                                    </div>
                                    <div class="form-group">
                                        <label>Teléfono</label>
                                        <input type="tel" name="telefono" value="${empleado.telefono || ''}">
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label>Email</label>
                                    <input type="email" name="correo_electronico" value="${empleado.correo_electronico || empleado.correo || ''}">
                                </div>
                            </div>

                            <div class="form-section">
                                <h3><i class="fas fa-briefcase"></i> Información Laboral</h3>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Placa</label>
                                        <input type="text" name="placa" value="${empleado.placa || ''}">
                                    </div>
                                    <div class="form-group">
                                        <label>Rango</label>
                                        <select name="rango">
                                            <option value="">Seleccionar rango</option>
                                            <option value="AGENTE" ${empleado.rango === 'AGENTE' ? 'selected' : ''}>AGENTE</option>
                                            <option value="CABO 1RO." ${empleado.rango === 'CABO 1RO.' ? 'selected' : ''}>CABO 1RO.</option>
                                            <option value="CABO 2DO." ${empleado.rango === 'CABO 2DO.' ? 'selected' : ''}>CABO 2DO.</option>
                                            <option value="SARGENTO" ${empleado.rango === 'SARGENTO' ? 'selected' : ''}>SARGENTO</option>
                                            <option value="COMISIONADO" ${empleado.rango === 'COMISIONADO' ? 'selected' : ''}>COMISIONADO</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Departamento</label>
                                        <select name="departamento_id">
                                            <option value="">Seleccionar departamento</option>
                                            ${departamentoOptions}
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label>Fecha de Ingreso</label>
                                        <input type="date" name="fecha_ingreso" value="${empleado.fecha_ingreso ? empleado.fecha_ingreso.split('T')[0] : ''}">
                                    </div>
                                </div>
                            </div>

                            <div class="form-section">
                                <h3><i class="fas fa-info-circle"></i> Información Adicional</h3>
                                <div class="form-group">
                                    <label>Fecha de Nacimiento</label>
                                    <input type="date" name="fecha_nacimiento" value="${empleado.fecha_nacimiento ? empleado.fecha_nacimiento.split('T')[0] : ''}">
                                </div>
                            </div>
                        </div>
                        <input type="hidden" name="id" value="${empleado.id}">
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-secondary" onclick="cerrarModalEdicionEmpleado()">Cancelar</button>
                    <button type="button" class="btn-primary" onclick="guardarCambiosEmpleado()">
                        <i class="fas fa-save"></i> Guardar Cambios
                    </button>
                </div>
            </div>
        </div>
    `;

    // Eliminar modal anterior si existe
    const modalExistente = document.getElementById('empleado-edit-modal');
    if (modalExistente) {
        modalExistente.remove();
    }

    // Insertar en el DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.body.style.overflow = 'hidden';

    console.log('Modal de edición mostrado correctamente');
}

// Cerrar modal de edición
function cerrarModalEdicionEmpleado() {
    const modal = document.getElementById('empleado-edit-modal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = 'auto';
    }
    empleadoEnEdicion = null;
}

// Guardar cambios del empleado
async function guardarCambiosEmpleado() {
    const form = document.getElementById('empleado-edit-form');
    if (!form) {
        console.error('Formulario no encontrado');
        return;
    }

    const formData = new FormData(form);
    const empleadoData = Object.fromEntries(formData);

    console.log('Guardando empleado:', empleadoData);

    try {
        const response = await fetch(`/api/empleados/${empleadoData.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(empleadoData)
        });

        const result = await response.json();

        if (result.success) {
            showNotification('Empleado actualizado exitosamente', 'success');
            cerrarModalEdicionEmpleado();
            await loadEmployeesData(); // Recargar la tabla
        } else {
            showNotification('Error: ' + result.message, 'error');
        }

    } catch (error) {
        console.error('Error actualizando empleado:', error);
        showNotification('Error de conexión al actualizar empleado', 'error');
    }
}

// Variables globales para filtrado
let allEmpleadosData = [];
let filteredEmpleadosData = [];

// Cargar datos básicos de empleados para estadísticas del dashboard
async function loadEmployeesData() {
    try {
        const empleadosResponse = await fetch('/api/empleados-completos');

        if (empleadosResponse.ok) {
            const data = await empleadosResponse.json();
            const empleados = data.empleados || [];

            // Actualizar contador en el dashboard principal
            const empleadosCount = document.getElementById('total-empleados');
            if (empleadosCount) {
                empleadosCount.textContent = empleados.length;
            }

            console.log(`✅ Estadísticas de empleados actualizadas: ${empleados.length} total`);
        }
    } catch (error) {
        console.error('❌ Error cargando estadísticas de empleados:', error);
    }
}

// Cargar departamentos en el filtro
function loadDepartamentosFilter(departamentos) {
    const select = document.getElementById('filter-departamento');
    if (select && departamentos) {
        // Limpiar opciones existentes excepto la primera
        while (select.children.length > 1) {
            select.removeChild(select.lastChild);
        }

        departamentos.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept.nombre;
            option.textContent = dept.nombre;
            select.appendChild(option);
        });

        if (select.options.length - 1 !== 16) {
            clearDepartamentosCache();
            fetchDepartamentos().then(deps => loadDepartamentosFilter(deps));
        }
    }
}

// Función de filtrado de empleados
function filterEmpleados() {
    const rangoFilter = document.getElementById('filter-rango')?.value || '';
    const departamentoFilter = document.getElementById('filter-departamento')?.value || '';

    filteredEmpleadosData = allEmpleadosData.filter(empleado => {
        const matchesRango = !rangoFilter || empleado.rango === rangoFilter;
        const matchesDepartamento = !departamentoFilter || empleado.departamento_nombre === departamentoFilter;

        return matchesRango && matchesDepartamento;
    });

    updateEmployeesTable(filteredEmpleadosData);
    updateEmpleadosCount();
}

// Actualizar contador de empleados filtrados
function updateEmpleadosCount() {
    const counter = document.getElementById('empleados-filtered-count');
    if (counter) {
        counter.textContent = `${filteredEmpleadosData.length} de ${allEmpleadosData.length} empleados mostrados`;
    }
}

// Actualizar contadores de inventario
function updateInventoryCounters(principal, periferico) {
    // Actualizar contadores en el dashboard principal
    const principalCount = document.getElementById('principal-count');
    const perifericoCount = document.getElementById('periferico-count');

    if (principalCount) principalCount.textContent = principal ? principal.length : 0;
    if (perifericoCount) perifericoCount.textContent = periferico ? periferico.length : 0;
}

// Actualizar tabla de empleados con datos completos (simplificada)
function updateEmployeesTable(empleados) {
    const tbody = document.getElementById('empleados-body');
    if (!tbody || !empleados) return;

    if (empleados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    <i class="fas fa-users"></i>
                    <h3>No hay empleados registrados</h3>
                    <p>No se encontraron empleados en la base de datos</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = empleados.map(empleado => {
        return `
            <tr>
                <td>${empleado.id}</td>
                <td><span class="placa-badge">${empleado.placa || 'Sin placa'}</span></td>
                <td><span class="rango-badge">${empleado.rango || 'Sin rango'}</span></td>
                <td>
                    <div class="empleado-name">
                        <strong>${empleado.nombre || 'Sin nombre'} ${empleado.apellido || 'Sin apellido'}</strong>
                    </div>
                </td>
                <td>${empleado.departamento_nombre || 'Sin departamento'}</td>
                <td>
                    <div class="contact-info">
                        <i class="fas fa-envelope"></i>
                        <span>${empleado.correo || empleado.correo_electronico || 'Sin email'}</span>
                    </div>
                </td>
                <td>
                    <div class="contact-info">
                        <i class="fas fa-phone"></i>
                        <span>${empleado.telefono || 'Sin teléfono'}</span>
                    </div>
                </td>
                <td>
                    <div class="empleado-actions">
                        <button class="btn-edit-empleado action-btn btn-edit" onclick="editarEmpleado('${empleado.id}')" title="Editar Empleado">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    console.log(`✅ Tabla de empleados actualizada con ${empleados.length} registros`);
}

// Función segura para editar empleado (simplificada)
window.editarEmpleadoSeguro = function(empleadoId) {
    // Validar que el ID sea válido
    const id = parseInt(empleadoId);
    if (isNaN(id) || id <= 0) {
        console.error('ID de empleado inválido:', empleadoId);
        showNotification('Error: ID de empleado inválido', 'error');
        return;
    }

    console.log('Editando empleado con ID válido:', id);
    editarEmpleado(id);
}

// Función mejorada para calcular información de vacaciones usando nueva API
function calcularVacaciones(empleado) {
    // Esta función ahora maneja la lógica simplificada para la tabla
    // La API detallada se usará cuando sea necesario información completa

    if (!empleado.fecha_vacaciones_inicio || !empleado.fecha_vacaciones_fin) {
        return {
            estado: 'sin_vacaciones',
            texto: 'Sin vacaciones programadas',
            icono: '<i class="fas fa-calendar-times text-muted"></i>',
            clase: 'sin-vacaciones',
            diasTranscurridos: 0
        };
    }

    const hoy = new Date();
    const fechaInicio = new Date(empleado.fecha_vacaciones_inicio);
    const fechaFin = new Date(empleado.fecha_vacaciones_fin);
    const fechaRetorno = new Date(fechaFin);
    fechaRetorno.setDate(fechaRetorno.getDate() + 1);

    if (hoy < fechaInicio) {
        // Vacaciones futuras
        const diasHasta = Math.ceil((fechaInicio - hoy) / (1000 * 60 * 60 * 24));
        return {
            estado: 'programadas',
            texto: `Programadas (en ${diasHasta} días)`,
            detalle: `Inicio: ${formatearFecha(empleado.fecha_vacaciones_inicio)}`,
            icono: '<i class="fas fa-calendar-check text-info"></i>',
            clase: 'programadas',
            diasHasta: diasHasta
        };
    } else if (hoy >= fechaInicio && hoy <= fechaFin) {
        // En vacaciones actualmente
        const diasTranscurridos = Math.ceil((hoy - fechaInicio) / (1000 * 60 * 60 * 24)) + 1;
        const diasRestantes = Math.ceil((fechaRetorno - hoy) / (1000 * 60 * 60 * 24));
        const diasTotales = Math.ceil((fechaFin - fechaInicio) / (1000 * 60 * 60 * 24)) + 1;

        return {
            estado: 'en_vacaciones',
            texto: `En vacaciones (${diasTranscurridos}/${diasTotales} días)`,
            detalle: `Retorna: ${formatearFecha(fechaRetorno)} (en ${diasRestantes} días)`,
            icono: '<i class="fas fa-umbrella-beach text-success"></i>',
            clase: 'en-vacaciones',
            diasTranscurridos: diasTranscurridos,
            diasRestantes: diasRestantes,
            fechaRetorno: fechaRetorno
        };
    } else {
        // Vacaciones pasadas
        return {
            estado: 'finalizadas',
            texto: 'Vacaciones finalizadas',
            detalle: `Del ${formatearFecha(empleado.fecha_vacaciones_inicio)} al ${formatearFecha(empleado.fecha_vacaciones_fin)}`,
            icono: '<i class="fas fa-check-circle text-muted"></i>',
            clase: 'finalizadas'
        };
    }
}

// Función para obtener información detallada de vacaciones vía API
async function obtenerVacacionesDetalladas(empleadoId) {
    try {
        const response = await fetch(`/api/empleado/${empleadoId}/vacaciones`);
        if (!response.ok) throw new Error('Error en la respuesta');

        const data = await response.json();
        return data.vacaciones;
    } catch (error) {
        console.error('Error obteniendo vacaciones detalladas:', error);
        return null;
    }
}

// Función para mostrar modal de gestión de vacaciones (disponible globalmente)
window.mostrarModalVacaciones = async function mostrarModalVacaciones(empleadoId) {
    console.log('Mostrando modal de vacaciones para empleado ID:', empleadoId);

    try {
        // Obtener datos del empleado
        const response = await fetch(`/api/empleado/${empleadoId}`);
        if (!response.ok) {
            throw new Error('Error al obtener datos del empleado');
        }

        const data = await response.json();
        if (!data.success || !data.empleado) {
            throw new Error('No se encontraron datos del empleado');
        }

        const empleado = data.empleado;

        // Crear modal de vacaciones
        const modalHTML = `
            <div id="vacaciones-modal" class="modal" style="display: flex;">
                <div class="modal-content modal-large">
                    <div class="modal-header">
                        <h2><i class="fas fa-umbrella-beach"></i> Gestionar Vacaciones</h2>
                        <span class="close" onclick="cerrarModalVacaciones()">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div class="empleado-info">
                            <h3>${empleado.nombre} ${empleado.apellido}</h3>
                            <p><strong>Placa:</strong> ${empleado.placa || 'Sin placa'}</p>
                            <p><strong>Departamento:</strong> ${empleado.departamento_nombre || 'Sin departamento'}</p>
                        </div>

                        <form id="vacaciones-form">
                            <div class="form-section">
                                <h4><i class="fas fa-calendar-alt"></i> Período de Vacaciones</h4>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Fecha de Inicio *</label>
                                        <input type="date" name="fecha_inicio" value="${empleado.fecha_vacaciones_inicio ? empleado.fecha_vacaciones_inicio.split('T')[0] : ''}" required>
                                    </div>
                                    <div class="form-group">
                                        <label>Fecha de Fin *</label>
                                        <input type="date" name="fecha_fin" value="${empleado.fecha_vacaciones_fin ? empleado.fecha_vacaciones_fin.split('T')[0] : ''}" required>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label>Observaciones</label>
                                    <textarea name="observaciones" rows="3" placeholder="Observaciones adicionales sobre las vacaciones..."></textarea>
                                </div>
                            </div>
                            <input type="hidden" name="empleado_id" value="${empleado.id}">
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn-secondary" onclick="cerrarModalVacaciones()">Cancelar</button>
                        <button type="button" class="btn-danger" onclick="eliminarVacaciones(${empleado.id})">
                            <i class="fas fa-trash"></i> Eliminar Vacaciones
                        </button>
                        <button type="button" class="btn-primary" onclick="guardarVacaciones()">
                            <i class="fas fa-save"></i> Guardar Vacaciones
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Eliminar modal anterior si existe
        const modalExistente = document.getElementById('vacaciones-modal');
        if (modalExistente) {
            modalExistente.remove();
        }

        // Insertar en el DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        document.body.style.overflow = 'hidden';

        console.log('Modal de vacaciones mostrado correctamente');

    } catch (error) {
        console.error('Error mostrando modal de vacaciones:', error);
        showNotification('Error cargando datos del empleado: ' + error.message, 'error');
    }
}

// Función para cerrar modal de vacaciones
function cerrarModalVacaciones() {
    const modal = document.getElementById('vacaciones-modal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = 'auto';
    }
}

// Función para guardar vacaciones
async function guardarVacaciones() {
    const form = document.getElementById('vacaciones-form');
    if (!form) {
        console.error('Formulario de vacaciones no encontrado');
        return;
    }

    const formData = new FormData(form);
    const vacacionesData = Object.fromEntries(formData);

    console.log('Guardando vacaciones:', vacacionesData);

    try {
        const response = await fetch('/api/vacaciones/actualizar', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(vacacionesData)
        });

        const result = await response.json();

        if (result.success) {
            showNotification('Vacaciones actualizadas exitosamente', 'success');
            cerrarModalVacaciones();
            await loadEmployeesData(); // Recargar la tabla
        } else {
            showNotification('Error: ' + result.message, 'error');
        }

    } catch (error) {
        console.error('Error actualizando vacaciones:', error);
        showNotification('Error de conexión al actualizar vacaciones', 'error');
    }
}

// Función para eliminar vacaciones
async function eliminarVacaciones(empleadoId) {
    if (!confirm('¿Está seguro de que desea eliminar las vacaciones de este empleado?')) {
        return;
    }

    try {
        const response = await fetch(`/api/vacaciones/eliminar/${empleadoId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            showNotification('Vacaciones eliminadas exitosamente', 'success');
            cerrarModalVacaciones();
            await loadEmployeesData(); // Recargar la tabla
        } else {
            showNotification('Error: ' + result.message, 'error');
        }

    } catch (error) {
        console.error('Error eliminando vacaciones:', error);
        showNotification('Error de conexión al eliminar vacaciones', 'error');
    }
}

function getVacacionesDefault() {
    return {
        estado: 'sin_vacaciones',
        texto: 'Sin vacaciones programadas',
        icono: '<i class="fas fa-calendar-times text-muted"></i>',
        clase: 'sin-vacaciones',
        diasTranscurridos: 0
    };
}

// Función para calcular información de cumpleaños
function calcularCumpleanos(fechaNacimiento) {
    if (!fechaNacimiento) {
        return {
            esCumpleanosMes: false,
            diasHasta: null,
            edad: null
        };
    }

    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    const cumpleañosEsteAño = new Date(hoy.getFullYear(), nacimiento.getMonth(), nacimiento.getDate());

    // Si ya pasó el cumpleaños este año, calculamos para el próximo año
    if (cumpleañosEsteAño < hoy) {
        cumpleañosEsteAño.setFullYear(hoy.getFullYear() + 1);
    }

    const diasHasta = Math.ceil((cumpleañosEsteAño - hoy) / (1000 * 60 * 60 * 24));
    const edad = hoy.getFullYear() - nacimiento.getFullYear();
    const esCumpleanosMes = diasHasta <= 30; // Próximos 30 días

    return {
        esCumpleanosMes,
        diasHasta,
        edad
    };
}

// Función para formatear fechas
function formatearFecha(fecha) {
    if (!fecha) return 'Sin fecha';

    const opciones = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    };

    return new Date(fecha).toLocaleDateString('es-ES', opciones);
}

// Navegación entre secciones
function showSection(sectionId) {
    console.log('Cambiando a sección:', sectionId);

    // Ocultar todas las secciones
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.style.display = 'none';
    });

    // Mostrar la sección seleccionada
    const targetSection = document.getElementById(sectionId + '-section');
    if (targetSection) {
        targetSection.style.display = 'block';
        console.log('Sección mostrada:', sectionId);
    } else {
        console.error('Sección no encontrada:', sectionId);
    }

    // Actualizar navegación activa
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.classList.remove('active');
    });

    // Marcar el elemento de menú como activo
    const activeMenuItem = document.querySelector(`[data-section="${sectionId}"]`);
    if (activeMenuItem) {
        activeMenuItem.classList.add('active');
        console.log('Menu item activado');
    }
}

// Función para navegar desde acciones rápidas
function navigateToSection(sectionId) {
    showSection(sectionId);
}

// Mostrar notificaciones
function showNotification(message, type = 'info') {
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;

    // Agregar al DOM
    document.body.appendChild(notification);

    // Mostrar con animación
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);

    // Ocultar después de 5 segundos
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

// === SISTEMA DE TEMAS ===
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    document.documentElement.setAttribute('data-theme', newTheme);
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    // Actualizar iconos y texto
    const themeIcon = document.getElementById('theme-icon');
    const themeText = document.getElementById('theme-text');

    if (themeIcon && themeText) {
        if (newTheme === 'light') {
            themeIcon.className = 'fas fa-sun';
            themeText.textContent = 'Claro';
        } else {
            themeIcon.className = 'fas fa-moon';
            themeText.textContent = 'Oscuro';
        }
    }

    showNotification(`Tema ${newTheme === 'light' ? 'claro' : 'oscuro'} activado`, 'success');
    console.log('Tema cambiado a:', newTheme);
}

// Cargar tema guardado
function loadSavedTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    document.body.setAttribute('data-theme', savedTheme);

    const themeIcon = document.getElementById('theme-icon');
    const themeText = document.getElementById('theme-text');

    if (themeIcon && themeText) {
        if (savedTheme === 'light') {
            themeIcon.className = 'fas fa-sun';
            themeText.textContent = 'Claro';
        } else {
            themeIcon.className = 'fas fa-moon';
            themeText.textContent = 'Oscuro';
        }
    }

    console.log('Tema cargado:', savedTheme);
}

// Logout
async function logout() {
    try {
        const response = await fetch('/api/logout', {
            method: 'POST'
        });

        if (response.ok) {
            window.location.href = '/login';
        } else {
            console.error('Error en logout');
        }
    } catch (error) {
        console.error('❌ Error en logout:', error);
        // Redirigir de todas formas
        window.location.href = '/login';
    }
}



// Función para actualizar la hora (corregida)
function updateTime() {
    const timeDisplay = document.getElementById('current-time');
    if (timeDisplay) {
        const now = new Date();
        const timeString = now.toLocaleTimeString('es-ES', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        timeDisplay.textContent = timeString;
    }
}

// Inicialización principal
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 Dashboard inicializado exitosamente');
    loadSavedTheme(); // Cargar tema guardado
    initializeDashboard();

    // Inicializar reloj solo si el elemento existe
    const timeElement = document.getElementById('current-time');
    if (timeElement) {
        updateTime();
        setInterval(updateTime, 1000);
    }
});

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Event listeners para navegación del menú
    const menuItems = document.querySelectorAll('.menu-item[data-section]');
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.getAttribute('data-section');
            if (sectionId) {
                showSection(sectionId);
            }
        });
    });

    // Búsqueda de usuarios
    const usersSearch = document.getElementById('users-search');
    if (usersSearch) {
        usersSearch.addEventListener('input', filterUsers);
    }

    // Filtro de rol
    const roleFilter = document.getElementById('users-role-filter');
    if (roleFilter) {
        roleFilter.addEventListener('change', filterUsers);
    }

    // Formulario de usuario
    const userForm = document.getElementById('user-form');
    if (userForm) {
        userForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveUser();
        });
    }

    // Cerrar modales al hacer clic fuera
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            if (e.target.id === 'user-modal') {
                closeUserModal();
            } else if (e.target.id === 'confirm-modal') {
                closeConfirmModal();
            }
        }
    });

    // Tecla ESC para cerrar modales
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeUserModal();
            closeConfirmModal();
        }
    });
});