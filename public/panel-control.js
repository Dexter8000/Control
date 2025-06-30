let dataTable;
let editingDepartamentoId = null;
let deletingDepartamentoId = null;

function parseRows(res) {
    if (Array.isArray(res)) return res;
    if (res.data && Array.isArray(res.data)) return res.data;
    const key = Object.keys(res).find(k => Array.isArray(res[k]));
    return key ? res[key] : [];
}

async function loadTable(tableName) {
    try {
        const response = await fetch(`/api/${tableName}`);
        const result = await response.json();
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
        if ($.fn.dataTable.isDataTable('#control-table')) {
            $('#control-table').DataTable().clear().destroy();
            $('#control-table').empty();
        }
        dataTable = $('#control-table').DataTable({ data: rows, columns });

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
            }
        }
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            closeDepartamentoModal();
            closeDeleteDepartamentoModal();
            closeUserModal();
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

function closeUserModal() {
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
