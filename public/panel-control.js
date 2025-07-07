let dataTable;
let editingDepartamentoId = null;
let deletingDepartamentoId = null;

async function loadDepartamentos() {
  const container = document.getElementById('table-container');
  const $table = $('#control-table');
  if (container) container.classList.add('loading');
  try {
    const res = await fetch('/api/departamentos');
    if (!res.ok) throw new Error(`Error ${res.status}`);
    const data = await res.json();
    const rows = Array.isArray(data)
      ? data
      : data.departamentos || data.data || [];

    let columns = [];
    if (rows.length) {
      columns = Object.keys(rows[0]).map(k => ({ title: k, data: k }));
    }
    columns.push({
      title: 'Acciones',
      data: null,
      orderable: false,
      render: (_, __, row) =>
        `<div class="table-actions">
          <i class="fas fa-edit edit-depto" data-id="${row.id}" data-nombre="${row.nombre}"></i>
          <i class="fas fa-trash delete-depto" data-id="${row.id}" data-nombre="${row.nombre}"></i>
        </div>`
    });

    if ($.fn.dataTable.isDataTable($table)) {
      $table.DataTable().clear().destroy();
      $table.empty();
    }

    dataTable = $table.DataTable({
      data: rows,
      columns,
      scrollX: true,
      language: { url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json' }
    });

    addDepartamentoListeners();
  } catch (err) {
    console.error('Error cargando departamentos', err);
    if (container) container.innerHTML = `<div class="error">Error: ${err.message}</div>`;
  } finally {
    if (container) container.classList.remove('loading');
  }
}

function addDepartamentoListeners() {
  $('#control-table').off('click', '.edit-depto');
  $('#control-table').off('click', '.delete-depto');

  $('#control-table').on('click', '.edit-depto', function () {
    openDepartamentoModal(this.dataset.nombre, this.dataset.id);
  });

  $('#control-table').on('click', '.delete-depto', function () {
    openDeleteDepartamentoModal(this.dataset.id, this.dataset.nombre);
  });
}

function openDepartamentoModal(nombre = '', id = '') {
  editingDepartamentoId = id || null;
  document.getElementById('departamento-modal-title').textContent =
    id ? 'Editar Departamento' : 'Nuevo Departamento';
  document.getElementById('departamento-nombre').value = nombre;
  document.getElementById('departamento-id').value = id;
  document.getElementById('departamento-modal').style.display = 'block';
}

function closeDepartamentoModal() {
  document.getElementById('departamento-modal').style.display = 'none';
  editingDepartamentoId = null;
}

async function saveDepartamento() {
  const id = document.getElementById('departamento-id').value;
  const nombre = document.getElementById('departamento-nombre').value.trim();
  if (!nombre) return;
  const url = id ? `/api/departamentos/${id}` : '/api/departamentos';
  const method = id ? 'PUT' : 'POST';
  await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre })
  });
  closeDepartamentoModal();
  loadDepartamentos();
}

function openDeleteDepartamentoModal(id, nombre = '') {
  deletingDepartamentoId = id;
  document.getElementById('delete-depto-text').textContent =
    `¿Eliminar el departamento "${nombre}" (ID ${id})?`;
  document.getElementById('confirm-delete-depto').value = '';
  document.getElementById('departamento-delete-modal').style.display = 'block';
}

function closeDeleteDepartamentoModal() {
  document.getElementById('departamento-delete-modal').style.display = 'none';
  deletingDepartamentoId = null;
}

async function confirmDeleteDepartamento() {
  const input = document.getElementById('confirm-delete-depto').value.trim();
  if (String(deletingDepartamentoId) !== input) return;
  await fetch(`/api/departamentos/${deletingDepartamentoId}`, { method: 'DELETE' });
  closeDeleteDepartamentoModal();
  loadDepartamentos();
}

document.addEventListener('DOMContentLoaded', () => {
  const btnAdd = document.getElementById('btn-add-departamento');
  if (btnAdd) btnAdd.addEventListener('click', () => openDepartamentoModal());
  loadDepartamentos();

  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      if (e.target.id === 'departamento-modal') closeDepartamentoModal();
      if (e.target.id === 'departamento-delete-modal') closeDeleteDepartamentoModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDepartamentoModal();
      closeDeleteDepartamentoModal();
    }
  });
});

window.saveDepartamento = saveDepartamento;
window.openDepartamentoModal = openDepartamentoModal;
window.closeDepartamentoModal = closeDepartamentoModal;
window.confirmDeleteDepartamento = confirmDeleteDepartamento;
window.closeDeleteDepartamentoModal = closeDeleteDepartamentoModal;

