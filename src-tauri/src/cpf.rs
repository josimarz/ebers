//! Validação de CPF no backend — espelho de `src/dominio/cpf.ts`.
//!
//! A rota de Auto-cadastro (ADR-0003) recebe cadastros de qualquer navegador
//! da rede local, então o backend valida o CPF por conta própria em vez de
//! confiar na SPA.

/// Valida os dígitos verificadores de um CPF, com ou sem máscara.
pub fn validar(cpf: &str) -> bool {
    let digitos: Vec<u32> = cpf.chars().filter_map(|c| c.to_digit(10)).collect();
    if digitos.len() != 11 {
        return false;
    }
    // Sequências repetidas (111.111.111-11 etc.) passam na aritmética dos
    // verificadores, mas são CPFs inválidos por definição.
    if digitos.iter().all(|&digito| digito == digitos[0]) {
        return false;
    }

    let verificador = |quantidade: usize| -> u32 {
        let soma: usize = digitos[..quantidade]
            .iter()
            .enumerate()
            .map(|(i, &digito)| digito as usize * (quantidade + 1 - i))
            .sum();
        let resto = soma % 11;
        if resto < 2 {
            0
        } else {
            (11 - resto) as u32
        }
    };

    verificador(9) == digitos[9] && verificador(10) == digitos[10]
}

#[cfg(test)]
mod testes {
    use super::validar;

    #[test]
    fn cpf_com_digitos_verificadores_corretos_e_valido() {
        assert!(validar("52998224725"));
    }

    #[test]
    fn mascara_nao_atrapalha_a_validacao() {
        assert!(validar("529.982.247-25"));
    }

    #[test]
    fn digito_verificador_errado_e_invalido() {
        assert!(!validar("52998224724"));
    }

    #[test]
    fn sequencia_repetida_e_invalida_mesmo_passando_na_aritmetica() {
        assert!(!validar("11111111111"));
    }

    #[test]
    fn tamanho_diferente_de_onze_digitos_e_invalido() {
        assert!(!validar("5299822472"));
        assert!(!validar("529982247255"));
        assert!(!validar(""));
    }
}
