"""Verificador de integridad referencial para kilo.db."""

import os
import sys

# Permite ejecutar el script directamente sin paquete
sys.path.append(os.path.dirname(__file__))

from db_config import db


def verificar_integridad():
    """Ejecuta PRAGMA foreign_key_check e imprime los errores."""
    with db:
        cursor = db.execute_sql("PRAGMA foreign_key_check")
        resultados = cursor.fetchall()

    if not resultados:
        print("\u2705 No se encontraron violaciones de claves for\u00e1neas.")
        return

    print("\u274C Violaciones de integridad referencial encontradas:")
    for tabla, fila_id, tabla_padre, clave in resultados:
        print(f"- Tabla: {tabla}, Fila ID: {fila_id}, Referencia: {tabla_padre}, Columna: {clave}")

    print("\nPosibles causas:")
    print("- \u00bfReferencia a id inexistente?")
    print("- \u00bfFalta insertar primero la tabla padre?")
    print("- \u00bfTipo de dato incompatible?")


if __name__ == "__main__":
    verificar_integridad()

