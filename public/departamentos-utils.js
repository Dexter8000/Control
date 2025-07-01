let departamentosCache = null;

// Permite limpiar la caché manualmente en caso de que
// los datos obtenidos no sean los esperados
function clearDepartamentosCache() {
  departamentosCache = null;
}

async function getDepartamentosList() {
  if (departamentosCache) {
    return departamentosCache;
  }
  try {
    const response = await fetch('/api/departamentos');
    if (response.ok) {
      const data = await response.json();
      departamentosCache = data.departamentos || [];
    } else {
      console.error('Error al cargar departamentos:', response.status);
      departamentosCache = null;
    }
  } catch (error) {
    console.error('❌ Error obteniendo departamentos:', error);
    departamentosCache = null;
  }
  return departamentosCache || [];
}

async function generarOpcionesDepartamentos(selectedNombre = '') {
  const departamentos = await getDepartamentosList();
  const options = departamentos
    .map((dep) => {
      const selected = dep.nombre === selectedNombre ? 'selected' : '';
      return `<option value="${dep.nombre}" ${selected}>${dep.nombre}</option>`;
    })
    .join('');
  return options;
}

// Expose functions globally
window.getDepartamentosList = getDepartamentosList;
window.generarOpcionesDepartamentos = generarOpcionesDepartamentos;
window.clearDepartamentosCache = clearDepartamentosCache;
