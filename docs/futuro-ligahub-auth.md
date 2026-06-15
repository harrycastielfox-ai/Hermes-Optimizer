# Futuro - Autenticacao e Licenciamento LigaHub

Status: requisito futuro salvo. Nao implementar sem aprovacao explicita.

## Objetivo

Criar o fluxo comercial real do Hermes usando a LigaHub como autenticadora e o WooCommerce como fonte de autorizacao da assinatura.

O recurso deve proteger a interface principal do app: o Hermes so deve liberar a experiencia completa quando o usuario estiver autenticado e possuir acesso ativo ao produto/assinatura WooCommerce `30921`.

## Stack obrigatoria

App desktop:
- Tauri
- React
- TypeScript
- Rust

Autenticacao externa:
- LigaHub
- WordPress
- WooCommerce
- MU-plugin WordPress real

## Regra principal

O MU-plugin WordPress e obrigatorio. Nao usar mock, API simulada, site ponte ou apenas UI local.

Fonte da verdade:
- Login: WordPress/LigaHub
- Assinatura: WooCommerce
- Produto/assinatura: `30921`
- API de autenticacao: MU-plugin WordPress
- Callback: `hermes://`
- Sessao segura: Rust/Tauri
- UI: React/TypeScript

## Fluxo esperado

1. Usuario clica em `Entrar com LigaHub` no Hermes.
2. Tauri abre o navegador padrao no endpoint `/start` do MU-plugin.
3. LigaHub/WordPress autentica o usuario.
4. MU-plugin verifica se o usuario possui acesso ativo ao produto/assinatura WooCommerce `30921`.
5. MU-plugin gera um `AUTH_CODE` temporario, seguro, de uso unico e curta duracao.
6. MU-plugin redireciona diretamente para:

```text
hermes://auth/callback?code=AUTH_CODE&state=STATE_VALUE
```

7. Tauri recebe o deep link.
8. Rust valida o `state`.
9. Rust troca o `AUTH_CODE` por tokens chamando `/exchange`.
10. Rust armazena a sessao de forma segura.
11. React/TypeScript atualiza o estado visual.
12. App libera a interface somente se `authorized: true`.
13. Se nao houver assinatura ativa, app mostra tela bloqueada com link de compra.

Link de compra:

```text
https://play.ligahub.org/hub/hermes/
```

## MU-plugin WordPress

Criar arquivo/plugin real para instalar em:

```text
wp-content/mu-plugins/
```

Endpoints REST obrigatorios:
- `GET /wp-json/hermes-auth/v1/start`
- `POST /wp-json/hermes-auth/v1/exchange`
- `POST /wp-json/hermes-auth/v1/refresh`
- `POST /wp-json/hermes-auth/v1/logout`
- `GET /wp-json/hermes-auth/v1/me`
- `GET /wp-json/hermes-auth/v1/access`

Responsabilidades:
- receber inicio do login por `/start`;
- receber `app`, `state` e `redirect_uri`;
- validar `redirect_uri`;
- permitir apenas callback seguro como `hermes://auth/callback`;
- redirecionar para login LigaHub/WordPress se o usuario nao estiver logado;
- continuar o fluxo automaticamente apos login;
- verificar acesso ativo ao produto/assinatura `30921`;
- gerar `AUTH_CODE` temporario, de uso unico e expiracao curta;
- implementar `/exchange` para trocar `AUTH_CODE` por access token e refresh token;
- rejeitar `AUTH_CODE` expirado ou ja usado;
- implementar `/me`, `/access`, `/refresh` e `/logout`;
- retornar JSON consistente para sucesso, erro, nao autorizado e sem assinatura.

## Verificacao WooCommerce

Produto/assinatura obrigatorio:

```text
30921
```

Se WooCommerce Subscriptions estiver ativo:
- verificar assinatura ativa relacionada ao produto `30921`;
- considerar apenas status realmente ativo, como `active`.

Se WooCommerce Subscriptions nao estiver ativo:
- verificar pedido valido contendo o produto `30921`;
- considerar `completed` ou `processing` se esta regra fizer sentido para o acesso;
- nao autorizar pedidos cancelados, reembolsados, falhos ou pendentes.

Exemplo autorizado:

```json
{
  "authorized": true,
  "user": {
    "id": 123,
    "name": "Nome do Usuario",
    "email": "usuario@email.com"
  },
  "access": {
    "product_id": 30921,
    "status": "active"
  }
}
```

Exemplo sem assinatura:

```json
{
  "authorized": false,
  "reason": "subscription_required",
  "product_id": 30921,
  "purchase_url": "https://play.ligahub.org/hub/hermes/"
}
```

## Integracao Tauri/Rust

O app deve:
- registrar custom protocol/deep link `hermes://`;
- gerar `STATE_VALUE` seguro antes do login;
- guardar `state` temporariamente no lado Rust/Tauri;
- abrir o navegador padrao para:

```text
https://play.ligahub.org/wp-json/hermes-auth/v1/start?app=hermes-desktop&state=STATE_VALUE&redirect_uri=hermes%3A%2F%2Fauth%2Fcallback
```

- receber `hermes://auth/callback?code=AUTH_CODE&state=STATE_VALUE`;
- validar `state`;
- rejeitar callback com `state` invalido;
- chamar `/exchange`;
- salvar tokens de forma segura no Rust/Tauri;
- nao expor tokens sensiveis no React;
- liberar UI apenas com `authorized: true`;
- bloquear UI se `/access` informar assinatura invalida, expirada ou cancelada.

Comandos Rust/Tauri esperados:
- iniciar login;
- processar callback;
- trocar code;
- consultar sessao;
- validar acesso;
- renovar token;
- fazer logout.

Estados de UI:
- `loading`
- `unauthenticated`
- `authenticating`
- `authorized`
- `blocked`
- `error`

## Telas futuras

Tela de login:
- exibida quando nao houver sessao valida;
- botao `Entrar com LigaHub`;
- nao renderizar interface principal antes da autorizacao.

Tela bloqueada:
- exibida quando usuario nao tiver assinatura ativa;
- mensagem: `Este aplicativo requer uma assinatura ativa do Hermes na LigaHub.`;
- botao `Assinar Hermes`;
- link: `https://play.ligahub.org/hub/hermes/`.

Tela principal protegida:
- renderizar apenas quando usuario estiver autenticado, sessao valida e `/access` confirmar `authorized: true`.

## Seguranca obrigatoria

- Nao pedir senha dentro do app se o fluxo usar navegador LigaHub.
- Nao expor tokens no frontend React.
- Nao salvar senha.
- Nao colocar segredos no React.
- Nao colocar tokens permanentes na URL.
- Usar `AUTH_CODE` temporario no callback.
- `AUTH_CODE` deve ser de uso unico e expiracao curta.
- Validar `state`.
- Validar `redirect_uri`.
- Usar HTTPS nas chamadas para LigaHub.
- Revalidar acesso periodicamente com `/access`.
- Bloquear o app se assinatura expirar ou for cancelada.
- Usar Rust/Tauri para armazenamento seguro e operacoes sensiveis.
- Configurar permissoes/capabilities Tauri de forma minima e explicita.
- Nao liberar APIs perigosas ao frontend sem necessidade.
- Nao considerar usuario autorizado apenas por existir token local.
- Autorizacao final depende do MU-plugin/WooCommerce.

## Entregaveis futuros

- App desktop Tauri + React + TypeScript + Rust protegido por autenticacao.
- MU-plugin WordPress real pronto para `wp-content/mu-plugins/`.
- Endpoints REST reais: `/start`, `/exchange`, `/refresh`, `/logout`, `/me`, `/access`.
- Verificacao WooCommerce do produto/assinatura `30921`.
- Registro do custom protocol `hermes://`.
- Handler Rust/Tauri para `hermes://auth/callback`.
- Tipos TypeScript das respostas da API.
- Servico de API.
- Store/contexto de autenticacao no React.
- Comunicacao segura via `invoke` e eventos Tauri.
- Tela de login.
- Tela bloqueada.
- Tela principal protegida.
- Instrucoes de instalacao do MU-plugin.
- Instrucoes de configuracao do deep link.
- Checklist de testes.

## Checklist de testes futuro

- App abre sem sessao e mostra `Entrar com LigaHub`.
- Botao abre navegador na LigaHub.
- `/start` funciona.
- Usuario nao logado e redirecionado para login.
- Fluxo continua apos login.
- Callback `hermes://auth/callback` e recebido com app aberto.
- Callback abre o app quando fechado.
- `state` correto e aceito.
- `state` invalido e rejeitado.
- `/exchange` troca code por token.
- `AUTH_CODE` usado duas vezes e rejeitado.
- `AUTH_CODE` expirado e rejeitado.
- Usuario sem assinatura `30921` e bloqueado.
- Usuario com assinatura ativa `30921` entra.
- Logout limpa sessao.
- Token expirado usa refresh.
- Refresh invalido exige novo login.
- Assinatura cancelada bloqueia no proximo `/access`.
- Nenhum segredo fica no bundle React.
- Tokens sensiveis nao ficam no frontend.
- Permissoes/capabilities Tauri ficam restritas ao necessario.

## Criterio de conclusao

A fase so sera considerada completa quando existir MU-plugin WordPress real, endpoints REST funcionais, verificacao WooCommerce do produto `30921`, deep link `hermes://`, validacao segura em Rust/Tauri, telas de login/bloqueio e protecao real da interface principal.

