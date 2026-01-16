# Guia Rápido - Empacotamento e Distribuição

Este guia fornece comandos rápidos para empacotar e distribuir a aplicação Ebers.

## 🚀 Início Rápido

### 1. Preparar o Ambiente

```bash
# Instalar dependências
npm install

# Gerar migrations do banco de dados
npm run db:generate
```

### 2. Testar Localmente

```bash
# Executar em modo desenvolvimento
npm run electron:dev
```

### 3. Criar Build de Teste (Rápido)

```bash
# Criar build sem instalador (mais rápido para testes)
npm run pack
```

Os arquivos estarão em:
- macOS: `dist/mac/Ebers.app`
- Windows: `dist/win-unpacked/Ebers.exe`
- Linux: `dist/linux-unpacked/ebers`

### 4. Criar Instaladores

```bash
# Para a plataforma atual
npm run dist

# Ou específico para cada plataforma
npm run dist:mac     # macOS
npm run dist:win     # Windows
npm run dist:linux   # Linux
```

### 5. Gerar Checksums

```bash
npm run checksums
```

## 📦 Release Completa (Automatizada)

Para criar uma release completa com testes, build e tag Git:

```bash
npm run release 1.0.0
```

Depois publique:

```bash
git push
git push --tags
```

## 🎨 Apenas Gerar Ícones

```bash
npm run generate:icons
```

## 🗄️ Apenas Gerar Migrations

```bash
npm run db:generate
```

## 🧪 Executar Testes

```bash
# Todos os testes
npm test

# Modo watch
npm test:watch

# Com coverage
npm test:coverage
```

## 📊 Estrutura de Comandos

```
Desenvolvimento:
├── npm run dev              → Next.js dev server
├── npm run electron:dev     → Electron + Next.js dev
└── npm test                 → Executar testes

Build:
├── npm run build            → Build Next.js
├── npm run build:electron   → Compilar TypeScript do Electron
└── npm run prepare:build    → Preparar tudo para build

Empacotamento (sem instalador):
├── npm run pack             → Plataforma atual
├── npm run pack:mac         → macOS
├── npm run pack:win         → Windows
└── npm run pack:linux       → Linux

Distribuição (com instalador):
├── npm run dist             → Plataforma atual
├── npm run dist:mac         → macOS (.dmg + .zip)
├── npm run dist:win         → Windows (.exe + portable)
└── npm run dist:linux       → Linux (.AppImage + .deb)

Utilitários:
├── npm run generate:icons   → Gerar ícones
├── npm run checksums        → Gerar checksums
└── npm run release <ver>    → Release automatizada

Banco de Dados:
├── npm run db:generate      → Gerar migrations
├── npm run db:migrate       → Aplicar migrations
└── npm run db:studio        → Abrir Drizzle Studio
```

## 🎯 Fluxo de Trabalho Recomendado

### Para Desenvolvimento

```bash
# 1. Instalar dependências
npm install

# 2. Gerar migrations
npm run db:generate

# 3. Executar em dev
npm run electron:dev
```

### Para Testar Build

```bash
# 1. Preparar build
npm run prepare:build

# 2. Criar build de teste (rápido)
npm run pack

# 3. Testar a aplicação empacotada
# macOS: open dist/mac/Ebers.app
# Windows: start dist/win-unpacked/Ebers.exe
# Linux: ./dist/linux-unpacked/ebers
```

### Para Release

```bash
# Método automatizado (recomendado)
npm run release 1.0.0
git push && git push --tags

# Ou método manual
npm test
npm run db:generate
# Atualizar versão no package.json
npm run dist
npm run checksums
git add .
git commit -m "chore(release): bump version to 1.0.0"
git tag -a v1.0.0 -m "Release v1.0.0"
git push && git push --tags
```

## 🐛 Solução Rápida de Problemas

### Erro: "Migrations não encontradas"
```bash
npm run db:generate
```

### Erro: "Ícones não encontrados"
```bash
npm run generate:icons
```

### Erro: "Next.js build não encontrado"
```bash
npm run build
```

### Erro: "Electron não compilado"
```bash
npm run build:electron
```

### Limpar tudo e recomeçar
```bash
rm -rf node_modules .next dist
npm install
npm run db:generate
npm run prepare:build
```

## 📝 Variáveis de Ambiente

Para builds de produção, você pode configurar:

```bash
# Assinatura de código (macOS)
export CSC_LINK=/path/to/certificate.p12
export CSC_KEY_PASSWORD=your-password

# Assinatura de código (Windows)
set CSC_LINK=C:\path\to\certificate.pfx
set CSC_KEY_PASSWORD=your-password

# Notarização Apple (macOS)
export APPLE_ID=your-apple-id@email.com
export APPLE_ID_PASSWORD=app-specific-password
export APPLE_TEAM_ID=your-team-id
```

## 🎨 Personalização do Ícone

O ícone usa o símbolo Ψ (PSY) com as cores do sistema:
- Primária: #197BBD
- Secundária: #125E8A

Para personalizar, edite `scripts/generate-icons.js`.

## 📚 Documentação Completa

Para mais detalhes, consulte:
- [BUILD.md](./BUILD.md) - Guia completo de build
- [DISTRIBUTION.md](./DISTRIBUTION.md) - Guia de distribuição
- [README.md](../README.md) - Documentação geral

## 💡 Dicas

1. **Use `pack` para testes rápidos** - É muito mais rápido que `dist`
2. **Gere checksums após cada release** - Importante para segurança
3. **Teste em máquinas limpas** - Sempre teste instaladores em VMs
4. **Mantenha migrations versionadas** - Commit do diretório `drizzle/`
5. **Use o script de release** - Automatiza e previne erros

## 🔗 Links Úteis

- [electron-builder](https://www.electron.build/)
- [Electron](https://www.electronjs.org/)
- [Next.js](https://nextjs.org/)
- [Drizzle ORM](https://orm.drizzle.team/)
