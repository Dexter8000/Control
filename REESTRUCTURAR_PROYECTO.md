/*
🧩 Objetivo: Reestructurar este proyecto Node.js para un sistema de préstamos de equipos.

🎯 Tareas que debes realizar:

🔃 REORGANIZACIÓN DE CARPETAS:

Mover todos los archivos relacionados a Express y SQLite a src/

Rutas => src/routes/

Controladores => src/controllers/

Middlewares => src/middlewares/

Modelos => src/models/

Base de datos => src/config/db.js

Servidor => src/server.js

📦 RUTAS:

Asegúrate que las rutas como usuario.routes.js, prestamos.js, etc. estén en src/routes/

Asegúrate de que se exporten como module.exports = router;

📚 ARCHIVOS ESTÁTICOS:

Mover todos los archivos HTML, CSS y JS de interfaz a public/

Los HTML completos a public/partials/

Archivos JS de interfaz a public/js/

Archivos CSS a public/css/

🧪 PRUEBAS:

Mover todo el código de pruebas (*.test.js) a tests/

Si hay mocks, ponerlos en tests/__mocks__/

🛠️ SCRIPTS Y UTILIDADES:

Mover scripts como setup-db.js, verificar-usuario.js, actualizar_password.js, etc. a la carpeta scripts/

Si hay SQL o configuraciones de schema, ponerlas en database/

🔥 LIMPIEZA:

Eliminar archivos .backup, duplicados, scripts innecesarios o comentarlos con // revisar este archivo

Revisar si *.sh o *.bat siguen siendo útiles o deben eliminarse

✅ VERIFICACIÓN:

Verifica que server.js use correctamente las rutas movidas

Asegúrate de que require(...) y path.join(...) usen rutas actualizadas

📁 Resultado esperado:

Control/
├── public/
│   ├── css/
│   ├── js/
│   ├── inventario/
│   └── partials/
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middlewares/
│   ├── models/
│   ├── modules/
│   ├── routes/
│   └── server.js
├── scripts/
├── tests/
├── database/
├── attached_assets/
├── .env, package.json, README.md, etc.

🛑 NOTA ESPECIAL SOBRE LA BASE DE DATOS

❗ Los archivos .sql y .db deben dejarse tal como están.

Por lo tanto:

NO los modifiques automáticamente.

SOLO muévelos a database/ si no están allí.

NO intentes abrir, analizar ni ejecutar .db ni .sql desde el script.

SOLO deja comentarios tipo // REVISAR: si encuentras:

kilo.db

*.sql como schema.sql

setup-db.js, verify-db.js

🔐 Estos archivos serán revisados manualmente luego.

Haz los cambios de forma incremental y deja comentarios // MOVIDO: o // REVISAR: en los archivos que necesiten revisión humana.
*/

