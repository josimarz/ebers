---
status: proposed
---

# Tauri como framework de aplicação

O sistema precisa rodar 100% local, embutir um servidor HTTP para a rede local (auto-cadastro via tablet) e capturar áudio do microfone para transcrição. Decidimos usar **Tauri 2** (backend Rust, frontend React + TypeScript via Vite) porque o Electron apresentou problemas de performance em avaliações anteriores, e o backend Rust atende bem tanto o servidor local (Axum) quanto a transcrição offline (`whisper-rs`).

Status *proposed*: a escolha pode ser revista se Tauri limitar performance, o servidor HTTP local ou a captura de áudio. Critérios para a decisão final: performance, facilidade do servidor HTTP local, suporte à captura de áudio e experiência de desenvolvimento.
