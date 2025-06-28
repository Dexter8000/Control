let empleados = [];
let filtrados = [];
let itemsPerPage = 15;
let currentPage = 1;

async function init() {
    await cargarEmpleados();
    await cargarDashboardData();
    setInterval(actualizarDatosIncompletos, 60000);
    document.getElementById('search').addEventListener('input', filtrar);
    document.getElementById('departamentoFilter').addEventListener('change', filtrar);
    document.getElementById('rangoFilter').addEventListener('change', filtrar);
    document.getElementById('cargarMas').addEventListener('click', cargarMas);
    document.getElementById('btnExportar').addEventListener('click', exportarCSV);
    document.getElementById('btnImprimir').addEventListener('click', () => window.print());
}

document.addEventListener('DOMContentLoaded', init);

async function cargarEmpleados() {
    const res = await fetch('/api/empleados');
    empleados = await res.json();
    filtrados = [...empleados];
    poblarFiltros();
    renderTabla();
}

function poblarFiltros() {
    const depSelect = document.getElementById('departamentoFilter');
    const rangoSelect = document.getElementById('rangoFilter');
    const deps = new Set();
    const rangos = new Set();
    empleados.forEach(e => {
        if (e.departamento_nombre || e.departamento) deps.add(e.departamento_nombre || e.departamento);
        if (e.rango) rangos.add(e.rango);
    });
    depSelect.innerHTML = '<option value="">Todos los departamentos</option>' +
        Array.from(deps).map(d => `<option value="${d}">${d}</option>`).join('');
    rangoSelect.innerHTML = '<option value="">Todos los rangos</option>' +
        Array.from(rangos).map(r => `<option value="${r}">${r}</option>`).join('');
}

function filtrar() {
    const texto = document.getElementById('search').value.toLowerCase();
    const depto = document.getElementById('departamentoFilter').value;
    const rango = document.getElementById('rangoFilter').value;

    filtrados = empleados.filter(e => {
        const matchTexto = `${e.nombre || ''} ${e.apellido || ''}`.toLowerCase().includes(texto);
        const matchDepto = !depto || (e.departamento_nombre || e.departamento) === depto;
        const matchRango = !rango || e.rango === rango;
        return matchTexto && matchDepto && matchRango;
    });
    currentPage = 1;
    renderTabla(true);
}

function renderTabla(reset=false) {
    const tbody = document.querySelector('#tabla-empleados tbody');
    if (reset) tbody.innerHTML = '';
    const start = (currentPage - 1) * itemsPerPage;
    const pageItems = filtrados.slice(start, start + itemsPerPage);
    pageItems.forEach(e => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${e.id}</td><td>${e.nombre || ''} ${e.apellido || ''}</td><td>${e.rango || ''}</td><td>${e.departamento_nombre || e.departamento || ''}</td>`;
        tbody.appendChild(tr);
    });
    if ((start + itemsPerPage) >= filtrados.length) {
        document.getElementById('cargarMas').disabled = true;
    } else {
        document.getElementById('cargarMas').disabled = false;
    }
}

function cargarMas() {
    currentPage++;
    renderTabla();
}

function exportarCSV() {
    let csv = 'ID,Nombre,Rango,Departamento\n';
    filtrados.forEach(e => {
        const nombre = `${e.nombre || ''} ${e.apellido || ''}`.trim();
        const depto = e.departamento_nombre || e.departamento || '';
        csv += `${e.id},${nombre},${e.rango || ''},${depto}\n`;
    });
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'analisis_empleados.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

async function cargarDashboardData() {
    const r1 = await fetch('/api/dashboard/rangos-por-departamento');
    const datosDepto = (await r1.json()).detalle;
    const etiquetas1 = datosDepto.map(d => `${d.rango_nombre} - ${d.departamento_nombre}`);
    const valores1 = datosDepto.map(d => d.cantidad);
    new Chart(document.getElementById('rangosDepartamentoChart').getContext('2d'), {
        type:'bar',
        data:{labels:etiquetas1,datasets:[{label:'Cantidad',data:valores1,backgroundColor:'rgba(26,115,232,0.6)'}]},
        options:{responsive:true,maintainAspectRatio:false}
    });

    const r2 = await fetch('/api/dashboard/cantidad-rangos');
    const datosRangos = (await r2.json()).detalle;
    new Chart(document.getElementById('cantidadRangosChart').getContext('2d'), {
        type:'bar',
        data:{labels:datosRangos.map(d=>d.rango_nombre),datasets:[{label:'Cantidad',data:datosRangos.map(d=>d.cantidad),backgroundColor:'rgba(67,233,123,0.6)'}]},
        options:{responsive:true,maintainAspectRatio:false}
    });

    const r3 = await fetch('/api/dashboard/total-departamentos');
    const totalDeptos = await r3.json();
    document.getElementById('totalDepartamentos').textContent = totalDeptos.total;

    await actualizarDatosIncompletos();
}

async function actualizarDatosIncompletos() {
    try {
        const r = await fetch('/api/dashboard/datos-incompletos');
        const incompletos = await r.json();
        const cont = document.getElementById('datosIncompletos');
        const card = cont.closest('.chart-box');
        if (incompletos.count === 0) {
            cont.innerHTML = '<p>No hay datos incompletos</p>';
            if (card) card.style.display = 'none';
        } else {
            if (card) card.style.display = '';
            let ul = cont.querySelector('ul');
            if (!ul) {
                ul = document.createElement('ul');
                cont.innerHTML = '';
                cont.appendChild(ul);
            } else {
                ul.innerHTML = '';
            }
            incompletos.ids.forEach(id => {
                const li = document.createElement('li');
                li.textContent = 'ID: ' + id;
                ul.appendChild(li);
            });
        }
    } catch (err) {
        console.error('Error al actualizar datos incompletos:', err);
    }
}
