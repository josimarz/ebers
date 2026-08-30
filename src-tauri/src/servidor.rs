//! Servidor HTTP local do Auto-cadastro (spec 1.3 e 5.1; ADR-0003; issue #5).
//!
//! Sobe junto com o app desktop e atende a rede local: serve a mesma SPA do
//! webview e expõe rotas REST restritas ao fluxo de Auto-cadastro — criar
//! Paciente e receber a foto de perfil. Sem autenticação, por decisão
//! consciente (ADR-0003): a rede física do consultório é considerada
//! confiável e as rotas só permitem criação, nunca leitura ou edição.

use std::path::PathBuf;

use axum::extract::State;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::routing::post;
use axum::{Json, Router};
use serde::Deserialize;

/// Porta fixa do servidor: a URL no tablet (favorito do navegador) não muda
/// entre reinícios do app.
pub const PORTA: u16 = 8738;

/// Caminhos que as rotas do Auto-cadastro usam para persistir.
#[derive(Clone)]
pub struct EstadoAutoCadastro {
    pub caminho_banco: PathBuf,
    pub diretorio_fotos: PathBuf,
}

/// Cadastro como o formulário do Modo tablet envia (src/db/auto-cadastro.ts):
/// os campos ocultos no tablet — Valor da consulta, Periodicidade e Dia da
/// semana — ficam de fora e `deny_unknown_fields` os recusa se aparecerem.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct NovoPacienteAutoCadastro {
    nome_completo: String,
    foto: Option<String>,
    data_nascimento: String,
    genero: String,
    cpf: String,
    rg: Option<String>,
    religiao: String,
    responsavel_legal: Option<String>,
    email_responsavel_legal: Option<String>,
    cpf_responsavel_legal: Option<String>,
    telefone_1: String,
    telefone_2: Option<String>,
    email: Option<String>,
    ja_fez_terapia: bool,
    quando_fez_terapia: Option<String>,
    toma_medicamento: bool,
    toma_medicamento_desde_quando: Option<String>,
    nomes_medicamentos: Option<String>,
    ja_foi_hospitalizado: bool,
    quando_foi_hospitalizado: Option<String>,
    razao_hospitalizacao: Option<String>,
}

/// Teto do corpo na rota de fotos: o limite padrão do Axum (2 MB) recusaria
/// foto de câmera de tablet com 413. O servidor reduz a imagem para avatar
/// (fotos.rs) logo após receber — o corpo grande é só transitório.
const LIMITE_CORPO_FOTO: usize = 20 * 1024 * 1024;

/// Rotas REST do Auto-cadastro — a superfície HTTP completa além da SPA.
pub fn rotas_auto_cadastro(estado: EstadoAutoCadastro) -> Router {
    Router::new()
        .route("/api/auto-cadastro/pacientes", post(cadastrar_paciente))
        .route(
            "/api/auto-cadastro/fotos",
            post(receber_foto)
                .layer(axum::extract::DefaultBodyLimit::max(LIMITE_CORPO_FOTO)),
        )
        .with_state(estado)
}

/// Sobe o servidor em segundo plano, junto com o app (lib.rs). Uma falha —
/// porta ocupada, por exemplo — não derruba o modo desktop: fica no stderr e
/// o Auto-cadastro volta no próximo início do app.
pub fn iniciar(app: &tauri::AppHandle) -> Result<(), String> {
    let estado = EstadoAutoCadastro {
        caminho_banco: crate::caminho_do_banco(app)?,
        diretorio_fotos: crate::diretorio_de_fotos(app)?,
    };
    let rotas = rotas_auto_cadastro(estado).fallback_service(rotas_spa(app.clone()));
    tauri::async_runtime::spawn(async move {
        // Escuta a rede local inteira: é assim que o tablet chega (ADR-0003).
        let escuta = match tokio::net::TcpListener::bind(("0.0.0.0", PORTA)).await {
            Ok(escuta) => escuta,
            Err(erro) => {
                eprintln!("Servidor do Auto-cadastro não conseguiu abrir a porta {PORTA}: {erro}");
                return;
            }
        };
        println!("Auto-cadastro na rede local: http://<IP-deste-computador>:{PORTA}");
        if let Err(erro) = axum::serve(escuta, rotas).await {
            eprintln!("Servidor do Auto-cadastro parou: {erro}");
        }
    });
    Ok(())
}

/// Serve a SPA embutida no binário para qualquer caminho fora de /api — a
/// mesma SPA do webview, que no navegador do tablet entra no Modo tablet.
/// Em `tauri dev` não há SPA embutida (o Vite serve o frontend); o acesso de
/// desenvolvimento ao Auto-cadastro é pelo Vite com proxy de /api.
fn rotas_spa(app: tauri::AppHandle) -> Router {
    Router::new()
        .fallback(axum::routing::get(servir_spa))
        .with_state(app)
}

async fn servir_spa(
    State(app): State<tauri::AppHandle>,
    uri: axum::http::Uri,
) -> axum::response::Response {
    let recursos = app.asset_resolver();
    responder_spa(
        |caminho| {
            recursos.get(caminho.to_string()).map(|recurso| RecursoSpa {
                corpo: recurso.bytes,
                tipo: recurso.mime_type,
            })
        },
        uri.path(),
    )
}

/// Recebe os bytes crus da foto (como o comando `salvar_foto_paciente`) e
/// devolve o nome do arquivo gravado, que o formulário envia no cadastro.
/// `fotos::salvar` normaliza a imagem — bytes que não são imagem não chegam
/// ao disco.
async fn receber_foto(
    State(estado): State<EstadoAutoCadastro>,
    corpo: axum::body::Bytes,
) -> Result<(StatusCode, Json<serde_json::Value>), StatusCode> {
    match crate::fotos::salvar(&estado.diretorio_fotos, &corpo) {
        Ok(arquivo) => Ok((
            StatusCode::CREATED,
            Json(serde_json::json!({ "arquivo": arquivo })),
        )),
        Err(_) => Err(StatusCode::UNPROCESSABLE_ENTITY),
    }
}

async fn cadastrar_paciente(
    State(estado): State<EstadoAutoCadastro>,
    Json(novo): Json<NovoPacienteAutoCadastro>,
) -> StatusCode {
    if validar(&novo).is_err() {
        return StatusCode::UNPROCESSABLE_ENTITY;
    }
    match inserir_paciente(&estado.caminho_banco, &novo) {
        Ok(()) => StatusCode::CREATED,
        Err(erro) if cpf_ja_cadastrado(&erro) => StatusCode::CONFLICT,
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR,
    }
}

/// Invariantes que o banco e a SPA não seguram sozinhos nesta fronteira. As
/// regras reativas (menor de 18, condicionais clínicos) continuam garantidas
/// pela própria SPA — a mesma do desktop — conforme o modelo de confiança da
/// rede local (ADR-0003).
fn validar(novo: &NovoPacienteAutoCadastro) -> Result<(), String> {
    let obrigatorios = [
        ("nomeCompleto", &novo.nome_completo),
        ("dataNascimento", &novo.data_nascimento),
        ("genero", &novo.genero),
        ("religiao", &novo.religiao),
        ("telefone1", &novo.telefone_1),
    ];
    for (campo, valor) in obrigatorios {
        if valor.trim().is_empty() {
            return Err(format!("Campo obrigatório em branco: {campo}"));
        }
    }
    if !crate::cpf::validar(&novo.cpf) {
        return Err("CPF inválido".into());
    }
    if let Some(foto) = &novo.foto {
        crate::fotos::nome_validado(foto)?;
    }
    Ok(())
}

/// CPF é único no sistema (spec 1.1): a violação do índice UNIQUE é a
/// conferência atômica de "CPF já cadastrado" — sem corrida entre checar e
/// gravar. A SPA traduz o 409 em "CPF já cadastrado — chame a terapeuta".
fn cpf_ja_cadastrado(erro: &rusqlite::Error) -> bool {
    matches!(
        erro,
        rusqlite::Error::SqliteFailure(falha, _)
            if falha.extended_code == rusqlite::ffi::SQLITE_CONSTRAINT_UNIQUE
    )
}

/// Valor padrão da consulta do consultório — fixo no v1 (spec 1.1). No
/// Auto-cadastro o campo fica oculto e o Paciente recebe este valor. Espelho
/// de VALOR_PADRAO_CONSULTA_CENTAVOS em src/dominio/paciente.ts.
const VALOR_PADRAO_CONSULTA_CENTAVOS: i64 = 25000;

/// Um recurso da SPA embutida no app, já com o tipo MIME.
pub struct RecursoSpa {
    pub corpo: Vec<u8>,
    pub tipo: String,
}

/// Resolve um caminho pedido pelo navegador do tablet contra os recursos da
/// SPA: arquivo existente volta como está; rota do React Router (sem
/// extensão) cai no index.html, para o BrowserRouter assumir.
fn responder_spa(
    busca: impl Fn(&str) -> Option<RecursoSpa>,
    caminho: &str,
) -> axum::response::Response {
    let pedido = if caminho == "/" { "/index.html" } else { caminho };
    let arquivo_com_extensao = pedido.rsplit('/').next().is_some_and(|nome| nome.contains('.'));
    let recurso = busca(pedido)
        .or_else(|| (!arquivo_com_extensao).then(|| busca("/index.html")).flatten());
    match recurso {
        Some(recurso) => (
            [(axum::http::header::CONTENT_TYPE, recurso.tipo)],
            recurso.corpo,
        )
            .into_response(),
        None => StatusCode::NOT_FOUND.into_response(),
    }
}

/// Grava o Paciente no mesmo `ebers.db` do app. O acesso é síncrono (rusqlite)
/// dentro do handler async: o fluxo atende o tablet do consultório, não há
/// carga que justifique um pool. `busy_timeout` cobre a concorrência com a
/// conexão do app desktop (tauri-plugin-sql).
fn inserir_paciente(
    caminho_banco: &std::path::Path,
    novo: &NovoPacienteAutoCadastro,
) -> Result<(), rusqlite::Error> {
    let conexao = rusqlite::Connection::open(caminho_banco)?;
    conexao.busy_timeout(std::time::Duration::from_secs(5))?;
    conexao.execute(
        "INSERT INTO pacientes (
            nome_completo, foto, data_nascimento, genero, cpf, rg, religiao,
            responsavel_legal, email_responsavel_legal, cpf_responsavel_legal,
            telefone_1, telefone_2, email,
            ja_fez_terapia, quando_fez_terapia,
            toma_medicamento, toma_medicamento_desde_quando, nomes_medicamentos,
            ja_foi_hospitalizado, quando_foi_hospitalizado, razao_hospitalizacao,
            valor_consulta_centavos
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13,
                  ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22)",
        rusqlite::params![
            novo.nome_completo,
            novo.foto,
            novo.data_nascimento,
            novo.genero,
            novo.cpf,
            novo.rg,
            novo.religiao,
            novo.responsavel_legal,
            novo.email_responsavel_legal,
            novo.cpf_responsavel_legal,
            novo.telefone_1,
            novo.telefone_2,
            novo.email,
            novo.ja_fez_terapia,
            novo.quando_fez_terapia,
            novo.toma_medicamento,
            novo.toma_medicamento_desde_quando,
            novo.nomes_medicamentos,
            novo.ja_foi_hospitalizado,
            novo.quando_foi_hospitalizado,
            novo.razao_hospitalizacao,
            VALOR_PADRAO_CONSULTA_CENTAVOS,
        ],
    )?;
    Ok(())
}

#[cfg(test)]
mod testes {
    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use serde_json::json;
    use tower::ServiceExt;

    use super::*;

    /// Banco migrado num diretório temporário, como o tauri-plugin-sql deixa
    /// o `ebers.db` na inicialização do app.
    fn estado_de_teste() -> (tempfile::TempDir, EstadoAutoCadastro) {
        let pasta = tempfile::tempdir().expect("criar diretório temporário");
        let caminho_banco = pasta.path().join("ebers.db");
        let conexao =
            rusqlite::Connection::open(&caminho_banco).expect("criar o SQLite de teste");
        for migracao in crate::migracoes() {
            conexao
                .execute_batch(migracao.sql)
                .expect("aplicar migração no SQLite");
        }
        let estado = EstadoAutoCadastro {
            caminho_banco,
            diretorio_fotos: pasta.path().join(crate::fotos::DIRETORIO_FOTOS),
        };
        (pasta, estado)
    }

    /// Cadastro como o formulário do tablet envia: adulta válida, sem os
    /// campos ocultos no Modo tablet.
    fn cadastro_valido() -> serde_json::Value {
        json!({
            "nomeCompleto": "Ana Lima",
            "foto": null,
            "dataNascimento": "1990-03-10",
            "genero": "Feminino",
            "cpf": "52998224725",
            "rg": null,
            "religiao": "Sem religião",
            "responsavelLegal": null,
            "emailResponsavelLegal": null,
            "cpfResponsavelLegal": null,
            "telefone1": "(11) 91234-5678",
            "telefone2": null,
            "email": null,
            "jaFezTerapia": false,
            "quandoFezTerapia": null,
            "tomaMedicamento": false,
            "tomaMedicamentoDesdeQuando": null,
            "nomesMedicamentos": null,
            "jaFoiHospitalizado": false,
            "quandoFoiHospitalizado": null,
            "razaoHospitalizacao": null
        })
    }

    async fn cadastrar(
        estado: &EstadoAutoCadastro,
        cadastro: &serde_json::Value,
    ) -> StatusCode {
        let requisicao = Request::builder()
            .method("POST")
            .uri("/api/auto-cadastro/pacientes")
            .header("content-type", "application/json")
            .body(Body::from(cadastro.to_string()))
            .expect("montar a requisição de teste");
        rotas_auto_cadastro(estado.clone())
            .oneshot(requisicao)
            .await
            .expect("obter resposta da rota")
            .status()
    }

    fn pacientes_gravados(estado: &EstadoAutoCadastro) -> i64 {
        let conexao = rusqlite::Connection::open(&estado.caminho_banco)
            .expect("abrir o SQLite de teste");
        conexao
            .query_row("SELECT COUNT(*) FROM pacientes", [], |linha| linha.get(0))
            .expect("contar pacientes")
    }

    #[tokio::test]
    async fn cadastro_valido_cria_o_paciente_com_o_valor_padrao_da_consulta() {
        let (_pasta, estado) = estado_de_teste();

        let status = cadastrar(&estado, &cadastro_valido()).await;

        assert_eq!(status, StatusCode::CREATED);
        // O que o app desktop verá no mesmo banco (spec 1.1: valor padrão
        // aplicado automaticamente; campos ocultos ficam vazios).
        let conexao = rusqlite::Connection::open(&estado.caminho_banco)
            .expect("abrir o SQLite de teste");
        let (nome, valor, periodicidade, dia): (String, i64, Option<String>, Option<String>) =
            conexao
                .query_row(
                    "SELECT nome_completo, valor_consulta_centavos,
                            periodicidade, dia_semana_consulta
                     FROM pacientes WHERE cpf = '52998224725'",
                    [],
                    |linha| {
                        Ok((linha.get(0)?, linha.get(1)?, linha.get(2)?, linha.get(3)?))
                    },
                )
                .expect("consultar o paciente criado");
        assert_eq!(nome, "Ana Lima");
        assert_eq!(valor, 25000);
        assert_eq!(periodicidade, None);
        assert_eq!(dia, None);
    }

    #[tokio::test]
    async fn cpf_ja_cadastrado_responde_conflito_e_nada_e_criado_ou_alterado() {
        let (_pasta, estado) = estado_de_teste();
        assert_eq!(cadastrar(&estado, &cadastro_valido()).await, StatusCode::CREATED);

        // Outra pessoa tentando usar o mesmo CPF: o tablet nunca edita.
        let mut repetido = cadastro_valido();
        repetido["nomeCompleto"] = json!("Bia Souza");
        let status = cadastrar(&estado, &repetido).await;

        assert_eq!(status, StatusCode::CONFLICT);
        assert_eq!(pacientes_gravados(&estado), 1);
        let conexao = rusqlite::Connection::open(&estado.caminho_banco)
            .expect("abrir o SQLite de teste");
        let nome: String = conexao
            .query_row(
                "SELECT nome_completo FROM pacientes WHERE cpf = '52998224725'",
                [],
                |linha| linha.get(0),
            )
            .expect("consultar o paciente original");
        assert_eq!(nome, "Ana Lima", "o cadastro original deve ficar intacto");
    }

    #[tokio::test]
    async fn cpf_com_digitos_verificadores_errados_e_recusado_sem_gravar() {
        let (_pasta, estado) = estado_de_teste();
        let mut cadastro = cadastro_valido();
        cadastro["cpf"] = json!("11111111111");

        let status = cadastrar(&estado, &cadastro).await;

        assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY);
        assert_eq!(pacientes_gravados(&estado), 0);
    }

    #[tokio::test]
    async fn campo_obrigatorio_em_branco_e_recusado_sem_gravar() {
        let (_pasta, estado) = estado_de_teste();
        for campo in [
            "nomeCompleto",
            "dataNascimento",
            "genero",
            "religiao",
            "telefone1",
        ] {
            let mut cadastro = cadastro_valido();
            cadastro[campo] = json!("   ");

            let status = cadastrar(&estado, &cadastro).await;

            assert_eq!(
                status,
                StatusCode::UNPROCESSABLE_ENTITY,
                "{campo} em branco deveria ser recusado"
            );
        }
        assert_eq!(pacientes_gravados(&estado), 0);
    }

    #[tokio::test]
    async fn nome_de_foto_que_sai_do_diretorio_de_fotos_e_recusado() {
        let (_pasta, estado) = estado_de_teste();
        // A rota é uma fronteira de rede: um nome com separadores apontaria
        // para fora do diretório de fotos quando o desktop fosse exibi-la.
        for nome in ["../ebers.db", "/etc/passwd", "fotos/../../x.jpg"] {
            let mut cadastro = cadastro_valido();
            cadastro["foto"] = json!(nome);

            let status = cadastrar(&estado, &cadastro).await;

            assert_eq!(
                status,
                StatusCode::UNPROCESSABLE_ENTITY,
                "foto {nome:?} deveria ser recusada"
            );
        }
        assert_eq!(pacientes_gravados(&estado), 0);
    }

    #[tokio::test]
    async fn campos_fora_do_fluxo_de_auto_cadastro_sao_recusados() {
        let (_pasta, estado) = estado_de_teste();
        // A rota é limitada ao fluxo de Auto-cadastro (ADR-0003): os campos
        // que só a Terapeuta define não podem entrar pela rede.
        for (campo, valor) in [
            ("valorConsultaCentavos", json!(100)),
            ("periodicidade", json!("Semanal")),
            ("diaSemanaConsulta", json!("Quarta")),
        ] {
            let mut cadastro = cadastro_valido();
            cadastro[campo] = valor;

            let status = cadastrar(&estado, &cadastro).await;

            assert_eq!(
                status,
                StatusCode::UNPROCESSABLE_ENTITY,
                "{campo} deveria ser recusado"
            );
        }
        assert_eq!(pacientes_gravados(&estado), 0);
    }

    async fn enviar_foto(estado: &EstadoAutoCadastro, corpo: Vec<u8>) -> (StatusCode, Vec<u8>) {
        let requisicao = Request::builder()
            .method("POST")
            .uri("/api/auto-cadastro/fotos")
            .body(Body::from(corpo))
            .expect("montar a requisição de teste");
        let resposta = rotas_auto_cadastro(estado.clone())
            .oneshot(requisicao)
            .await
            .expect("obter resposta da rota");
        let status = resposta.status();
        let corpo = axum::body::to_bytes(resposta.into_body(), usize::MAX)
            .await
            .expect("ler o corpo da resposta");
        (status, corpo.to_vec())
    }

    fn png_de_teste() -> Vec<u8> {
        let imagem = image::RgbImage::from_pixel(32, 32, image::Rgb([200, 120, 80]));
        let mut png = Vec::new();
        image::DynamicImage::ImageRgb8(imagem)
            .write_to(&mut std::io::Cursor::new(&mut png), image::ImageFormat::Png)
            .expect("codificar PNG de teste");
        png
    }

    #[tokio::test]
    async fn foto_enviada_e_gravada_e_o_nome_do_arquivo_volta_na_resposta() {
        let (_pasta, estado) = estado_de_teste();

        let (status, corpo) = enviar_foto(&estado, png_de_teste()).await;

        assert_eq!(status, StatusCode::CREATED);
        let resposta: serde_json::Value =
            serde_json::from_slice(&corpo).expect("resposta em JSON");
        let arquivo = resposta["arquivo"].as_str().expect("nome do arquivo");
        // A foto fica legível no diretório que o app desktop consulta.
        crate::fotos::carregar(&estado.diretorio_fotos, arquivo)
            .expect("a foto gravada deve ser legível");
    }

    #[tokio::test]
    async fn foto_maior_que_o_limite_padrao_do_axum_nao_vira_413() {
        // Foto de câmera de tablet passa fácil dos 2 MB do limite padrão do
        // Axum. O corpo grande tem que chegar ao decodificador — aqui, bytes
        // que não são imagem: a resposta certa é 422, nunca 413.
        let (_pasta, estado) = estado_de_teste();

        let (status, _) = enviar_foto(&estado, vec![7u8; 3 * 1024 * 1024]).await;

        assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY);
    }

    #[tokio::test]
    async fn corpo_que_nao_e_imagem_e_recusado_sem_gravar_nada() {
        let (_pasta, estado) = estado_de_teste();

        let (status, _) = enviar_foto(&estado, b"isto nao e uma imagem".to_vec()).await;

        assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY);
        assert!(
            !estado.diretorio_fotos.exists()
                || std::fs::read_dir(&estado.diretorio_fotos)
                    .map(|conteudo| conteudo.count() == 0)
                    .unwrap_or(true),
            "nenhum arquivo deve sobrar no diretório de fotos"
        );
    }

    /// SPA de mentira com os dois recursos que o build do Vite produz.
    fn spa_de_teste(caminho: &str) -> Option<RecursoSpa> {
        match caminho {
            "/index.html" => Some(RecursoSpa {
                corpo: b"<!doctype html>ebers".to_vec(),
                tipo: "text/html".into(),
            }),
            "/assets/app.js" => Some(RecursoSpa {
                corpo: b"console.log(1)".to_vec(),
                tipo: "text/javascript".into(),
            }),
            _ => None,
        }
    }

    async fn corpo_e_tipo(resposta: axum::response::Response) -> (Vec<u8>, String) {
        let tipo = resposta
            .headers()
            .get("content-type")
            .map(|valor| valor.to_str().unwrap_or_default().to_string())
            .unwrap_or_default();
        let corpo = axum::body::to_bytes(resposta.into_body(), usize::MAX)
            .await
            .expect("ler o corpo da resposta");
        (corpo.to_vec(), tipo)
    }

    #[tokio::test]
    async fn raiz_e_arquivos_da_spa_sao_servidos_com_o_tipo_certo() {
        let resposta = responder_spa(spa_de_teste, "/");
        assert_eq!(resposta.status(), StatusCode::OK);
        let (corpo, tipo) = corpo_e_tipo(resposta).await;
        assert_eq!(corpo, b"<!doctype html>ebers");
        assert_eq!(tipo, "text/html");

        let resposta = responder_spa(spa_de_teste, "/assets/app.js");
        assert_eq!(resposta.status(), StatusCode::OK);
        let (corpo, tipo) = corpo_e_tipo(resposta).await;
        assert_eq!(corpo, b"console.log(1)");
        assert_eq!(tipo, "text/javascript");
    }

    #[tokio::test]
    async fn rota_do_react_router_cai_no_index_para_a_spa_assumir() {
        // O tablet abre qualquer caminho (ex.: /pacientes salvo no favorito)
        // e recebe a SPA, que no navegador redireciona ao Auto-cadastro.
        let resposta = responder_spa(spa_de_teste, "/pacientes");
        assert_eq!(resposta.status(), StatusCode::OK);
        let (corpo, tipo) = corpo_e_tipo(resposta).await;
        assert_eq!(corpo, b"<!doctype html>ebers");
        assert_eq!(tipo, "text/html");
    }

    #[tokio::test]
    async fn arquivo_inexistente_com_extensao_e_404_sem_cair_no_index() {
        let resposta = responder_spa(spa_de_teste, "/assets/sumiu.js");
        assert_eq!(resposta.status(), StatusCode::NOT_FOUND);
    }

    #[tokio::test]
    async fn sem_spa_embutida_qualquer_caminho_e_404() {
        let resposta = responder_spa(|_| None, "/");
        assert_eq!(resposta.status(), StatusCode::NOT_FOUND);
    }
}
