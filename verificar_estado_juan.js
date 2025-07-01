const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'attached_assets', 'kilo.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error('Error al conectar a la base de datos:', err.message);
        return;
    }
    console.log('Conectado a la base de datos SQLite');
});

// Consultar estado de Juan
const query = `
    SELECT 
        id, 
        usuario, 
        activo, 
        intentos_fallidos, 
        bloqueado_hasta,
        datetime('now', 'localtime') as hora_actual
    FROM usuarios 
    WHERE usuario = 'juan_perez'
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
    
    console.log('\n🔍 Estado de la cuenta de Juan Pérez:');
    console.log('----------------------------------');
    console.log(`ID: ${row.id}`);
    console.log(`Usuario: ${row.usuario}`);
    console.log(`Activo: ${row.activo ? '✅ Sí' : '❌ No'}`);
    console.log(`Intentos fallidos: ${row.intentos_fallidos || 0}`);
    console.log(`Bloqueado hasta: ${row.bloqueado_hasta || 'No bloqueado'}`);
    console.log(`Hora actual: ${row.hora_actual}`);
    
    // Verificar si la cuenta está bloqueada
    if (row.bloqueado_hasta && new Date(row.bloqueado_hasta) > new Date()) {
        console.log('\n⚠️  La cuenta aún está bloqueada.');
        console.log('Ejecuta el siguiente comando para desbloquearla:');
        console.log('node desbloquear_juan.js');
    } else if (row.activo && !row.bloqueado_hasta) {
        console.log('\n✅ La cuenta está activa y desbloqueada.');
        console.log('Puedes iniciar sesión con:');
        console.log('Usuario: juan_perez');
        console.log('Contraseña: MiContrasenaParaJuan123!');
    }
    
    db.close();
});
