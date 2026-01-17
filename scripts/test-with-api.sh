#!/bin/bash

echo "Iniciando aplicação e testando API..."
xattr -cr dist/mac/Ebers.app

# Executar em background
dist/mac/Ebers.app/Contents/MacOS/Ebers > /tmp/ebers-full.log 2>&1 &
APP_PID=$!

echo "Aplicação iniciada (PID: $APP_PID)"
echo "Aguardando 10 segundos para inicialização..."
sleep 10

echo ""
echo "Testando API..."
curl -s http://localhost:3000/api/patients/ 2>&1

echo ""
echo ""
echo "=== ÚLTIMAS 100 LINHAS DOS LOGS ==="
tail -100 /tmp/ebers-full.log

# Matar o processo
kill $APP_PID 2>/dev/null || true
sleep 1
kill -9 $APP_PID 2>/dev/null || true

echo ""
echo "Teste concluído"
