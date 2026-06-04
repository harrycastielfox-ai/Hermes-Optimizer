## Ajuste do botão "OTIMIZAR AGORA"

### Problema
O botão atual é uma imagem pequena (`h-[68px] w-auto`) dentro do card inferior. Ele passa despercebido como CTA principal.

### Objetivo
Transformar o botão em CTA premium, maior e mais destacado, sem alterar cards, sidebar, cores globais ou layout geral.

### O que será feito

**1. Substituir a imagem do botão por componente HTML/CSS customizado em `src/routes/index.tsx`**

O botão atual (linhas 110-112):
```tsx
<button className="ml-auto shrink-0 transition-transform hover:scale-[1.02] active:scale-[0.98]">
  <img src={otimizar.url} alt="Otimizar agora" className="h-[68px] w-auto" />
</button>
```

Será substituído por um botão nativo com:
- **Dimensões**: largura ~340px, altura ~80px
- **Fundo**: gradiente azul elétrico (do primary ao info), com leve transparência no topo para efeito de brilho
- **Ícone**: `Zap` do lucide-react à esquerda, em círculo com fundo branco/azul claro
- **Textos**:
  - Principal: "OTIMIZAR AGORA" — fonte grande (~16px), bold, branco
  - Secundário: "Análise e segurança engine (PRO)" — fonte menor (~11px), branco com opacidade 80%
- **Bordas**: raio 16px, box-shadow com glow azul sutil (`0 0 20px color-mix(in oklab, var(--primary) 25%, transparent)`)
- **Interações**: hover com leve elevação (`translateY(-1px)`), scale sutil, glow intensificado; active com scale 0.98
- **Posição**: mantido no canto inferior direito do card de status (`ml-auto`)

**2. Remover import não utilizado**
- Remover o import do asset `otimizar` e a dependência do arquivo `.asset.json` para este botão.

### O que NÃO será alterado
- Cards de métricas, painéis de informação, sidebar, health ring
- Cores globais do `styles.css` (exceto possível adição de utility local inline se necessário)
- Layout grid do status bar
- Footer
- Dados mockados

### Arquivos alterados
- `src/routes/index.tsx` — apenas a seção do botão dentro do status bar

### Resultado esperado
Botão que domina visualmente o card inferior, claramente identificável como a ação principal da tela, com estética premium coerente ao tema azul elétrico/raios.