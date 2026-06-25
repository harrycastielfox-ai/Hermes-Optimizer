# QA Manual - Máquina Limpa / Instalação

Data: 2026-06-24

Status: **PARCIAL / NO-GO PARA RELEASE PÚBLICO**

## Escopo

Checklist solicitado:

- Instalar.
- Abrir.
- Navegar.
- Testar scroll.
- Testar redimensionar.
- Testar maximizar/restaurar.
- Validar rotas:
  - Dashboard.
  - Otimizar.
  - Anti-Cheat.
  - Defender.
  - Manutenção Programada.
  - Configurações.

## Ambiente Usado Nesta Tentativa

Resultado: **não é uma máquina limpa real**.

Motivos:

- Já existia instalação anterior do Hermes Optimizer em `C:\Users\mchen\AppData\Local\Hermes Optimizer`.
- A máquina já possui histórico de uso do Hermes e outros otimizadores.
- Portanto, esta tentativa vale como **QA local parcial**, não como validação final de máquina limpa.

## Pré-check

- Instalador NSIS release atual gerado com sucesso:
  - `src-tauri\target\release\bundle\nsis\Hermes Optimizer_0.1.0_x64-setup.exe`
- MSI release atual gerado com sucesso:
  - `src-tauri\target\release\bundle\msi\Hermes Optimizer_0.1.0_x64_en-US.msi`
- Build usado:
  - `npm run build:windows:test`
- Modo do build:
  - `VITE_HERMES_SAFE_TEST_MODE=true`
  - `HERMES_SAFE_TEST_MODE=true`
- Release gates:
  - Passou.
- Assinatura:
  - `NotSigned`.
- Branding técnico:
  - Identificador atual esperado: `com.hermesoptimizer.desktop`.
  - Varredura por termos e domínios do branding técnico antigo: sem ocorrências.

## Instalação Local Parcial

Resultado: **PASSOU parcialmente, mas precisa repetir com o Hermes fechado**.

Ações realizadas em rodada anterior:

- Hermes antigo foi fechado.
- Instalação anterior foi removida via `uninstall.exe /S`.
- Instalador NSIS recém-gerado foi instalado via `/S`.
- Executável instalado encontrado em:
  - `C:\Users\mchen\AppData\Local\Hermes Optimizer\hermes-optimizer.exe`
- Registro de instalação encontrado:
  - Nome: `Hermes Optimizer`
  - Versão: `0.1.0`
  - Publisher: `Hermes Optimizer Team`
  - InstallLocation: `C:\Users\mchen\AppData\Local\Hermes Optimizer`

Achado da rodada atual:

- O processo `hermes-optimizer.exe` continuou aberto/elevado e não aceitou fechamento por `Alt+F4`, menu de sistema ou `taskkill`.
- A reinstalação silenciosa não conseguiu substituir `hermes-optimizer.exe` enquanto o processo estava aberto.
- Hash da build release local:
  - `F65DEA0E6F2B4C66D854652E32C397408545317B600D53A3BB78D25C02543601`
- Hash do executável instalado:
  - `B1DB9594B9994799A822551F71F8F23084E6C693FA1EE562588ED70A81940989`
- Conclusão:
  - O instalador deve ser testado novamente após fechar o Hermes manualmente ou após reiniciar o PC.

## Abertura do Aplicativo

Resultado: **PASSOU visualmente, com ressalva de build instalada**.

Observações:

- O app abriu com a identidade nova `com.hermesoptimizer.desktop`.
- O Dashboard apareceu com sidebar reduzida:
  - Dashboard.
  - Otimizar.
  - Anti-Cheat.
  - Defender.
  - Manutenção Programada.
  - Configurações.
- O branding técnico antigo não apareceu na interface observada.
- A validação visual ainda precisa ser repetida depois que o executável instalado bater com a build release atual.

## Navegação

Resultado: **parcial**.

Rotas ainda pendentes para validação completa após reinstalação limpa:

- Dashboard.
- Otimizar.
- Anti-Cheat.
- Defender.
- Manutenção Programada.
- Configurações.

## Scroll / Redimensionamento / Maximizar

Resultado: **parcial**.

Achados:

- A janela custom/transparente funciona visualmente, mas a automação do Windows expôs a janela com metadados de tamanho incorretos.
- Isso dificultou clicar nos controles de fechar/maximizar via automação.
- Precisa de validação manual final para:
  - Arrastar janela.
  - Maximizar/restaurar.
  - Redimensionar.
  - Usar scroll do mouse nas abas longas.

## Veredito Desta Rodada

**NO-GO para QA manual final.**

Não por falha funcional principal, mas porque:

- O ambiente não é uma máquina limpa real.
- O processo instalado ficou aberto/elevado e bloqueou substituição do executável.
- O hash instalado ainda não bate com a build release atual.
- O instalador ainda não está assinado.

## Próxima Ação

1. Fechar o Hermes manualmente ou reiniciar o PC.
2. Reinstalar o NSIS recém-gerado.
3. Confirmar que o hash instalado bate com `src-tauri\target\release\hermes-optimizer.exe`.
4. Repetir validação visual:
   - Dashboard.
   - Otimizar.
   - Anti-Cheat.
   - Defender.
   - Manutenção Programada.
   - Configurações.
5. Validar scroll, maximizar/restaurar e redimensionamento.
6. Repetir o mesmo checklist em VM ou PC realmente limpo.
