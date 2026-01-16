# Ebers - Sistema de Gerenciamento de Pacientes

Sistema para gerenciamento de pacientes e consultas de psicologia.

## 🖥️ Aplicação Desktop

Este sistema pode ser executado como uma **aplicação desktop** usando Electron, permitindo:

- ✅ Execução local sem necessidade de servidor externo
- ✅ Banco de dados SQLite armazenado localmente
- ✅ Acesso via rede local para iPads
- ✅ Distribuição como aplicativo nativo (macOS, Windows, Linux)
- ✅ Ícone com símbolo Ψ (PSY) do alfabeto grego

### Executar como Desktop

```bash
# Desenvolvimento
npm run electron:dev

# Produção
npm run electron:build
npm run electron
```

### Gerar Distribuíveis

```bash
# Release automatizada (recomendado)
npm run release 1.0.0

# Ou manualmente
npm run dist        # Plataforma atual
npm run dist:mac    # macOS (.dmg + .zip)
npm run dist:win    # Windows (.exe + portable)
npm run dist:linux  # Linux (.AppImage + .deb)

# Gerar checksums de segurança
npm run checksums
```

📖 **Documentação de Distribuição:**
- [Guia Rápido](docs/QUICK-START.md) - Comandos essenciais
- [Guia de Build](docs/BUILD.md) - Build detalhado
- [Guia de Distribuição](docs/DISTRIBUTION.md) - Publicação e instalação

## 🌐 Tecnologias

- **Next.js 16.1.1** com App Router
- **Electron** para aplicação desktop
- **TypeScript** para type safety
- **Tailwind CSS 4.1** para estilização
- **Drizzle ORM** com SQLite (better-sqlite3)
- **Jest** e **React Testing Library** para testes
- **fast-check** para property-based testing

## Desenvolvimento

### Pré-requisitos

- Node.js 18+ 
- npm ou yarn

### Instalação

```bash
npm install
```

### Configuração do banco de dados

```bash
npm run db:init
```

### Executar em desenvolvimento

```bash
npm run dev
```

### Testes

```bash
# Executar todos os testes
npm test

# Executar testes em modo watch
npm run test:watch

# Executar testes com coverage
npm run test:coverage
```

### Build para produção

```bash
npm run build
npm start
```

## Estrutura do Projeto

```
app/                    # App Router do Next.js
├── layout.tsx         # Layout raiz
├── page.tsx           # Página inicial
├── patients/          # Páginas de pacientes
├── consultations/     # Páginas de consultas
├── financial/         # Páginas financeiras
└── api/              # API routes

components/            # Componentes React
├── ui/               # Componentes de UI
├── forms/            # Componentes de formulário
├── layout/           # Componentes de layout
└── consultation/     # Componentes de consulta

lib/                  # Utilitários e configurações
├── db/               # Drizzle ORM e schema
│   ├── index.ts      # Conexão do banco
│   ├── schema.ts     # Schema do banco
│   └── migrate.ts    # Migrations
├── validations.ts    # Schemas de validação
├── utils.ts          # Funções utilitárias
└── device-detection.ts # Detecção de dispositivos
```

## 🚀 Funcionalidades

- ✅ Gerenciamento de pacientes
- ✅ Auto-cadastro via iPad
- ✅ Sistema de consultas
- ✅ Controle de créditos
- ✅ Controle financeiro
- ✅ Interface responsiva
- ✅ **Aplicação desktop com Electron**
- ✅ **Acesso via rede local**
- ✅ **Banco de dados local e privado**

## 📱 Uso com iPad

O sistema detecta automaticamente dispositivos iPad e:

1. Redireciona para a página de cadastro de paciente
2. Oculta campos administrativos
3. Permite auto-cadastro pelos pacientes
4. Impede navegação para áreas restritas

## 🗄️ Banco de Dados

- **SQLite** armazenado localmente
- **Localização automática** na pasta de dados do usuário:
  - macOS: `~/Library/Application Support/Ebers/`
  - Windows: `%APPDATA%/Ebers/`
  - Linux: `~/.config/Ebers/`
- **Inicialização automática** na primeira execução