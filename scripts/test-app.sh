#!/bin/bash

echo "Testando aplicação empacotada..."
xattr -cr dist/mac/Ebers.app

# Executar em background e capturar PID
dist/mac/Ebers.app/Contents/MacOS/Ebers > /tmp/ebers-test.log 2>&1 &
APP_PID=$!

echo "Aplicação iniciada (PID: $APP_PID)"
echo "Aguardando 8 segundos..."
sleep 8

echo ""
echo "=== LOGS ==="
cat /tmp/ebers-test.log
echo ""

# Matar o processo
kill $APP_PID 2>/dev/null || true
sleep 1
kill -9 $APP_PID 2>/dev/null || true

echo "Teste concluído"
