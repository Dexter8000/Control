import os
from peewee import SqliteDatabase

# Ruta absoluta a la base de datos SQLite existente
DB_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), '..', 'attached_assets', 'kilo.db')
)

# Conexion a la base de datos con soporte de claves foraneas
# El pragma 'foreign_keys' garantiza la verificacion de integridad
# desde que se abre la conexion.
db = SqliteDatabase(DB_PATH, pragmas={"foreign_keys": 1})

__all__ = ["db", "DB_PATH"]

