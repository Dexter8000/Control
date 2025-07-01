const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Configuración para Juan
const USUARIO = 'juan_perez';
const NUEVA_PASSWORD = 'MiContrasenaParaJuan123!'; // La contraseña que proporcionaste

const dbPath = path.join(__dirname, 'attached_assets', 'kilo.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error('Error al conectar a la base de datos:', err.message);
        return;
    }
    console.log('Conectado a la base de datos SQLite');
});

// Función para desbloquear a Juan y actualizar su contraseña
async function desbloquearJuan() {
    try {
        console.log(`\n🔧 Desbloqueando a ${USUARIO}...`);
        
        // Actualizar la base de datos - quitar bloqueo y reiniciar intentos
        await new Promise((resolve, reject) => {
            db.run(
                `UPDATE usuarios 
                 SET intentos_fallidos = 0, 
                     bloqueado_hasta = NULL,
                     activo = 1
                 WHERE usuario = ?`,
                [USUARIO],
                function(err) {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
        
        console.log(`✅ ${USUARIO} ha sido desbloqueado exitosamente`);
        console.log('✅ Intentos fallidos reiniciados a 0');
        
    } catch (error) {
        console.error('❌ Error al desbloquear al usuario:', error.message);
    } finally {
        db.close();
    }
}

// Verificar el estado actual del usuario
async function verificarUsuario() {
    return new Promise((resolve, reject) => {
        db.get(
            'SELECT usuario, activo, intentos_fallidos, bloqueado_hasta FROM usuarios WHERE usuario = ?',
            [USUARIO],
            (err, row) => {
                if (err) reject(err);
                else resolve(row);
            }
        );
    });
}

// Ejecutar la verificación y desbloqueo
async function main() {
    try {
        // Primero verificamos el estado actual
        const usuario = await verificarUsuario();
        if (!usuario) {
            console.log('❌ Usuario no encontrado');
            return;
        }
        
        console.log('\n🔍 Estado actual del usuario:');
        console.log('---------------------------');
        console.log(`Usuario: ${usuario.usuario}`);
        console.log(`Activo: ${usuario.activo ? '✅ Sí' : '❌ No'}`);
        console.log(`Intentos fallidos: ${usuario.intentos_fallidos || 0}`);
        console.log(`Bloqueado hasta: ${usuario.bloqueado_hasta || 'No bloqueado'}`);
        
        // Preguntar si se desea continuar
        const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        readline.question('\n¿Deseas desbloquear a Juan? (s/n): ', async (respuesta) => {
            if (respuesta.toLowerCase() === 's') {
                await desbloquearJuan();
            } else {
                console.log('Operación cancelada');
            }
            readline.close();
            db.close();
        });
        
    } catch (error) {
        console.error('Error:', error);
        db.close();
    }
}

main();
