// Variables globales
let allEmpleados = [];
let filteredEmpleados = [];
let currentEditingEmpleadoId = null;
let currentPage = 1;
let itemsPerPage = 10;
let sortColumn = '';
let sortDirection = 'asc';

// Lista estandarizada de departamentos según propuesta oficial
const DEPARTAMENTOS_LISTA = [
    '01-JEFATURA',
    'JEFATURA',
    'DEPARTAMENTO ADMINISTRATIVO',
    'UNIDADES EN OTRA DEPENDENCIA',
    'DEPARTAMENTO DE ENLACE Y MONITOREO DE INFORMACION AERONAVAL',
    'DEPARTAMENTO DE OPERACIONES',
    'TÉCNICOS OPERACIONALES',
    'Departamento de Fusión Operacional de Inteligencia',
    'INTELIGENCIA INSULAR',
    'INTELIGENCIA AÉREA',
    'Departamento de Análisis de Inteligencia',
    'DEPARTAMENTO CANINO',
    'DEPARTAMENTO DE INTELIGENCIA CRIMINAL',
    'DEPARTAMENTO REGIONAL DE INTELIGENCIA AERONAVAL',
    '[sin departamento]'
];

// Función para generar opciones de departamentos dinámicamente
function generarOpcionesDepartamentos() {
    return DEPARTAMENTOS_LISTA.map(dept => 
        `<option value="${dept}">${dept}</option>`
    ).join('');
}

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 Inicializando gestión moderna de empleados');
    initializeDepartmentSelectors();
    initializeApp();
});

// Función para inicializar selectores de departamentos
function initializeDepartmentSelectors() {
    // Actualizar filtro de departamentos
    const filtroDepartamento = document.getElementById('filtro-departamento');
    if (filtroDepartamento) {
        const opcionesTodos = '<option value="">Todos los departamentos</option>';
        filtroDepartamento.innerHTML = opcionesTodos + generarOpcionesDepartamentos();
    }

    // Actualizar selector en modal (se hará cuando se abra)
    console.log('✅ Selectores de departamentos inicializados con lista estándar');
}

// Actualizar opciones del filtro de departamentos según los datos cargados
function updateDepartmentFilter() {
    const filtroDepartamento = document.getElementById('filtro-departamento');
    if (!filtroDepartamento) return;

    const departamentos = Array.from(new Set(
        allEmpleados
            .map(emp => emp.departamento_nombre || emp.departamento)
            .filter(dept => dept && dept.trim() !== '')
            .map(dept => dept.trim())
    )).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

    const opciones = ['<option value="">Todos los departamentos</option>']
        .concat(departamentos.map(d => `<option value="${d}">${d}</option>`))
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
function showNuevoEmpleadoModal() {
    console.log('➕ Abriendo modal para agregar nuevo empleado');
    
    currentEditingEmpleadoId = null;
    document.getElementById('modal-title').innerHTML = '<i data-feather="user-plus"></i> Agregar Nuevo Empleado';
    document.getElementById('empleado-form').reset();
    document.getElementById('empleado-id').value = '';
    
    // Actualizar selector de departamentos en el modal
    updateModalDepartmentSelector();
    
    // Restaurar texto del botón de guardar
    const saveBtn = document.querySelector('.btn-save');
    saveBtn.innerHTML = '<i data-feather="save"></i> Guardar Empleado';
    
    document.getElementById('empleado-modal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    refreshIcons();
}

// Función para actualizar selector de departamentos en modal
function updateModalDepartmentSelector() {
    const modalDepartmentSelect = document.querySelector('#empleado-modal select[name="departamento"]');
    if (modalDepartmentSelect) {
        const opcionSeleccionar = '<option value="">Seleccionar departamento</option>';
        modalDepartmentSelect.innerHTML = opcionSeleccionar + generarOpcionesDepartamentos();
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
            updateModalDepartmentSelector();

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
    showNotification('Función de carga masiva próximamente disponible', 'warning');
}

// Ver panel completo
function verPanelCompleto() {
    console.log('📊 Abriendo panel completo de análisis');
    
    // Crear modal de panel completo
    const panelHTML = `
        <div id="panel-completo-modal" class="modal">
            <div class="modal-content" style="max-width: 1400px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header">
                    <div class="modal-title">
                        <i data-feather="bar-chart-2"></i>
                        Análisis Completo: Rangos por Departamento
                    </div>
                    <button class="modal-close" onclick="closePanelCompleto()">
                        <i data-feather="x"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="form-grid">
                        <!-- Resumen General de Rangos -->
                        <div class="form-section">
                            <div class="form-section-title">
                                <i data-feather="award"></i>
                                Resumen General por Rangos
                            </div>
                            <div id="resumen-rangos-container">
                                <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                                    <i data-feather="loader"></i> Cargando datos...
                                </div>
                            </div>
                        </div>

                        <!-- Análisis Detallado por Departamento -->
                        <div class="form-section">
                            <div class="form-section-title">
                                <i data-feather="layers"></i>
                                Análisis Detallado por Departamento
                            </div>
                            <div id="analisis-departamentos-container">
                                <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                                    <i data-feather="loader"></i> Cargando datos...
                                </div>
                            </div>
                        </div>

                        <!-- Comparativa Departamentos -->
                        <div class="form-section">
                            <div class="form-section-title">
                                <i data-feather="git-branch"></i>
                                Comparativa entre Departamentos
                            </div>
                            <div id="comparativa-container">
                                <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                                    <i data-feather="loader"></i> Cargando datos...
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-modern btn-secondary" onclick="closePanelCompleto()">
                        <i data-feather="x"></i>
                        Cerrar Panel
                    </button>
                    <button class="btn-modern btn-primary" onclick="exportarAnalisis()">
                        <i data-feather="download"></i>
                        Exportar Análisis
                    </button>
                </div>
            </div>
        </div>
    `;

    // Eliminar modal anterior si existe
    const modalExistente = document.getElementById('panel-completo-modal');
    if (modalExistente) {
        modalExistente.remove();
    }

    // Insertar en el DOM
    document.body.insertAdjacentHTML('beforeend', panelHTML);
    document.getElementById('panel-completo-modal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    refreshIcons();
    
    // Cargar datos del análisis
    loadAnalisisCompleto();
}

// Cerrar panel completo
function closePanelCompleto() {
    const modal = document.getElementById('panel-completo-modal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = 'auto';
    }
}

// Cargar análisis completo
async function loadAnalisisCompleto() {
    try {
        console.log('📊 Cargando análisis completo...');
        console.log('🔍 Total empleados disponibles:', allEmpleados.length);
        console.log('🔍 Muestra de empleados:', allEmpleados.slice(0, 3));

        if (allEmpleados.length === 0) {
            console.warn('⚠️ No hay empleados cargados, intentando recargar...');
            await loadEmpleados();
            console.log('🔍 Después de recargar - Total empleados:', allEmpleados.length);
        }

        // Resumen general de rangos
        const resumenRangos = calcularResumenGeneralRangos();
        console.log('📊 Resumen rangos calculado:', resumenRangos);
        renderResumenRangos(resumenRangos);

        // Análisis detallado por departamento
        const analisisDepartamentos = calcularAnalisisDepartamentos();
        console.log('📊 Análisis departamentos calculado:', analisisDepartamentos);
        renderAnalisisDepartamentos(analisisDepartamentos);

        // Comparativa entre departamentos
        const comparativa = calcularComparativaDepartamentos();
        renderComparativa(comparativa);

        console.log('✅ Análisis completo cargado');

    } catch (error) {
        console.error('❌ Error cargando análisis:', error);
        showNotification('Error cargando análisis: ' + error.message, 'error');
    }
}

// Calcular resumen general de rangos
function calcularResumenGeneralRangos() {
    const empleadosActivos = allEmpleados.filter(emp => 
        emp.activo === 'Sí' || emp.activo === 'Activo' || emp.estado === 'Activo'
    );

    const rangoCount = {};
    empleadosActivos.forEach(empleado => {
        if (empleado.rango && empleado.rango.trim() !== '') {
            rangoCount[empleado.rango] = (rangoCount[empleado.rango] || 0) + 1;
        }
    });

    return Object.entries(rangoCount)
        .map(([rango, cantidad]) => ({ 
            rango, 
            cantidad, 
            porcentaje: ((cantidad / empleadosActivos.length) * 100).toFixed(1)
        }))
        .sort((a, b) => b.cantidad - a.cantidad);
}

// Calcular análisis por departamentos
function calcularAnalisisDepartamentos() {
    const empleadosActivos = allEmpleados.filter(emp => 
        emp.activo === 'Sí' || emp.activo === 'Activo' || emp.estado === 'Activo'
    );

    const departamentoAnalisis = {};

    empleadosActivos.forEach(empleado => {
        const dept = empleado.departamento_nombre || empleado.departamento || '[sin departamento]';
        const rango = empleado.rango || '[sin rango]';

        if (!departamentoAnalisis[dept]) {
            departamentoAnalisis[dept] = {
                total: 0,
                rangos: {}
            };
        }

        departamentoAnalisis[dept].total++;
        departamentoAnalisis[dept].rangos[rango] = (departamentoAnalisis[dept].rangos[rango] || 0) + 1;
    });

    return departamentoAnalisis;
}

// Calcular comparativa entre departamentos
function calcularComparativaDepartamentos() {
    const analisisDept = calcularAnalisisDepartamentos();
    
    return Object.entries(analisisDept)
        .map(([dept, data]) => ({
            departamento: dept,
            totalEmpleados: data.total,
            rangoMasFrecuente: Object.entries(data.rangos)
                .sort(([,a], [,b]) => b - a)[0] || ['N/A', 0],
            diversidadRangos: Object.keys(data.rangos).length
        }))
        .sort((a, b) => b.totalEmpleados - a.totalEmpleados);
}

// Calcular distribución global de rangos
function calcularDistribucionGlobalRangos() {
    const rangoCount = {};
    
    allEmpleados.forEach(empleado => {
        if (empleado.rango && empleado.rango.trim() !== '') {
            rangoCount[empleado.rango] = (rangoCount[empleado.rango] || 0) + 1;
        }
    });

    return Object.entries(rangoCount)
        .map(([rango, cantidad]) => ({ rango, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad);
}

// Calcular distribución por departamento
function calcularDistribucionPorDepartamento() {
    const departamentoRangos = {};

    allEmpleados.forEach(empleado => {
        const dept = empleado.departamento_nombre || empleado.departamento || '[sin departamento]';
        const rango = empleado.rango || '[sin rango]';

        if (!departamentoRangos[dept]) {
            departamentoRangos[dept] = {};
        }

        departamentoRangos[dept][rango] = (departamentoRangos[dept][rango] || 0) + 1;
    });

    return departamentoRangos;
}

// Renderizar resumen de rangos
function renderResumenRangos(resumenRangos) {
    const container = document.getElementById('resumen-rangos-container');
    
    if (resumenRangos.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                <i data-feather="alert-circle"></i>
                <p>No hay datos de rangos disponibles</p>
            </div>
        `;
        refreshIcons();
        return;
    }

    const tableHTML = `
        <table class="employees-table">
            <thead>
                <tr>
                    <th><i data-feather="award"></i> Rango</th>
                    <th><i data-feather="users"></i> Total Empleados</th>
                    <th><i data-feather="percent"></i> Porcentaje</th>
                    <th><i data-feather="bar-chart"></i> Representación</th>
                </tr>
            </thead>
            <tbody>
                ${resumenRangos.map(item => {
                    const barWidth = Math.max(5, (item.cantidad / resumenRangos[0].cantidad) * 100);
                    return `
                        <tr>
                            <td>
                                <span class="employee-badge badge-rango">${item.rango}</span>
                            </td>
                            <td><strong>${item.cantidad}</strong></td>
                            <td>${item.porcentaje}%</td>
                            <td>
                                <div style="background: #e0e0e0; border-radius: 4px; height: 8px; width: 100px; position: relative;">
                                    <div style="background: var(--primary-blue); height: 100%; width: ${barWidth}%; border-radius: 4px;"></div>
                                </div>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = tableHTML;
    refreshIcons();
}

// Renderizar análisis de departamentos
function renderAnalisisDepartamentos(analisisDepartamentos) {
    const container = document.getElementById('analisis-departamentos-container');
    
    if (Object.keys(analisisDepartamentos).length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                <i data-feather="alert-circle"></i>
                <p>No hay datos de departamentos disponibles</p>
            </div>
        `;
        refreshIcons();
        return;
    }

    const accordionHTML = Object.entries(analisisDepartamentos)
        .sort(([,a], [,b]) => b.total - a.total)
        .map(([departamento, data]) => {
            const rangoEntries = Object.entries(data.rangos).sort(([,a], [,b]) => b - a);
            const deptId = departamento.replace(/[^a-zA-Z0-9]/g, '');

            return `
                <div class="form-section" style="margin-bottom: 1rem; border-left: 4px solid var(--primary-blue);">
                    <div class="form-section-title" style="cursor: pointer; display: flex; justify-content: space-between; align-items: center;" 
                         onclick="toggleDepartamento('${deptId}')">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <i data-feather="briefcase"></i>
                            <strong>${departamento}</strong>
                        </div>
                        <div style="display: flex; gap: 1rem; align-items: center;">
                            <span class="employee-badge badge-departamento">${data.total} empleados</span>
                            <span class="employee-badge" style="background: #f3e5f5; color: #7b1fa2;">${Object.keys(data.rangos).length} rangos</span>
                            <i data-feather="chevron-down"></i>
                        </div>
                    </div>
                    <div id="dept-${deptId}" class="department-content" style="display: none;">
                        <table class="employees-table">
                            <thead>
                                <tr>
                                    <th><i data-feather="award"></i> Rango</th>
                                    <th><i data-feather="users"></i> Cantidad</th>
                                    <th><i data-feather="percent"></i> % del Depto</th>
                                    <th><i data-feather="bar-chart"></i> Distribución</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rangoEntries.map(([rango, cantidad]) => {
                                    const porcentajeDept = ((cantidad / data.total) * 100).toFixed(1);
                                    const barWidth = Math.max(5, (cantidad / data.total) * 100);
                                    return `
                                        <tr>
                                            <td><span class="employee-badge badge-rango">${rango}</span></td>
                                            <td><strong>${cantidad}</strong></td>
                                            <td>${porcentajeDept}%</td>
                                            <td>
                                                <div style="background: #e0e0e0; border-radius: 4px; height: 6px; width: 80px; position: relative;">
                                                    <div style="background: var(--success-green); height: 100%; width: ${barWidth}%; border-radius: 4px;"></div>
                                                </div>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }).join('');

    container.innerHTML = accordionHTML;
    refreshIcons();
}

// Renderizar comparativa
function renderComparativa(comparativa) {
    const container = document.getElementById('comparativa-container');
    
    if (comparativa.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                <i data-feather="alert-circle"></i>
                <p>No hay datos para comparar</p>
            </div>
        `;
        refreshIcons();
        return;
    }

    const tableHTML = `
        <table class="employees-table">
            <thead>
                <tr>
                    <th><i data-feather="briefcase"></i> Departamento</th>
                    <th><i data-feather="users"></i> Total Empleados</th>
                    <th><i data-feather="award"></i> Rango Predominante</th>
                    <th><i data-feather="layers"></i> Diversidad Rangos</th>
                    <th><i data-feather="trending-up"></i> Ranking</th>
                </tr>
            </thead>
            <tbody>
                ${comparativa.map((item, index) => {
                    const rankingColor = index === 0 ? 'var(--success-green)' : 
                                       index === 1 ? 'var(--warning-orange)' : 
                                       index === 2 ? '#cd7f32' : 'var(--text-muted)';
                    return `
                        <tr>
                            <td>
                                <span class="employee-badge badge-departamento">${item.departamento}</span>
                            </td>
                            <td><strong>${item.totalEmpleados}</strong></td>
                            <td>
                                <span class="employee-badge badge-rango">${item.rangoMasFrecuente[0]}</span>
                                <small>(${item.rangoMasFrecuente[1]})</small>
                            </td>
                            <td>${item.diversidadRangos} tipos</td>
                            <td>
                                <span style="color: ${rankingColor}; font-weight: 600;">
                                    #${index + 1}
                                </span>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = tableHTML;
    refreshIcons();
}

// Toggle departamento en el acordeón
function toggleDepartamento(departamento) {
    const deptId = 'dept-' + departamento.replace(/[^a-zA-Z0-9]/g, '');
    const content = document.getElementById(deptId);
    
    if (content) {
        content.style.display = content.style.display === 'none' ? 'block' : 'none';
    }
}

// Exportar análisis
function exportarAnalisis() {
    showNotification('📄 Función de exportación próximamente disponible', 'info');
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
