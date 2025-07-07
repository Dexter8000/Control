// Panel de Control - Versión simplificada
let dataTable;
let currentTable = '';

// Función para cargar cualquier tabla desde la API
async function cargarTabla(nombreTabla) {
  console.log(`🔄 Cargando tabla: ${nombreTabla}...`);
  currentTable = nombreTabla;
  
  // Mostrar indicador de carga
  document.querySelector('.loading-indicator').style.display = 'flex';
  document.getElementById('table-error-message').style.display = 'none';
  
  try {
    // Hacer la petición a la API sin autenticación (para pruebas)
    const response = await fetch(`/api/${nombreTabla}`);
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    const resultado = await response.json();
    console.log(`✅ Datos recibidos para ${nombreTabla}:`, resultado);
    
    // Extraer los datos del resultado según su estructura
    let filas = [];
    
    if (resultado.success && resultado[nombreTabla]) {
      filas = resultado[nombreTabla];
    } else if (resultado.success && resultado.inventario && nombreTabla === 'inventario_general_activos') {
      filas = resultado.inventario;
    } else if (resultado.success && resultado.data) {
      filas = resultado.data;
    } else if (Array.isArray(resultado)) {
      filas = resultado;
    } else {
      // Buscar cualquier propiedad que sea un array
      const clave = Object.keys(resultado).find(k => Array.isArray(resultado[k]));
      if (clave) {
        filas = resultado[clave];
      }
    }
    
    if (!Array.isArray(filas)) {
      filas = [];
      console.warn('No se encontraron datos en formato de array');
    }
    
    // Destruir la tabla existente si hay una
    if (dataTable) {
      dataTable.destroy();
      document.querySelector('#control-table').innerHTML = '';
    }
    
    // Si no hay datos, mostrar mensaje
    if (filas.length === 0) {
      document.getElementById('table-error-message').textContent = 'No hay datos disponibles';
      document.getElementById('table-error-message').style.display = 'block';
      document.querySelector('.loading-indicator').style.display = 'none';
      return;
    }
    
    // Crear columnas basadas en las propiedades del primer objeto
    const columnas = Object.keys(filas[0]).map(key => ({
      title: key,
      data: key
    }));
    
    // Inicializar DataTable
    dataTable = new DataTable('#control-table', {
      data: filas,
      columns: columnas,
      language: {
        emptyTable: 'No hay datos disponibles',
        zeroRecords: 'No se encontraron registros coincidentes',
        info: 'Mostrando _START_ a _END_ de _TOTAL_ registros',
        infoEmpty: 'Mostrando 0 a 0 de 0 registros',
        search: 'Buscar:',
        paginate: {
          first: 'Primero',
          last: 'Último',
          next: 'Siguiente',
          previous: 'Anterior'
        }
      }
    });
    
    // Mostrar los botones de acción correspondientes
    mostrarAcciones(nombreTabla);
    
  } catch (error) {
    console.error(`❌ Error cargando tabla ${nombreTabla}:`, error);
    document.getElementById('table-error-message').textContent = 
      `Error cargando datos: ${error.message}`;
    document.getElementById('table-error-message').style.display = 'block';
  } finally {
    document.querySelector('.loading-indicator').style.display = 'none';
  }
}

// Función para mostrar los botones de acción según la tabla seleccionada
function mostrarAcciones(nombreTabla) {
  // Ocultar todos los paneles de acciones
  document.querySelectorAll('.pc-actions').forEach(panel => {
    panel.style.display = 'none';
  });
  
  // Mostrar el panel correspondiente
  const panelId = `${nombreTabla}-actions`;
  const panel = document.getElementById(panelId);
  if (panel) {
    panel.style.display = 'flex';
  }
}

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  // Configurar los botones de las tarjetas
  document.querySelectorAll('.pc-card').forEach(card => {
    card.addEventListener('click', () => {
      const nombreTabla = card.getAttribute('data-table');
      if (nombreTabla) {
        cargarTabla(nombreTabla);
      }
    });
  });
  
  // Cargar la tabla de usuarios por defecto
  cargarTabla('usuarios');
});

// Funciones para gestionar departamentos
function showDepartamentoModal(id = null, nombre = '') {
  const modal = document.getElementById('departamento-modal');
  const title = document.getElementById('departamento-modal-title');
  const input = document.getElementById('departamento-nombre');
  
  if (id) {
    title.textContent = 'Editar Departamento';
    input.value = nombre;
    document.getElementById('departamento-id').value = id;
  } else {
    title.textContent = 'Nuevo Departamento';
    input.value = '';
    document.getElementById('departamento-id').value = '';
  }
  
  modal.style.display = 'block';
}

function closeDepartamentoModal() {
  document.getElementById('departamento-modal').style.display = 'none';
}

async function saveDepartamento() {
  const id = document.getElementById('departamento-id').value;
  const nombre = document.getElementById('departamento-nombre').value;
  
  if (!nombre.trim()) {
    alert('El nombre del departamento es obligatorio');
    return;
  }
  
  try {
    const url = id ? `/api/departamentos/${id}` : '/api/departamentos';
    const method = id ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ nombre })
    });
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    closeDepartamentoModal();
    cargarTabla('departamentos');
    
  } catch (error) {
    console.error('❌ Error guardando departamento:', error);
    alert(`Error guardando departamento: ${error.message}`);
  }
}

// Exportar funciones para uso global
window.cargarTabla = cargarTabla;
window.showDepartamentoModal = showDepartamentoModal;
window.closeDepartamentoModal = closeDepartamentoModal;
window.saveDepartamento = saveDepartamento;
