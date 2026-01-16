# Guia de Build e Distribuição - Ebers

Este documento descreve como empacotar e distribuir a aplicação Ebers usando Electron.

## 📋 Pré-requisitos

- Node.js 18+ instalado
- npm ou yarn
- Para macOS: Xcode Command Line Tools
- Para Windows: Visual Studio Build Tools (opcional, mas recomendado)

## 🎨 Ícone da Aplicação

A aplicação usa o símbolo **Ψ (PSY)** do alfabeto grego como ícone, representando a psicologia.

Os ícones são gerados automaticamente durante o processo de build usando o script `generate-icons.js`.

## 🗄️ Banco de Dados

### Localização

O banco de dados SQLite é criado automaticamente na primeira execução da aplicação nos seguintes locais:

- **macOS**: `~/Library/Application Support/Ebers/database.db`
- **Windows**: `%APPDATA%/Ebers/database.db`
- **Linux**: `~/.config/Ebers/database.db`

### Migrations

As migrations do Drizzle ORM são executadas automaticamente na inicialização da aplicação:

1. O sistema verifica se o banco de dados existe
2. Se não existir, cria um novo banco
3. Executa todas as migrations pendentes do diretório `drizzle/`
4. Registra as migrations aplicadas na tabela `__drizzle_migrations`

## 🚀 Comandos de Build

### Preparação

Antes de fazer o build, certifique-se de que as migrations foram geradas:

```bash
npm run db:generate
```

### Build Completo

Para fazer o build completo da aplicação (Next.js + Electron):

```bash
npm run prepare:build
```

Este comando:
- Verifica se as migrations existem
- Gera os ícones se necessário
- Compila o código TypeScript do Electron
- Faz o build do Next.js

### Empacotamento

#### Testar sem criar instalador (mais rápido)

```bash
# Para a plataforma atual
npm run pack

# Para macOS
npm run pack:mac

# Para Windows
npm run pack:win

# Para Linux
npm run pack:linux
```

Os arquivos serão gerados em `dist/mac`, `dist/win-unpacked` ou `dist/linux-unpacked`.

#### Criar instaladores

```bash
# Para a plataforma atual
npm run dist

# Para macOS (gera .dmg e .zip)
npm run dist:mac

# Para Windows (gera .exe e .exe portable)
npm run dist:win

# Para Linux (gera .AppImage e .deb)
npm run dist:linux
```

## 📦 Formatos de Distribuição

### macOS

- **DMG**: Instalador com interface drag-and-drop
- **ZIP**: Arquivo compactado da aplicação

Arquiteturas suportadas: x64 (Intel) e arm64 (Apple Silicon)

### Windows

- **NSIS Installer**: Instalador tradicional com opções de customização
- **Portable**: Executável portátil que não requer instalação

Arquiteturas suportadas: x64 e ia32 (32-bit)

### Linux

- **AppImage**: Executável portátil que funciona em qualquer distribuição
- **DEB**: Pacote para distribuições baseadas em Debian/Ubuntu

Arquitetura suportada: x64

## 🔧 Estrutura de Arquivos no Build

```
dist/
├── mac/
│   ├── Ebers.app
│   ├── Ebers-1.0.0.dmg
│   └── Ebers-1.0.0-mac.zip
├── win-unpacked/
│   └── Ebers.exe
├── Ebers Setup 1.0.0.exe
├── Ebers 1.0.0.exe (portable)
├── linux-unpacked/
│   └── ebers
├── Ebers-1.0.0.AppImage
└── ebers_1.0.0_amd64.deb
```

## 🐛 Troubleshooting

### Aplicação não abre no macOS

Se a aplicação empacotada não abrir:

1. **Remova a quarentena do macOS:**
   ```bash
   xattr -cr dist/mac/Ebers.app
   ```

2. **Abra a aplicação:**
   ```bash
   open dist/mac/Ebers.app
   ```

3. **Verifique se está rodando:**
   ```bash
   ps aux | grep Ebers | grep -v grep
   ```

### Debug da Aplicação Empacotada (macOS)

Se a aplicação não abre ou parece travar, use o script de debug para ver os logs:

```bash
./scripts/debug-packaged-app.sh
```

Este script irá:
1. Verificar se a aplicação existe
2. Remover a quarentena do macOS
3. Executar a aplicação mostrando todos os logs no terminal

### Verificar Logs do Sistema (macOS)

Você também pode verificar os logs do sistema:

```bash
# Logs do Console (tempo real)
log stream --predicate 'process == "Ebers"' --level debug

# Logs de crash
open ~/Library/Logs/DiagnosticReports/
```

### Janela não aparece

Se a aplicação inicia mas a janela não aparece:

1. A janela pode estar em uma posição fora da tela (monitor secundário desconectado)
2. Pressione `Cmd+Tab` para ver se a aplicação está na lista
3. Use Mission Control (F3) para ver todas as janelas
4. Feche a aplicação e abra novamente - ela deve centralizar automaticamente

### Erro: "Migrations não encontradas"

Execute:
```bash
npm run db:generate
```

### Erro: "Ícones não encontrados"

Execute:
```bash
npm run generate:icons
```

### Erro: "Next.js build não encontrado"

Execute:
```bash
npm run build
```

### Erro: "Electron não compilado"

Execute:
```bash
npm run build:electron
```

### Erro no macOS: "App não pode ser aberta porque é de desenvolvedor não identificado"

Isso é normal para apps não assinados. Para abrir:
1. Clique com botão direito no app
2. Selecione "Abrir"
3. Confirme que deseja abrir

Ou via terminal:
```bash
xattr -cr /Applications/Ebers.app
```

### Erro no Windows: "Windows Defender bloqueou o app"

Isso é normal para apps não assinados. Clique em "Mais informações" e depois "Executar assim mesmo".

## 🔐 Assinatura de Código

Para distribuição em produção, é recomendado assinar o código:

### macOS

1. Obtenha um certificado de desenvolvedor Apple
2. Configure as variáveis de ambiente:
   ```bash
   export CSC_LINK=/path/to/certificate.p12
   export CSC_KEY_PASSWORD=your-password
   ```
3. Execute o build normalmente

### Windows

1. Obtenha um certificado de assinatura de código
2. Configure as variáveis de ambiente:
   ```bash
   set CSC_LINK=C:\path\to\certificate.pfx
   set CSC_KEY_PASSWORD=your-password
   ```
3. Execute o build normalmente

## 📝 Notas Importantes

1. **Tamanho do Build**: O build final terá aproximadamente 200-300 MB devido ao Next.js e dependências do Electron.

2. **Primeira Execução**: Na primeira execução, a aplicação criará o banco de dados e executará as migrations automaticamente.

3. **Atualizações**: Para implementar auto-update, considere usar o electron-updater (não incluído nesta versão).

4. **Backup**: O sistema inclui funcionalidade de backup do banco de dados. Os usuários podem exportar o banco via interface.

5. **Configuração do Next.js**: O arquivo `next.config.js` (JavaScript) é usado ao invés de TypeScript para evitar que o Next.js tente instalar o TypeScript em tempo de execução na aplicação empacotada.

6. **Módulos Desempacotados**: Alguns módulos (Next.js, jsdom, sharp) são desempacotados do arquivo ASAR para funcionar corretamente. Isso é configurado automaticamente no `package.json` através da propriedade `asarUnpack`.

## ⚠️ Problemas Conhecidos

### Aviso sobre jsdom

Você pode ver um aviso sobre o módulo `jsdom` nos logs:
```
⨯ Error: Failed to load external module jsdom-...
```

Este aviso é esperado e não afeta o funcionamento da aplicação. O jsdom é usado pelo `isomorphic-dompurify` para sanitização de HTML, mas funciona corretamente mesmo com o aviso.

### Janela fora da tela

Se você usa múltiplos monitores e desconecta um deles, a janela pode abrir fora da tela visível. A aplicação agora centraliza automaticamente a janela ao abrir, mas se o problema persistir:

1. Feche a aplicação completamente
2. Abra novamente - ela deve aparecer centralizada

## 🎯 Checklist de Release

Antes de fazer uma release:

- [ ] Atualizar versão no `package.json`
- [ ] Executar todos os testes: `npm test`
- [ ] Gerar migrations: `npm run db:generate`
- [ ] Testar build local: `npm run pack`
- [ ] Testar a aplicação empacotada
- [ ] Criar instaladores: `npm run dist`
- [ ] Testar instaladores em máquinas limpas
- [ ] Criar tag no Git: `git tag v1.0.0`
- [ ] Fazer push da tag: `git push --tags`

## 📚 Recursos Adicionais

- [Documentação do electron-builder](https://www.electron.build/)
- [Documentação do Electron](https://www.electronjs.org/docs)
- [Documentação do Next.js](https://nextjs.org/docs)
- [Documentação do Drizzle ORM](https://orm.drizzle.team/)
