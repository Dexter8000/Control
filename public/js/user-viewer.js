/**
 * Módulo para visualizar usuarios en el panel de control
 * Este módulo solo permite ver la información de los usuarios, sin capacidad de edición
 */

// Función para mostrar los detalles de un usuario en un modal
function showUserDetails(userId) {
  fetch(`/api/usuarios/${userId}`)
    .then(response => {
      if (!response.ok) {
        throw new Error('Error al obtener datos del usuario');
      }
      return response.json();
    })
    .then(data => {
      const user = data.usuario;
      
      // Llenar los campos del modal con la información del usuario
      document.getElementById('user-id-display').textContent = user.id || '';
      document.getElementById('user-username-display').textContent = user.usuario || '';
      document.getElementById('user-rol-display').textContent = user.rol || '';
      document.getElementById('user-activo-display').textContent = user.activo ? 'Activo' : 'Inactivo';
      
      document.getElementById('user-nombre-display').textContent = user.nombre || 'No especificado';
      document.getElementById('user-apellido-display').textContent = user.apellido || 'No especificado';
      document.getElementById('user-email-display').textContent = user.email || 'No especificado';
      document.getElementById('user-telefono-display').textContent = user.telefono || 'No especificado';
      
      document.getElementById('user-fecha-creacion-display').textContent = formatDate(user.fecha_creacion) || 'No especificado';
      document.getElementById('user-ultimo-acceso-display').textContent = formatDate(user.ultimo_acceso) || 'No especificado';
      document.getElementById('user-intentos-fallidos-display').textContent = user.intentos_fallidos || '0';
      document.getElementById('user-bloqueado-hasta-display').textContent = user.bloqueado_hasta ? formatDate(user.bloqueado_hasta) : 'No bloqueado';
      
      // Mostrar el modal
      document.getElementById('user-modal-title').textContent = 'Detalles de Usuario';
      document.getElementById('user-view-modal').style.display = 'block';
    })
    .catch(error => {
      console.error('Error al cargar los datos del usuario:', error);
      alert('No se pudieron cargar los datos del usuario. Por favor, intente nuevamente.');
    });
}

// Función para cerrar el modal de visualización
function closeUserModal() {
  document.getElementById('user-view-modal').style.display = 'none';
}

// Función auxiliar para formatear fechas
function formatDate(dateString) {
  if (!dateString) return 'No especificado';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Fecha inválida';
    
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch (e) {
    console.error('Error al formatear la fecha:', e);
    return 'Fecha inválida';
  }
}

// Inicializar los event listeners cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', () => {
  // Agregar event listener al botón de cerrar el modal
  const closeButton = document.getElementById('btn-close-user-modal');
  if (closeButton) {
    closeButton.addEventListener('click', closeUserModal);
  }
  
  // Cerrar el modal al hacer clic fuera del contenido
  const modal = document.getElementById('user-view-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeUserModal();
      }
    });
  }
});

// Exportar funciones al ámbito global
window.showUserDetails = showUserDetails;
window.closeUserModal = closeUserModal;
