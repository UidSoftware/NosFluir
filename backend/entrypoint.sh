#!/bin/bash
# entrypoint.sh — Nos Studio Fluir
# Executa migrations, coleta estáticos e inicia o servidor

set -e

echo "⏳ Aguardando banco de dados..."
until python -c "
import os, psycopg2
try:
    psycopg2.connect(
        dbname=os.environ['DB_NAME'],
        user=os.environ['DB_USER'],
        password=os.environ['DB_PASSWORD'],
        host=os.environ.get('DB_HOST', 'db'),
        port=os.environ.get('DB_PORT', '5432'),
    )
    print('✅ Banco disponível')
except Exception as e:
    print(f'⏳ Aguardando: {e}')
    exit(1)
"; do
  sleep 2
done

echo "🔍 Verificando configuração Django..."
python manage.py check

echo "🗄️  Criando migrations por app..."
python manage.py makemigrations usuarios --noinput
python manage.py makemigrations financeiro operacional tecnico --noinput

echo "🗄️  Migrando usuarios primeiro..."
python manage.py migrate usuarios --noinput

echo "🗄️  Executando demais migrations..."
python manage.py migrate --noinput

echo "📦 Coletando arquivos estáticos..."
python manage.py collectstatic --noinput

echo "🚀 Iniciando Gunicorn (3 workers)..."
exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 3 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -
