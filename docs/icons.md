# Ícones da Aplicação Ebers

Este documento descreve como os ícones da aplicação Ebers são gerados e utilizados.

## Símbolo PSY (Ψ)

O ícone da aplicação utiliza o símbolo PSY (Ψ) do alfabeto grego, que é tradicionalmente associado à psicologia e psiquiatria. O símbolo é renderizado em branco sobre um fundo com gradiente azul usando as cores primárias do sistema:

- **Cor primária**: #197BBD
- **Cor secundária**: #125E8A

## Estrutura dos Ícones

### Arquivo Base
- `public/icons/icon.svg` - Arquivo SVG vetorial base com o símbolo PSY

### Ícones Gerados
Os seguintes ícones são gerados automaticamente a partir do SVG base:

#### Para Electron (Desktop)
- `icon-for-icns.png` (1024x1024) - Para macOS (.icns)
- `icon-for-ico.png` (256x256) - Para Windows (.ico)
- `icon.png` (512x512) - Para Linux

#### Para Web
- `favicon.ico` (32x32) - Favicon do navegador

#### Tamanhos Adicionais
- `icon-16x16.png`
- `icon-32x32.png`
- `icon-48x48.png`
- `icon-64x64.png`
- `icon-128x128.png`
- `icon-256x256.png`
- `icon-512x512.png`
- `icon-1024x1024.png`

## Scripts de Geração

### Gerar Todos os Ícones
```bash
npm run generate:icons
```

Este comando executa:
1. `scripts/generate-icons.js` - Gera todos os tamanhos PNG
2. `scripts/generate-favicon.js` - Gera o favicon.ico

### Gerar Apenas Ícones PNG
```bash
node scripts/generate-icons.js
```

### Gerar Apenas Favicon
```bash
node scripts/generate-favicon.js
```

## Configuração do Electron

Os ícones são configurados no `package.json` na seção `build`:

```json
{
  "build": {
    "mac": {
      "icon": "public/icons/icon-for-icns.png"
    },
    "win": {
      "icon": "public/icons/icon-for-ico.png"
    },
    "linux": {
      "icon": "public/icons/icon.png"
    }
  }
}
```

E também no código do Electron (`electron/main.ts` e `electron/main.js`):

```typescript
const iconPath = isDev 
  ? join(__dirname, '..', 'public', 'icons', 'icon.png')
  : join(process.resourcesPath, 'app', 'public', 'icons', 'icon.png');

mainWindow = new BrowserWindow({
  icon: iconPath,
  // ... outras configurações
});
```

## Dependências

- **sharp** - Biblioteca para processamento de imagens (conversão SVG → PNG)

## Modificando o Ícone

Para modificar o ícone da aplicação:

1. Edite o arquivo `public/icons/icon.svg`
2. Execute `npm run generate:icons` para regenerar todos os formatos
3. Teste a aplicação em desenvolvimento: `npm run electron:dev`
4. Gere a distribuição: `npm run dist`

## Notas Técnicas

- O electron-builder automaticamente converte os PNGs de alta resolução em formatos nativos (.icns para macOS, .ico para Windows)
- O favicon.ico é tecnicamente um PNG com extensão .ico (suportado por navegadores modernos)
- Os ícones são incluídos no build final através da configuração `files` no package.json