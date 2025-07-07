/**
 * Módulo para mostrar el modal informativo sobre la creación de usuarios
 * Este módulo solo muestra información sobre la estructura de la tabla de usuarios
 * y explica que la gestión se realiza externamente mediante SQLite Studio
 */

// Función para mostrar el modal informativo de creación de usuarios
function showUserAddModal() {
  // Cargar el modal desde el archivo parcial si no existe en el DOM
  if (!document.getElementById('user-add-modal')) {
    fetch('/partials/user-add-modal.html')
      .then(response => {
        if (!response.ok) {
          throw new Error('Error al cargar el modal');
        }
        return response.text();
      })
      .then(html => {
        // Insertar el HTML del modal en el documento
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = html;
        document.body.appendChild(modalContainer.firstChild);
        
        // Inicializar los event listeners
        initUserAddModalListeners();
        
        // Mostrar el modal
        document.getElementById('user-add-modal').style.display = 'block';
        
        // Inicializar los iconos de Feather
        if (window.feather) {
          feather.replace();
        }
      })
      .catch(error => {
        console.error('Error:', error);
        alert('Error al cargar el modal de información de usuarios');
      });
  } else {
    // Si el modal ya existe en el DOM, solo mostrarlo
    document.getElementById('user-add-modal').style.display = 'block';
    
    // Inicializar los iconos de Feather
    if (window.feather) {
      feather.replace();
    }
  }
}

// Función para cerrar el modal
function closeUserAddModal() {
  const modal = document.getElementById('user-add-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// Función para inicializar los event listeners del modal
function initUserAddModalListeners() {
  // Botón para cerrar el modal
  const btnCloseModal = document.getElementById('btn-close-user-add-modal');
  if (btnCloseModal) {
    btnCloseModal.addEventListener('click', closeUserAddModal);
  }
  
  // Botón para cancelar/cerrar
  const btnCancelAdd = document.getElementById('btn-cancel-user-add');
  if (btnCancelAdd) {
    btnCancelAdd.addEventListener('click', closeUserAddModal);
  }
  
  // Cerrar el modal al hacer clic fuera de él
  window.addEventListener('click', (e) => {
    const modal = document.getElementById('user-add-modal');
    if (e.target === modal) {
      closeUserAddModal();
    }
  });
  
  // Cerrar el modal con la tecla Escape
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeUserAddModal();
    }
  });
}

// Inicializar los event listeners cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', () => {
  // Botón para mostrar el modal informativo de creación de usuarios
  const btnShowUserAddModal = document.getElementById('btn-show-user-add-modal');
  if (btnShowUserAddModal) {
    btnShowUserAddModal.addEventListener('click', showUserAddModal);
  }
});

// Exportar funciones al ámbito global
window.showUserAddModal = showUserAddModal;
window.closeUserAddModal = closeUserAddModal;
