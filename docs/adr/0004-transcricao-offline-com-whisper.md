# Transcrição de voz offline com Whisper

O Conteúdo da consulta é transcrito do microfone em tempo real, e áudio de sessão de terapia é dado clínico sensível — não pode sair da máquina. Decidimos usar **Whisper via whisper.cpp** (`whisper-rs` no backend Rust), execução 100% local em pt-BR, com modelos escaláveis (`tiny`/`base`/`small`) conforme o hardware. Serviços de transcrição em nuvem foram descartados por princípio (privacidade), não por custo.
