
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const assetsDir = path.join(__dirname, '../attached_assets');
if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
}
const dbPath = path.join(assetsDir, 'kilo.db');

console.log('🔍 VERIFICANDO ESTRUCTURA DE LA TABLA EMPLEADOS');
console.log('================================================\n');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error conectando:', err.message);
        return;
    }
    
    console.log('✅ Conectado a la base de datos\n');
    
    // Obtener información de las columnas de la tabla empleados
    db.all("PRAGMA table_info(empleados)", (err, columns) => {
        if (err) {
            console.error('❌ Error obteniendo estructura:', err.message);
            return;
        }
        
        console.log('📋 COLUMNAS DE LA TABLA EMPLEADOS:');
        console.log('==================================');
        
        columns.forEach(col => {
            console.log(`• ${col.name} (${col.type}) - ${col.notnull ? 'NOT NULL' : 'NULL'} - ${col.pk ? 'PRIMARY KEY' : ''}`);
        });
        
        console.log('\n📊 Total de columnas:', columns.length);
        
        // Verificar si existe la columna fecha_ingreso
        const fechaIngresoExists = columns.some(col => col.name === 'fecha_ingreso');
        console.log(`\n🔍 ¿Existe columna 'fecha_ingreso'? ${fechaIngresoExists ? '✅ SÍ' : '❌ NO'}`);
        
        if (!fechaIngresoExists) {
            console.log('\n💡 SUGERENCIA: La columna fecha_ingreso no existe en la tabla.');
            console.log('   Opciones:');
            console.log('   1. Eliminar fecha_ingreso del código (recomendado)');
            console.log('   2. Añadir la columna a la tabla con ALTER TABLE');
        }
        
        db.close();
    });
});
