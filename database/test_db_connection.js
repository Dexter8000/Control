const Database = require('./config');

async function testConnection() {
    console.log('🔍 Probando conexión a la base de datos...');
    
    const db = new Database();
    await db.connect();
    console.log('✅ Conexión establecida');
    
    console.log('🔍 Probando obtener empleados...');
    try {
        const empleados = await db.getEmpleadosCompletos();
        console.log(`✅ Éxito! Obtenidos ${empleados.length} empleados`);
        console.log('📊 Primeros 5 empleados:');
        empleados.slice(0, 5).forEach((emp, index) => {
            console.log(`  ${index + 1}. ID: ${emp.id}, Nombre: ${emp.nombre}, Rango: ${emp.rango}, Departamento: ${emp.departamento}`);
        });
    } catch (error) {
        console.error('❌ Error obteniendo empleados:', error.message);
        console.error('❌ Stack trace:', error.stack);
    } finally {
        db.close();
    }
}

testConnection().catch(err => {
    console.error('❌ Error en la prueba:', err);
});
