---
inclusion: always
---
<!------------------------------------------------------------------------------------
   Add rules to this file or a short description and have Kiro refine them for you.
   
   Learn about inclusion modes: https://kiro.dev/docs/steering/#inclusion-modes
-------------------------------------------------------------------------------------> 

# Introdução

Este documento contém as definições sobre a *stack* técnica que será usada para desenvolvimento do projeto.

- **ESTE SISTEMA NÃO SERÁ HOSPEDADO EM NENHUMA NUVEM**
- **ESTE SISTEMA RODARÁ LOCALMENTE NA MÁQUINA DA TERAPEUTA**
- **PARA QUE OS PACIENTES POSSAM ACESSAR O SISTEMA, A TERAPEUTA CRIARÁ UMA REDE LOCAL ENTRE COMPUTADOR E IPAD**
- **USE TDD**
- Use o MCP Context7 para consultar a documentação atualizada das bibliotecas utilizadas neste projeto

## Banco de dados

Será usado como banco de dados a útlima versão estável (LTS) do SQLite.

### ORM

O ORM utilizado no projeto será o [Drizzle ORM](https://orm.drizzle.team/) com [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) para melhor compatibilidade com distribuição via Electron.

## Frontend/Backend

O frontend/backend devem ser construídos com auxílio da última versão estável (16.1.1) do Next.js.

### Tailwind CSS

Use a última versão estável (4.1) do TailwindCSS.

### ShadCN

Use a última versão estável do shadcn ui para definir os componentes do sistema.