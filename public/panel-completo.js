let empleados = [];
let filtrados = [];
let itemsPerPage = 15;
let currentPage = 1;

let rangosDepartamento = [];
let filtradosRD = [];
let cantidadRangos = [];
let filtradosCR = [];

let sortRD = { column: null, asc: true };
let sortCR = { column: null, asc: true };

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

    const inpRD = document.getElementById('buscar-rangos-departamento');
    if (inpRD) inpRD.addEventListener('input', filtrarRD);
    const inpCR = document.getElementById('buscar-cantidad-rangos');
    if (inpCR) inpCR.addEventListener('input', filtrarCR);

    document.querySelectorAll('#tabla-rangos-departamento th').forEach(th =>
        th.addEventListener('click', () => ordenarRD(th.dataset.col)));
    document.querySelectorAll('#tabla-cantidad-rangos th').forEach(th =>
        th.addEventListener('click', () => ordenarCR(th.dataset.col)));
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

function filtrarRD() {
    const t = document.getElementById('buscar-rangos-departamento').value.toLowerCase();
    filtradosRD = rangosDepartamento.filter(d =>
        d.rango_nombre.toLowerCase().includes(t) ||
        d.departamento_nombre.toLowerCase().includes(t)
    );
    renderTablaRD();
}

function filtrarCR() {
    const t = document.getElementById('buscar-cantidad-rangos').value.toLowerCase();
    filtradosCR = cantidadRangos.filter(d =>
        d.rango_nombre.toLowerCase().includes(t)
    );
    renderTablaCR();
}

function ordenarRD(col) {
    if (sortRD.column === col) {
        sortRD.asc = !sortRD.asc;
    } else {
        sortRD.column = col;
        sortRD.asc = true;
    }
    filtradosRD.sort((a,b)=>{
        let av=a[col]; let bv=b[col];
        if(typeof av==='string') av=av.toLowerCase();
        if(typeof bv==='string') bv=bv.toLowerCase();
        if(av<bv) return sortRD.asc?-1:1;
        if(av>bv) return sortRD.asc?1:-1;
        return 0;
    });
    renderTablaRD();
}

function ordenarCR(col) {
    if (sortCR.column === col) {
        sortCR.asc = !sortCR.asc;
    } else {
        sortCR.column = col;
        sortCR.asc = true;
    }
    filtradosCR.sort((a,b)=>{
        let av=a[col]; let bv=b[col];
        if(typeof av==='string') av=av.toLowerCase();
        if(typeof bv==='string') bv=bv.toLowerCase();
        if(av<bv) return sortCR.asc?-1:1;
        if(av>bv) return sortCR.asc?1:-1;
        return 0;
    });
    renderTablaCR();
}

function renderTablaRD() {
    const tbody = document.querySelector('#tabla-rangos-departamento tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    filtradosRD.forEach(d => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${d.rango_nombre}</td><td>${d.departamento_nombre}</td><td>${d.cantidad}</td>`;
        tbody.appendChild(tr);
    });
}

function renderTablaCR() {
    const tbody = document.querySelector('#tabla-cantidad-rangos tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    filtradosCR.forEach(d => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${d.rango_nombre}</td><td>${d.cantidad}</td>`;
        tbody.appendChild(tr);
    });
}

function verificarTotales() {
    const totalEmp = empleados.length;
    const totalRD = rangosDepartamento.reduce((s,d)=>s+d.cantidad,0);
    const totalCR = cantidadRangos.reduce((s,d)=>s+d.cantidad,0);
    if (totalRD !== totalEmp || totalCR !== totalEmp) {
        console.warn('Inconsistencia en totales', {totalEmp,totalRD,totalCR});
    }
}

async function cargarDashboardData() {
    const r1 = await fetch('/api/dashboard/rangos-por-departamento');
    rangosDepartamento = (await r1.json()).detalle;
    filtradosRD = [...rangosDepartamento];
    renderTablaRD();

    const r2 = await fetch('/api/dashboard/cantidad-rangos');
    cantidadRangos = (await r2.json()).detalle;
    filtradosCR = [...cantidadRangos];
    renderTablaCR();

    verificarTotales();

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
