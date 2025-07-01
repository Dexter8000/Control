const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'attached_assets', 'kilo.db');
const db = new sqlite3.Database(dbPath);

// Función para verificar si una cadena parece ser un hash bcrypt
function esHashBcrypt(password) {
    // Un hash bcrypt válido típicamente comienza con $2a$, $2b$, $2y$ o similar
    return /^\$2[aby]\$\d{2}\$[./0-9A-Za-z]{53}$/.test(password);
}

// Función para actualizar el hash de un usuario
async function actualizarHash(userId, nuevoHash) {
    return new Promise((resolve, reject) => {
        db.run(
            'UPDATE usuarios SET contrasena = ? WHERE id = ?',
            [nuevoHash, userId],
            function(err) {
                if (err) reject(err);
                else resolve(this.changes > 0);
            }
        );
    });
}

// Verificar y actualizar hashes
async function verificarYActualizarHashes() {
    // Obtener todos los usuarios
    db.all("SELECT id, usuario, contrasena FROM usuarios", async (err, usuarios) => {
        if (err) {
            console.error('❌ Error al obtener usuarios:', err);
            db.close();
            return;
        }

        console.log(`\n🔍 Verificando ${usuarios.length} usuarios...`);
        let actualizados = 0;
        const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        });

        for (const usuario of usuarios) {
            try {
                const esHashValido = esHashBcrypt(usuario.contrasena);
                
                console.log(`\n👤 Usuario: ${usuario.usuario} (ID: ${usuario.id})`);
                console.log(`🔒 Hash actual: ${usuario.contrasena.substring(0, 20)}...`);
                console.log(`✅ Hash válido: ${esHashValido ? 'Sí' : 'No'}`);
                
                if (!esHashValido) {
                    console.log('⚠️  Este usuario necesita actualización de hash');
                    
                    const respuesta = await new Promise(resolve => {
                        readline.question('¿Deseas actualizar el hash de este usuario? (s/n): ', resolve);
                    });
                    
                    if (respuesta.toLowerCase() === 's') {
                        const nuevaContrasena = await new Promise(resolve => {
                            readline.question('Ingresa la nueva contraseña (o presiona Enter para omitir): ', resolve);
                        });
                        
                        if (nuevaContrasena) {
                            try {
                                const nuevoHash = await bcrypt.hash(nuevaContrasena, 10);
                                const actualizado = await actualizarHash(usuario.id, nuevoHash);
                                
                                if (actualizado) {
                                    console.log('✅ Hash actualizado correctamente');
                                    actualizados++;
                                } else {
                                    console.log('⚠️  No se pudo actualizar el hash');
                                }
                            } catch (error) {
                                console.error('❌ Error al generar el hash:', error.message);
                            }
                        }
                    }
                }
            } catch (error) {
                console.error(`❌ Error procesando usuario ${usuario.usuario}:`, error.message);
            }
        }

        readline.close();
        console.log(`\n📊 Resumen:`);
        console.log(`- Usuarios verificados: ${usuarios.length}`);
        console.log(`- Hashes actualizados: ${actualizados}`);
        console.log('✅ Verificación completada');
        db.close();
    });
}

// Ejecutar la verificación
console.log('🔍 Iniciando verificación de hashes...');
verificarYActualizarHashes().catch(console.error);
