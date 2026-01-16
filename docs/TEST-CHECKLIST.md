# Checklist de Testes - Sistema de Distribuição

Use este checklist para validar a implementação antes de fazer commit.

## ✅ Testes Básicos

### 1. Geração de Ícones
```bash
npm run generate:icons
```

**Verificar:**
- [ ] Script executa sem erros
- [ ] Ícones criados em `public/icons/`
- [ ] Todos os tamanhos gerados (16, 32, 48, 64, 128, 256, 512, 1024)
- [ ] Ícones especiais criados (icon-for-icns.png, icon-for-ico.png)
- [ ] Favicons criados em `public/`
- [ ] Arquivo `site.webmanifest` criado
- [ ] Ícones exibem símbolo Ψ (PSY)

### 2. Preparação de Build
```bash
npm run prepare:build
```

**Verificar:**
- [ ] Script executa sem erros
- [ ] Verifica existência de migrations
- [ ] Verifica ícones
- [ ] Compila TypeScript do Electron
- [ ] Faz build do Next.js
- [ ] Exibe mensagens de sucesso

### 3. Empacotamento de Teste (Rápido)
```bash
npm run pack
```

**Verificar:**
- [ ] Script executa sem erros
- [ ] Diretório `dist/` criado
- [ ] Aplicação empacotada criada:
  - macOS: `dist/mac/Ebers.app`
  - Windows: `dist/win-unpacked/Ebers.exe`
  - Linux: `dist/linux-unpacked/ebers`

### 4. Testar Aplicação Empacotada

**macOS:**
```bash
open dist/mac/Ebers.app
```

**Windows:**
```bash
start dist/win-unpacked/Ebers.exe
```

**Linux:**
```bash
./dist/linux-unpacked/ebers
```

**Verificar:**
- [ ] Aplicação inicia sem erros
- [ ] Ícone correto exibido
- [ ] Banco de dados criado automaticamente
- [ ] Migrations executadas
- [ ] Interface carrega corretamente
- [ ] Funcionalidades básicas funcionam

### 5. Verificar Localização do Banco

**macOS:**
```bash
ls -la ~/Library/Application\ Support/Ebers/
```

**Windows:**
```powershell
dir %APPDATA%\Ebers\
```

**Linux:**
```bash
ls -la ~/.config/Ebers/
```

**Verificar:**
- [ ] Diretório criado
- [ ] Arquivo `database.db` existe
- [ ] Arquivo `config.json` existe

### 6. Verificar Migrations

Abrir o banco de dados e verificar:

```bash
# macOS
sqlite3 ~/Library/Application\ Support/Ebers/database.db ".tables"
```

**Verificar:**
- [ ] Tabela `Patient` existe
- [ ] Tabela `Consultation` existe
- [ ] Tabela `__drizzle_migrations` existe
- [ ] Migrations registradas na tabela

## 🔧 Testes Avançados

### 7. Criar Instaladores (Opcional)
```bash
npm run dist:mac    # ou dist:win, dist:linux
```

**Verificar:**
- [ ] Instaladores criados em `dist/`
- [ ] Formatos corretos:
  - macOS: `.dmg` e `.zip`
  - Windows: `.exe` (NSIS) e `.exe` (portable)
  - Linux: `.AppImage` e `.deb`

### 8. Gerar Checksums
```bash
npm run checksums
```

**Verificar:**
- [ ] Arquivo `dist/CHECKSUMS.md` criado
- [ ] Arquivo `dist/checksums.txt` criado
- [ ] Arquivo `dist/verify-checksums.sh` criado
- [ ] Checksums SHA-256 corretos
- [ ] Tamanhos dos arquivos exibidos

### 9. Testar Instalador (Opcional)

**macOS:**
- [ ] Abrir arquivo `.dmg`
- [ ] Arrastar para Applications
- [ ] Executar aplicação
- [ ] Verificar se funciona

**Windows:**
- [ ] Executar instalador `.exe`
- [ ] Seguir wizard de instalação
- [ ] Executar aplicação instalada
- [ ] Verificar se funciona

**Linux:**
- [ ] Tornar AppImage executável
- [ ] Executar AppImage
- [ ] Ou instalar `.deb`
- [ ] Verificar se funciona

## 🧪 Testes de Integração

### 10. Testar Script de Release (Dry Run)

**NÃO execute o comando completo ainda!**

Apenas verifique se o script existe e está correto:

```bash
cat scripts/release.js
```

**Verificar:**
- [ ] Script existe
- [ ] Lógica parece correta
- [ ] Comandos estão corretos

### 11. Verificar Configuração do package.json

```bash
cat package.json | grep -A 50 '"scripts"'
```

**Verificar:**
- [ ] Todos os scripts adicionados
- [ ] Comandos corretos
- [ ] Sem erros de sintaxe

```bash
cat package.json | grep -A 50 '"build"'
```

**Verificar:**
- [ ] Configuração do electron-builder
- [ ] Plataformas configuradas
- [ ] Ícones configurados
- [ ] Arquivos incluídos

### 12. Verificar Documentação

**Verificar:**
- [ ] `docs/BUILD.md` existe e está completo
- [ ] `docs/DISTRIBUTION.md` existe e está completo
- [ ] `docs/QUICK-START.md` existe e está completo
- [ ] `docs/CI-CD.md` existe e está completo
- [ ] `docs/SUMMARY.md` existe e está completo
- [ ] `CHANGELOG.md` existe
- [ ] `README.md` atualizado

## 🐛 Testes de Problemas Comuns

### 13. Testar Sem Migrations

```bash
# Renomear diretório de migrations temporariamente
mv drizzle drizzle.bak

# Tentar preparar build
npm run prepare:build

# Deve falhar com mensagem clara
# Restaurar migrations
mv drizzle.bak drizzle
```

**Verificar:**
- [ ] Script detecta falta de migrations
- [ ] Mensagem de erro clara
- [ ] Sugere executar `npm run db:generate`

### 14. Testar Sem Ícones

```bash
# Remover ícones temporariamente
rm -rf public/icons/*.png

# Tentar preparar build
npm run prepare:build

# Deve gerar ícones automaticamente
```

**Verificar:**
- [ ] Script detecta falta de ícones
- [ ] Gera ícones automaticamente
- [ ] Build continua normalmente

### 15. Limpar e Reconstruir

```bash
# Limpar tudo
rm -rf node_modules .next dist

# Reinstalar
npm install

# Verificar pós-instalação
ls -la ~/Library/Application\ Support/Ebers/  # macOS
```

**Verificar:**
- [ ] Script `postinstall` executado
- [ ] Diretório de dados criado
- [ ] Arquivo de configuração criado

## 📝 Checklist Final

Antes de fazer commit:

- [ ] Todos os testes básicos passaram
- [ ] Aplicação empacotada funciona
- [ ] Banco de dados criado corretamente
- [ ] Migrations executadas
- [ ] Ícones corretos
- [ ] Documentação completa
- [ ] Scripts funcionam
- [ ] Sem erros no console
- [ ] Sem warnings críticos

## 🚀 Testes Opcionais (Recomendados)

- [ ] Testar em máquina limpa (VM)
- [ ] Testar instalador completo
- [ ] Testar em diferentes versões do OS
- [ ] Testar com banco de dados existente
- [ ] Testar migração de versão anterior
- [ ] Testar backup e restauração

## 📊 Resultados

**Data do teste:** _______________

**Plataforma testada:** _______________

**Versão do Node.js:** _______________

**Problemas encontrados:**
- 
- 
- 

**Observações:**
- 
- 
- 

---

## 💡 Dicas

1. **Teste incremental**: Não teste tudo de uma vez
2. **Limpe entre testes**: Use `rm -rf dist` entre builds
3. **Verifique logs**: Sempre leia os logs de erro
4. **Teste em VM**: Ideal para testar instaladores
5. **Documente problemas**: Anote qualquer comportamento estranho

## 🆘 Se algo falhar

1. Verifique os logs de erro
2. Consulte `docs/BUILD.md` seção Troubleshooting
3. Verifique se todas as dependências estão instaladas
4. Tente limpar e reconstruir
5. Verifique versões do Node.js e npm
