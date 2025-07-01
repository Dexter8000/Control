const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os'); // <--- Importante

// --- Funciones de Ayuda ---

function runCommand(command, options = {}) {
  const { cwd = process.cwd(), silent = false } = options;
  return new Promise((resolve, reject) => {
    if (!silent) {
      console.log(`\n$ ${command}`);
    }
    const proc = exec(command, { cwd });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    proc.stderr.on('data', (data) => {
      if (!silent) process.stderr.write(data);
      stderr += data.toString();
    });
    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`El comando falló con código ${code}\n${stderr}`));
      }
    });
  });
}

async function findPythonExecutable() {
  const candidates = ['python', 'py', 'python3'];
  for (const candidate of candidates) {
    try {
      await runCommand(`${candidate} --version`, { silent: true });
      console.log(`[OK] Python encontrado como: ${candidate}`);
      return candidate;
    } catch (error) {
      // Ignorar y probar el siguiente
    }
  }
  return null;
}

function ensureSyncScriptExists() {
  const syncScriptPath = path.join(__dirname, 'sync', 'sync_to_duckdb.py');
  const logFilePath = path.join(__dirname, 'sync', 'sync-db.log');
  console.log('[INFO] Generando script de sincronización de Python...');

  const syncScriptDir = path.dirname(syncScriptPath);
  if (!fs.existsSync(syncScriptDir)) {
    fs.mkdirSync(syncScriptDir, { recursive: true });
  }

  const escapedLogPath = logFilePath.replace(/\\/g, '\\\\');

  const pythonScriptLines = [
    '# -*- coding: utf-8 -*-',
    'import duckdb',
    'import sqlite3',
    'import pandas as pd',
    'from pathlib import Path',
    'import sys',
    'import os',
    'from datetime import datetime',
    '',
    '# --- Configuración de Logging ---',
    `LOG_FILE_PATH = r'${escapedLogPath}'`,
    '',
    'if os.path.exists(LOG_FILE_PATH):',
    '    os.remove(LOG_FILE_PATH)',
    '',
    'def write_log(message):',
    '    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")',
    '    log_line = f"[{timestamp}] {message}\\n"',
    '    with open(LOG_FILE_PATH, "a", encoding="utf-8") as f:',
    '        f.write(log_line)',
    '',
    '# --- Configuración de DB ---',
    'BASE_DIR = Path(__file__).resolve().parent.parent.parent',
    "SQLITE_DB = str(BASE_DIR / 'attached_assets' / 'kilo.db')",
    "DUCKDB_DB = str(BASE_DIR / 'attached_assets' / 'analytics.db')",
    '',
    'def sync_table(sqlite_conn, duckdb_conn, table_name):',
    '    write_log(f"[+] Sincronizando tabla: {table_name}")',
    '    try:',
    '        df = pd.read_sql_query(f"SELECT * FROM {table_name}", sqlite_conn)',
    '        if df.empty:',
    '            write_log(f"  [!] Tabla \'{table_name}\' está vacía. Omitiendo.")',
    '            return 0',
    '        ',
    '        duckdb_conn.register("temp_df", df)',
    '        duckdb_conn.execute(f"CREATE OR REPLACE TABLE {table_name} AS SELECT * FROM temp_df")',
    '        write_log(f"  [OK] Tabla \'{table_name}\' sincronizada con {len(df)} registros.")',
    '        return len(df)',
    '    except Exception as e:',
    '        write_log(f"  [ERROR] Al sincronizar tabla \'{table_name}\': {e}")',
    '        return 0',
    '',
    'def get_all_tables(conn):',
    '    cursor = conn.cursor()',
    '    cursor.execute("SELECT name FROM sqlite_master WHERE type=\'table\' AND name NOT LIKE \'sqlite_%\'")',
    '    tables = [table[0] for table in cursor.fetchall()]',
    '    write_log(f"  [INFO] Tablas encontradas en SQLite: {tables}")',
    '    return tables',
    '',
    'def main():',
    '    write_log("--- Inicio de Sincronización ---")',
    '    write_log(f"    Origen (SQLite): {SQLITE_DB}")',
    '    write_log(f"    Destino (DuckDB): {DUCKDB_DB}")',
    '',
    '    if not os.path.exists(SQLITE_DB):',
    '        write_log(f"[FATAL] El archivo de base de datos de origen no existe: {SQLITE_DB}")',
    '        sys.exit(1)',
    '',
    '    try:',
    '        sqlite_conn = sqlite3.connect(SQLITE_DB)',
    '        duckdb_conn = duckdb.connect(database=DUCKDB_DB, read_only=False)',
    '        write_log("[OK] Conexiones a bases de datos establecidas.")',
    '    except Exception as e:',
    '        write_log(f"[FATAL] No se pudo conectar a las bases de datos: {e}")',
    '        sys.exit(1)',
    '',
    '    tables_to_sync = get_all_tables(sqlite_conn)',
    '    if not tables_to_sync:',
    '        write_log("[WARN] No se encontraron tablas para sincronizar. Finalizando.")',
    '    else:',
    '        total_records = 0',
    '        for table in tables_to_sync:',
    '            total_records += sync_table(sqlite_conn, duckdb_conn, table)',
    '        write_log(f"Total de registros sincronizados: {total_records}")',
    '',
    '    sqlite_conn.close()',
    '    duckdb_conn.close()',
    '    write_log("[OK] Conexiones cerradas.")',
    '',
    'if __name__ == "__main__":',
    '    main()',
  ];

  // CORRECCIÓN: Usar el salto de línea del sistema operativo (os.EOL)
  const pythonScript = pythonScriptLines.join(os.EOL);

  fs.writeFileSync(syncScriptPath, pythonScript, 'utf-8');
  console.log(`[OK] Script de sincronización guardado en: ${syncScriptPath}`);
  return syncScriptPath;
}

// --- Proceso Principal ---

async function syncDatabases() {
  try {
    console.log('[INFO] Iniciando proceso de sincronización de bases de datos...');

    const python = await findPythonExecutable();
    if (!python) {
      throw new Error('No se pudo encontrar una instalación de Python en el PATH. Asegúrate de que esté instalado y accesible.');
    }

    const syncScriptPath = ensureSyncScriptExists();

    console.log('\\n[INFO] Verificando dependencias de Python...');
    try {
      await runCommand(`${python} -c "import duckdb; import pandas"`, { silent: true });
      console.log('[OK] Dependencias de Python ya están instaladas.');
    } catch (error) {
      console.log('[INFO] Dependencias no encontradas. Instalando duckdb y pandas...');
      await runCommand(`${python} -m pip install duckdb pandas`);
      console.log('[OK] Dependencias instaladas correctamente.');
    }

    console.log('\\n[INFO] Ejecutando el script de sincronización de Python...');
    await runCommand(`${python} "${syncScriptPath}"`);
    console.log('[INFO] Script de Python ejecutado. Revisa sync-db.log para ver los detalles.');

    console.log('\\n[SUCCESS] Proceso de sincronización finalizado.');
  } catch (error) {
    console.error('\\n[FATAL] Error durante el proceso de sincronización:');
    console.error(error.message);
    process.exit(1);
  }
}

syncDatabases();