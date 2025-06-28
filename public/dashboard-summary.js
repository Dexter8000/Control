// Dashboard summary cards script

document.addEventListener('DOMContentLoaded', () => {
    cargarDatosDashboard();

});

async function cargarDatosDashboard() {
    try {
        const resEmpleados = await fetch('/api/dashboard/total-empleados');
        const dataEmpleados = await resEmpleados.json();
        document.getElementById('totalEmpleados').textContent = dataEmpleados.total;

        const resRangosDepto = await fetch('/api/dashboard/rangos-por-departamento');
        const dataRangosDepto = await resRangosDepto.json();
        const resumenRangosDepto = dataRangosDepto.detalle.slice(0, 2)
            .map(item => `${item.rango_nombre} (${item.departamento_nombre}): ${item.cantidad}`)
            .join(', ');
        document.getElementById('resumenRangosPorDepartamentos').textContent = resumenRangosDepto || 'No hay datos de rangos por departamento.';

        const resCantidadRangos = await fetch('/api/dashboard/cantidad-rangos');
        const dataCantidadRangos = await resCantidadRangos.json();
        const resumenCantidadRangos = dataCantidadRangos.detalle.slice(0, 2)
            .map(item => `${item.rango_nombre}: ${item.cantidad}`)
            .join(', ');
        document.getElementById('resumenCantidadRangos').textContent = resumenCantidadRangos || 'No hay datos de rangos.';

        const resDepartamentos = await fetch('/api/dashboard/total-departamentos');
        const dataDepartamentos = await resDepartamentos.json();
        document.getElementById('totalDepartamentos').textContent = dataDepartamentos.total;

        const resIncompletos = await fetch('/api/dashboard/datos-incompletos');
        const dataIncompletos = await resIncompletos.json();
        const datosIncompletosCard = document.getElementById('datosIncompletosCard');
        const listaIncompletos = document.getElementById('listaIncompletos');
        const mensajeIncompletos = document.getElementById('mensajeIncompletos');

        if (dataIncompletos.count > 0) {
            datosIncompletosCard.style.display = 'block';
            mensajeIncompletos.textContent = `Se encontraron ${dataIncompletos.count} registros con datos incompletos. IDs:`;
            listaIncompletos.innerHTML = dataIncompletos.ids.slice(0, 5)
                .map(id => `<li>ID: ${id}</li>`).join('');
            if (dataIncompletos.count > 5) {
                listaIncompletos.innerHTML += `<li>...y ${dataIncompletos.count - 5} más.</li>`;
            }
        } else {
            datosIncompletosCard.style.display = 'none';
        }
    } catch (error) {
        console.error('Error al cargar datos del dashboard:', error);
    }
}

