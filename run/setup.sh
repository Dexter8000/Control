#!/bin/bash

# Actualizar pip
python -m pip install --upgrade pip

# Instalar dependencias de Python
pip install flask pandas openpyxl peewee

# Instalar dependencias de Node.js
echo "Instalando dependencias de Node.js..."
npm install

echo "Configuración completada exitosamente!"
