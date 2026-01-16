# Configuração de CI/CD

Este documento descreve como configurar CI/CD para automatizar o processo de build e release.

## 🔄 GitHub Actions

### Configuração Básica

1. Copie o arquivo de exemplo:
```bash
cp .github/workflows/release.yml.example .github/workflows/release.yml
```

2. Configure os secrets no GitHub:
   - Vá para Settings > Secrets and variables > Actions
   - Adicione os secrets necessários

### Secrets Necessários

#### Para macOS (Assinatura e Notarização)

```
MAC_CERTIFICATE          # Certificado .p12 em base64
MAC_CERTIFICATE_PASSWORD # Senha do certificado
APPLE_ID                 # Apple ID
APPLE_ID_PASSWORD        # App-specific password
APPLE_TEAM_ID           # Team ID da Apple
```

Para converter certificado para base64:
```bash
base64 -i certificate.p12 -o certificate.txt
```

#### Para Windows (Assinatura)

```
WIN_CERTIFICATE          # Certificado .pfx em base64
WIN_CERTIFICATE_PASSWORD # Senha do certificado
```

### Workflow de Release

O workflow é acionado automaticamente quando você cria uma tag:

```bash
# Criar tag
git tag -a v1.0.0 -m "Release v1.0.0"

# Push da tag
git push --tags
```

O GitHub Actions irá:
1. ✅ Executar testes em todas as plataformas
2. 🗄️ Gerar migrations
3. 🎨 Gerar ícones
4. 🏗️ Fazer build do Next.js e Electron
5. 📦 Criar instaladores para macOS, Windows e Linux
6. 🔐 Assinar código (se certificados configurados)
7. 📊 Gerar checksums
8. 📤 Criar draft release no GitHub

### Personalização

Edite `.github/workflows/release.yml` para:

- Adicionar mais plataformas
- Modificar estratégia de build
- Adicionar notificações
- Integrar com outros serviços

## 🚀 Outras Plataformas de CI/CD

### GitLab CI

Crie `.gitlab-ci.yml`:

```yaml
stages:
  - test
  - build
  - release

variables:
  NODE_VERSION: "18"

test:
  stage: test
  image: node:${NODE_VERSION}
  script:
    - npm ci
    - npm test
  only:
    - tags

build:mac:
  stage: build
  tags:
    - macos
  script:
    - npm ci
    - npm run db:generate
    - npm run prepare:build
    - npm run dist:mac
    - npm run checksums
  artifacts:
    paths:
      - dist/*.dmg
      - dist/*.zip
      - dist/CHECKSUMS.md
  only:
    - tags

build:windows:
  stage: build
  tags:
    - windows
  script:
    - npm ci
    - npm run db:generate
    - npm run prepare:build
    - npm run dist:win
    - npm run checksums
  artifacts:
    paths:
      - dist/*.exe
      - dist/CHECKSUMS.md
  only:
    - tags

build:linux:
  stage: build
  image: node:${NODE_VERSION}
  script:
    - npm ci
    - npm run db:generate
    - npm run prepare:build
    - npm run dist:linux
    - npm run checksums
  artifacts:
    paths:
      - dist/*.AppImage
      - dist/*.deb
      - dist/CHECKSUMS.md
  only:
    - tags

release:
  stage: release
  image: registry.gitlab.com/gitlab-org/release-cli:latest
  script:
    - echo "Creating release"
  release:
    tag_name: $CI_COMMIT_TAG
    description: "Release $CI_COMMIT_TAG"
    assets:
      links:
        - name: "macOS DMG"
          url: "${CI_PROJECT_URL}/-/jobs/artifacts/${CI_COMMIT_TAG}/raw/dist/Ebers-${CI_COMMIT_TAG}.dmg?job=build:mac"
        - name: "Windows Installer"
          url: "${CI_PROJECT_URL}/-/jobs/artifacts/${CI_COMMIT_TAG}/raw/dist/Ebers-Setup-${CI_COMMIT_TAG}.exe?job=build:windows"
        - name: "Linux AppImage"
          url: "${CI_PROJECT_URL}/-/jobs/artifacts/${CI_COMMIT_TAG}/raw/dist/Ebers-${CI_COMMIT_TAG}.AppImage?job=build:linux"
  only:
    - tags
```

### CircleCI

Crie `.circleci/config.yml`:

```yaml
version: 2.1

orbs:
  node: circleci/node@5.1.0

jobs:
  test:
    executor:
      name: node/default
      tag: '18'
    steps:
      - checkout
      - node/install-packages
      - run:
          name: Run tests
          command: npm test

  build-mac:
    macos:
      xcode: 14.2.0
    steps:
      - checkout
      - node/install-packages:
          pkg-manager: npm
      - run:
          name: Generate migrations
          command: npm run db:generate
      - run:
          name: Build
          command: npm run dist:mac
      - run:
          name: Generate checksums
          command: npm run checksums
      - store_artifacts:
          path: dist
          destination: installers

  build-windows:
    executor:
      name: win/default
    steps:
      - checkout
      - node/install-packages
      - run:
          name: Generate migrations
          command: npm run db:generate
      - run:
          name: Build
          command: npm run dist:win
      - run:
          name: Generate checksums
          command: npm run checksums
      - store_artifacts:
          path: dist
          destination: installers

  build-linux:
    executor:
      name: node/default
      tag: '18'
    steps:
      - checkout
      - node/install-packages
      - run:
          name: Generate migrations
          command: npm run db:generate
      - run:
          name: Build
          command: npm run dist:linux
      - run:
          name: Generate checksums
          command: npm run checksums
      - store_artifacts:
          path: dist
          destination: installers

workflows:
  release:
    jobs:
      - test:
          filters:
            tags:
              only: /^v.*/
      - build-mac:
          requires:
            - test
          filters:
            tags:
              only: /^v.*/
            branches:
              ignore: /.*/
      - build-windows:
          requires:
            - test
          filters:
            tags:
              only: /^v.*/
            branches:
              ignore: /.*/
      - build-linux:
          requires:
            - test
          filters:
            tags:
              only: /^v.*/
            branches:
              ignore: /.*/
```

## 🔐 Segurança

### Proteção de Secrets

- Nunca commite certificados ou senhas
- Use secrets do CI/CD
- Rotacione senhas regularmente
- Use app-specific passwords para Apple ID

### Verificação de Builds

Sempre verifique os checksums após o build:

```bash
# Baixar instalador e checksum
wget https://example.com/Ebers-1.0.0.dmg
wget https://example.com/checksums.txt

# Verificar
shasum -a 256 -c checksums.txt
```

## 📊 Monitoramento

### Notificações

Configure notificações para:
- Builds com falha
- Releases criadas
- Testes com falha

### Métricas

Monitore:
- Tempo de build
- Taxa de sucesso
- Tamanho dos instaladores
- Cobertura de testes

## 🐛 Troubleshooting

### Build falha no CI mas funciona localmente

- Verificar versão do Node.js
- Verificar variáveis de ambiente
- Verificar permissões de arquivos
- Verificar dependências do sistema

### Assinatura de código falha

- Verificar validade do certificado
- Verificar senha do certificado
- Verificar permissões do runner
- Verificar configuração do entitlements

### Testes falham no CI

- Verificar timeouts
- Verificar dependências de sistema
- Verificar variáveis de ambiente
- Executar localmente com mesma configuração

## 📚 Recursos

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitLab CI/CD Documentation](https://docs.gitlab.com/ee/ci/)
- [CircleCI Documentation](https://circleci.com/docs/)
- [electron-builder CI Configuration](https://www.electron.build/configuration/configuration#configuration)
