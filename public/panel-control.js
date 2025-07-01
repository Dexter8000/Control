let dataTable;
let editingDepartamentoId = null;
let deletingDepartamentoId = null;
let currentTableRequest = 0;

function parseRows(res) {
    if (Array.isArray(res)) return res;
    if (res.data && Array.isArray(res.data)) return res.data;
    const key = Object.keys(res).find(k => Array.isArray(res[k]));
    return key ? res[key] : [];
}

async function loadTable(tableName) {
    const requestToken = ++currentTableRequest;
    try {
        const response = await fetch(`/api/${tableName}`);
        const result = await response.json();
        if (requestToken !== currentTableRequest) return;
        const rows = parseRows(result);
        let columns = rows.length
            ? Object.keys(rows[0]).map(k => ({ title: k, data: k }))
            : [];

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
                }
            });
        }
        const $table = $('#control-table');
        if ($.fn.dataTable.isDataTable($table)) {
            $table.DataTable().clear().destroy();
            $table.empty();
        }
        if (requestToken !== currentTableRequest) return;
        dataTable = $table.DataTable({ data: rows, columns });

        if (tableName === 'departamentos') {
            addDepartamentoListeners();
        }
    } catch (err) {
        console.error('Error cargando tabla', err);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const empleadosActions = document.getElementById('empleados-actions');
    const usuariosActions = document.getElementById('usuarios-actions');
    const departamentosActions = document.getElementById('departamentos-actions');
    const btnAddDepartamento = document.getElementById('btn-add-departamento');
    const btnAddUsuario = document.getElementById('btn-add-usuario');

    if (btnAddDepartamento) {
        btnAddDepartamento.addEventListener('click', () => openDepartamentoModal());
    }
    if (btnAddUsuario) {
        btnAddUsuario.addEventListener('click', () => showNewUserModal());
    }
    document.querySelectorAll('.pc-card').forEach(card => {
        card.addEventListener('click', () => {
            loadTable(card.dataset.table);

            if (empleadosActions) {
                empleadosActions.style.display = card.dataset.table === 'empleados' ? 'flex' : 'none';
            }
            if (usuariosActions) {
                usuariosActions.style.display = card.dataset.table === 'usuarios' ? 'flex' : 'none';
            }
            if (departamentosActions) {
                departamentosActions.style.display = card.dataset.table === 'departamentos' ? 'flex' : 'none';
            }
        });
    });

    document.addEventListener('click', e => {
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
            }
        }
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            closeDepartamentoModal();
            closeDeleteDepartamentoModal();
            closeUserModal();
            closeEmpleadoModal();
            closeMassUploadModal();
        }
    });
});

function addDepartamentoListeners() {
    $('#control-table').off('click', '.edit-depto');
    $('#control-table').off('click', '.delete-depto');

    $('#control-table').on('click', '.edit-depto', function() {
        const id = this.dataset.id;
        const nombreActual = this.dataset.nombre || '';
        openDepartamentoModal(nombreActual, id);
    });

    $('#control-table').on('click', '.delete-depto', function() {
        const id = this.dataset.id;
        const nombre = this.dataset.nombre || '';
        openDeleteDepartamentoModal(id, nombre);
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
            body: JSON.stringify({ nombre })
        });
    } else {
        await fetch('/api/departamentos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre })
        });
    }
    closeDepartamentoModal();
    loadTable('departamentos');
}

function openDepartamentoModal(nombre = '', id = '') {
    editingDepartamentoId = id || null;
    document.getElementById('departamento-modal-title').textContent = id ? 'Editar Departamento' : 'Nuevo Departamento';
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

function openDeleteDepartamentoModal(id, nombre = '') {
    deletingDepartamentoId = id;
    document.getElementById('delete-depto-text').textContent = `¿Eliminar el departamento "${nombre}" (ID ${id})?`;
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
    const confirmInput = document.getElementById('confirm-delete-depto').value.trim();
    if (String(deletingDepartamentoId) !== confirmInput) return;
    await fetch(`/api/departamentos/${deletingDepartamentoId}`, { method: 'DELETE' });
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
    const title = document.getElementById('user-modal-title');
    const form = document.getElementById('user-form');
    if (!modal || !title || !form) return;

    title.textContent = 'Nuevo Usuario';
    currentEditingUserId = null;
    form.reset();

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

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
        email: formData.get('email')
    };

    if (!userData.usuario || !userData.password || !userData.rol) {
        showNotification('Usuario, contraseña y rol son requeridos', 'error');
        return;
    }

    try {
        const response = await fetch('/api/usuarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
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

function closeEmpleadoModal() {
    const modal = document.getElementById('empleado-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

async function updateEmpleadoDepartmentSelector(selected = '') {
    const select = document.querySelector('#empleado-modal select[name="departamento"]');
    if (!select || typeof getDepartamentosList !== 'function') return;
    let departamentos = await getDepartamentosList();
    const options = departamentos.map(d => {
        const sel = d.nombre === selected ? 'selected' : '';
        return `<option value="${d.nombre}" ${sel}>${d.nombre}</option>`;
    }).join('');
    select.innerHTML = '<option value="">Seleccionar departamento</option>' + options;
    if (selected) select.value = selected;
}

async function saveEmpleado() {
    const form = document.getElementById('empleado-form');
    const data = Object.fromEntries(new FormData(form));
    if (!data.nombre || !data.apellido || !data.correo_electronico || !data.rango || !data.departamento) {
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
            body: JSON.stringify(data)
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

function downloadTemplate() {
    const csvContent = `nombre,apellido,cedula,telefono,correo_electronico,placa,rango,departamento_id,fecha_ingreso,fecha_nacimiento\n` +
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
    reader.onload = function(e) {
        const csv = e.target.result;
        const lines = csv.split('\n');
        const headers = lines[0].split(',');
        let previewHTML = '<div class="upload-preview">';
        previewHTML += `<p><strong>Archivo:</strong> ${file.name}</p>`;
        previewHTML += `<p><strong>Filas detectadas:</strong> ${lines.length - 1}</p>`;
        previewHTML += '<table class="preview-table"><thead><tr>' + headers.map(h => `<th>${h.trim()}</th>`).join('') + '</tr></thead><tbody>';
        for (let i = 1; i <= Math.min(3, lines.length - 1); i++) {
            if (lines[i].trim()) {
                const cells = lines[i].split(',');
                previewHTML += '<tr>' + cells.map(c => `<td>${c.trim()}</td>`).join('') + '</tr>';
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
    reader.onload = async function(e) {
        const csv = e.target.result;
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        let successCount = 0;
        let errorCount = 0;
        let errors = [];
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const cells = lines[i].split(',').map(c => c.trim());
            const data = {};
            headers.forEach((h, idx) => { data[h] = cells[idx] || ''; });
            try {
                const res = await fetch('/api/empleados', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
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
            resultHTML += `<div class="upload-error"><p><strong>❌ Errores encontrados:</strong> ${errorCount}</p><div class="error-list"><ul>${errors.map(e => `<li>${e}</li>`).join('')}</ul></div></div>`;
        }
        document.getElementById('results-content').innerHTML = resultHTML;
        document.getElementById('upload-results').style.display = 'block';
        if (successCount > 0) {
            await loadTable('empleados');
            showNotification(`${successCount} empleados cargados exitosamente`, 'success');
        }
    };
    reader.readAsText(file);
}

window.showNuevoEmpleadoModal = showNuevoEmpleadoModal;
window.closeEmpleadoModal = closeEmpleadoModal;
window.saveEmpleado = saveEmpleado;
window.showMassUploadModal = showMassUploadModal;
window.closeMassUploadModal = closeMassUploadModal;
window.previewCSV = previewCSV;
window.uploadCSV = uploadCSV;
window.downloadTemplate = downloadTemplate;
