const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

// Configuración
const USUARIO = 'juan_perez';
const NUEVA_PASSWORD = 'MiContrasenaParaJuan123!';

const dbPath = path.join(__dirname, 'attached_assets', 'kilo.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error('Error al conectar a la base de datos:', err.message);
        return;
    }
    console.log('Conectado a la base de datos SQLite');
});

// Función para actualizar la contraseña
async function actualizarPassword() {
    try {
        console.log(`\n🔧 Actualizando contraseña para: ${USUARIO}`);
        
        // Generar el hash de la nueva contraseña
        const hashedPassword = await bcrypt.hash(NUEVA_PASSWORD, 10);
        
        // Actualizar la base de datos
        await new Promise((resolve, reject) => {
            db.run(
                'UPDATE usuarios SET contrasena = ? WHERE usuario = ?',
                [hashedPassword, USUARIO],
                function(err) {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
        
        console.log('✅ Contraseña actualizada exitosamente');
        console.log('\n📋 Detalles:');
        console.log('------------');
        console.log(`Usuario: ${USUARIO}`);
        console.log(`Nuevo hash: ${hashedPassword}`);
        
    } catch (error) {
        console.error('❌ Error al actualizar la contraseña:', error.message);
    } finally {
        db.close();
    }
}

// Ejecutar la actualización
actualizarPassword();
