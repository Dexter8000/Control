// Configuración de DataTables
let dataTable;

// Función para cargar la tabla según la selección
async function loadTable(tableName) {
  console.log(`Cargando tabla: ${tableName}`);
  
  // Mostrar indicador de carga
  const tableContainer = document.getElementById('table-container');
  tableContainer.innerHTML = '<div class="loading">Cargando datos...</div>';
  
  try {
    // Obtener datos de la API
    const response = await fetch(`/api/${tableName}`);
    const data = await response.json();
    
    if (!data || data.length === 0) {
      tableContainer.innerHTML = '<div class="no-data">No hay datos disponibles</div>';
      return;
    }
    
    // Crear la tabla
    let tableHtml = `
      <div class="table-responsive">
        <table id="control-table" class="display" style="width:100%">
          <thead>
            <tr>`;
    
    // Crear encabezados de la tabla
    const headers = Object.keys(data[0]);
    headers.forEach(header => {
      tableHtml += `<th>${header.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</th>`;
    });
    
    tableHtml += `
            </tr>
          </thead>
          <tbody>`;
    
    // Llenar la tabla con datos
    data.forEach(row => {
      tableHtml += '<tr>';
      headers.forEach(header => {
        // Formatear fechas si es necesario
        let value = row[header];
        if (value && (header.includes('fecha') || header.includes('fecha_') || header === 'created_at' || header === 'updated_at')) {
          value = new Date(value).toLocaleString();
        }
        tableHtml += `<td>${value || ''}</td>`;
      });
      tableHtml += '</tr>';
    });
    
    tableHtml += `
          </tbody>
        </table>
      </div>`;
    
    tableContainer.innerHTML = tableHtml;
    
    // Inicializar DataTable
    if ($.fn.DataTable.isDataTable('#control-table')) {
      dataTable.destroy();
    }
    
    dataTable = $('#control-table').DataTable({
      responsive: true,
      language: {
        url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json'
      },
      pageLength: 10,
      order: [],
      columnDefs: [
        { orderable: false, targets: -1 } // Deshabilitar ordenación en la última columna
      ]
    });
    
  } catch (error) {
    console.error('Error al cargar la tabla:', error);
    tableContainer.innerHTML = `<div class="error">Error al cargar los datos: ${error.message}</div>`;
  }
}

// Manejar clic en las tarjetas
document.addEventListener('DOMContentLoaded', function() {
  // Cargar la tabla de departamentos por defecto
  loadTable('departamentos');
  
  // Agregar evento de clic a las tarjetas
  document.querySelectorAll('.pc-card').forEach(card => {
    card.addEventListener('click', function() {
      // Remover clase activa de todas las tarjetas
      document.querySelectorAll('.pc-card').forEach(c => c.classList.remove('active'));
      // Agregar clase activa a la tarjeta seleccionada
      this.classList.add('active');
      // Cargar la tabla correspondiente
      const tableName = this.getAttribute('data-table');
      loadTable(tableName);
    });
  });
  
  // Marcar la tarjeta de departamentos como activa por defecto
  document.querySelector('.pc-card[data-table="departamentos"]').classList.add('active');
});

// Función para formatear fechas
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Exportar funciones al ámbito global
window.loadTable = loadTable;
window.formatDate = formatDate;
