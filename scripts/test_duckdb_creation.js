const { initializeDuckDB } = require('../database/duckdb');

async function testCreation() {
  console.log('🚀 Iniciando prueba de creación de tablas de DuckDB...');
  let db, connection;
  try {
    const { instance, connection: conn } = await initializeDuckDB();
    db = instance;
    connection = conn;
    console.log('✅ Prueba finalizada con éxito. La base de datos y las tablas están listas.');
  } catch (error) {
    console.error('❌ La prueba de creación de tablas falló:', error);
  } finally {
    console.log('⏳ Esperando para cerrar las conexiones...');
    await new Promise(resolve => setTimeout(resolve, 500));
    if (connection) {
      connection.closeSync();
    }
    if (db) {
      db.closeSync();
    }
    console.log('🔌 Conexiones cerradas.');
  }
}

testCreation();
