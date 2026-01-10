# Ebers - Sistema de Gerenciamento de Pacientes

Sistema para gerenciamento de pacientes e consultas de psicologia.

## Tecnologias

- **Next.js 16.1.1** com App Router
- **TypeScript** para type safety
- **Tailwind CSS 4.1** para estilização
- **Prisma ORM** com SQLite
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
npx prisma generate
npx prisma db push
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
├── prisma.ts         # Cliente Prisma
├── validations.ts    # Schemas de validação
├── utils.ts          # Funções utilitárias
└── device-detection.ts # Detecção de dispositivos

prisma/               # Configuração do Prisma
└── schema.prisma     # Schema do banco de dados
```

## Funcionalidades

- ✅ Gerenciamento de pacientes
- ✅ Auto-cadastro via iPad
- ✅ Sistema de consultas
- ✅ Controle de créditos
- ✅ Controle financeiro
- ✅ Interface responsiva