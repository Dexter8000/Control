// Variables globales
let allEmpleados = [];
let filteredEmpleados = [];
let currentEditingEmpleadoId = null;
let currentPage = 1;
let itemsPerPage = 10;
let sortColumn = '';
let sortDirection = 'asc';

// Funciones de departamentos provistas por departamentos-utils.js

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 Inicializando gestión moderna de empleados');
    initializeDepartmentSelectors();
    initializeApp();
});

// Función para inicializar selectores de departamentos
async function initializeDepartmentSelectors() {
    const departamentos = await getDepartamentosList();
    const options = departamentos.map(d => `<option value="${d.nombre}">${d.nombre}</option>`).join('');

    // Actualizar filtro de departamentos
    const filtroDepartamento = document.getElementById('filtro-departamento');
    if (filtroDepartamento) {
        const opcionesTodos = '<option value="">Todos los departamentos</option>';
        filtroDepartamento.innerHTML = opcionesTodos + options;
    }

    // Actualizar selector en modal si está presente
    const modalDepartmentSelect = document.querySelector('#empleado-modal select[name="departamento"]');
    if (modalDepartmentSelect) {
        modalDepartmentSelect.innerHTML = '<option value="">Seleccionar departamento</option>' + options;
    }

    console.log('✅ Selectores de departamentos inicializados');
}

// Actualizar opciones del filtro de departamentos según los datos cargados
async function updateDepartmentFilter() {
    const filtroDepartamento = document.getElementById('filtro-departamento');
    if (!filtroDepartamento) return;

    const departamentos = await getDepartamentosList();
    const opciones = ['<option value="">Todos los departamentos</option>']
        .concat(departamentos.map(d => `<option value="${d.nombre}">${d.nombre}</option>`))
        .join('');

    filtroDepartamento.innerHTML = opciones;
}

async function initializeApp() {
    try {
        await loadEmpleados();
        await loadDashboardStats();
        setupEventListeners();
        refreshIcons();
        console.log('✅ Aplicación inicializada exitosamente');
    } catch (error) {
        console.error('❌ Error inicializando aplicación:', error);
        showNotification('Error inicializando la aplicación', 'error');
    }
}

// Configurar event listeners
function setupEventListeners() {
    // Filtros
    document.getElementById('busqueda-global').addEventListener('input', debounce(applyFilters, 300));
    document.getElementById('filtro-departamento').addEventListener('change', applyFilters);
    document.getElementById('filtro-rango').addEventListener('change', applyFilters);
    document.getElementById('filtro-estado').addEventListener('change', applyFilters);

    // Cerrar modal al hacer clic fuera
    document.getElementById('empleado-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeEmpleadoModal();
        }
    });

    // Cerrar modal con ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const empleadoModal = document.getElementById('empleado-modal');
            const deleteModal = document.getElementById('delete-modal');
            
            if (empleadoModal.style.display === 'flex') {
                closeEmpleadoModal();
            } else if (deleteModal.style.display === 'flex') {
                closeDeleteModal();
            }
        }
    });
}

// Cargar empleados desde API
async function loadEmpleados() {
    try {
        console.log('🔄 Cargando empleados desde API...');
        showLoading();
        
        const response = await fetch('/api/empleados');
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('📊 Respuesta API empleados:', data);
        
        allEmpleados = data;
        filteredEmpleados = [...allEmpleados];
        renderEmpleados();
        updatePagination();
        updateDepartmentFilter();
        
        console.log(`✅ ${allEmpleados.length} empleados cargados`);
    } catch (error) {
        console.error('❌ Error cargando empleados:', error);
        showError('No se pudieron cargar los empleados. Intente recargar la página.');
        showNotification('Error cargando empleados: ' + error.message, 'error');
    }
}

// Cargar datos del dashboard para las tarjetas de resumen
async function loadDashboardStats() {
    try {
        const resEmpleados = await fetch('/api/dashboard/total-empleados');
        const dataEmpleados = await resEmpleados.json();
        document.getElementById('total-empleados').textContent = dataEmpleados.total;

        const resRangosDepto = await fetch('/api/dashboard/rangos-por-departamento');
        const dataRangosDepto = await resRangosDepto.json();
        const resumenRangosDepto = dataRangosDepto.detalle.slice(0, 2)
            .map(item => `${item.rango_nombre} (${item.departamento_nombre}): ${item.cantidad}`)
            .join(', ');
        document.getElementById('rango-principal').textContent =
            resumenRangosDepto || 'No hay datos de rangos por departamento.';

        const resCantidadRangos = await fetch('/api/dashboard/cantidad-rangos');
        const dataCantidadRangos = await resCantidadRangos.json();
        const resumenCantidadRangos = dataCantidadRangos.detalle.slice(0, 2)
            .map(item => `${item.rango_nombre}: ${item.cantidad}`)
            .join(', ');
        document.getElementById('departamento-principal').textContent =
            resumenCantidadRangos || 'No hay datos de rangos.';

        const resDepartamentos = await fetch('/api/dashboard/total-departamentos');
        const dataDepartamentos = await resDepartamentos.json();
        document.getElementById('rangos-diferentes').textContent = dataDepartamentos.total;

        const resIncompletos = await fetch('/api/dashboard/datos-incompletos');
        const dataIncompletos = await resIncompletos.json();
        const card = document.getElementById('datosIncompletosCard');
        const mensaje = document.getElementById('mensajeIncompletos');
        const lista = document.getElementById('listaIncompletos');
        if (dataIncompletos.count > 0) {
            card.style.display = 'block';
            mensaje.textContent = `Se encontraron ${dataIncompletos.count} registros con datos incompletos. IDs:`;
            lista.innerHTML = dataIncompletos.ids.slice(0, 5)
                .map(id => `<li>ID: ${id}</li>`).join('');
            if (dataIncompletos.count > 5) {
                lista.innerHTML += `<li>...y ${dataIncompletos.count - 5} más.</li>`;
            }
        } else {
            card.style.display = 'none';
        }
    } catch (error) {
        console.error('Error al cargar datos del dashboard:', error);
    }
}

// Actualizar KPIs con estadísticas de rangos y departamentos
function updateKPIs() {
    console.log('📊 Calculando estadísticas mejoradas de personal...');

    const empleadosActivos = allEmpleados.filter(emp => 
        emp.activo === 'Sí' || emp.activo === 'Activo' || emp.estado === 'Activo'
    );

    const empleadosInactivos = allEmpleados.filter(emp => 
        emp.activo === 'No' || emp.activo === 'Inactivo' || emp.estado === 'Inactivo'
    );

    // Recuadro 1: Total de Empleados (Activos/Total)
    const totalEmpleados = allEmpleados.length;
    const activosCount = empleadosActivos.length;
    const inactivosCount = empleadosInactivos.length;
    
    document.getElementById('total-empleados').innerHTML = 
        `<div style="font-size: 2.5rem; font-weight: 700; color: var(--primary-blue);">${totalEmpleados}</div>
         <div style="font-size: 0.9rem; margin-top: 4px;">
             <span style="color: var(--success-green);">✓ ${activosCount} activos</span> • 
             <span style="color: var(--error-red);">✗ ${inactivosCount} inactivos</span>
         </div>`;

    // Recuadro 2: Rango con Más Empleados
    const rangoCount = {};
    empleadosActivos.forEach(emp => {
        if (emp.rango && emp.rango.trim() !== '') {
            rangoCount[emp.rango] = (rangoCount[emp.rango] || 0) + 1;
        }
    });

    const rangoMasFrecuente = Object.entries(rangoCount)
        .sort(([,a], [,b]) => b - a)[0];
    
    if (rangoMasFrecuente) {
        const porcentaje = ((rangoMasFrecuente[1] / activosCount) * 100).toFixed(1);
        document.getElementById('rango-principal').innerHTML = 
            `<div style="font-size: 1.1rem; font-weight: 600; color: var(--success-green); margin-bottom: 4px;">
                ${rangoMasFrecuente[0]}
             </div>
             <div style="font-size: 0.85rem; color: var(--text-secondary);">
                ${rangoMasFrecuente[1]} empleados (${porcentaje}%)
             </div>`;
    } else {
        document.getElementById('rango-principal').innerHTML = 'Sin datos';
    }

    // Recuadro 3: Departamento con Más Personal
    const deptCount = {};
    empleadosActivos.forEach(emp => {
        const dept = emp.departamento_nombre || emp.departamento || '[Sin Departamento]';
        deptCount[dept] = (deptCount[dept] || 0) + 1;
    });

    const deptMasFrecuente = Object.entries(deptCount)
        .sort(([,a], [,b]) => b - a)[0];
    
    if (deptMasFrecuente) {
        const porcentaje = ((deptMasFrecuente[1] / activosCount) * 100).toFixed(1);
        const nombreCorto = deptMasFrecuente[0].length > 25 ? 
            deptMasFrecuente[0].substring(0, 25) + '...' : 
            deptMasFrecuente[0];
        
        document.getElementById('departamento-principal').innerHTML = 
            `<div style="font-size: 0.95rem; font-weight: 600; color: var(--primary-purple); margin-bottom: 4px; line-height: 1.2;">
                ${nombreCorto}
             </div>
             <div style="font-size: 0.85rem; color: var(--text-secondary);">
                ${deptMasFrecuente[1]} empleados (${porcentaje}%)
             </div>`;
    } else {
        document.getElementById('departamento-principal').innerHTML = 'Sin datos';
    }

    // Recuadro 4: Total de Departamentos Únicos
    const departamentosUnicos = Object.keys(deptCount).length;
    const rangosUnicos = Object.keys(rangoCount).length;
    
    document.getElementById('rangos-diferentes').innerHTML = 
        `<div style="font-size: 2.5rem; font-weight: 700; color: var(--warning-orange);">${departamentosUnicos}</div>
         <div style="font-size: 0.9rem; margin-top: 4px; color: var(--text-secondary);">
             Departamentos • ${rangosUnicos} rangos
         </div>`;

    // Recuadro 5: Distribución por Departamentos (Top 5)
    const topDepartamentos = Object.entries(deptCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([dept, count]) => {
            const porcentaje = ((count / activosCount) * 100).toFixed(1);
            const nombreCorto = dept.length > 20 ? dept.substring(0, 20) + '...' : dept;
            return `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; padding: 2px 0;">
                        <span style="font-size: 0.7rem; color: var(--text-primary); flex: 1;">${nombreCorto}</span>
                        <span style="font-weight: 600; font-size: 0.75rem; color: var(--error-red); margin-left: 8px;">
                            ${count} <small style="color: var(--text-muted);">(${porcentaje}%)</small>
                        </span>
                    </div>`;
        })
        .join('');

    document.getElementById('distribucion-rangos').innerHTML = topDepartamentos || 
        '<div style="color: var(--text-muted); font-style: italic;">Sin datos disponibles</div>';

    console.log(`📊 Estadísticas calculadas: ${totalEmpleados} empleados, ${departamentosUnicos} departamentos, ${rangosUnicos} rangos`);
}

// Aplicar filtros
function applyFilters() {
    const busqueda = document.getElementById('busqueda-global').value.toLowerCase();
    const departamento = document.getElementById('filtro-departamento').value;
    const rango = document.getElementById('filtro-rango').value;
    const estado = document.getElementById('filtro-estado').value;

    filteredEmpleados = allEmpleados.filter(empleado => {
        // Filtro de búsqueda global
        const matchesBusqueda = !busqueda || 
            (empleado.nombre && empleado.nombre.toLowerCase().includes(busqueda)) ||
            (empleado.apellido && empleado.apellido.toLowerCase().includes(busqueda)) ||
            (empleado.placa && empleado.placa.toLowerCase().includes(busqueda)) ||
            (empleado.correo_electronico && empleado.correo_electronico.toLowerCase().includes(busqueda)) ||
            (empleado.correo && empleado.correo.toLowerCase().includes(busqueda));

        // Filtro de departamento
        const matchesDepartamento = !departamento || 
            empleado.departamento === departamento ||
            empleado.departamento_nombre === departamento;

        // Filtro de rango
        const matchesRango = !rango || empleado.rango === rango;

        // Filtro de estado
        const matchesEstado = !estado || 
            empleado.estado === estado ||
            empleado.activo === estado ||
            (estado === 'Activo' && (empleado.activo === 'Sí' || empleado.estado === 'Activo'));

        return matchesBusqueda && matchesDepartamento && matchesRango && matchesEstado;
    });

    currentPage = 1;
    renderEmpleados();
    updatePagination();
}

// Renderizar empleados
function renderEmpleados() {
    const tbody = document.getElementById('employees-tbody');
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const empleadosPage = filteredEmpleados.slice(startIndex, endIndex);

    if (empleadosPage.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    <i data-feather="users"></i>
                    <h3>No se encontraron empleados</h3>
                    <p>No hay empleados que coincidan con los filtros aplicados</p>
                </td>
            </tr>
        `;
        refreshIcons();
        return;
    }

    tbody.innerHTML = empleadosPage.map(empleado => `
        <tr>
            <td>${empleado.id ? empleado.id.toString().replace('EMP', '') : 'N/A'}</td>
            <td>
                <span class="employee-badge badge-placa">
                    ${empleado.placa || 'Sin placa'}
                </span>
            </td>
            <td>
                <span class="employee-badge badge-rango">
                    ${empleado.rango || 'Sin rango'}
                </span>
            </td>
            <td>
                <strong>${empleado.nombre || 'Sin nombre'} ${empleado.apellido || 'Sin apellido'}</strong>
            </td>
            <td>
                <span class="employee-badge badge-departamento">
                    ${empleado.departamento_nombre || empleado.departamento || 'Sin departamento'}
                </span>
            </td>
            <td>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <i data-feather="mail" style="width: 14px; height: 14px;"></i>
                    ${empleado.correo_electronico || empleado.correo || 'Sin email'}
                </div>
            </td>
            <td>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <i data-feather="phone" style="width: 14px; height: 14px;"></i>
                    ${empleado.telefono || 'Sin teléfono'}
                </div>
            </td>
            <td>
                <div class="table-actions">
                    <button class="action-btn edit" onclick="editEmpleado('${empleado.id}')" title="Editar empleado">
                        <i data-feather="edit-2"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteEmpleado('${empleado.id}')" title="Eliminar empleado">
                        <i data-feather="trash-2"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    // Actualizar contador
    document.getElementById('empleados-count').textContent = 
        `${filteredEmpleados.length} empleados encontrados`;

    refreshIcons();
}

// Actualizar paginación
function updatePagination() {
    const totalPages = Math.ceil(filteredEmpleados.length / itemsPerPage);
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, filteredEmpleados.length);

    document.getElementById('pagination-info').textContent = 
        `Mostrando ${startItem}-${endItem} de ${filteredEmpleados.length} empleados`;

    // Botones anterior/siguiente
    document.getElementById('prev-page').disabled = currentPage === 1;
    document.getElementById('next-page').disabled = currentPage === totalPages || totalPages === 0;

    // Números de página
    const pageNumbers = document.getElementById('page-numbers');
    let pagesHTML = '';

    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
        pagesHTML += `
            <button class="pagination-btn ${i === currentPage ? 'active' : ''}" 
                    onclick="goToPage(${i})">${i}</button>
        `;
    }

    pageNumbers.innerHTML = pagesHTML;
}

// Ordenar tabla
function sortTable(column) {
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'asc';
    }

    filteredEmpleados.sort((a, b) => {
        let aVal = a[column] || '';
        let bVal = b[column] || '';

        if (column === 'nombre') {
            aVal = `${a.nombre || ''} ${a.apellido || ''}`;
            bVal = `${b.nombre || ''} ${b.apellido || ''}`;
        }

        if (column === 'departamento') {
            aVal = a.departamento_nombre || a.departamento || '';
            bVal = b.departamento_nombre || b.departamento || '';
        }

        if (column === 'email') {
            aVal = a.correo_electronico || a.correo || '';
            bVal = b.correo_electronico || b.correo || '';
        }

        aVal = aVal.toString().toLowerCase();
        bVal = bVal.toString().toLowerCase();

        if (sortDirection === 'asc') {
            return aVal.localeCompare(bVal);
        } else {
            return bVal.localeCompare(aVal);
        }
    });

    renderEmpleados();
}

// Navegación de páginas
function changePage(direction) {
    const totalPages = Math.ceil(filteredEmpleados.length / itemsPerPage);
    const newPage = currentPage + direction;

    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        renderEmpleados();
        updatePagination();
    }
}

function goToPage(page) {
    currentPage = page;
    renderEmpleados();
    updatePagination();
}

// Mostrar modal de nuevo empleado
async function showNuevoEmpleadoModal() {
    console.log('➕ Abriendo modal para agregar nuevo empleado');
    
    currentEditingEmpleadoId = null;
    document.getElementById('modal-title').innerHTML = '<i data-feather="user-plus"></i> Agregar Nuevo Empleado';
    document.getElementById('empleado-form').reset();
    document.getElementById('empleado-id').value = '';
    
    // Actualizar selector de departamentos en el modal
    await updateModalDepartmentSelector();
    
    // Restaurar texto del botón de guardar
    const saveBtn = document.querySelector('.btn-save');
    saveBtn.innerHTML = '<i data-feather="save"></i> Guardar Empleado';
    
    document.getElementById('empleado-modal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    refreshIcons();
}

// Función para actualizar selector de departamentos en modal
async function updateModalDepartmentSelector(selected = '') {
    const modalDepartmentSelect = document.querySelector('#empleado-modal select[name="departamento"]');
    if (modalDepartmentSelect) {
        const options = await generarOpcionesDepartamentos(selected);
        modalDepartmentSelect.innerHTML = '<option value="">Seleccionar departamento</option>' + options;
        if (selected) {
            modalDepartmentSelect.value = selected;
        }
        console.log('✅ Selector de departamentos en modal actualizado');
    }
}

// Editar empleado
async function editEmpleado(empleadoId) {
    try {
        console.log('📝 Cargando datos para editar empleado ID:', empleadoId);

        // Mostrar indicador de carga temporal
        showNotification('🔄 Cargando datos del empleado...', 'info');

        const response = await fetch(`/api/empleado/${empleadoId}`);
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.success && data.empleado) {
            const empleado = data.empleado;
            currentEditingEmpleadoId = empleadoId;

            // Actualizar título del modal
            document.getElementById('modal-title').innerHTML = '<i data-feather="edit-2"></i> Editar Empleado';
            
            // Llenar formulario con datos del empleado
            document.querySelector('[name="nombre"]').value = empleado.nombre || '';
            document.querySelector('[name="apellido"]').value = empleado.apellido || '';
            document.querySelector('[name="cedula"]').value = empleado.cedula || '';
            document.querySelector('[name="fecha_nacimiento"]').value = empleado.fecha_nacimiento ? empleado.fecha_nacimiento.split('T')[0] : '';
            document.querySelector('[name="correo_electronico"]').value = empleado.correo_electronico || empleado.correo || '';
            document.querySelector('[name="telefono"]').value = empleado.telefono || '';
            document.querySelector('[name="placa"]').value = empleado.placa || '';
            document.querySelector('[name="rango"]').value = empleado.rango || '';
            document.querySelector('[name="departamento"]').value = empleado.departamento || empleado.departamento_nombre || '';
            document.getElementById('empleado-id').value = empleadoId;

            // Actualizar texto del botón de guardar
            const saveBtn = document.querySelector('.btn-save');
            saveBtn.innerHTML = '<i data-feather="save"></i> Actualizar Empleado';

            // Actualizar selector de departamentos antes de mostrar
            await updateModalDepartmentSelector(empleado.departamento || empleado.departamento_nombre || '');

            // Mostrar modal
            document.getElementById('empleado-modal').style.display = 'flex';
            document.body.style.overflow = 'hidden';
            refreshIcons();

            console.log('✅ Modal de edición cargado para:', `${empleado.nombre} ${empleado.apellido}`);
        } else {
            throw new Error('No se encontraron datos del empleado');
        }
    } catch (error) {
        console.error('❌ Error cargando empleado:', error);
        showNotification('❌ Error cargando datos del empleado: ' + error.message, 'error');
    }
}

// Variables para el modal de eliminación
let empleadoToDelete = null;

// Eliminar empleado - Mostrar modal de confirmación
function deleteEmpleado(empleadoId) {
    console.log('🗑️ Preparando eliminación de empleado:', empleadoId);
    
    const empleado = allEmpleados.find(emp => emp.id === empleadoId);
    if (!empleado) {
        showNotification('Empleado no encontrado', 'error');
        return;
    }

    empleadoToDelete = empleadoId;
    
    // Llenar información del empleado en el modal
    document.getElementById('delete-employee-name').textContent = 
        `${empleado.nombre || 'Sin nombre'} ${empleado.apellido || 'Sin apellido'}`;
    
    document.getElementById('delete-employee-details').textContent = 
        `${empleado.rango || 'Sin rango'} • ${empleado.departamento_nombre || empleado.departamento || 'Sin departamento'}`;

    // Mostrar modal
    document.getElementById('delete-modal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    empleadoToDelete = null;
}

// Cerrar modal de eliminación
function closeDeleteModal() {
    document.getElementById('delete-modal').style.display = 'none';
    document.body.style.overflow = 'auto';
    empleadoToDelete = null;
}

// Confirmar eliminación
async function confirmDeleteEmpleado() {
    if (!empleadoToDelete) {
        showNotification('Error: No hay empleado seleccionado para eliminar', 'error');
        return;
    }

    try {
        console.log('🗑️ Eliminando empleado:', empleadoToDelete);
        
        const response = await fetch(`/api/empleados/${empleadoToDelete}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            showNotification('✅ Empleado eliminado exitosamente', 'success');
            closeDeleteModal();
            await loadEmpleados(); // Recargar y actualizar tabla
        } else {
            throw new Error(result.message || 'Error eliminando empleado');
        }
    } catch (error) {
        console.error('❌ Error eliminando empleado:', error);
        showNotification('Error eliminando empleado: ' + error.message, 'error');
    }
}

// Guardar empleado
async function saveEmpleado() {
    const form = document.getElementById('empleado-form');
    const formData = new FormData(form);
    const empleadoData = Object.fromEntries(formData);

    // Validaciones básicas
    if (!empleadoData.nombre || !empleadoData.apellido) {
        showNotification('❌ Nombre y apellido son requeridos', 'error');
        return;
    }

    if (!empleadoData.correo_electronico) {
        showNotification('❌ El email es requerido', 'error');
        return;
    }

    if (!empleadoData.rango) {
        showNotification('❌ El rango es requerido', 'error');
        return;
    }

    if (!empleadoData.departamento) {
        showNotification('❌ El departamento es requerido', 'error');
        return;
    }

    // Mostrar indicador de carga
    const saveBtn = document.querySelector('.btn-save');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i data-feather="loader"></i> Guardando...';
    saveBtn.disabled = true;
    refreshIcons();

    try {
        let response;
        const isEditing = currentEditingEmpleadoId;

        console.log(`${isEditing ? '📝' : '➕'} ${isEditing ? 'Actualizando' : 'Creando'} empleado:`, empleadoData);

        if (isEditing) {
            // Actualizar empleado existente
            response = await fetch(`/api/empleados/${currentEditingEmpleadoId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(empleadoData)
            });
        } else {
            // Crear nuevo empleado
            response = await fetch('/api/empleados', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(empleadoData)
            });
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error ${response.status}: ${errorText}`);
        }

        const result = await response.json();

        if (result.success) {
            const mensaje = isEditing ? 
                '✅ Empleado actualizado exitosamente' : 
                '✅ Empleado creado exitosamente';

            showNotification(mensaje, 'success');
            closeEmpleadoModal();
            
            // Recargar datos y actualizar tabla
            await loadEmpleados();

            console.log('✅ Operación completada:', mensaje);
        } else {
            throw new Error(result.message || 'Error en la operación');
        }

    } catch (error) {
        console.error('❌ Error en saveEmpleado:', error);
        showNotification('❌ Error: ' + error.message, 'error');
    } finally {
        // Restaurar botón
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
        refreshIcons();
    }
}

// Cerrar modal
function closeEmpleadoModal() {
    document.getElementById('empleado-modal').style.display = 'none';
    document.body.style.overflow = 'auto';
    currentEditingEmpleadoId = null;
}

// Carga masiva
function cargaMasivaEmpleados() {
    showMassUploadModal();
}

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

function closeMassUploadModal() {
    const modal = document.getElementById('mass-upload-modal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = 'auto';
    }
}

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
            await loadEmpleados();
            showNotification(`${sucessCount} empleados cargados exitosamente`, 'success');
        }
    };

    reader.readAsText(file);
}


// Utilidades
function showLoading() {
    document.getElementById('employees-tbody').innerHTML = `
        <tr>
            <td colspan="8" class="loading">
                <i data-feather="loader"></i> Cargando empleados...
            </td>
        </tr>
    `;
    refreshIcons();
}

function showError(message) {
    document.getElementById('employees-tbody').innerHTML = `
        <tr>
            <td colspan="8" class="empty-state">
                <i data-feather="alert-circle"></i>
                <h3>Error</h3>
                <p>${message}</p>
            </td>
        </tr>
    `;
    refreshIcons();
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;

    const icon = type === 'success' ? 'check-circle' : 
                 type === 'error' ? 'alert-circle' : 
                 type === 'warning' ? 'alert-triangle' : 'info';

    notification.innerHTML = `
        <i data-feather="${icon}"></i>
        <span>${message}</span>
    `;

    document.body.appendChild(notification);
    feather.replace();

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

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function refreshIcons() {
    setTimeout(() => {
        feather.replace();
    }, 100);
}

console.log('🎯 Gestión moderna de empleados cargada');
