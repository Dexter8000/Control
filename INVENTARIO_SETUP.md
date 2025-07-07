# Configuración del Sistema de Inventario

## Requisitos del Sistema

- Node.js v14.18.0 o superior (Actual: v22.16.0)
- npm (viene con Node.js)

## Dependencias Instaladas

### Principales

- `superagent`: ^9.0.0 (Cliente HTTP para Node.js)

## Estructura de Base de Datos

### Tabla: `inventario_principal`

```sql
CREATE TABLE inventario_principal (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    marca TEXT,
    modelo TEXT,
    serie TEXT UNIQUE NOT NULL,
    categoria TEXT,
    subcategoria TEXT,
    estado TEXT,
    condicion TEXT,
    tipo_adquisicion TEXT,
    id_departamento INTEGER,
    ubicacion_especifica TEXT,
    responsable_actual INTEGER,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_adquisicion DATE,
    valor_compra DECIMAL(10,2),
    proveedor TEXT,
    garantia_hasta DATE,
    detalles TEXT,
    especificaciones_tecnicas JSON
);
```

### Tabla: `perifericos`

```sql
CREATE TABLE perifericos (
    id_periferico INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre_periferico TEXT NOT NULL,
    marca_periferico TEXT,
    modelo_periferico TEXT,
    serie_periferico TEXT UNIQUE NOT NULL,
    estado_periferico TEXT,
    condicion_periferico TEXT,
    tipo_adquisicion_periferico TEXT,
    id_departamento_asignado INTEGER,
    ubicacion_especifica_periferico TEXT,
    responsable_actual INTEGER,
    fecha_creacion_periferico TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_adquisicion_periferico DATE,
    fecha_asignacion DATE,
    detalles_periferico TEXT,
    id_inventario_principal INTEGER,
    especificaciones_tecnicas JSON,
    FOREIGN KEY (id_inventario_principal) REFERENCES inventario_principal(id)
);
```

## Configuración Inicial

1. Instalar dependencias:

```bash
npm install superagent@latest
```

2. Crear archivo de configuración `.env` en la raíz del proyecto:

   ```env
   # Configuración de Base de Datos
    DB_PATH=./attached_assets/kilo.db

   # Configuración del Servidor
   PORT=3000
   NODE_ENV=development
   ```

## Scripts Útiles

### Para crear las tablas:

```bash
node scripts/setup-db.js
```

### Para iniciar el servidor de desarrollo:

```bash
npm run dev
```

## Notas de Actualización

### 2025-07-01

- Actualizado superagent a la versión 9.0.0+
- Configurada la estructura inicial de la base de datos
