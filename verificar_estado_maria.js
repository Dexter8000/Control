const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'attached_assets', 'kilo.db');
const db = new sqlite3.Database(dbPath);

// Consultar estado de maria_lopez
const query = `
    SELECT 
        id, 
        usuario, 
        activo, 
        intentos_fallidos, 
        bloqueado_hasta,
        datetime('now', 'localtime') as hora_actual,
        substr(contrasena, 1, 20) as hash_inicio
    FROM usuarios 
    WHERE usuario = 'maria_lopez'
`;

db.get(query, [], (err, row) => {
    if (err) {
        console.error('Error al consultar el usuario:', err.message);
        return;
    }
    
    if (!row) {
        console.log('❌ Usuario no encontrado');
        return;
    }
    
    console.log('\n🔍 Estado de la cuenta de María López:');
    console.log('----------------------------------');
    console.log(`ID: ${row.id}`);
    console.log(`Usuario: ${row.usuario}`);
    console.log(`Activo: ${row.activo ? '✅ Sí' : '❌ No'}`);
    console.log(`Intentos fallidos: ${row.intentos_fallidos || 0}`);
    console.log(`Bloqueado hasta: ${row.bloqueado_hasta || 'No bloqueado'}`);
    console.log(`Inicio del hash: ${row.hash_inicio}...`);
    console.log(`Hora actual: ${row.hora_actual}`);
    
    // Verificar si la cuenta está lista para iniciar sesión
    if (row.activo && !row.bloqueado_hasta) {
        console.log('\n✅ La cuenta está lista para usarse con:');
        console.log('   Usuario: maria_lopez');
        console.log('   Contraseña: Salayer*109');
    } else {
        console.log('\n⚠️  La cuenta aún requiere atención:');
        if (row.bloqueado_hasta) console.log(`- Desbloquear la cuenta`);
        if (!row.activo) console.log(`- Activar la cuenta`);
    }
    
    db.close();
});
