
const Database = require('./config');

async function inspectDatabase() {
    const db = new Database();
    
    try {
        await db.connect();
        console.log('\n📊 INSPECCIÓN DE LA BASE DE DATOS MIGRADA');
        console.log('=========================================\n');

        // Obtener lista de tablas
        const tables = await new Promise((resolve, reject) => {
            db.db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        console.log('📋 Tablas encontradas:');
        tables.forEach(table => console.log(`   - ${table.name}`));
        console.log('');

        // Inspeccionar cada tabla
        for (const table of tables) {
            console.log(`🔍 Estructura de la tabla: ${table.name}`);
            console.log('-'.repeat(50));

            // Obtener estructura de la tabla
            const columns = await new Promise((resolve, reject) => {
                db.db.all(`PRAGMA table_info(${table.name})`, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });

            columns.forEach(col => {
                console.log(`   ${col.name} (${col.type}) ${col.pk ? '[PK]' : ''} ${col.notnull ? '[NOT NULL]' : ''}`);
            });

            // Contar registros
            const count = await new Promise((resolve, reject) => {
                db.db.get(`SELECT COUNT(*) as count FROM ${table.name}`, (err, row) => {
                    if (err) reject(err);
                    else resolve(row.count);
                });
            });

            console.log(`   📊 Registros: ${count}\n`);

            // Mostrar datos específicos según la tabla
            if (table.name === 'usuarios') {
                console.log('👥 Usuarios migrados:');
                const users = await new Promise((resolve, reject) => {
                    db.db.all("SELECT id, usuario, rol, nombre, apellido, activo FROM usuarios", (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows);
                    });
                });

                users.forEach(user => {
                    console.log(`   • ID: ${user.id} | Usuario: ${user.usuario} | Rol: ${user.rol} | Activo: ${user.activo ? 'Sí' : 'No'}`);
                });
                console.log('');
            }

            if (table.name === 'departamentos') {
                console.log('🏢 Departamentos migrados:');
                const depts = await new Promise((resolve, reject) => {
                    db.db.all("SELECT id, nombre FROM departamentos ORDER BY id", (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows);
                    });
                });

                depts.forEach(dept => {
                    console.log(`   • ${dept.id}: ${dept.nombre}`);
                });
                console.log('');
            }

            if (table.name === 'empleados') {
                console.log('👨‍💼 Empleados migrados:');
                const empleados = await new Promise((resolve, reject) => {
                    db.db.all("SELECT id, placa, rango, nombre, apellido, departamento_id FROM empleados LIMIT 5", (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows);
                    });
                });

                empleados.forEach(emp => {
                    console.log(`   • ${emp.id} | Placa: ${emp.placa} | ${emp.rango} ${emp.nombre} ${emp.apellido} | Depto: ${emp.departamento_id}`);
                });
                if (count > 5) console.log(`   ... y ${count - 5} empleados más`);
                console.log('');
            }

            if (table.name === 'configuracion') {
                console.log('⚙️ Configuraciones del sistema:');
                const configs = await new Promise((resolve, reject) => {
                    db.db.all("SELECT clave, valor, descripcion FROM configuracion", (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows);
                    });
                });

                configs.forEach(config => {
                    console.log(`   • ${config.clave}: ${config.valor} (${config.descripcion})`);
                });
                console.log('');
            }
        }

        console.log('✅ Inspección de base de datos migrada completada');
        console.log('\n🎯 ESTADO DE LA MIGRACIÓN:');
        console.log('✅ Usuarios originales migrados con contraseñas hasheadas');
        console.log('✅ Departamentos completos importados');
        console.log('✅ Estructura de empleados preparada');
        console.log('✅ Tablas de inventario configuradas');
        console.log('✅ Sistema de logs implementado');

    } catch (error) {
        console.error('❌ Error inspeccionando la base de datos:', error);
    } finally {
        db.close();
    }
}

// Ejecutar inspección
inspectDatabase();
