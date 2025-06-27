const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const assetsDir = path.join(__dirname, '../attached_assets');
const dbPath = path.join(assetsDir, 'kilo.db');

console.log('👥 VERIFICANDO EMPLEADOS EN KILO.DB');
console.log('===================================');
console.log('📍 Ruta de BD:', dbPath);
console.log('📍 Existe archivo:', fs.existsSync(dbPath) ? 'SÍ' : 'NO');

if (!fs.existsSync(dbPath)) {
    console.log('❌ El archivo kilo.db no existe');
    process.exit(1);
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error conectando:', err.message);
        return;
    }
    
    console.log('✅ Conectado a kilo.db\n');
    
    // Ver empleados (usando nombres de columnas correctos)
    db.all("SELECT * FROM empleados ORDER BY id LIMIT 15", (err, empleados) => {
        if (err) {
            console.error('❌ Error:', err.message);
            return;
        }
        
        console.log(`👥 EMPLEADOS ENCONTRADOS: ${empleados.length} (mostrando primeros 15)\n`);
        
        if (empleados.length === 0) {
            console.log('⚠️ No hay empleados en la base de datos');
        } else {
            empleados.forEach(emp => {
                console.log(`🆔 ID: ${emp.id}`);
                console.log(`👤 Nombre: ${emp.nombre}`);
                console.log(`🏷️ Placa: ${emp.placa || '[Sin placa]'}`);
                console.log(`🎖️ Rango: ${emp.rango || '[Sin rango]'}`);
                console.log(`🏢 Departamento: ${emp.departamento || '[Sin departamento]'}`);
                console.log(`✅ Activo: ${emp.activo || emp.estado || '[Sin estado]'}`);
                console.log(`📧 Email: ${emp.email || '[Sin email]'}`);
                console.log('-----------------------------------');
            });
        }
        
        // Contar totales
        db.get("SELECT COUNT(*) as total FROM empleados", (err, result) => {
            if (!err) {
                console.log(`\n📊 TOTAL DE EMPLEADOS: ${result.total}`);
            }
            
            // Contar por estado
            db.all("SELECT activo, COUNT(*) as cantidad FROM empleados GROUP BY activo", (err, estados) => {
                if (!err && estados.length > 0) {
                    console.log('\n📈 POR ESTADO:');
                    estados.forEach(estado => {
                        console.log(`   ${estado.activo || 'Sin estado'}: ${estado.cantidad} empleados`);
                    });
                }
                
                // Contar por departamento
                db.all("SELECT departamento, COUNT(*) as cantidad FROM empleados WHERE departamento IS NOT NULL GROUP BY departamento ORDER BY cantidad DESC LIMIT 5", (err, departamentos) => {
                    if (!err && departamentos.length > 0) {
                        console.log('\n🏢 TOP 5 DEPARTAMENTOS:');
                        departamentos.forEach(dept => {
                            console.log(`   ${dept.departamento}: ${dept.cantidad} empleados`);
                        });
                    }
                    
                    // Contar por rango
                    db.all("SELECT rango, COUNT(*) as cantidad FROM empleados WHERE rango IS NOT NULL GROUP BY rango ORDER BY cantidad DESC LIMIT 5", (err, rangos) => {
                        if (!err && rangos.length > 0) {
                            console.log('\n🎖️ TOP 5 RANGOS:');
                            rangos.forEach(rango => {
                                console.log(`   ${rango.rango}: ${rango.cantidad} empleados`);
                            });
                        }
                        
                        db.close();
                    });
                });
            });
        });
    });
});
