
// Sistema de Gestión de Vacaciones
// Este archivo maneja toda la funcionalidad relacionada con vacaciones de empleados

document.addEventListener('DOMContentLoaded', function() {
    initializeVacacionesManager();
});

// Variables globales para vacaciones
let currentEmpleadoVacaciones = null;
let historialVacaciones = [];

// Inicializar el sistema de vacaciones
function initializeVacacionesManager() {
    console.log('🏖️ Sistema de gestión de vacaciones inicializado');
}

// Mostrar modal de gestión de vacaciones para un empleado
async function mostrarModalVacaciones(empleadoId) {
    try {
        // Obtener información del empleado
        const empleadoResponse = await fetch(`/api/empleados`);
        const empleadosData = await empleadoResponse.json();
        const empleado = empleadosData.empleados.find(e => e.id === empleadoId);

        if (!empleado) {
            showNotification('Empleado no encontrado', 'error');
            return;
        }

        currentEmpleadoVacaciones = empleado;

        // Obtener información detallada de vacaciones
        const vacacionesInfo = await obtenerVacacionesDetalladas(empleadoId);
        
        // Obtener historial de vacaciones
        const historialResponse = await fetch(`/api/empleado/${empleadoId}/historial-vacaciones`);
        const historialData = await historialResponse.json();
        historialVacaciones = historialData.success ? historialData.historial : [];

        // Crear y mostrar modal
        crearModalVacaciones(empleado, vacacionesInfo, historialVacaciones);

    } catch (error) {
        console.error('❌ Error mostrando modal de vacaciones:', error);
        showNotification('Error cargando información de vacaciones', 'error');
    }
}

// Crear modal completo de vacaciones
function crearModalVacaciones(empleado, vacacionesInfo, historial) {
    // Remover modal existente si existe
    const existingModal = document.getElementById('vacaciones-modal');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'vacaciones-modal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content modal-large">
            <div class="modal-header">
                <h2>
                    <i class="fas fa-umbrella-beach"></i>
                    Gestión de Vacaciones - ${empleado.nombre} ${empleado.apellido}
                </h2>
                <span class="close" onclick="cerrarModalVacaciones()">&times;</span>
            </div>
            
            <div class="modal-body">
                <!-- Información actual de vacaciones -->
                <div class="vacaciones-info-section">
                    <h3><i class="fas fa-info-circle"></i> Estado Actual</h3>
                    <div class="vacaciones-status-card">
                        ${renderEstadoVacacionesDetallado(vacacionesInfo)}
                    </div>
                </div>

                <!-- Formulario para nuevo período de vacaciones -->
                <div class="vacaciones-form-section">
                    <h3><i class="fas fa-plus-circle"></i> Programar Nuevas Vacaciones</h3>
                    <form id="vacaciones-form" class="vacaciones-form">
                        <div class="form-grid">
                            <div class="form-group">
                                <label for="vacaciones-fecha-inicio">Fecha de Inicio</label>
                                <input type="date" id="vacaciones-fecha-inicio" name="fecha_inicio" required>
                            </div>
                            <div class="form-group">
                                <label for="vacaciones-fecha-fin">Fecha de Fin</label>
                                <input type="date" id="vacaciones-fecha-fin" name="fecha_fin" required>
                            </div>
                            <div class="form-group">
                                <label for="vacaciones-tipo">Tipo de Vacaciones</label>
                                <select id="vacaciones-tipo" name="tipo_vacaciones">
                                    <option value="anuales">Anuales</option>
                                    <option value="especiales">Especiales</option>
                                    <option value="medicas">Médicas</option>
                                    <option value="personales">Personales</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="vacaciones-motivo">Motivo (Opcional)</label>
                                <input type="text" id="vacaciones-motivo" name="motivo" placeholder="Ej: Vacaciones anuales 2025">
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="vacaciones-notas">Notas Adicionales</label>
                            <textarea id="vacaciones-notas" name="notas" rows="3" placeholder="Notas adicionales sobre este período de vacaciones..."></textarea>
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-save"></i>
                                Programar Vacaciones
                            </button>
                            <div class="vacaciones-calculation" id="vacaciones-preview"></div>
                        </div>
                    </form>
                </div>

                <!-- Historial de vacaciones -->
                <div class="vacaciones-historial-section">
                    <h3><i class="fas fa-history"></i> Historial de Vacaciones</h3>
                    <div class="historial-container">
                        ${renderHistorialVacaciones(historial)}
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Configurar event listeners
    configurarEventListenersVacaciones();
}

// Renderizar estado detallado de vacaciones
function renderEstadoVacacionesDetallado(vacacionesInfo) {
    if (!vacacionesInfo) {
        return `
            <div class="status-card status-sin-vacaciones">
                <i class="fas fa-calendar-times"></i>
                <h4>Sin Vacaciones Programadas</h4>
                <p>Este empleado no tiene vacaciones programadas actualmente.</p>
            </div>
        `;
    }

    switch (vacacionesInfo.estado) {
        case 'en_vacaciones':
            return `
                <div class="status-card status-en-vacaciones">
                    <i class="fas fa-umbrella-beach"></i>
                    <h4>Actualmente en Vacaciones</h4>
                    <div class="vacaciones-details">
                        <p><strong>Días transcurridos:</strong> ${vacacionesInfo.diasTranscurridos} de ${vacacionesInfo.diasTotales}</p>
                        <p><strong>Días restantes:</strong> ${vacacionesInfo.diasRestantes}</p>
                        <p><strong>Fecha de retorno:</strong> ${formatearFecha(vacacionesInfo.fechaRetorno)}</p>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${(vacacionesInfo.diasTranscurridos / vacacionesInfo.diasTotales) * 100}%"></div>
                    </div>
                </div>
            `;

        case 'programadas':
            return `
                <div class="status-card status-programadas">
                    <i class="fas fa-calendar-check"></i>
                    <h4>Vacaciones Programadas</h4>
                    <div class="vacaciones-details">
                        <p><strong>Inician en:</strong> ${vacacionesInfo.diasHastaProximas} días</p>
                        <p><strong>Fecha de inicio:</strong> ${formatearFecha(vacacionesInfo.proximasVacaciones.fecha_inicio)}</p>
                        <p><strong>Fecha de fin:</strong> ${formatearFecha(vacacionesInfo.proximasVacaciones.fecha_fin)}</p>
                        <p><strong>Duración:</strong> ${vacacionesInfo.proximasVacaciones.dias_totales} días</p>
                    </div>
                </div>
            `;

        default:
            return `
                <div class="status-card status-disponible">
                    <i class="fas fa-check-circle"></i>
                    <h4>Disponible para Vacaciones</h4>
                    <p>El empleado está disponible y puede programar nuevas vacaciones.</p>
                </div>
            `;
    }
}

// Renderizar historial de vacaciones
function renderHistorialVacaciones(historial) {
    if (!historial || historial.length === 0) {
        return `
            <div class="empty-historial">
                <i class="fas fa-calendar-times"></i>
                <p>No hay historial de vacaciones registrado</p>
            </div>
        `;
    }

    return `
        <div class="historial-table-container">
            <table class="historial-table">
                <thead>
                    <tr>
                        <th>Período</th>
                        <th>Duración</th>
                        <th>Tipo</th>
                        <th>Estado</th>
                        <th>Aprobado por</th>
                        <th>Año</th>
                    </tr>
                </thead>
                <tbody>
                    ${historial.map(periodo => `
                        <tr class="historial-row ${periodo.estado}">
                            <td>
                                <div class="periodo-info">
                                    <strong>${formatearFecha(periodo.fecha_inicio)} - ${formatearFecha(periodo.fecha_fin)}</strong>
                                    ${periodo.motivo ? `<br><small>${periodo.motivo}</small>` : ''}
                                </div>
                            </td>
                            <td>
                                <span class="duracion-badge">${periodo.dias_totales} días</span>
                                <br><small>Retorno: ${formatearFecha(periodo.fecha_retorno)}</small>
                            </td>
                            <td>
                                <span class="tipo-badge tipo-${periodo.tipo_vacaciones}">${periodo.tipo_vacaciones}</span>
                            </td>
                            <td>
                                <span class="estado-badge estado-${periodo.estado}">${periodo.estado}</span>
                            </td>
                            <td>
                                <small>${periodo.aprobado_por_nombre || 'N/A'}</small>
                            </td>
                            <td>
                                <span class="año-badge">${periodo.año_periodo}</span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Configurar event listeners para el formulario de vacaciones
function configurarEventListenersVacaciones() {
    const form = document.getElementById('vacaciones-form');
    const fechaInicio = document.getElementById('vacaciones-fecha-inicio');
    const fechaFin = document.getElementById('vacaciones-fecha-fin');

    // Calcular duración automáticamente
    function actualizarPreview() {
        if (fechaInicio.value && fechaFin.value) {
            const inicio = new Date(fechaInicio.value);
            const fin = new Date(fechaFin.value);
            const diferencia = fin - inicio;
            
            if (diferencia > 0) {
                const dias = Math.ceil(diferencia / (1000 * 60 * 60 * 24)) + 1;
                const retorno = new Date(fin);
                retorno.setDate(retorno.getDate() + 1);
                
                document.getElementById('vacaciones-preview').innerHTML = `
                    <div class="preview-info">
                        <i class="fas fa-calculator"></i>
                        <strong>Duración:</strong> ${dias} días
                        <br><strong>Fecha de retorno:</strong> ${formatearFecha(retorno)}
                    </div>
                `;
            } else {
                document.getElementById('vacaciones-preview').innerHTML = `
                    <div class="preview-error">
                        <i class="fas fa-exclamation-triangle"></i>
                        La fecha de fin debe ser posterior a la fecha de inicio
                    </div>
                `;
            }
        }
    }

    fechaInicio.addEventListener('change', actualizarPreview);
    fechaFin.addEventListener('change', actualizarPreview);

    // Envío del formulario
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        await procesarNuevasVacaciones();
    });
}

// Procesar formulario de nuevas vacaciones
async function procesarNuevasVacaciones() {
    const form = document.getElementById('vacaciones-form');
    const formData = new FormData(form);
    
    const datosVacaciones = {
        empleado_id: currentEmpleadoVacaciones.id,
        fecha_inicio: formData.get('fecha_inicio'),
        fecha_fin: formData.get('fecha_fin'),
        tipo_vacaciones: formData.get('tipo_vacaciones'),
        motivo: formData.get('motivo'),
        notas: formData.get('notas')
    };

    // Validaciones
    if (!datosVacaciones.fecha_inicio || !datosVacaciones.fecha_fin) {
        showNotification('Fechas de inicio y fin son requeridas', 'error');
        return;
    }

    const fechaInicio = new Date(datosVacaciones.fecha_inicio);
    const fechaFin = new Date(datosVacaciones.fecha_fin);

    if (fechaFin <= fechaInicio) {
        showNotification('La fecha de fin debe ser posterior a la fecha de inicio', 'error');
        return;
    }

    try {
        const response = await fetch('/api/vacaciones', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(datosVacaciones)
        });

        const result = await response.json();

        if (result.success) {
            showNotification('Período de vacaciones programado exitosamente', 'success');
            cerrarModalVacaciones();
            
            // Recargar datos de empleados para actualizar la tabla
            if (typeof loadEmployeesData === 'function') {
                await loadEmployeesData();
            }
        } else {
            showNotification('Error: ' + result.message, 'error');
        }

    } catch (error) {
        console.error('❌ Error programando vacaciones:', error);
        showNotification('Error de conexión al programar vacaciones', 'error');
    }
}

// Cerrar modal de vacaciones
function cerrarModalVacaciones() {
    const modal = document.getElementById('vacaciones-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        modal.remove();
    }
    currentEmpleadoVacaciones = null;
    historialVacaciones = [];
}

// Función para limpiar registros antiguos (solo administradores)
async function ejecutarLimpiezaVacaciones() {
    if (!confirm('¿Está seguro de que desea archivar los registros de vacaciones antiguos (más de 2 años)? Esta acción no se puede deshacer.')) {
        return;
    }

    try {
        const response = await fetch('/api/vacaciones/limpiar-antiguos', {
            method: 'POST'
        });

        const result = await response.json();

        if (result.success) {
            showNotification(`Se archivaron ${result.registrosArchivados} registros antiguos`, 'success');
        } else {
            showNotification('Error: ' + result.message, 'error');
        }

    } catch (error) {
        console.error('❌ Error ejecutando limpieza:', error);
        showNotification('Error de conexión al ejecutar limpieza', 'error');
    }
}

// Cerrar modal con tecla ESC
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        cerrarModalVacaciones();
    }
});
