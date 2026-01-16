#!/bin/bash

# Script para debug da aplicação empacotada no macOS

echo "=== Ebers - Debug da Aplicação Empacotada ==="
echo ""

# Verificar se a aplicação existe
if [ ! -d "dist/mac/Ebers.app" ]; then
  echo "❌ Aplicação não encontrada em dist/mac/Ebers.app"
  echo "Execute primeiro: npm run pack:mac"
  exit 1
fi

echo "✓ Aplicação encontrada"
echo ""

# Remover quarentena do macOS
echo "Removendo quarentena do macOS..."
xattr -cr dist/mac/Ebers.app
echo "✓ Quarentena removida"
echo ""

# Executar a aplicação com logs
echo "Iniciando aplicação com logs..."
echo "Pressione Ctrl+C para sair"
echo ""
echo "=== LOGS DA APLICAÇÃO ==="
echo ""

# Executar e mostrar logs
dist/mac/Ebers.app/Contents/MacOS/Ebers 2>&1

echo ""
echo "=== Aplicação encerrada ==="
