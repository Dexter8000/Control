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

// Consulta para obtener la estructura de la tabla usuarios
db.all("PRAGMA table_info(usuarios);", [], (err, columns) => {
    if (err) {
        console.error('Error al obtener la estructura de la tabla usuarios:', err.message);
        db.close();
        return;
    }
    
    console.log('\nEstructura de la tabla usuarios:');
    console.log('----------------------------');
    console.log(columns.map(col => `${col.name} (${col.type})`).join('\n'));
    
    // Ahora obtenemos los datos de los usuarios
    db.all("SELECT id, nombre, usuario, email, rol, activo FROM usuarios ORDER BY id;", [], (err, usuarios) => {
        if (err) {
            console.error('Error al obtener los usuarios:', err.message);
            db.close();
            return;
        }
        
        console.log('\nUsuarios en el sistema:');
        console.log('----------------------------');
        console.log('ID | Nombre | Usuario | Email | Rol | Activo');
        console.log('-----------------------------------------------');
        usuarios.forEach(usuario => {
            console.log(`${usuario.id} | ${usuario.nombre} | ${usuario.usuario} | ${usuario.email} | ${usuario.rol} | ${usuario.activo ? 'Sí' : 'No'}`);
        });
        
        // No mostramos las contraseñas por seguridad
        console.log('\nNOTA: Las contraseñas están hasheadas por seguridad.');
        console.log('Si necesitas restablecer una contraseña, usa el sistema de recuperación.');
        
        db.close();
    });
});
