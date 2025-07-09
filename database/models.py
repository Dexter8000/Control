import datetime
from peewee import (
    Model,
    CharField,
    TextField,
    IntegerField,
    DateField,
    DateTimeField,
    BooleanField,
    ForeignKeyField,
)

from .db_config import db


class BaseModel(Model):
    class Meta:
        database = db
        legacy_table_names = False


class Departamento(BaseModel):
    nombre = TextField(unique=True)

    class Meta:
        table_name = "departamentos"


class Empleado(BaseModel):
    placa = CharField(null=True)
    rango = CharField(null=True)
    nombre = CharField(null=True)
    apellido = CharField(null=True)
    departamento = ForeignKeyField(
        Departamento, backref="empleados", column_name="departamento_id", null=True
    )
    correo_electronico = CharField(null=True)
    cedula = CharField(null=True)
    telefono = CharField(null=True)
    fecha_nacimiento = DateField(null=True)
    jefe_inmediato = CharField(null=True)
    tel_jefe = CharField(null=True)
    fecha_creacion = DateTimeField(null=True)
    ubicacion_especifica = CharField(null=True)

    class Meta:
        table_name = "empleados"


class InventarioGeneralActivo(BaseModel):
    serie = CharField(unique=True)
    nombre = CharField()
    marca = CharField(null=True)
    modelo = CharField(null=True)
    categoria = CharField(null=True)
    subcategoria = CharField(null=True)
    estado = CharField(default="operativo", null=True)
    condicion = CharField(default="nuevo", null=True)
    tipo_adquisicion = CharField(null=True)
    departamento_asignado = ForeignKeyField(
        Departamento,
        backref="inventario",
        column_name="departamento_asignado",
        null=True,
    )
    ubicacion_especifica = CharField(null=True)
    responsable_actual = ForeignKeyField(
        Empleado, backref="equipos", column_name="responsable_actual", null=True
    )
    fecha_creacion = DateTimeField(null=True)
    fecha_adquisicion = DateField(null=True)
    detalles = TextField(null=True)
    garantia_hasta = DateField(null=True)
    id_inventario_principal = IntegerField(null=True)
    fecha_asignacion = DateTimeField(null=True)

    class Meta:
        table_name = "inventario_general_activos"


class Usuario(BaseModel):
    nombre_usuario = CharField(unique=True)
    contrasena = CharField()
    nombre_completo = CharField(null=True)
    correo = CharField(null=True)
    rol = CharField(null=True)
    fecha_creacion = DateTimeField(null=True)

    class Meta:
        table_name = "usuarios"


class Sesion(BaseModel):
    usuario = ForeignKeyField(Usuario, backref="sesiones", column_name="usuario_id")
    session_token = CharField(unique=True)
    ip_address = CharField(null=True)
    user_agent = TextField(null=True)
    fecha_creacion = DateTimeField(default=datetime.datetime.now)
    fecha_expiracion = DateTimeField()
    activa = BooleanField(default=True)

    class Meta:
        table_name = "sesiones"


class Prestamo(BaseModel):
    numero_prestamo = TextField(unique=True)
    fecha_prestamo = DateTimeField()
    empleado = ForeignKeyField(
        Empleado, backref="prestamos_recibidos", column_name="empleado_id"
    )
    responsable_entrega = ForeignKeyField(
        Empleado,
        backref="prestamos_entregados",
        column_name="responsable_entrega_id",
    )
    tipo_prestamo = TextField()
    detalle_tipo_prestamo = TextField(null=True)
    estado = TextField(default="activo")

    class Meta:
        table_name = "prestamos"


class DetallePrestamoEquipos(BaseModel):
    prestamo = ForeignKeyField(
        Prestamo, backref="detalles", column_name="prestamo_id"
    )
    equipo = ForeignKeyField(
        InventarioGeneralActivo,
        backref="prestamos",
        column_name="equipo_id",
    )
    numero_chip = TextField(null=True)

    class Meta:
        table_name = "detalle_prestamo_equipos"


