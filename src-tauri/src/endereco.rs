//! Endereço do Auto-cadastro na rede local (issue #21): o que o QR code da
//! modal "Auto-cadastro no tablet" codifica. A máquina pode ter vários
//! endereços IPv4 ao mesmo tempo (Wi-Fi, Ethernet, VPN, compartilhamento de
//! internet); a escolha é automática e a terapeuta nunca vê uma opção de rede.

use std::net::{IpAddr, Ipv4Addr, SocketAddr, UdpSocket};

use serde::Serialize;

use crate::servidor::{EstadoDoServidor, PORTA};

/// Resposta do comando `endereco_auto_cadastro`, como a modal a lê
/// (src/db/servidor.ts). Servidor fora do ar prevalece sobre sem rede: com a
/// porta fechada, endereço nenhum serviria.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(tag = "estado", rename_all = "kebab-case")]
pub enum EnderecoAutoCadastro {
    NoAr { url: String },
    ForaDoAr,
    SemRede,
}

/// Um endereço IPv4 da máquina e o nome da interface que o carrega.
pub type EnderecoDaMaquina = (String, Ipv4Addr);

/// O que a modal do QR code mostra agora: relido a cada abertura, porque o
/// endereço muda quando a máquina troca de rede.
pub fn endereco_auto_cadastro(estado: &EstadoDoServidor) -> EnderecoAutoCadastro {
    resolver(estado.no_ar(), &enderecos_da_maquina(), endereco_de_saida())
}

/// Decide a resposta a partir do estado do servidor e dos endereços da
/// máquina (`saida` é o endereço pelo qual ela sai para a rede, se conhecido).
pub fn resolver(
    no_ar: bool,
    enderecos: &[EnderecoDaMaquina],
    saida: Option<Ipv4Addr>,
) -> EnderecoAutoCadastro {
    if !no_ar {
        return EnderecoAutoCadastro::ForaDoAr;
    }
    match escolher(enderecos, saida) {
        Some(ip) => EnderecoAutoCadastro::NoAr {
            url: url_do_auto_cadastro(ip),
        },
        None => EnderecoAutoCadastro::SemRede,
    }
}

/// A URL que o tablet abre — porta fixa (servidor.rs), para o favorito do
/// navegador sobreviver aos reinícios do app.
pub fn url_do_auto_cadastro(ip: Ipv4Addr) -> String {
    format!("http://{ip}:{PORTA}")
}

/// Escolhe, entre os endereços da máquina, o que o tablet deve abrir: um da
/// rede local — de preferência o pelo qual a máquina sai para a rede e, sem
/// esse, o da interface com mais cara de Wi-Fi ou Ethernet do consultório.
pub fn escolher(enderecos: &[EnderecoDaMaquina], saida: Option<Ipv4Addr>) -> Option<Ipv4Addr> {
    let mut candidatos: Vec<&EnderecoDaMaquina> = enderecos
        .iter()
        .filter(|(_, ip)| na_rede_local(*ip))
        .collect();
    if let Some(saida) = saida.filter(|saida| candidatos.iter().any(|(_, ip)| ip == saida)) {
        return Some(saida);
    }
    candidatos.sort_by_key(|(nome, _)| (prioridade_da_interface(nome), nome.to_ascii_lowercase()));
    candidatos.first().map(|(_, ip)| *ip)
}

/// Endereço que um tablet no Wi-Fi do consultório alcança: as faixas privadas
/// (RFC 1918 — 10/8, 172.16/12 e 192.168/16). Ficam de fora o loopback, os
/// link-local (169.254/16) e a faixa de túneis 100.64/10 (Tailscale,
/// operadoras) — nenhum deles está nas faixas privadas.
fn na_rede_local(ip: Ipv4Addr) -> bool {
    ip.is_private()
}

/// Desempate quando não se sabe por onde a máquina sai: Wi-Fi e Ethernet
/// (`en*` no macOS, `eth*`/`enp*`/`wl*` no Linux, "Ethernet"/"Wi-Fi" no
/// Windows) primeiro; pontes, túneis e redes virtuais por último.
fn prioridade_da_interface(nome: &str) -> u8 {
    const VIRTUAIS: [&str; 11] = [
        "bridge", "utun", "tun", "tap", "veth", "docker", "vmnet", "vbox", "awdl", "llw", "ap",
    ];
    const FISICAS: [&str; 5] = ["en", "eth", "wl", "wi-fi", "wifi"];
    let nome = nome.to_ascii_lowercase();
    if VIRTUAIS.iter().any(|prefixo| nome.starts_with(prefixo)) {
        2
    } else if FISICAS.iter().any(|prefixo| nome.starts_with(prefixo)) {
        0
    } else {
        1
    }
}

/// Endereços IPv4 de todas as interfaces da máquina, com o nome de cada uma.
fn enderecos_da_maquina() -> Vec<EnderecoDaMaquina> {
    local_ip_address::list_afinet_netifas()
        .unwrap_or_default()
        .into_iter()
        .filter_map(|(nome, ip)| match ip {
            IpAddr::V4(ip) => Some((nome, ip)),
            IpAddr::V6(_) => None,
        })
        .collect()
}

/// O endereço pelo qual a máquina sai para a rede — o mesmo que o roteador
/// do consultório enxerga. Um `connect` de UDP não envia pacote nenhum: só
/// pede ao sistema a rota (e o endereço local) que ele usaria para aquele
/// destino. Sem rota padrão (máquina sem roteador), volta `None` e o
/// desempate por nome de interface decide.
fn endereco_de_saida() -> Option<Ipv4Addr> {
    let socket = UdpSocket::bind((Ipv4Addr::UNSPECIFIED, 0)).ok()?;
    socket.connect(SocketAddr::from(([1, 1, 1, 1], 53))).ok()?;
    match socket.local_addr().ok()?.ip() {
        IpAddr::V4(ip) => Some(ip),
        IpAddr::V6(_) => None,
    }
}

#[cfg(test)]
mod testes {
    use super::*;

    fn endereco(nome: &str, ip: [u8; 4]) -> EnderecoDaMaquina {
        (nome.to_string(), Ipv4Addr::from(ip))
    }

    #[test]
    fn servidor_fora_do_ar_prevalece_mesmo_com_rede() {
        let enderecos = [endereco("en0", [192, 168, 0, 10])];

        assert_eq!(
            resolver(false, &enderecos, None),
            EnderecoAutoCadastro::ForaDoAr
        );
    }

    #[test]
    fn sem_endereco_na_rede_local_e_sem_rede() {
        assert_eq!(resolver(true, &[], None), EnderecoAutoCadastro::SemRede);
    }

    #[test]
    fn no_ar_monta_a_url_com_a_porta_fixa() {
        let enderecos = [endereco("en0", [192, 168, 0, 10])];

        assert_eq!(
            resolver(true, &enderecos, None),
            EnderecoAutoCadastro::NoAr {
                url: "http://192.168.0.10:8738".into()
            }
        );
    }

    #[test]
    fn loopback_link_local_e_tuneis_nao_servem_para_o_tablet() {
        // Nenhum deles é alcançável pelo Wi-Fi do consultório: loopback só
        // vale na própria máquina, link-local não passa por roteador e a
        // faixa 100.64/10 é de túneis (Tailscale, operadoras).
        let enderecos = [
            endereco("lo0", [127, 0, 0, 1]),
            endereco("awdl0", [169, 254, 10, 2]),
            endereco("utun3", [100, 64, 0, 7]),
        ];

        assert_eq!(
            resolver(true, &enderecos, None),
            EnderecoAutoCadastro::SemRede
        );
    }

    #[test]
    fn prefere_o_endereco_pelo_qual_a_maquina_sai_para_a_rede() {
        let enderecos = [
            endereco("en0", [192, 168, 0, 10]),
            endereco("en5", [10, 0, 0, 4]),
        ];

        assert_eq!(
            escolher(&enderecos, Some(Ipv4Addr::new(10, 0, 0, 4))),
            Some(Ipv4Addr::new(10, 0, 0, 4))
        );
    }

    #[test]
    fn saida_por_um_tunel_nao_conta_e_a_rede_local_ganha() {
        // VPN de túnel completo: a rota padrão sai pelo utun, mas o tablet
        // só chega pelo Wi-Fi.
        let enderecos = [
            endereco("en0", [192, 168, 0, 10]),
            endereco("utun4", [100, 100, 1, 1]),
        ];

        assert_eq!(
            escolher(&enderecos, Some(Ipv4Addr::new(100, 100, 1, 1))),
            Some(Ipv4Addr::new(192, 168, 0, 10))
        );
    }

    #[test]
    fn sem_saida_conhecida_wifi_e_ethernet_vem_antes_de_pontes_e_tuneis() {
        let enderecos = [
            endereco("bridge100", [192, 168, 2, 1]),
            endereco("utun2", [10, 8, 0, 2]),
            endereco("en1", [192, 168, 0, 10]),
        ];

        assert_eq!(
            escolher(&enderecos, None),
            Some(Ipv4Addr::new(192, 168, 0, 10))
        );
    }

    #[test]
    fn nomes_de_interface_do_windows_e_do_linux_tambem_sao_reconhecidos() {
        let windows = [
            endereco("vEthernet (Default Switch)", [172, 20, 0, 1]),
            endereco("Wi-Fi", [192, 168, 0, 10]),
        ];
        let linux = [
            endereco("docker0", [172, 17, 0, 1]),
            endereco("wlp2s0", [192, 168, 0, 11]),
        ];

        assert_eq!(
            escolher(&windows, None),
            Some(Ipv4Addr::new(192, 168, 0, 10))
        );
        assert_eq!(escolher(&linux, None), Some(Ipv4Addr::new(192, 168, 0, 11)));
    }

    #[test]
    fn resposta_serializa_como_a_modal_espera() {
        // O contrato com src/db/servidor.ts: campo `estado` em kebab-case.
        let no_ar = EnderecoAutoCadastro::NoAr {
            url: "http://192.168.0.10:8738".into(),
        };

        assert_eq!(
            serde_json::to_value(no_ar).expect("serializar"),
            serde_json::json!({ "estado": "no-ar", "url": "http://192.168.0.10:8738" })
        );
        assert_eq!(
            serde_json::to_value(EnderecoAutoCadastro::ForaDoAr).expect("serializar"),
            serde_json::json!({ "estado": "fora-do-ar" })
        );
        assert_eq!(
            serde_json::to_value(EnderecoAutoCadastro::SemRede).expect("serializar"),
            serde_json::json!({ "estado": "sem-rede" })
        );
    }

    #[test]
    fn servidor_nasce_fora_do_ar_ate_abrir_a_porta() {
        assert_eq!(
            endereco_auto_cadastro(&EstadoDoServidor::default()),
            EnderecoAutoCadastro::ForaDoAr
        );
    }
}
