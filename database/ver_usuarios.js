
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../attached_assets/sistema_completo.db');

console.log('👥 USUARIOS EN LA BASE DE DATOS');
console.log('===============================\n');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error conectando:', err.message);
        return;
    }
    
    // Ver todos los usuarios
    db.all(`
        SELECT id, usuario, rol, nombre, apellido, email, activo, 
               fecha_creacion, ultimo_acceso
        FROM usuarios 
        ORDER BY id
    `, (err, users) => {
        if (err) {
            console.error('❌ Error:', err.message);
            return;
        }
        
        console.log(`📊 Total de usuarios: ${users.length}\n`);
        
        users.forEach(user => {
            console.log(`🆔 ID: ${user.id}`);
            console.log(`👤 Usuario: ${user.usuario}`);
            console.log(`🔑 Rol: ${user.rol}`);
            console.log(`📧 Email: ${user.email || 'Sin email'}`);
            console.log(`✅ Activo: ${user.activo ? 'Sí' : 'No'}`);
            console.log(`📅 Creado: ${user.fecha_creacion}`);
            console.log(`🕐 Último acceso: ${user.ultimo_acceso || 'Nunca'}`);
            console.log('-'.repeat(40));
        });
        
        db.close();
    });
});
