#!/bin/bash

xattr -cr dist/mac/Ebers.app
echo "Iniciando aplicação..."
dist/mac/Ebers.app/Contents/MacOS/Ebers &
PID=$!
echo "PID: $PID"
sleep 5
echo "Verificando se está rodando..."
ps -p $PID > /dev/null && echo "✓ Aplicação está rodando!" || echo "✗ Aplicação não está rodando"
echo ""
echo "Pressione Ctrl+C para encerrar"
wait $PID
