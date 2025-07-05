// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function () {
  // Variables globales
  let equipos = [];
  let perifericos = [];
  // Endpoints CRUD de inventario
  const API_INVENTARIO_PRINCIPAL = '/api/inventario-principal';
  const API_INVENTARIO_PERIFERICO = '/api/inventario-periferico';
  let currentView = 'principal';
  let equipoPrincipalSeleccionado = null;

  // Elementos del DOM
  const navButtons = document.querySelectorAll('.nav-btn');
  const viewContainers = document.querySelectorAll('.view-container');
  const searchInput = document.getElementById('search-input');
  const statusFilter = document.getElementById('status-filter');
  const typeFilter = document.getElementById('type-filter');
  const addPrincipalBtn = document.getElementById('add-principal');
  const addPerifericoBtn = document.getElementById('add-periferico');
  const exportPdfBtn = document.getElementById('export-pdf');
  const modal = document.getElementById('equipo-modal');
  const confirmModal = document.getElementById('confirm-modal');
  const closeModalBtn = document.querySelector('.close-btn');
  const cancelModalBtn = document.querySelector('.cancel-btn');
  const equipoForm = document.getElementById('equipo-form');
  const saveBtn = document.querySelector('.save-btn');
  const addAnotherBtn = document.querySelector('.add-another-btn');
  const finishBtn = document.querySelector('.finish-btn');
  const confirmBtn = document.querySelector('.confirm-btn');
  const cancelConfirmBtn = document.querySelector(
    '.confirm-actions .cancel-btn'
  );


  // Inicializar la aplicación
  init();

  async function init() {
    await loadInventario();
    showView(currentView);
    setupEventListeners();
  }

  async function loadInventario() {
    await Promise.all([loadEquipos(), loadPerifericos()]);
  }

  async function loadEquipos() {
    try {
      const res = await fetch(API_INVENTARIO_PRINCIPAL);
      const data = await res.json();
      equipos = data.inventario || data.data || [];
    } catch (err) {
      console.error('Error cargando inventario principal:', err);
      equipos = [];
    }
  }

  async function loadPerifericos() {
    try {
      const res = await fetch(API_INVENTARIO_PERIFERICO);
      const data = await res.json();
      perifericos = data.inventario || data.data || [];
    } catch (err) {
      console.error('Error cargando periféricos:', err);
      perifericos = [];
    }
  }

  async function deleteItem(id, type) {
    const url =
      type === 'principal'
        ? `${API_INVENTARIO_PRINCIPAL}/${id}`
        : `${API_INVENTARIO_PERIFERICO}/${id}`;
    const res = await fetch(url, { method: 'DELETE' });
    if (!res.ok) {
      throw new Error('Error eliminando elemento');
    }
  }

  function setupEventListeners() {
    // Navegación entre vistas
    navButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const view = button.dataset.view;
        currentView = view;
        showView(view);

        // Actualizar botones activos
        navButtons.forEach((btn) => btn.classList.remove('active'));
        button.classList.add('active');
      });
    });

    // Búsqueda y filtrado
    searchInput.addEventListener('input', filterItems);
    statusFilter.addEventListener('change', filterItems);
    typeFilter.addEventListener('change', filterItems);

    // Botones para agregar equipos
    addPrincipalBtn.addEventListener('click', () =>
      openEquipoModal('principal')
    );
    addPerifericoBtn.addEventListener('click', () =>
      openEquipoModal('periferico')
    );

    // Exportar a PDF
    exportPdfBtn.addEventListener('click', exportToPdf);

    // Modal
    closeModalBtn.addEventListener('click', closeModal);
    cancelModalBtn.addEventListener('click', closeModal);

    // Confirmación
    cancelConfirmBtn.addEventListener('click', () => {
      confirmModal.classList.remove('show');
    });

    confirmBtn.addEventListener('click', confirmAction);

    // Formulario
    equipoForm.addEventListener('submit', handleFormSubmit);

    // Botones especiales del formulario
    addAnotherBtn.addEventListener('click', () => {
      handleFormSubmit(new Event('submit'), 'add-another');
    });

    finishBtn.addEventListener('click', () => {
      handleFormSubmit(new Event('submit'), 'finish');
    });



    // Cambios en categoría para actualizar subcategorías
    document
      .getElementById('categoria')
      .addEventListener('change', updateSubcategorias);
  }

  function showView(view) {
    // Ocultar todas las vistas
    viewContainers.forEach((container) => {
      container.classList.add('hidden');
    });

    // Mostrar la vista seleccionada
    document.getElementById(`${view}-view`).classList.remove('hidden');

    // Renderizar los datos correspondientes
    switch (view) {
      case 'principal':
        renderEquiposPrincipales();
        break;
      case 'perifericos':
        renderPerifericos();
        break;
      case 'agrupado':
        renderAgrupado();
        break;
      case 'general':
        renderGeneral();
        break;

    }
  }

  function renderEquiposPrincipales() {
    const tableBody = document.querySelector('#principal-table tbody');
    tableBody.innerHTML = '';

    equipos.forEach((equipo) => {
      const row = document.createElement('tr');
      row.innerHTML = `
                <td>${equipo.id}</td>
                <td>${equipo.nombre}</td>
                <td>${equipo.marca} ${equipo.modelo}</td>
                <td>${equipo.categoria}</td>
                <td><span class="badge ${getBadgeClass(equipo.estado)}">${equipo.estado}</span></td>
                <td>${equipo.ubicacion}</td>
                <td>
                    <button class="action-btn edit" data-id="${equipo.id}" data-type="principal"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" data-id="${equipo.id}" data-type="principal"><i class="fas fa-trash"></i></button>
                </td>
            `;
      tableBody.appendChild(row);
    });

    // Agregar event listeners a los botones de acción
    addActionListeners();
  }

  function renderPerifericos() {
    const tableBody = document.querySelector('#perifericos-table tbody');
    tableBody.innerHTML = '';

    perifericos.forEach((periferico) => {
      const equipoPrincipal = equipos.find(
        (e) => e.id === periferico.equipoPrincipalId
      ) || { nombre: 'No asignado' };

      const row = document.createElement('tr');
      row.innerHTML = `
                <td>${periferico.id}</td>
                <td>${periferico.nombre}</td>
                <td>${periferico.marca} ${periferico.modelo}</td>
                <td>${periferico.subcategoria}</td>
                <td><span class="badge ${getBadgeClass(periferico.estado)}">${periferico.estado}</span></td>
                <td>${equipoPrincipal.nombre}</td>
                <td>
                    <button class="action-btn edit" data-id="${periferico.id}" data-type="periferico"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" data-id="${periferico.id}" data-type="periferico"><i class="fas fa-trash"></i></button>
                </td>
            `;
      tableBody.appendChild(row);
    });

    // Agregar event listeners a los botones de acción
    addActionListeners();
  }

  function renderAgrupado() {
    const container = document.getElementById('grouped-items');
    container.innerHTML = '';

    equipos.forEach((equipo) => {
      const perifericosEquipo = perifericos.filter(
        (p) => p.equipoPrincipalId === equipo.id
      );

      const groupItem = document.createElement('div');
      groupItem.className = 'group-item';

      const groupHeader = document.createElement('div');
      groupHeader.className = 'group-header';
      groupHeader.innerHTML = `
                <h3><i class="fas fa-laptop"></i> ${equipo.nombre} (${perifericosEquipo.length} periféricos)</h3>
                <button class="toggle-btn"><i class="fas fa-chevron-down"></i></button>
            `;

      const perifericosList = document.createElement('div');
      perifericosList.className = 'perifericos-list';

      if (perifericosEquipo.length > 0) {
        perifericosEquipo.forEach((periferico) => {
          const perifericoItem = document.createElement('div');
          perifericoItem.className = 'periferico-item';
          perifericoItem.innerHTML = `
                        <div class="periferico-info">
                            <i class="fas fa-desktop"></i>
                            <span>${periferico.nombre} (${periferico.marca} ${periferico.modelo}) - ${periferico.subcategoria}</span>
                        </div>
                        <div>
                            <span class="badge ${getBadgeClass(periferico.estado)}">${periferico.estado}</span>
                        </div>
                    `;
          perifericosList.appendChild(perifericoItem);
        });
      } else {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'periferico-item';
        emptyMessage.textContent = 'No hay periféricos asociados a este equipo';
        perifericosList.appendChild(emptyMessage);
      }

      groupItem.appendChild(groupHeader);
      groupItem.appendChild(perifericosList);
      container.appendChild(groupItem);

      // Event listener para expandir/contraer
      groupHeader.addEventListener('click', () => {
        perifericosList.classList.toggle('expanded');
        const icon = groupHeader.querySelector('.toggle-btn i');
        if (perifericosList.classList.contains('expanded')) {
          icon.classList.remove('fa-chevron-down');
          icon.classList.add('fa-chevron-up');
        } else {
          icon.classList.remove('fa-chevron-up');
          icon.classList.add('fa-chevron-down');
        }
      });
    });
  }

  function renderGeneral() {
    const tableBody = document.querySelector('#general-table tbody');
    tableBody.innerHTML = '';

    // Agregar equipos principales
    equipos.forEach((equipo) => {
      const row = document.createElement('tr');
      row.innerHTML = `
                <td><span class="badge badge-primary">Principal</span></td>
                <td>${equipo.id}</td>
                <td>${equipo.nombre}</td>
                <td>${equipo.marca} ${equipo.modelo}</td>
                <td>${equipo.categoria}</td>
                <td><span class="badge ${getBadgeClass(equipo.estado)}">${equipo.estado}</span></td>
                <td>${equipo.ubicacion}</td>
                <td>${equipo.responsable}</td>
                <td>
                    <button class="action-btn edit" data-id="${equipo.id}" data-type="principal"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" data-id="${equipo.id}" data-type="principal"><i class="fas fa-trash"></i></button>
                </td>
            `;
      tableBody.appendChild(row);
    });

    // Agregar periféricos
    perifericos.forEach((periferico) => {
      const equipoPrincipal = equipos.find(
        (e) => e.id === periferico.equipoPrincipalId
      ) || { nombre: 'No asignado' };

      const row = document.createElement('tr');
      row.innerHTML = `
                <td><span class="badge badge-secondary">Periférico</span></td>
                <td>${periferico.id}</td>
                <td>${periferico.nombre}</td>
                <td>${periferico.marca} ${periferico.modelo}</td>
                <td>${equipoPrincipal.nombre}</td>
                <td><span class="badge ${getBadgeClass(periferico.estado)}">${periferico.estado}</span></td>
                <td>${periferico.ubicacion}</td>
                <td>${periferico.responsable}</td>
                <td>
                    <button class="action-btn edit" data-id="${periferico.id}" data-type="periferico"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" data-id="${periferico.id}" data-type="periferico"><i class="fas fa-trash"></i></button>
                </td>
            `;
      tableBody.appendChild(row);
    });

    // Agregar event listeners a los botones de acción
    addActionListeners();
  }

  function addActionListeners() {
    // Botones de editar
    document.querySelectorAll('.action-btn.edit').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const type = btn.dataset.type;
        editItem(id, type);
      });
    });

    // Botones de eliminar
    document.querySelectorAll('.action-btn.delete').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const type = btn.dataset.type;
        confirmDelete(id, type);
      });
    });
  }

  function editItem(id, type) {
    let item;
    if (type === 'principal') {
      item = equipos.find((e) => e.id === id);
    } else {
      item = perifericos.find((p) => p.id === id);
    }

    if (!item) return;

    // Llenar el formulario con los datos del item
    document.getElementById('equipo-id').value = item.id;
    document.getElementById('equipo-type').value = type;
    document.getElementById('nombre').value = item.nombre;
    document.getElementById('marca').value = item.marca;
    document.getElementById('modelo').value = item.modelo;
    document.getElementById('serie').value = item.serie || '';
    document.getElementById('categoria').value = item.categoria;
    updateSubcategorias(); // Actualizar subcategorías basado en la categoría
    document.getElementById('subcategoria').value = item.subcategoria || '';
    document.getElementById('estado').value = item.estado;
    document.getElementById('condicion').value = item.condicion;
    document.getElementById('tipo-adquisicion').value = item.tipoAdquisicion;
    document.getElementById('departamento').value = item.departamento;
    document.getElementById('ubicacion').value = item.ubicacion;
    document.getElementById('responsable').value = item.responsable;
    document.getElementById('fecha-adquisicion').value =
      item.fechaAdquisicion || '';
    document.getElementById('detalles').value = item.detalles || '';

    // Mostrar el modal
    document.getElementById('modal-title').textContent =
      `Editar ${type === 'principal' ? 'Equipo Principal' : 'Periférico'}`;
    openModal();
  }

  function confirmDelete(id, type) {
    // Guardar el id y tipo para usarlo en la confirmación
    confirmModal.dataset.id = id;
    confirmModal.dataset.type = type;

    // Mostrar mensaje de confirmación
    document.getElementById('confirm-message').textContent =
      `¿Está seguro que desea eliminar este ${type === 'principal' ? 'equipo principal' : 'periférico'}?`;

    // Mostrar el modal de confirmación
    confirmModal.classList.add('show');
  }

  function confirmAction() {
    const id = confirmModal.dataset.id;
    const type = confirmModal.dataset.type;

    deleteItem(id, type)
      .then(loadInventario)
      .then(() => showView(currentView))
      .catch((err) => console.error('Error eliminando elemento:', err))
      .finally(() => {
        confirmModal.classList.remove('show');
      });
  }

  function filterItems() {
    const searchTerm = searchInput.value.toLowerCase();
    const statusFilterValue = statusFilter.value;
    const typeFilterValue = typeFilter.value;

    switch (currentView) {
      case 'principal':
        filterEquiposPrincipales(searchTerm, statusFilterValue);
        break;
      case 'perifericos':
        filterPerifericos(searchTerm, statusFilterValue);
        break;
      case 'general':
        filterGeneral(searchTerm, statusFilterValue, typeFilterValue);
        break;
    }
  }

  function filterEquiposPrincipales(searchTerm, statusFilterValue) {
    const filtered = equipos.filter((equipo) => {
      const matchesSearch =
        equipo.id.toLowerCase().includes(searchTerm) ||
        equipo.nombre.toLowerCase().includes(searchTerm) ||
        equipo.marca.toLowerCase().includes(searchTerm) ||
        equipo.modelo.toLowerCase().includes(searchTerm) ||
        equipo.categoria.toLowerCase().includes(searchTerm) ||
        equipo.ubicacion.toLowerCase().includes(searchTerm);

      const matchesStatus = statusFilterValue
        ? equipo.estado === statusFilterValue
        : true;

      return matchesSearch && matchesStatus;
    });

    renderFilteredEquiposPrincipales(filtered);
  }

  function renderFilteredEquiposPrincipales(filteredEquipos) {
    const tableBody = document.querySelector('#principal-table tbody');
    tableBody.innerHTML = '';

    filteredEquipos.forEach((equipo) => {
      const row = document.createElement('tr');
      row.innerHTML = `
                <td>${equipo.id}</td>
                <td>${equipo.nombre}</td>
                <td>${equipo.marca} ${equipo.modelo}</td>
                <td>${equipo.categoria}</td>
                <td><span class="badge ${getBadgeClass(equipo.estado)}">${equipo.estado}</span></td>
                <td>${equipo.ubicacion}</td>
                <td>
                    <button class="action-btn edit" data-id="${equipo.id}" data-type="principal"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" data-id="${equipo.id}" data-type="principal"><i class="fas fa-trash"></i></button>
                </td>
            `;
      tableBody.appendChild(row);
    });

    addActionListeners();
  }

  function filterPerifericos(searchTerm, statusFilterValue) {
    const filtered = perifericos.filter((periferico) => {
      const equipoPrincipal = equipos.find(
        (e) => e.id === periferico.equipoPrincipalId
      ) || { nombre: 'No asignado' };

      const matchesSearch =
        periferico.id.toLowerCase().includes(searchTerm) ||
        periferico.nombre.toLowerCase().includes(searchTerm) ||
        periferico.marca.toLowerCase().includes(searchTerm) ||
        periferico.modelo.toLowerCase().includes(searchTerm) ||
        periferico.subcategoria.toLowerCase().includes(searchTerm) ||
        equipoPrincipal.nombre.toLowerCase().includes(searchTerm);

      const matchesStatus = statusFilterValue
        ? periferico.estado === statusFilterValue
        : true;

      return matchesSearch && matchesStatus;
    });

    renderFilteredPerifericos(filtered);
  }

  function renderFilteredPerifericos(filteredPerifericos) {
    const tableBody = document.querySelector('#perifericos-table tbody');
    tableBody.innerHTML = '';

    filteredPerifericos.forEach((periferico) => {
      const equipoPrincipal = equipos.find(
        (e) => e.id === periferico.equipoPrincipalId
      ) || { nombre: 'No asignado' };

      const row = document.createElement('tr');
      row.innerHTML = `
                <td>${periferico.id}</td>
                <td>${periferico.nombre}</td>
                <td>${periferico.marca} ${periferico.modelo}</td>
                <td>${periferico.subcategoria}</td>
                <td><span class="badge ${getBadgeClass(periferico.estado)}">${periferico.estado}</span></td>
                <td>${equipoPrincipal.nombre}</td>
                <td>
                    <button class="action-btn edit" data-id="${periferico.id}" data-type="periferico"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" data-id="${periferico.id}" data-type="periferico"><i class="fas fa-trash"></i></button>
                </td>
            `;
      tableBody.appendChild(row);
    });

    addActionListeners();
  }

  function filterGeneral(searchTerm, statusFilterValue, typeFilterValue) {
    const filteredEquipos = equipos.filter((equipo) => {
      const matchesSearch =
        equipo.id.toLowerCase().includes(searchTerm) ||
        equipo.nombre.toLowerCase().includes(searchTerm) ||
        equipo.marca.toLowerCase().includes(searchTerm) ||
        equipo.modelo.toLowerCase().includes(searchTerm) ||
        equipo.categoria.toLowerCase().includes(searchTerm) ||
        equipo.ubicacion.toLowerCase().includes(searchTerm) ||
        equipo.responsable.toLowerCase().includes(searchTerm);

      const matchesStatus = statusFilterValue
        ? equipo.estado === statusFilterValue
        : true;
      const matchesType = typeFilterValue
        ? typeFilterValue === 'principal'
        : true;

      return matchesSearch && matchesStatus && matchesType;
    });

    const filteredPerifericos = perifericos.filter((periferico) => {
      const equipoPrincipal = equipos.find(
        (e) => e.id === periferico.equipoPrincipalId
      ) || { nombre: 'No asignado' };

      const matchesSearch =
        periferico.id.toLowerCase().includes(searchTerm) ||
        periferico.nombre.toLowerCase().includes(searchTerm) ||
        periferico.marca.toLowerCase().includes(searchTerm) ||
        periferico.modelo.toLowerCase().includes(searchTerm) ||
        periferico.subcategoria.toLowerCase().includes(searchTerm) ||
        equipoPrincipal.nombre.toLowerCase().includes(searchTerm) ||
        periferico.ubicacion.toLowerCase().includes(searchTerm) ||
        periferico.responsable.toLowerCase().includes(searchTerm);

      const matchesStatus = statusFilterValue
        ? periferico.estado === statusFilterValue
        : true;
      const matchesType = typeFilterValue
        ? typeFilterValue === 'periferico'
        : true;

      return matchesSearch && matchesStatus && matchesType;
    });

    renderFilteredGeneral(filteredEquipos, filteredPerifericos);
  }

  function renderFilteredGeneral(filteredEquipos, filteredPerifericos) {
    const tableBody = document.querySelector('#general-table tbody');
    tableBody.innerHTML = '';

    // Agregar equipos principales filtrados
    filteredEquipos.forEach((equipo) => {
      const row = document.createElement('tr');
      row.innerHTML = `
                <td><span class="badge badge-primary">Principal</span></td>
                <td>${equipo.id}</td>
                <td>${equipo.nombre}</td>
                <td>${equipo.marca} ${equipo.modelo}</td>
                <td>${equipo.categoria}</td>
                <td><span class="badge ${getBadgeClass(equipo.estado)}">${equipo.estado}</span></td>
                <td>${equipo.ubicacion}</td>
                <td>${equipo.responsable}</td>
                <td>
                    <button class="action-btn edit" data-id="${equipo.id}" data-type="principal"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" data-id="${equipo.id}" data-type="principal"><i class="fas fa-trash"></i></button>
                </td>
            `;
      tableBody.appendChild(row);
    });

    // Agregar periféricos filtrados
    filteredPerifericos.forEach((periferico) => {
      const equipoPrincipal = equipos.find(
        (e) => e.id === periferico.equipoPrincipalId
      ) || { nombre: 'No asignado' };

      const row = document.createElement('tr');
      row.innerHTML = `
                <td><span class="badge badge-secondary">Periférico</span></td>
                <td>${periferico.id}</td>
                <td>${periferico.nombre}</td>
                <td>${periferico.marca} ${periferico.modelo}</td>
                <td>${equipoPrincipal.nombre}</td>
                <td><span class="badge ${getBadgeClass(periferico.estado)}">${periferico.estado}</span></td>
                <td>${periferico.ubicacion}</td>
                <td>${periferico.responsable}</td>
                <td>
                    <button class="action-btn edit" data-id="${periferico.id}" data-type="periferico"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" data-id="${periferico.id}" data-type="periferico"><i class="fas fa-trash"></i></button>
                </td>
            `;
      tableBody.appendChild(row);
    });

    addActionListeners();
  }

  function openEquipoModal(type) {
    // Resetear el formulario
    equipoForm.reset();
    document.getElementById('equipo-id').value = '';
    document.getElementById('equipo-type').value = type;

    // Configurar el título del modal
    document.getElementById('modal-title').textContent =
      type === 'principal'
        ? 'Agregar Nuevo Equipo'
        : 'Agregar Nuevo Periférico';

    // Mostrar/ocultar elementos según el tipo
    if (type === 'periferico') {
      // Ocultar botones especiales inicialmente
      addAnotherBtn.classList.add('hidden');
      finishBtn.classList.add('hidden');

      // Mostrar selector de equipo principal si estamos agregando un periférico nuevo
      if (!document.getElementById('equipo-principal-group')) {
        const equipoPrincipalGroup = document.createElement('div');
        equipoPrincipalGroup.className = 'form-group';
        equipoPrincipalGroup.id = 'equipo-principal-group';
        equipoPrincipalGroup.innerHTML = `
                    <label for="equipo-principal">Equipo Principal*</label>
                    <select id="equipo-principal" required>
                        <option value="">Seleccione un equipo principal...</option>
                        ${equipos.map((e) => `<option value="${e.id}">${e.nombre} (${e.id})</option>`).join('')}
                    </select>
                `;

        const firstSection = document.querySelector('.form-section');
        firstSection.parentNode.insertBefore(
          equipoPrincipalGroup,
          firstSection
        );
      }

      // Bloquear campos heredados
      document.getElementById('categoria').disabled = true;
      document.getElementById('ubicacion').disabled = true;
      document.getElementById('responsable').disabled = true;
    } else {
      // Eliminar el selector de equipo principal si existe
      const equipoPrincipalGroup = document.getElementById(
        'equipo-principal-group'
      );
      if (equipoPrincipalGroup) {
        equipoPrincipalGroup.remove();
      }

      // Habilitar todos los campos
      document.getElementById('categoria').disabled = false;
      document.getElementById('ubicacion').disabled = false;
      document.getElementById('responsable').disabled = false;
    }

    // Mostrar el modal
    openModal();
  }

  function openModal() {
    modal.classList.add('show');
  }

  function closeModal() {
    modal.classList.remove('show');
  }

  function updateSubcategorias() {
    const categoria = document.getElementById('categoria').value;
    const subcategoriaSelect = document.getElementById('subcategoria');

    // Limpiar opciones actuales
    subcategoriaSelect.innerHTML = '<option value="">Seleccione...</option>';

    // Agregar opciones basadas en la categoría seleccionada
    if (categoria === 'Laptop') {
      subcategoriaSelect.innerHTML += `
                <option value="Ejecutiva">Ejecutiva</option>
                <option value="Estándar">Estándar</option>
                <option value="Reforzada">Reforzada</option>
            `;
    } else if (categoria === 'Workstation') {
      subcategoriaSelect.innerHTML += `
                <option value="Diseño">Diseño</option>
                <option value="Desarrollo">Desarrollo</option>
                <option value="Renderizado">Renderizado</option>
            `;
    } else if (categoria === 'Servidor') {
      subcategoriaSelect.innerHTML += `
                <option value="Base de datos">Base de datos</option>
                <option value="Aplicaciones">Aplicaciones</option>
                <option value="Almacenamiento">Almacenamiento</option>
            `;
    } else if (categoria === 'Impresora') {
      subcategoriaSelect.innerHTML += `
                <option value="Láser">Láser</option>
                <option value="Inyección">Inyección</option>
                <option value="Multifuncional">Multifuncional</option>
            `;
    }
  }

  async function handleFormSubmit(event, action = 'save') {
    event.preventDefault();

    const type = document.getElementById('equipo-type').value;
    const id = document.getElementById('equipo-id').value;

    // Validar formulario
    if (!validateForm()) {
      return;
    }

    // Crear objeto con los datos del formulario
    const formData = {
      nombre: document.getElementById('nombre').value,
      marca: document.getElementById('marca').value,
      modelo: document.getElementById('modelo').value,
      serie: document.getElementById('serie').value,
      categoria: document.getElementById('categoria').value,
      subcategoria: document.getElementById('subcategoria').value || null,
      estado: document.getElementById('estado').value,
      condicion: document.getElementById('condicion').value,
      tipoAdquisicion: document.getElementById('tipo-adquisicion').value,
      departamento: document.getElementById('departamento').value,
      ubicacion: document.getElementById('ubicacion').value,
      responsable: document.getElementById('responsable').value,
      fechaAdquisicion:
        document.getElementById('fecha-adquisicion').value || null,
      detalles: document.getElementById('detalles').value || null,
    };

    if (type === 'periferico') {
      formData.equipoPrincipalId =
        document.getElementById('equipo-principal').value;

      // Heredar campos del equipo principal si es un periférico nuevo
      if (!id) {
        const equipoPrincipal = equipos.find(
          (e) => e.id === formData.equipoPrincipalId
        );
        if (equipoPrincipal) {
          formData.categoria = equipoPrincipal.categoria;
          formData.ubicacion = equipoPrincipal.ubicacion;
          formData.responsable = equipoPrincipal.responsable;
        }
      }
    }

    // Guardar o actualizar el item en el servidor

    let method = id ? 'PUT' : 'POST';
    let url =
      type === 'principal'
        ? API_INVENTARIO_PRINCIPAL
        : API_INVENTARIO_PERIFERICO;
    if (id) url += `/${id}`;

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }
      await loadInventario();
    } catch (err) {
      console.error('Error guardando elemento:', err);
    }

    // Manejar la acción después de guardar
    if (action === 'add-another') {
      // Resetear el formulario para agregar otro
      equipoForm.reset();
      document.getElementById('equipo-id').value = '';

      // Mantener el tipo y equipo principal seleccionado
      document.getElementById('equipo-type').value = type;
      if (type === 'periferico') {
        document.getElementById('equipo-principal').value =
          formData.equipoPrincipalId;

        // Heredar campos del equipo principal
        const equipoPrincipal = equipos.find(
          (e) => e.id === formData.equipoPrincipalId
        );
        if (equipoPrincipal) {
          document.getElementById('categoria').value =
            equipoPrincipal.categoria;
          document.getElementById('ubicacion').value =
            equipoPrincipal.ubicacion;
          document.getElementById('responsable').value =
            equipoPrincipal.responsable;
        }
      }

      // Enfocar el primer campo
      document.getElementById('nombre').focus();
    } else if (action === 'finish') {
      // Cerrar el modal
      closeModal();

      // Mostrar la vista de periféricos si acabamos de agregar un equipo principal
      if (type === 'principal' && !id) {
        currentView = 'perifericos';
        showView('perifericos');
        navButtons.forEach((btn) => {
          btn.classList.remove('active');
          if (btn.dataset.view === 'perifericos') {
            btn.classList.add('active');
          }
        });
      }
    } else {
      // Cerrar el modal
      closeModal();

      await loadInventario();
      showView(currentView);
    }
  }

  function validateForm() {
    let isValid = true;
    const requiredFields = [
      'nombre',
      'marca',
      'modelo',
      'categoria',
      'estado',
      'condicion',
      'tipo-adquisicion',
      'departamento',
      'ubicacion',
      'responsable',
    ];

    if (document.getElementById('equipo-type').value === 'periferico') {
      requiredFields.push('equipo-principal');
    }

    requiredFields.forEach((fieldId) => {
      const field = document.getElementById(fieldId);
      if (!field.value.trim()) {
        field.style.borderColor = 'var(--danger-color)';
        isValid = false;
      } else {
        field.style.borderColor = 'var(--border-color)';
      }
    });

    return isValid;
  }

  function generateId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${timestamp}-${random}`.toUpperCase();
  }

  function saveData() {
    // Persistencia manejada en el servidor
  }

  function getBadgeClass(status) {
    switch (status) {
      case 'Operativo':
        return 'badge-success';
      case 'Inactivo':
        return 'badge-warning';
      case 'En Reparación':
        return 'badge-info';
      case 'Obsoleto':
        return 'badge-danger';
      default:
        return 'badge-primary';
    }
  }

  function loadSampleData() {
    // Equipos principales de ejemplo
    equipos = [
      {
        id: generateId(),
        nombre: 'Laptop Ejecutiva Principal',
        marca: 'Dell',
        modelo: 'Latitude 7420',
        serie: 'DL7420X12345',
        categoria: 'Laptop',
        subcategoria: 'Ejecutiva',
        estado: 'Operativo',
        condicion: 'Excelente',
        tipoAdquisicion: 'Compra',
        departamento: 'Gerencia General',
        ubicacion: 'Oficina Ejecutiva A-01',
        responsable: 'Juan Pérez',
        fechaAdquisicion: '2023-01-15',
        detalles: 'Laptop para uso ejecutivo',
        fechaCreacion: new Date().toISOString(),
      },
      {
        id: generateId(),
        nombre: 'Workstation Desarrollo',
        marca: 'HP',
        modelo: 'Z4 G4',
        serie: 'HPZ4G456789',
        categoria: 'Workstation',
        subcategoria: 'Desarrollo',
        estado: 'Operativo',
        condicion: 'Buena',
        tipoAdquisicion: 'Compra',
        departamento: 'Tecnología',
        ubicacion: 'Cubículo B-15',
        responsable: 'María Gómez',
        fechaAdquisicion: '2023-03-10',
        detalles: 'Estación de trabajo para desarrollo',
        fechaCreacion: new Date().toISOString(),
      },
    ];

    // Periféricos de ejemplo
    perifericos = [
      {
        id: generateId(),
        nombre: 'Monitor Ultrawide Ejecutivo',
        marca: 'LG',
        modelo: '34WN80C-B',
        serie: 'LG34WN12345',
        categoria: 'Laptop',
        subcategoria: 'Monitor',
        estado: 'Operativo',
        condicion: 'Excelente',
        tipoAdquisicion: 'Compra',
        departamento: 'Gerencia General',
        ubicacion: 'Oficina Ejecutiva A-01',
        responsable: 'Juan Pérez',
        fechaAdquisicion: '2023-02-01',
        detalles: 'Monitor ultrawide 34" para laptop ejecutiva',
        equipoPrincipalId: equipos[0].id,
        fechaCreacion: new Date().toISOString(),
      },
      {
        id: generateId(),
        nombre: 'Teclado Mecánico Inalámbrico',
        marca: 'Logitech',
        modelo: 'MX Mechanical',
        serie: 'LOGIMX67890',
        categoria: 'Laptop',
        subcategoria: 'Teclado',
        estado: 'Operativo',
        condicion: 'Buena',
        tipoAdquisicion: 'Compra',
        departamento: 'Gerencia General',
        ubicacion: 'Oficina Ejecutiva A-01',
        responsable: 'Juan Pérez',
        fechaAdquisicion: '2023-01-20',
        detalles: 'Teclado inalámbrico mecánico',
        equipoPrincipalId: equipos[0].id,
        fechaCreacion: new Date().toISOString(),
      },
      {
        id: generateId(),
        nombre: 'Monitor Dual 4K',
        marca: 'ASUS',
        modelo: 'ProArt PA278QV',
        serie: 'ASUSPA23456',
        categoria: 'Workstation',
        subcategoria: 'Monitor',
        estado: 'Operativo',
        condicion: 'Excelente',
        tipoAdquisicion: 'Compra',
        departamento: 'Tecnología',
        ubicacion: 'Cubículo B-15',
        responsable: 'María Gómez',
        fechaAdquisicion: '2023-03-15',
        detalles: 'Monitores 4K para estación de trabajo',
        equipoPrincipalId: equipos[1].id,
        fechaCreacion: new Date().toISOString(),
      },
    ];

    saveData();
  }

  async function loadDuckdbTables() {
    try {
      const res = await fetch('/api/analytics-panel/tables');
      const data = await res.json();
      duckdbTotalTables.textContent = `Tablas: ${data.tables.length}`;
      duckdbTableSelect.innerHTML = data.tables
        .map((t) => `<option value="${t}">${t}</option>`) 
        .join('');
      if (data.tables.length) {
        await loadDuckdbTable(data.tables[0]);
      }
    } catch (err) {
      console.error('Error cargando tablas DuckDB:', err);
    }
  }

  async function loadDuckdbTable(name) {
    try {
      const res = await fetch(`/api/analytics-panel/table/${encodeURIComponent(name)}`);
      const data = await res.json();
      duckdbRowCount.textContent = `Filas: ${data.rows.length}`;
      const thead = document.querySelector('#duckdb-table-preview thead');
      const tbody = document.querySelector('#duckdb-table-preview tbody');
      thead.innerHTML = `<tr>${data.columns
        .map((c) => `<th>${c}</th>`)
        .join('')}</tr>`;
      tbody.innerHTML = data.rows
        .map((row) => `<tr>${row.map((v) => `<td>${v}</td>`).join('')}</tr>`)
        .join('');
    } catch (err) {
      console.error('Error cargando datos de tabla:', err);
    }
  }

  function renderDuckdbPanel() {
    loadDuckdbTables();
  }

  function exportToPdf() {
    // Usar jsPDF y html2canvas para generar el PDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Título del reporte
    doc.setFontSize(18);
    doc.text('Reporte de Inventario Agrupado', 105, 15, { align: 'center' });

    // Fecha del reporte
    doc.setFontSize(10);
    doc.text(
      `Generado el: ${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}`,
      105,
      22,
      { align: 'center' }
    );

    let yPosition = 30;

    // Agregar cada grupo al PDF
    equipos.forEach((equipo, index) => {
      const perifericosEquipo = perifericos.filter(
        (p) => p.equipoPrincipalId === equipo.id
      );

      // Equipo principal
      doc.setFontSize(12);
      doc.setTextColor(59, 130, 246); // Azul
      doc.text(
        `${index + 1}. ${equipo.nombre} (${equipo.marca} ${equipo.modelo})`,
        14,
        yPosition
      );
      yPosition += 7;

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0); // Negro
      doc.text(
        `ID: ${equipo.id} | Categoría: ${equipo.categoria} | Estado: ${equipo.estado}`,
        14,
        yPosition
      );
      yPosition += 7;

      doc.text(
        `Ubicación: ${equipo.ubicacion} | Responsable: ${equipo.responsable}`,
        14,
        yPosition
      );
      yPosition += 10;

      // Periféricos
      if (perifericosEquipo.length > 0) {
        doc.setFontSize(10);
        doc.setTextColor(139, 92, 246); // Púrpura
        doc.text('Periféricos asociados:', 20, yPosition);
        yPosition += 7;

        perifericosEquipo.forEach((periferico) => {
          doc.setFontSize(9);
          doc.setTextColor(0, 0, 0); // Negro
          doc.text(
            `- ${periferico.nombre} (${periferico.marca} ${periferico.modelo})`,
            25,
            yPosition
          );
          yPosition += 6;

          doc.text(
            `  ID: ${periferico.id} | Subcategoría: ${periferico.subcategoria} | Estado: ${periferico.estado}`,
            25,
            yPosition
          );
          yPosition += 6;
        });
      } else {
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100); // Gris
        doc.text('No hay periféricos asociados a este equipo', 20, yPosition);
        yPosition += 6;
      }

      yPosition += 10;

      // Agregar nueva página si es necesario
      if (yPosition > 270 && index < equipos.length - 1) {
        doc.addPage();
        yPosition = 20;
      }
    });

    // Pie de página
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100); // Gris
      doc.text(`Página ${i} de ${totalPages}`, 105, 287, { align: 'center' });
    }

    // Descargar el PDF
    doc.save(`reporte-inventario-${new Date().toISOString().slice(0, 10)}.pdf`);
  }
});
