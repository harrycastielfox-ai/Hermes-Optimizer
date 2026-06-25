# Licenciamento - Release 0.1.0

Status: **congelado para esta release**.

## Decisao

O Hermes Optimizer 0.1.0 nao possui ativacao real, pagamento integrado, validacao de chave, login Hermes Account ou chamada para servidor de licenca.

## Comportamento do app

- A tela de configuracoes deve exibir licenciamento como congelado/indisponivel.
- Nenhum recurso deve depender de uma licenca simulada.
- Nenhuma chave digitavel deve ser aceita como se fosse validacao real.
- Nenhum checkout, pagamento ou assinatura deve ser prometido dentro do app.

## Fonte futura

O fluxo real aprovado para uma fase futura esta documentado em `docs/futuro-hermes-auth.md`.

## Criterio para descongelar

Descongelar somente quando existir:

- MU-plugin WordPress real na Hermes Account.
- Validacao WooCommerce do produto/assinatura `30921`.
- Deep link `hermes://`.
- Sessao segura no Rust/Tauri.
- UI de login/bloqueio protegendo a interface principal.
- Testes manuais do fluxo completo de autorizacao.

