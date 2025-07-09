@echo off
echo Actualizando pip...
python -m pip install --upgrade pip

echo Instalando dependencias de Python...
pip install flask pandas openpyxl peewee

echo Instalando dependencias de Node.js...
call npm install

echo Configuración completada exitosamente!
pause
