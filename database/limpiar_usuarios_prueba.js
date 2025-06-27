
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const assetsDir = path.join(__dirname, '../attached_assets');
if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
}
const dbPath = path.join(assetsDir, 'sistema_completo.db');

console.log('🧹 LIMPIANDO USUARIOS INACTIVOS');
console.log('===============================\n');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error conectando:', err.message);
        return;
    }
    
    // Primero mostrar usuarios inactivos
    db.all(`
        SELECT id, usuario, rol, activo
        FROM usuarios 
        WHERE activo = 0
        ORDER BY id
    `, (err, inactiveUsers) => {
        if (err) {
            console.error('❌ Error:', err.message);
            return;
        }
        
        console.log(`📊 Usuarios inactivos encontrados: ${inactiveUsers.length}\n`);
        
        if (inactiveUsers.length > 0) {
            inactiveUsers.forEach(user => {
                console.log(`🆔 ID: ${user.id} - Usuario: ${user.usuario} - Activo: ${user.activo ? 'Sí' : 'No'}`);
            });
            
            console.log('\n🗑️ Eliminando usuarios inactivos...\n');
            
            // Eliminar usuarios inactivos
            db.run(`DELETE FROM usuarios WHERE activo = 0`, function(err) {
                if (err) {
                    console.error('❌ Error eliminando usuarios:', err.message);
                } else {
                    console.log(`✅ ${this.changes} usuarios inactivos eliminados permanentemente`);
                }
                
                // Mostrar usuarios restantes
                db.all(`
                    SELECT id, usuario, rol, activo
                    FROM usuarios 
                    ORDER BY id
                `, (err, remainingUsers) => {
                    if (err) {
                        console.error('❌ Error:', err.message);
                    } else {
                        console.log(`\n📊 Usuarios activos restantes: ${remainingUsers.length}\n`);
                        remainingUsers.forEach(user => {
                            console.log(`🆔 ID: ${user.id} - Usuario: ${user.usuario}`);
                        });
                    }
                    
                    db.close();
                });
            });
        } else {
            console.log('✅ No hay usuarios inactivos para eliminar');
            db.close();
        }
    });
});');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error conectando:', err.message);
        return;
    }
    
    // Primero ver qué usuarios hay
    db.all("SELECT id, usuario, rol FROM usuarios WHERE activo = 1", (err, users) => {
        if (err) {
            console.error('❌ Error:', err.message);
            return;
        }
        
        console.log('👥 USUARIOS ACTUALES:');
        users.forEach(user => {
            console.log(`   ${user.id}: ${user.usuario} (${user.rol})`);
        });
        
        // Buscar usuarios de prueba
        const usuariosPrueba = users.filter(u => 
            u.usuario.includes('prueba') || 
            u.usuario.includes('test') || 
            u.usuario.includes('demo')
        );
        
        if (usuariosPrueba.length > 0) {
            console.log('\n🗑️  USUARIOS DE PRUEBA ENCONTRADOS:');
            usuariosPrueba.forEach(user => {
                console.log(`   ${user.id}: ${user.usuario}`);
            });
            
            console.log('\n¿Desea eliminar estos usuarios? (Este script solo muestra, no elimina)');
            console.log('Para eliminar, ejecute: DELETE FROM usuarios WHERE usuario LIKE "%prueba%"');
        } else {
            console.log('\n✅ No se encontraron usuarios de prueba');
        }
        
        db.close();
    });
});
