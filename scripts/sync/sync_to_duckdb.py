# -*- coding: utf-8 -*-
import duckdb
import sqlite3
import pandas as pd
from pathlib import Path
import sys
import os
from datetime import datetime

# --- Configuración de Logging ---
LOG_FILE_PATH = r'C:\\Users\\Dexter\\Control\\scripts\\sync\\sync-db.log'

if os.path.exists(LOG_FILE_PATH):
    os.remove(LOG_FILE_PATH)

def write_log(message):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_line = f"[{timestamp}] {message}\n"
    with open(LOG_FILE_PATH, "a", encoding="utf-8") as f:
        f.write(log_line)

# --- Configuración de DB ---
BASE_DIR = Path(__file__).resolve().parent.parent.parent
SQLITE_DB = str(BASE_DIR / 'attached_assets' / 'kilo.db')
DUCKDB_DB = str(BASE_DIR / 'attached_assets' / 'analytics.db')

def sync_table(sqlite_conn, duckdb_conn, table_name):
    write_log(f"[+] Sincronizando tabla: {table_name}")
    try:
        df = pd.read_sql_query(f"SELECT * FROM {table_name}", sqlite_conn)
        if df.empty:
            write_log(f"  [!] Tabla '{table_name}' está vacía. Omitiendo.")
            return 0
        
        duckdb_conn.register("temp_df", df)
        duckdb_conn.execute(f"DELETE FROM {table_name}")
        duckdb_conn.execute(f"INSERT INTO {table_name} SELECT * FROM temp_df")
        write_log(f"  [OK] Tabla '{table_name}' sincronizada con {len(df)} registros.")
        return len(df)
    except Exception as e:
        write_log(f"  [ERROR] Al sincronizar tabla '{table_name}': {e}")
        return 0

def get_all_tables(conn):
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    tables = [table[0] for table in cursor.fetchall()]
    write_log(f"  [INFO] Tablas encontradas en SQLite: {tables}")
    return tables

def main():
    write_log("--- Inicio de Sincronización ---")
    write_log(f"    Origen (SQLite): {SQLITE_DB}")
    write_log(f"    Destino (DuckDB): {DUCKDB_DB}")

    if not os.path.exists(SQLITE_DB):
        write_log(f"[FATAL] El archivo de base de datos de origen no existe: {SQLITE_DB}")
        sys.exit(1)

    try:
        sqlite_conn = sqlite3.connect(SQLITE_DB)
        duckdb_conn = duckdb.connect(database=DUCKDB_DB, read_only=False)
        write_log("[OK] Conexiones a bases de datos establecidas.")
    except Exception as e:
        write_log(f"[FATAL] No se pudo conectar a las bases de datos: {e}")
        sys.exit(1)

    tables_to_sync = get_all_tables(sqlite_conn)
    if not tables_to_sync:
        write_log("[WARN] No se encontraron tablas para sincronizar. Finalizando.")
    else:
        total_records = 0
        for table in tables_to_sync:
            total_records += sync_table(sqlite_conn, duckdb_conn, table)
        write_log(f"Total de registros sincronizados: {total_records}")

    sqlite_conn.close()
    duckdb_conn.close()
    write_log("[OK] Conexiones cerradas.")

if __name__ == "__main__":
    main()