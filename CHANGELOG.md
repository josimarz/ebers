# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [Unreleased]

### Adicionado
- Scripts de empacotamento e distribuição com Electron
- Geração automática de ícones com símbolo Ψ (PSY)
- Sistema de migrations automático na inicialização
- Script de release automatizado
- Geração de checksums SHA-256 para instaladores
- Suporte para múltiplas plataformas (macOS, Windows, Linux)
- Documentação completa de build e distribuição
- Configuração de CI/CD para GitHub Actions
- Script de pós-instalação
- Entitlements para macOS

### Modificado
- Banco de dados agora é criado automaticamente em `~/Library/Application Support/Ebers/` (macOS)
- Sistema de migrations migrado para Drizzle ORM
- Configuração do electron-builder expandida

## [0.1.0] - 2024-01-14

### Adicionado
- Estrutura inicial do projeto
- Sistema de gerenciamento de pacientes
- Sistema de consultas
- Controle financeiro
- Sistema de créditos
- Interface responsiva com Tailwind CSS
- Detecção de dispositivos iPad
- Auto-cadastro de pacientes via iPad
- Testes unitários e de integração
- Property-based testing com fast-check
- Integração com Electron
- Banco de dados SQLite com Drizzle ORM

### Tipos de Mudanças
- `Added` - para novas funcionalidades
- `Changed` - para mudanças em funcionalidades existentes
- `Deprecated` - para funcionalidades que serão removidas
- `Removed` - para funcionalidades removidas
- `Fixed` - para correções de bugs
- `Security` - para correções de vulnerabilidades

---

## Guia de Versionamento

Este projeto usa [Semantic Versioning](https://semver.org/):

- **MAJOR** (X.0.0): Mudanças incompatíveis na API
- **MINOR** (0.X.0): Novas funcionalidades compatíveis
- **PATCH** (0.0.X): Correções de bugs compatíveis

### Exemplos

- `1.0.0` → `2.0.0`: Breaking changes (ex: mudança no schema do banco)
- `1.0.0` → `1.1.0`: Nova funcionalidade (ex: exportação de relatórios)
- `1.0.0` → `1.0.1`: Bug fix (ex: correção de cálculo de créditos)

---

[Unreleased]: https://github.com/seu-usuario/ebers/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/seu-usuario/ebers/releases/tag/v0.1.0
