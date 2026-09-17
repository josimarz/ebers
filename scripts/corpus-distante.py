#!/usr/bin/env python3
"""Monta o corpus de medição da Transcrição a distância (issue #34).

A partir do split `dev` do CORAA (fala espontânea em pt-BR, com transcrição
revisada), junta trechos consecutivos de uma mesma entrevista em gravações de
uns dois minutos e meio, com pausas entre as falas, e gera três condições:

- `limpo/`: as gravações como estão no corpus (voz perto do microfone);
- `distante/`: −14 dB, reverberação de sala pequena e piso de ruído — o
  paciente a uns 2 m do MacBook;
- `distante-baixo/`: o mesmo, a −20 dB — voz baixa a 2 m.

Cada gravação sai como `gravacao-NN.wav` (16 kHz, mono, 16 bits) ao lado de
`gravacao-NN.txt`, a referência para o WER. O áudio fica FORA do repositório
(é derivado do CORAA, que não é redistribuível); só este script e os números
medidos (docs/pesquisa) entram no git.

Uso:
    scripts/corpus-distante.py --coraa <pasta com dev/ e metadata_dev_final.csv> --saida <pasta>

Requer `ffmpeg` no PATH. Nada de numpy: a resposta ao impulso da sala é
gerada com a biblioteca padrão.
"""

import argparse
import csv
import math
import os
import random
import re
import shutil
import struct
import subprocess
import sys
import wave

TAXA = 16000

# Fontes do CORAA usadas e quantas gravações tirar de cada uma. TEDx fica de
# fora: é fala preparada, de palco. NURC-Recife também: são fitas dos anos
# 1970-80, abafadas e saturadas, em que o Whisper erra 86% das palavras já
# na condição limpa — nada a ver com o microfone de um MacBook.
GRAVACOES_POR_FONTE = [
    ("SP2010", 3),
    ("C-ORAL-BRASIL I", 3),
    ("ALIP", 2),
]
DURACAO_ALVO_S = 150
TRECHO_MAXIMO_S = 30

# Condições degradadas: (nome, atenuação em dB).
CONDICOES = [("distante", -14), ("distante-baixo", -20)]
# Piso de ruído (RMS, dBFS) somado às condições degradadas: sala silenciosa
# com microfone de notebook.
RUIDO_DBFS = -58
# Reverberação: tempo de decaimento de 60 dB (sala pequena, mobiliada) e
# razão direto/reverberante a 2 m (perto da distância crítica).
RT60_S = 0.5
DRR_DB = 0.0


def numero_do_arquivo(caminho):
    nome = os.path.basename(caminho)
    return int(re.match(r"(\d+)", nome).group(1))


def ler_wav(caminho):
    """Amostras s16 mono a 16 kHz, via ffmpeg: o CORAA mistura WAVs de 16
    bits com WAVs em ponto flutuante, que o módulo `wave` não lê."""
    resultado = subprocess.run(
        [
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-i", caminho,
            "-f", "s16le", "-ar", str(TAXA), "-ac", "1", "-",
        ],
        capture_output=True,
    )
    if resultado.returncode != 0 or len(resultado.stdout) == 0:
        return None
    return resultado.stdout


def escrever_wav(caminho, quadros):
    with wave.open(caminho, "wb") as arquivo:
        arquivo.setnchannels(1)
        arquivo.setsampwidth(2)
        arquivo.setframerate(TAXA)
        arquivo.writeframes(quadros)


def pausa(rng, segundos):
    """Quase-silêncio: ±2 LSB, para não haver zeros digitais."""
    amostras = int(segundos * TAXA)
    return struct.pack(f"<{amostras}h", *(rng.randint(-2, 2) for _ in range(amostras)))


def montar_gravacoes(coraa, saida, rng):
    with open(os.path.join(coraa, "metadata_dev_final.csv"), encoding="utf-8") as arquivo:
        linhas = list(csv.DictReader(arquivo))

    limpo = os.path.join(saida, "limpo")
    os.makedirs(limpo, exist_ok=True)
    numero = 0
    for fonte, quantidade in GRAVACOES_POR_FONTE:
        candidatos = sorted(
            (
                linha
                for linha in linhas
                if linha["dataset"] == fonte and linha["down_votes"] == "0"
            ),
            key=lambda linha: numero_do_arquivo(linha["file_path"]),
        )
        # Pontos diferentes da lista: entrevistas (e vozes) diferentes.
        inicios = [int(len(candidatos) * i / quantidade) for i in range(quantidade)]
        for inicio in inicios:
            numero += 1
            quadros = bytearray()
            textos = []
            duracao = 0.0
            for linha in candidatos[inicio:]:
                dados = ler_wav(os.path.join(coraa, linha["file_path"]))
                if dados is None:
                    continue
                segundos = len(dados) / 2 / TAXA
                if segundos > TRECHO_MAXIMO_S:
                    continue
                quadros += dados
                textos.append(linha["text"].strip())
                duracao += segundos
                # Pausa entre falas; de vez em quando uma pausa de pensar.
                if rng.random() < 0.15:
                    silencio = rng.uniform(2.0, 3.0)
                else:
                    silencio = rng.uniform(0.4, 1.2)
                quadros += pausa(rng, silencio)
                duracao += silencio
                if duracao >= DURACAO_ALVO_S:
                    break
            nome = f"gravacao-{numero:02d}"
            escrever_wav(os.path.join(limpo, f"{nome}.wav"), bytes(quadros))
            with open(os.path.join(limpo, f"{nome}.txt"), "w", encoding="utf-8") as arquivo:
                arquivo.write(" ".join(textos) + "\n")
            print(f"{nome}: {fonte}, {len(textos)} falas, {duracao:.0f} s", file=sys.stderr)
    return numero


def gerar_rir(caminho, rng):
    """Resposta ao impulso sintética: caminho direto em t=0 e cauda de ruído
    gaussiano com decaimento exponencial (RT60), escalada para a DRR pedida.
    Primeiras reflexões só depois de 5 ms."""
    total = int(TAXA * (RT60_S + 0.1))
    inicio_cauda = int(TAXA * 0.005)
    cauda = []
    for n in range(total):
        if n < inicio_cauda:
            cauda.append(0.0)
        else:
            decaimento = math.exp(-6.9078 * n / (TAXA * RT60_S))
            cauda.append(rng.gauss(0.0, 1.0) * decaimento)
    energia = sum(x * x for x in cauda)
    ganho = math.sqrt(10 ** (-DRR_DB / 10) / energia)
    rir = [ganho * x for x in cauda]
    rir[0] = 1.0
    # Em s16 o pico direto vale 1.0 → 32767; a cauda cabe com folga.
    escala = 32767 / max(abs(x) for x in rir)
    quadros = struct.pack(f"<{len(rir)}h", *(int(round(x * escala)) for x in rir))
    escrever_wav(caminho, quadros)


def rms_dbfs_do_ruido_rosa():
    """RMS (dBFS) que o `anoisesrc` rosa produz com amplitude 1, medido uma
    vez para calibrar o piso de ruído."""
    saida = subprocess.run(
        [
            "ffmpeg", "-hide_banner", "-f", "lavfi",
            "-i", f"anoisesrc=c=pink:r={TAXA}:a=1:d=10",
            "-af", "astats=measure_overall=RMS_level:measure_perchannel=none",
            "-f", "null", "-",
        ],
        capture_output=True, text=True, check=True,
    ).stderr
    return float(re.search(r"RMS level dB:\s*(-?[\d.]+)", saida).group(1))


def degradar(origem, destino, rir, atenuacao_db, ganho_ruido_db):
    filtro = (
        f"[0:a][1:a]afir=gtype=none:irnorm=-1[rev];"
        f"[rev]volume={atenuacao_db}dB[voz];"
        f"anoisesrc=c=pink:r={TAXA}:a=1,volume={ganho_ruido_db}dB[ruido];"
        f"[voz][ruido]amix=inputs=2:normalize=0:duration=first"
    )
    subprocess.run(
        [
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-i", origem, "-i", rir,
            "-filter_complex", filtro,
            "-ar", str(TAXA), "-ac", "1", "-c:a", "pcm_s16le", destino,
        ],
        check=True,
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--coraa", required=True)
    parser.add_argument("--saida", required=True)
    parser.add_argument("--semente", type=int, default=34)
    args = parser.parse_args()

    if shutil.which("ffmpeg") is None:
        sys.exit("ffmpeg não encontrado no PATH")
    rng = random.Random(args.semente)
    os.makedirs(args.saida, exist_ok=True)

    total = montar_gravacoes(args.coraa, args.saida, rng)

    rir = os.path.join(args.saida, "rir.wav")
    gerar_rir(rir, rng)
    ganho_ruido_db = RUIDO_DBFS - rms_dbfs_do_ruido_rosa()

    limpo = os.path.join(args.saida, "limpo")
    for condicao, atenuacao in CONDICOES:
        pasta = os.path.join(args.saida, condicao)
        os.makedirs(pasta, exist_ok=True)
        for numero in range(1, total + 1):
            nome = f"gravacao-{numero:02d}"
            degradar(
                os.path.join(limpo, f"{nome}.wav"),
                os.path.join(pasta, f"{nome}.wav"),
                rir, atenuacao, ganho_ruido_db,
            )
            shutil.copyfile(
                os.path.join(limpo, f"{nome}.txt"), os.path.join(pasta, f"{nome}.txt")
            )
        print(f"{condicao}: {total} gravações a {atenuacao} dB", file=sys.stderr)


if __name__ == "__main__":
    main()
