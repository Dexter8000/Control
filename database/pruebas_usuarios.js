const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const assetsDir = path.join(__dirname, '../attached_assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}
const dbPath = path.join(assetsDir, 'kilo.db');

class PruebasUsuarios {
  constructor() {
    this.db = new sqlite3.Database(dbPath);
  }

  // Ver todos los usuarios
  async verUsuarios() {
    return new Promise((resolve, reject) => {
      this.db.all(
        `
                SELECT id, usuario, rol, nombre, apellido, email, activo, 
                       fecha_creacion, ultimo_acceso
                FROM usuarios 
                WHERE activo = 1
                ORDER BY id
            `,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  // Agregar usuario de prueba
  async agregarUsuarioPrueba(
    usuario,
    password,
    rol = 'no administrador',
    nombre = null
  ) {
    try {
      const passwordHash = await bcrypt.hash(password, 10);

      return new Promise((resolve, reject) => {
        this.db.run(
          `
                    INSERT INTO usuarios (usuario, password_hash, rol, nombre, activo, fecha_creacion)
                    VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
                `,
          [usuario, passwordHash, rol, nombre],
          function (err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });
    } catch (error) {
      throw error;
    }
  }

  // Eliminar usuario (marcar como inactivo)
  async eliminarUsuario(id) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `
                UPDATE usuarios 
                SET activo = 0 
                WHERE id = ?
            `,
        [id],
        function (err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }

  // Reactivar usuario
  async reactivarUsuario(id) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `
                UPDATE usuarios 
                SET activo = 1 
                WHERE id = ?
            `,
        [id],
        function (err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }

  cerrar() {
    this.db.close();
  }
}

// Función principal para hacer pruebas
async function hacerPruebas() {
  const pruebas = new PruebasUsuarios();

  try {
    console.log('🧪 INICIANDO PRUEBAS DE USUARIOS');
    console.log('=================================\n');

    // 1. Ver usuarios actuales
    console.log('1️⃣ Usuarios actuales:');
    let usuarios = await pruebas.verUsuarios();
    usuarios.forEach((u) => {
      console.log(`   ${u.id}: ${u.usuario} (${u.rol})`);
    });
    console.log(`   Total: ${usuarios.length} usuarios\n`);

    // 2. Agregar usuario de prueba
    console.log('2️⃣ Agregando usuario de prueba...');
    const nuevoId = await pruebas.agregarUsuarioPrueba(
      'usuario_prueba',
      'password123',
      'no administrador',
      'Usuario de Prueba'
    );
    console.log(`   ✅ Usuario agregado con ID: ${nuevoId}\n`);

    // 3. Ver usuarios después de agregar
    console.log('3️⃣ Usuarios después de agregar:');
    usuarios = await pruebas.verUsuarios();
    usuarios.forEach((u) => {
      console.log(`   ${u.id}: ${u.usuario} (${u.rol})`);
    });
    console.log(`   Total: ${usuarios.length} usuarios\n`);

    // 4. Eliminar el usuario de prueba
    console.log('4️⃣ Eliminando usuario de prueba...');
    const eliminados = await pruebas.eliminarUsuario(nuevoId);
    console.log(`   ✅ Usuarios eliminados: ${eliminados}\n`);

    // 5. Ver usuarios después de eliminar
    console.log('5️⃣ Usuarios después de eliminar:');
    usuarios = await pruebas.verUsuarios();
    usuarios.forEach((u) => {
      console.log(`   ${u.id}: ${u.usuario} (${u.rol})`);
    });
    console.log(`   Total: ${usuarios.length} usuarios\n`);

    console.log('🎉 PRUEBAS COMPLETADAS EXITOSAMENTE');
  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
  } finally {
    pruebas.cerrar();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  hacerPruebas();
}

module.exports = PruebasUsuarios;
