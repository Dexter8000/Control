let dataTable;

function parseRows(res) {
    if (Array.isArray(res)) return res;
    if (res.data && Array.isArray(res.data)) return res.data;
    const key = Object.keys(res).find(k => Array.isArray(res[k]));
    return key ? res[key] : [];
}

async function loadTable(tableName) {
    try {
        const response = await fetch(`/api/${tableName}`);
        const result = await response.json();
        const rows = parseRows(result);
        const columns = rows.length
            ? Object.keys(rows[0]).map(k => ({ title: k, data: k }))
            : [];
        if (dataTable) {
            dataTable.clear().destroy();
            document.querySelector('#control-table').innerHTML = '';
        }
        dataTable = $('#control-table').DataTable({ data: rows, columns });
    } catch (err) {
        console.error('Error cargando tabla', err);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const actions = document.getElementById('empleados-actions');
    document.querySelectorAll('.pc-card').forEach(card => {
        card.addEventListener('click', () => {
            loadTable(card.dataset.table);
            if (card.dataset.table === 'empleados') {
                actions.style.display = 'flex';
            } else {
                actions.style.display = 'none';
            }
        });
    });
});
