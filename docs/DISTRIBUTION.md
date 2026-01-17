# Guia de Distribuição - Ebers

Este documento descreve o processo completo de distribuição da aplicação Ebers.

## 🎯 Visão Geral

A aplicação Ebers é distribuída como uma aplicação desktop usando Electron, com as seguintes características:

- **Execução local**: Não requer conexão com internet ou servidor externo
- **Banco de dados local**: SQLite armazenado na pasta de dados do usuário
- **Auto-suficiente**: Inclui servidor Next.js embutido
- **Multiplataforma**: Suporta macOS, Windows e Linux

## 📦 Processo de Release

### Método Automatizado (Recomendado)

Use o script de release que automatiza todo o processo:

```bash
npm run release 1.0.0
```

Este comando irá:
1. ✅ Executar todos os testes
2. 🗄️ Gerar migrations do banco de dados
3. 📝 Atualizar a versão no package.json
4. 🎨 Gerar ícones
5. 🏗️ Fazer build do Next.js e Electron
6. 📦 Criar instaladores para a plataforma atual
7. 💾 Fazer commit das alterações
8. 🏷️ Criar tag Git

Após a conclusão, você pode publicar com:

```bash
git push
git push --tags
```

### Método Manual

Se preferir fazer o processo manualmente:

```bash
# 1. Executar testes
npm test

# 2. Gerar migrations
npm run db:generate

# 3. Atualizar versão no package.json manualmente

# 4. Preparar build
npm run prepare:build

# 5. Criar instaladores
npm run dist:mac    # ou dist:win, dist:linux

# 6. Commit e tag
git add .
git commit -m "chore(release): bump version to 1.0.0"
git tag -a v1.0.0 -m "Release v1.0.0"
git push && git push --tags
```

## 🖥️ Plataformas Suportadas

### macOS

**Requisitos mínimos:**
- macOS 10.13 (High Sierra) ou superior
- 200 MB de espaço em disco

**Formatos disponíveis:**
- `.dmg` - Instalador com interface drag-and-drop
- `.zip` - Arquivo compactado da aplicação

**Arquiteturas:**
- Intel (x64)
- Apple Silicon (arm64)

**Instalação:**
1. Baixar o arquivo `.dmg`
2. Abrir o arquivo
3. Arrastar o ícone do Ebers para a pasta Applications
4. Ejetar o volume do instalador

**Primeira execução:**
- Se aparecer aviso de segurança, clique com botão direito e selecione "Abrir"

### Windows

**Requisitos mínimos:**
- Windows 7 ou superior
- 200 MB de espaço em disco

**Formatos disponíveis:**
- `.exe` (NSIS) - Instalador tradicional
- `.exe` (Portable) - Versão portátil sem instalação

**Arquiteturas:**
- 64-bit (x64)
- 32-bit (ia32)

**Instalação (NSIS):**
1. Baixar o arquivo `Ebers Setup X.X.X.exe`
2. Executar o instalador
3. Seguir as instruções na tela
4. Escolher pasta de instalação (opcional)
5. Criar atalhos (opcional)

**Versão Portátil:**
1. Baixar o arquivo `Ebers X.X.X.exe`
2. Executar diretamente (não requer instalação)
3. Dados serão salvos em `%APPDATA%/Ebers`

### Linux

**Requisitos mínimos:**
- Distribuição Linux moderna (Ubuntu 18.04+, Fedora 30+, etc.)
- 200 MB de espaço em disco

**Formatos disponíveis:**
- `.AppImage` - Executável portátil universal
- `.deb` - Pacote para Debian/Ubuntu

**Arquitetura:**
- 64-bit (x64)

**Instalação (AppImage):**
```bash
# Baixar o arquivo
wget https://example.com/Ebers-X.X.X.AppImage

# Tornar executável
chmod +x Ebers-X.X.X.AppImage

# Executar
./Ebers-X.X.X.AppImage
```

**Instalação (DEB):**
```bash
# Baixar o arquivo
wget https://example.com/ebers_X.X.X_amd64.deb

# Instalar
sudo dpkg -i ebers_X.X.X_amd64.deb

# Resolver dependências (se necessário)
sudo apt-get install -f
```

## 🗄️ Gerenciamento de Dados

### Localização do Banco de Dados

O banco de dados é criado automaticamente na primeira execução:

| Plataforma | Localização |
|------------|-------------|
| macOS | `~/Library/Application Support/Ebers/database.db` |
| Windows | `%APPDATA%\Ebers\database.db` |
| Linux | `~/.config/Ebers/database.db` |

### Backup e Restauração

**Criar Backup:**
1. Abrir a aplicação
2. Ir para Configurações > Backup
3. Clicar em "Criar Backup"
4. Escolher pasta de destino
5. Arquivo será salvo como `ebers-YYYYMMDDTHHMMSS.db`

**Restaurar Backup:**
1. Fechar a aplicação
2. Localizar o arquivo do banco de dados
3. Substituir pelo arquivo de backup
4. Reiniciar a aplicação

### Migração entre Computadores

Para transferir dados entre computadores:

1. **No computador antigo:**
   - Criar backup do banco de dados
   - Copiar arquivo de backup para pendrive/nuvem

2. **No computador novo:**
   - Instalar a aplicação
   - Executar uma vez para criar estrutura de pastas
   - Fechar a aplicação
   - Copiar arquivo de backup para a localização do banco
   - Renomear para `database.db`
   - Reiniciar a aplicação

## 🔄 Atualizações

### Atualização Manual

1. Baixar nova versão
2. Criar backup dos dados
3. Instalar nova versão (sobrescreverá a antiga)
4. Abrir aplicação
5. Migrations serão aplicadas automaticamente

### Verificação de Versão

A versão atual pode ser verificada em:
- Menu: Ajuda > Sobre o Ebers
- Ou no arquivo `package.json` dentro da aplicação

## 🐛 Solução de Problemas

### Aplicação não inicia

**macOS:**
```bash
# Remover quarentena
xattr -cr /Applications/Ebers.app

# Verificar permissões
ls -la /Applications/Ebers.app
```

**Windows:**
- Executar como Administrador
- Verificar se antivírus não está bloqueando
- Verificar logs em `%APPDATA%\Ebers\logs`

**Linux:**
```bash
# Verificar permissões do AppImage
chmod +x Ebers-X.X.X.AppImage

# Instalar dependências faltantes
sudo apt-get install libgtk-3-0 libnotify4 libnss3 libxss1
```

### Banco de dados corrompido

1. Fechar a aplicação
2. Renomear banco atual: `database.db` → `database.db.old`
3. Restaurar backup mais recente
4. Se não houver backup, a aplicação criará novo banco vazio

### Erro de migrations

Se houver erro ao aplicar migrations:

1. Verificar logs da aplicação
2. Fazer backup do banco atual
3. Tentar restaurar backup anterior
4. Se persistir, contatar suporte

## 📊 Estatísticas de Build

Tamanhos aproximados dos instaladores:

| Plataforma | Formato | Tamanho |
|------------|---------|---------|
| macOS | DMG | ~150 MB |
| macOS | ZIP | ~140 MB |
| Windows | NSIS | ~130 MB |
| Windows | Portable | ~130 MB |
| Linux | AppImage | ~140 MB |
| Linux | DEB | ~130 MB |

## 🔐 Segurança

### Assinatura de Código

Para builds de produção, é recomendado assinar o código:

**macOS:**
- Requer Apple Developer Account ($99/ano)
- Certificado Developer ID Application
- Notarização via Apple

**Windows:**
- Requer certificado de Code Signing
- Pode ser obtido de CAs como DigiCert, Sectigo, etc.
- Custo: ~$100-400/ano

### Verificação de Integridade

Após o build, gere checksums:

```bash
# macOS/Linux
shasum -a 256 dist/*.dmg > checksums.txt
shasum -a 256 dist/*.AppImage >> checksums.txt

# Windows (PowerShell)
Get-FileHash dist\*.exe -Algorithm SHA256 > checksums.txt
```

Publique os checksums junto com os instaladores.

## 📝 Checklist de Release

Antes de publicar uma release:

- [ ] Todos os testes passando
- [ ] Migrations geradas e testadas
- [ ] Versão atualizada em package.json
- [ ] CHANGELOG.md atualizado
- [ ] Build testado em todas as plataformas
- [ ] Instaladores testados em máquinas limpas
- [ ] Backup/restauração testado
- [ ] Documentação atualizada
- [ ] Screenshots atualizados (se necessário)
- [ ] Tag Git criada
- [ ] Release notes preparadas

## 🚀 Publicação

### GitHub Releases

1. Ir para repositório no GitHub
2. Clicar em "Releases" > "Draft a new release"
3. Escolher a tag (v1.0.0)
4. Adicionar título: "Ebers v1.0.0"
5. Adicionar descrição (release notes)
6. Fazer upload dos instaladores
7. Fazer upload do arquivo checksums.txt
8. Marcar como "Latest release"
9. Publicar

### Website/Servidor

Se hospedar em servidor próprio:

```bash
# Estrutura de diretórios
releases/
├── v1.0.0/
│   ├── Ebers-1.0.0.dmg
│   ├── Ebers-1.0.0-mac.zip
│   ├── Ebers-Setup-1.0.0.exe
│   ├── Ebers-1.0.0.exe
│   ├── Ebers-1.0.0.AppImage
│   ├── ebers_1.0.0_amd64.deb
│   └── checksums.txt
└── latest/
    └── (links simbólicos para versão mais recente)
```

## 📞 Suporte

Para problemas com distribuição ou instalação:

- Verificar documentação em `docs/`
- Abrir issue no GitHub
- Contatar suporte técnico

## 📚 Recursos Adicionais

- [Documentação do electron-builder](https://www.electron.build/)
- [Guia de Assinatura de Código - macOS](https://developer.apple.com/support/code-signing/)
- [Guia de Assinatura de Código - Windows](https://docs.microsoft.com/en-us/windows/win32/seccrypto/cryptography-tools)
