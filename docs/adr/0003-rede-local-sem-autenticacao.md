# Rede local sem autenticação, usuária única

O sistema atende um consultório com uma única terapeuta e, por segurança, nada é hospedado em nuvem: o app roda na máquina dela e expõe pela rede local apenas o fluxo de Auto-cadastro para o tablet. Decidimos **não ter autenticação nem conceito de usuário**: o app desktop *é* a terapeuta; qualquer navegador na rede local cai no modo tablet (restrito ao Auto-cadastro), e as rotas HTTP expostas se limitam a esse fluxo. Assumimos a rede física do consultório como confiável — decisão consciente.

Consequências: a terapeuta não acessa listagens de outro dispositivo (só pelo app desktop); qualquer dispositivo na rede pode criar cadastros de paciente.
