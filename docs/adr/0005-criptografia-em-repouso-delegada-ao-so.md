# Criptografia em repouso delegada ao sistema operacional

O banco guarda prontuário psicológico na máquina pessoal da terapeuta. Consideramos criptografia na camada da aplicação (SQLCipher), mas decidimos **delegar a proteção em repouso à criptografia de disco do SO** (FileVault/BitLocker), exigida como pré-requisito de instalação na especificação. SQLCipher complicaria driver, backup manual e depuração sem proteger contra o cenário realista de ataque (máquina ligada e desbloqueada).
