let dataTable;

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
                            <i class="fas fa-trash delete-depto" data-id="${row.id}"></i>
                        </div>`;
                }
            });
        }
        if (dataTable) {
            dataTable.clear().destroy();
            document.querySelector('#control-table').innerHTML = '';
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

    if (btnAddDepartamento) {
        btnAddDepartamento.addEventListener('click', crearDepartamento);
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
});

function addDepartamentoListeners() {
    $('#control-table').off('click', '.edit-depto');
    $('#control-table').off('click', '.delete-depto');

    $('#control-table').on('click', '.edit-depto', async function() {
        const id = this.dataset.id;
        const nombreActual = this.dataset.nombre || '';
        const nuevoNombre = prompt('Nuevo nombre del departamento:', nombreActual);
        if (nuevoNombre && nuevoNombre.trim() !== '') {
            await fetch(`/api/departamentos/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre: nuevoNombre.trim() })
            });
            loadTable('departamentos');
        }
    });

    $('#control-table').on('click', '.delete-depto', async function() {
        const id = this.dataset.id;
        const confirmId = prompt(`Escriba el ID ${id} para confirmar eliminación:`);
        if (confirmId === id) {
            await fetch(`/api/departamentos/${id}`, { method: 'DELETE' });
            loadTable('departamentos');
        }
    });
}

async function crearDepartamento() {
    const nombre = prompt('Nombre del nuevo departamento:');
    if (!nombre || nombre.trim() === '') return;
    await fetch('/api/departamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombre.trim() })
    });
    loadTable('departamentos');
}
