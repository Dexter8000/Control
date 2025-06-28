// Dashboard summary cards script

document.addEventListener('DOMContentLoaded', () => {
    cargarDatosDashboard();

    const btnVerPanelCompleto = document.getElementById('btnVerPanelCompleto');
    if (btnVerPanelCompleto) {
        btnVerPanelCompleto.addEventListener('click', () => mostrarPanelCompletoGlobal());
    }
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

async function mostrarPanelCompletoGlobal() {
    const modal = document.getElementById('panelCompletoModal');
    const contenido = document.getElementById('contenidoPanelCompleto');
    contenido.innerHTML = 'Cargando información detallada...';
    modal.style.display = 'block';

    try {
        let htmlContenido = '<h3>Detalles Completos del Panel de Gestión</h3>';

        const resRangosDepto = await fetch('/api/dashboard/rangos-por-departamento');
        const dataRangosDepto = await resRangosDepto.json();
        htmlContenido += '<h4>Rangos por Departamento:</h4>';
        htmlContenido += '<table><thead><tr><th>Rango</th><th>Departamento</th><th>Cantidad</th></tr></thead><tbody>';
        dataRangosDepto.detalle.forEach(item => {
            htmlContenido += `<tr><td>${item.rango_nombre}</td><td>${item.departamento_nombre}</td><td>${item.cantidad}</td></tr>`;
        });
        htmlContenido += '</tbody></table>';

        const resCantidadRangos = await fetch('/api/dashboard/cantidad-rangos');
        const dataCantidadRangos = await resCantidadRangos.json();
        htmlContenido += '<h4>Cantidad Total de Rangos:</h4>';
        htmlContenido += '<table><thead><tr><th>Rango</th><th>Cantidad</th></tr></thead><tbody>';
        dataCantidadRangos.detalle.forEach(item => {
            htmlContenido += `<tr><td>${item.rango_nombre}</td><td>${item.cantidad}</td></tr>`;
        });
        htmlContenido += '</tbody></table>';

        const resIncompletos = await fetch('/api/dashboard/datos-incompletos');
        const dataIncompletos = await resIncompletos.json();
        if (dataIncompletos.count > 0) {
            htmlContenido += '<h4>Registros con Datos Incompletos:</h4>';
            htmlContenido += '<table><thead><tr><th>ID</th><th>Nombre</th><th>Rango</th><th>Departamento ID</th></tr></thead><tbody>';
            dataIncompletos.detalle.forEach(item => {
                htmlContenido += `<tr><td>${item.id || 'N/A'}</td><td>${item.nombre || 'INCOMPLETO'}</td><td>${item.rango || 'INCOMPLETO'}</td><td>${item.id_departamento || 'INCOMPLETO'}</td></tr>`;
            });
            htmlContenido += '</tbody></table>';
        }

        contenido.innerHTML = htmlContenido;
    } catch (error) {
        contenido.innerHTML = '<p>Error al cargar el panel completo. Por favor, inténtelo de nuevo.</p>';
        console.error('Error al cargar el panel completo:', error);
    }
}

function cerrarPanelCompleto() {
    document.getElementById('panelCompletoModal').style.display = 'none';
}
