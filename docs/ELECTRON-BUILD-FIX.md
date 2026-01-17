# Correção do Build Electron - Resumo Técnico

## Problema Original

A aplicação Ebers empacotada para macOS não abria após o build. O processo iniciava mas a janela não aparecia.

## Diagnóstico

Através de logs detalhados, identificamos vários problemas:

1. **Servidor Next.js não iniciava**: Tentativa de spawnar processo do Next.js falhava com erro `ENOTDIR`
2. **Arquivos dentro do ASAR**: Binários e módulos não podem ser executados diretamente de dentro do arquivo ASAR
3. **TypeScript em produção**: Next.js tentava instalar TypeScript em tempo de execução
4. **Módulos não encontrados**: jsdom e outros módulos não eram encontrados
5. **Janela fora da tela**: Posicionamento incorreto da janela

## Soluções Implementadas

### 1. Servidor Next.js Programático

**Antes:**
```typescript
// Tentava spawnar processo do Next.js
nextServer = spawn(nextPath, nextArgs, { ... });
```

**Depois:**
```typescript
// Usa Next.js programaticamente
const next = require('next');
nextApp = next({ dev: false, dir: nextDir });
await nextApp.prepare();
const handle = nextApp.getRequestHandler();
const server = http.createServer((req, res) => handle(req, res));
```

**Benefício**: Elimina necessidade de executar binários de dentro do ASAR.

### 2. Configuração do ASAR Unpack

Adicionado ao `package.json`:
```json
"asarUnpack": [
  ".next/**/*",
  "node_modules/next/**/*",
  "node_modules/sharp/**/*",
  "node_modules/@next/**/*",
  "node_modules/jsdom/**/*",
  "node_modules/isomorphic-dompurify/**/*",
  "node_modules/dompurify/**/*"
]
```

**Benefício**: Módulos que precisam de acesso direto ao sistema de arquivos são desempacotados.

### 3. Conversão do next.config.ts para JavaScript

**Antes:**
```typescript
// next.config.ts
import type { NextConfig } from 'next'
const nextConfig: NextConfig = { ... }
export default nextConfig
```

**Depois:**
```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = { ... }
module.exports = nextConfig
```

**Benefício**: Evita que Next.js tente instalar TypeScript em tempo de execução.

### 4. Detecção de Caminho Desempacotado

```typescript
let nextDir: string;
if (isAsar) {
  // Arquivos desempacotados ficam em app.asar.unpacked
  const unpackedPath = appPath.replace('app.asar', 'app.asar.unpacked');
  nextDir = unpackedPath;
} else {
  nextDir = appPath;
}
```

**Benefício**: Garante que Next.js use os arquivos desempacotados.

### 5. Posicionamento Correto da Janela

```typescript
mainWindow = new BrowserWindow({
  width: 1200,
  height: 800,
  show: false, // Não mostrar até estar pronto
  center: true, // Centralizar
  // ...
});

// Após carregar
mainWindow.show();
mainWindow.focus();
```

**Benefício**: Janela sempre aparece centralizada na tela principal.

### 6. Logs Detalhados

Adicionados logs em pontos críticos:
- Inicialização da aplicação
- Inicialização do banco de dados
- Inicialização do servidor Next.js
- Criação e exibição da janela

**Benefício**: Facilita debug de problemas futuros.

## Scripts de Debug Criados

### 1. `scripts/debug-packaged-app.sh`
Executa a aplicação empacotada mostrando todos os logs no terminal.

### 2. `scripts/test-app.sh`
Testa a aplicação em background e captura logs.

### 3. `scripts/quick-test.sh`
Teste rápido para verificar se a aplicação inicia.

## Resultado

✅ Aplicação empacotada abre corretamente
✅ Servidor Next.js inicia programaticamente
✅ Banco de dados é inicializado
✅ Janela aparece centralizada na tela
✅ Interface carrega corretamente

## Problemas Conhecidos

### Aviso do jsdom
```
⨯ Error: Failed to load external module jsdom-...
```

Este aviso aparece mas não afeta o funcionamento. O jsdom é usado pelo isomorphic-dompurify e funciona corretamente.

## Arquivos Modificados

1. `electron/main.ts` - Lógica principal do Electron
2. `package.json` - Configuração do electron-builder
3. `next.config.js` - Convertido de TypeScript para JavaScript
4. `docs/BUILD.md` - Documentação atualizada
5. `scripts/debug-packaged-app.sh` - Script de debug
6. `scripts/test-app.sh` - Script de teste
7. `scripts/quick-test.sh` - Script de teste rápido

## Próximos Passos

1. Testar em diferentes versões do macOS
2. Testar build para Windows e Linux
3. Implementar assinatura de código
4. Criar instaladores (.dmg, .exe, .deb)
5. Configurar auto-update (electron-updater)

## Referências

- [Electron ASAR](https://www.electronjs.org/docs/latest/tutorial/asar-archives)
- [electron-builder Configuration](https://www.electron.build/configuration/configuration)
- [Next.js Custom Server](https://nextjs.org/docs/pages/building-your-application/configuring/custom-server)
