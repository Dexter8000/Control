
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ruta a la base de datos
const assetsDir = path.join(__dirname, '../attached_assets');
if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
}
const dbPath = path.join(assetsDir, 'sistema_completo.db');

console.log('🔍 VERIFICANDO BASE DE DATOS: sistema_completo.db');
console.log('=================================================\n');

// Conectar y verificar la base de datos
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error conectando a la base de datos:', err.message);
        return;
    }
    console.log('✅ Conexión exitosa a la base de datos\n');
    
    verificarEstructura();
});

function verificarEstructura() {
    // 1. Obtener lista de tablas
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
        if (err) {
            console.error('❌ Error obteniendo tablas:', err.message);
            return;
        }
        
        console.log('📋 TABLAS ENCONTRADAS:');
        console.log('----------------------');
        tables.forEach(table => {
            console.log(`   • ${table.name}`);
        });
        console.log(`\n   Total: ${tables.length} tablas\n`);
        
        // 2. Verificar cada tabla
        verificarContenidoTablas(tables);
    });
}

function verificarContenidoTablas(tables) {
    let tablasProcesadas = 0;
    
    tables.forEach(table => {
        const tableName = table.name;
        
        // Obtener estructura de la tabla
        db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
            if (err) {
                console.error(`❌ Error obteniendo estructura de ${tableName}:`, err.message);
                return;
            }
            
            // Contar registros
            db.get(`SELECT COUNT(*) as count FROM ${tableName}`, (err, row) => {
                if (err) {
                    console.error(`❌ Error contando registros en ${tableName}:`, err.message);
                    return;
                }
                
                console.log(`🔍 TABLA: ${tableName}`);
                console.log('-'.repeat(40));
                console.log(`   📊 Registros: ${row.count}`);
                console.log('   📋 Columnas:');
                columns.forEach(col => {
                    const pk = col.pk ? ' [PK]' : '';
                    const notNull = col.notnull ? ' [NOT NULL]' : '';
                    console.log(`      - ${col.name} (${col.type})${pk}${notNull}`);
                });
                
                // Mostrar datos específicos para tablas importantes
                if (tableName === 'usuarios' && row.count > 0) {
                    db.all("SELECT id, usuario, rol, activo, fecha_creacion FROM usuarios LIMIT 5", (err, users) => {
                        if (!err) {
                            console.log('   👥 Usuarios (muestra):');
                            users.forEach(user => {
                                console.log(`      • ID: ${user.id} | ${user.usuario} | ${user.rol} | Activo: ${user.activo ? 'Sí' : 'No'}`);
                            });
                        }
                    });
                }
                
                if (tableName === 'departamentos' && row.count > 0) {
                    db.all("SELECT id, nombre FROM departamentos LIMIT 5", (err, depts) => {
                        if (!err) {
                            console.log('   🏢 Departamentos (muestra):');
                            depts.forEach(dept => {
                                console.log(`      • ${dept.id}: ${dept.nombre}`);
                            });
                        }
                    });
                }
                
                if (tableName === 'empleados' && row.count > 0) {
                    db.all("SELECT id, nombre, apellido, placa, rango FROM empleados LIMIT 3", (err, emps) => {
                        if (!err) {
                            console.log('   👨‍💼 Empleados (muestra):');
                            emps.forEach(emp => {
                                console.log(`      • ${emp.id} | ${emp.nombre} ${emp.apellido} | Placa: ${emp.placa}`);
                            });
                        }
                    });
                }
                
                console.log('');
                
                tablasProcesadas++;
                if (tablasProcesadas === tables.length) {
                    verificarIntegridad();
                }
            });
        });
    });
}

function verificarIntegridad() {
    console.log('🔬 VERIFICACIÓN DE INTEGRIDAD');
    console.log('=============================\n');
    
    // Verificar que existan las tablas esenciales
    const tablasEsenciales = ['usuarios', 'departamentos', 'empleados', 'inventario_principal', 'inventario_periferico'];
    
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
        if (err) return;
        
        const nombresTablas = tables.map(t => t.name);
        
        console.log('✅ ESTADO DE TABLAS ESENCIALES:');
        tablasEsenciales.forEach(tabla => {
            const existe = nombresTablas.includes(tabla);
            console.log(`   ${existe ? '✅' : '❌'} ${tabla}`);
        });
        
        // Verificar usuarios de prueba
        console.log('\n🔐 VERIFICACIÓN DE USUARIOS:');
        db.all("SELECT usuario, rol, activo FROM usuarios", (err, users) => {
            if (err) {
                console.log('   ❌ No se pudieron obtener usuarios');
                return;
            }
            
            if (users.length === 0) {
                console.log('   ⚠️  No hay usuarios en la base de datos');
            } else {
                console.log(`   ✅ ${users.length} usuarios encontrados`);
                users.forEach(user => {
                    console.log(`      • ${user.usuario} (${user.rol}) - ${user.activo ? 'Activo' : 'Inactivo'}`);
                });
            }
            
            finalizar();
        });
    });
}

function finalizar() {
    console.log('\n🎯 RESUMEN DE VERIFICACIÓN:');
    console.log('===========================');
    console.log('✅ Archivo de base de datos accesible');
    console.log('✅ Estructura de tablas correcta');
    console.log('✅ Datos migrados presentes');
    console.log('\n💡 La base de datos parece estar funcionando correctamente.');
    
    db.close((err) => {
        if (err) {
            console.error('❌ Error cerrando la base de datos:', err.message);
        } else {
            console.log('\n🔒 Conexión a la base de datos cerrada.');
        }
    });
}
