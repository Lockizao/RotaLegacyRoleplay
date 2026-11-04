---
name: ROTA · Ronda Ostensiva Tobias de Aguiar (RP)
description: Portal da unidade ROTA na Cidade Legacy, desenhado como a formatura no pátio do batalhão à noite.
colors:
  asfalto: "#15181b"
  chassi: "#1d2125"
  lataria: "#272c31"
  friso: "#353b42"
  friso-forte: "#4b525b"
  faixa: "#f2f1ec"
  texto: "#d7d9db"
  nevoa: "#9ea4ab"
  demarcacao: "#f2c230"
  demarcacao-forte: "#ffd451"
  demarcacao-texto: "#f5cf55"
  sirene: "#d3262e"
  sirene-texto: "#ff7a7e"
  radio: "#4cc78a"
  pendente: "#f0913a"
typography:
  display:
    fontFamily: "Big Shoulders Display, Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "clamp(60px, 7.4vw, 112px)"
    fontWeight: 900
    lineHeight: 0.86
    letterSpacing: "0.005em"
  headline:
    fontFamily: "Big Shoulders Display, Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "clamp(44px, 5.2vw, 64px)"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "0em"
  title:
    fontFamily: "Big Shoulders Display, Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "clamp(30px, 3.2vw, 40px)"
    fontWeight: 700
    lineHeight: 1.1
  numeral:
    fontFamily: "Big Shoulders Stencil Display, Big Shoulders Display, sans-serif"
    fontSize: "44px"
    fontWeight: 700
    lineHeight: 1
    fontFeature: "tnum"
  subtitle:
    fontFamily: "Barlow, system-ui, Segoe UI, sans-serif"
    fontSize: "19px"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Barlow, system-ui, Segoe UI, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Barlow, system-ui, Segoe UI, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.2
  caption:
    fontFamily: "Barlow, system-ui, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.4
  micro:
    fontFamily: "Barlow, system-ui, Segoe UI, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.2
  input:
    fontFamily: "Barlow, system-ui, Segoe UI, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.4
  card-title:
    fontFamily: "Big Shoulders Display, Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.1
  panel-title:
    fontFamily: "Big Shoulders Display, Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.05
  code:
    fontFamily: "ui-monospace, Cascadia Mono, Consolas, monospace"
    fontSize: "0.92em"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  s: "3px"
  m: "6px"
  pill: "999px"
spacing:
  gutter: "24px"
  gutter-mobile: "16px"
  panel: "24px"
  section: "96px"
  section-mobile: "64px"
  wrap: "1240px"
  bar: "64px"
components:
  button-primary:
    backgroundColor: "{colors.demarcacao}"
    textColor: "{colors.asfalto}"
    typography: "{typography.label}"
    rounded: "{rounded.s}"
    padding: "10px 16px"
    height: "42px"
  button-primary-hover:
    backgroundColor: "{colors.demarcacao-forte}"
    textColor: "{colors.asfalto}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.faixa}"
    typography: "{typography.label}"
    rounded: "{rounded.s}"
    padding: "10px 16px"
    height: "42px"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.sirene-texto}"
    rounded: "{rounded.s}"
    padding: "10px 16px"
  button-danger-hover:
    backgroundColor: "{colors.sirene}"
    textColor: "#ffffff"
  button-selected:
    backgroundColor: "{colors.lataria}"
    textColor: "{colors.faixa}"
    rounded: "{rounded.s}"
  input:
    backgroundColor: "{colors.asfalto}"
    textColor: "{colors.faixa}"
    rounded: "{rounded.s}"
    padding: "11px 12px"
    height: "44px"
  panel:
    backgroundColor: "{colors.chassi}"
    textColor: "{colors.texto}"
    rounded: "{rounded.m}"
    padding: "24px"
  tag-aguardando:
    backgroundColor: "rgba(240,145,58,.12)"
    textColor: "{colors.pendente}"
    rounded: "{rounded.pill}"
    padding: "5px 10px"
  tag-ativo:
    backgroundColor: "rgba(76,199,138,.12)"
    textColor: "{colors.radio}"
    rounded: "{rounded.pill}"
    padding: "5px 10px"
  tag-procurado:
    backgroundColor: "rgba(211,38,46,.12)"
    textColor: "{colors.sirene-texto}"
    rounded: "{rounded.pill}"
    padding: "5px 10px"
  nav-item:
    textColor: "{colors.nevoa}"
    typography: "{typography.label}"
    padding: "8px 12px"
    height: "40px"
  nav-item-active:
    textColor: "{colors.faixa}"
---

# Design System: ROTA · Ronda Ostensiva Tobias de Aguiar (RP)

## Overview

**Creative North Star: "Formatura no pátio do batalhão"**

O portal é o pátio do batalhão à noite, com a tropa em forma. O chão é asfalto e concreto grafite, o texto é giz branco e a única tinta forte é o amarelo de demarcação, pintado só onde alguém se posiciona: o item atual, o selecionado, o foco e o próximo passo. Tudo entra em fileira: destinos, etapas, métricas e listas se alinham lado a lado, separados por juntas finas de concreto em vez de cartões soltos.

A densidade muda conforme o modo. Home e ingresso (Persuadir) usam letreiro de comando em caixa alta, foto real do servidor e respiro largo entre blocos (96px). Atendimento, área policial e administração (Operar) viram painéis de concreto com tabelas, filas e métricas em estêncil. Código Penal e regras (Ler) mantêm Barlow em corpo de leitura. É o mesmo mundo em todas as superfícies.

O sistema recusa o "site policial" padrão (hero escuro com viatura, título enorme e três cartões iguais) e o painel tático de videogame (neon, HUD, brilho). A ficção é explícita: o selo "RP fictício" acompanha a marca, e a autoridade vem da disciplina de formação, não de imitar um órgão real.

**Key Characteristics:**
- Chão escuro e chapado em três camadas tonais (asfalto, chassi, lataria), sem sombra em repouso.
- Amarelo de demarcação raro e funcional: marca em "L" nos quatro cantos, linha pintada sob o cabeçalho e botão principal.
- Letreiro condensado Big Shoulders para comando; estêncil só em números grandes; Barlow para todo o resto.
- Fileiras alinhadas com juntas de 1px no lugar de grades de cartões.
- Cor de estado presa ao item: verde ativo/aceito, laranja aguardando, vermelho alerta/procurado.
- Ícones exclusivamente Lucide.

## Colors

Paleta de poucas tintas sobre concreto escuro: um amarelo de pátio que marca posição, um verde de rádio, um laranja de pendência e o vermelho da faixa paulista, cada um com um único trabalho.

### Primary
- **Amarelo de Demarcação** (`demarcacao`): a tinta do chão do pátio. Pinta a marca de posição em "L" (item ativo do menu lateral, aba ativa, opção marcada, item do Código Penal selecionado, etapa atual), a linha de 72px sob o cabeçalho de página e acima da Ordem do dia, a régua sob a foto da formação, o fundo do botão principal, o contorno de foco e a seleção de texto. Mais vivo no hover (`demarcacao-forte`); em texto e numerais sobre o escuro usa a versão `demarcacao-texto`.

### Secondary
- **Verde Rádio** (`radio`): em forma, ativo, aceito, conexão ao vivo. Chip de situação ativa, estado "aceito" do pedido, protocolo emitido, ponto de status do servidor.

### Tertiary
- **Vermelho Sirene** (`sirene`, texto em `sirene-texto`): alerta, procurado, recusado e ação destrutiva. Chip vermelho, aviso de blacklist e regra de roubo, hover do botão de exclusão, mensagens de erro.
- **Laranja Pendente** (`pendente`): exclusivamente o chip "Aguardando" e o estado pendente do pedido enviado.

### Neutral
- **Asfalto** (`asfalto`): fundo da página, fundo de campos, cartões dentro de painéis.
- **Chassi** (`chassi`): painéis, menu lateral da área policial, rodapé, modal.
- **Lataria** (`lataria`): superfície elevada; hover, fundo de item selecionado sob a marca em "L", avisos.
- **Friso** (`friso`): juntas de 1px entre fileiras, bordas de painel, divisórias.
- **Friso Forte** (`friso-forte`): borda de botões e campos (1.5px), borda de item selecionado.
- **Giz** (`faixa`): títulos, números, texto forte, toast.
- **Texto** (`texto`): corpo corrido.
- **Névoa** (`nevoa`): texto secundário, legendas, cabeçalhos de tabela (7:1 sobre o asfalto).

### Named Rules
**The Demarcação Rule.** Amarelo só onde há posição: o item atual, o selecionado, o foco e o próximo passo (marca em "L" via `--pos`, linha pintada sob o cabeçalho, botão principal). Nunca em ícones decorativos, títulos, selos ou fundos de seção.

**The Sirene Rule.** Vermelho só para alerta, procurado e ação destrutiva. Se nada está em risco, não há vermelho na tela.

**The Aguardando Rule.** Laranja existe apenas no chip "Aguardando" e no estado pendente que ele representa. Nenhum outro elemento usa laranja.

**The Em Forma Rule.** Verde marca ativo e aceito, e nada mais; não é cor de sucesso genérica para decoração.

## Typography

**Display Font:** Big Shoulders Display 700/800/900 (com Barlow Condensed, Arial Narrow)
**Numeral Font:** Big Shoulders Stencil Display 700 (com Big Shoulders Display)
**Body Font:** Barlow 400/500/600/700 (com system-ui, Segoe UI)

**Character:** Letreiro de comando condensado e alto, como o pintado em muro de quartel, sobre uma sans de interface sóbria e legível. O estêncil é a tinta de marcar número no chão e aparece só em escala grande.

### Hierarchy
- **Display** (900, clamp 60–112px, 0.86, caixa alta): somente o título de comando da home ("A ROTA está em forma.").
- **Headline** (800, clamp 44–64px, 0.95): título de página (h1) no cabeçalho de página, com a linha amarela pintada embaixo.
- **Title** (700, clamp 30–40px, 1.1): títulos de seção e de painel (h2), entre 24 e 36px dentro de painéis.
- **Numeral** (700 estêncil, 40–48px, 1, algarismos tabulares): números de posição dos destinos, etapas do ingresso, métricas do painel, pena total da calculadora, contagens da formação.
- **Subtitle** (Barlow 600, 19px, 1.3): h3/h4 em cartões e linhas.
- **Body** (Barlow 400, 17px, 1.55; 16px abaixo de 760px): texto corrido, até ~60ch na Ordem do dia e 34–44em nos textos de abertura.
- **Label** (Barlow 600, 15px): botões, rótulos de campo, navegação, cabeçalhos de tabela.
- **Caption** (Barlow 400, 13–14px): datas, contagens, dicas e legendas, sempre em névoa.

### Named Rules
**The Estêncil Grande Rule.** Estêncil só em números grandes (40px ou mais). Abaixo disso o número usa Big Shoulders Display ou Barlow.

**The Sem Kicker Rule.** Nenhum rótulo em caixa alta acima de títulos. O título se apresenta sozinho; contexto vai na linha de apoio abaixo dele.

## Layout

Coluna central de 1240px com margem lateral de 24px (16px até 760px, 14px até 400px) e cabeçalho fixo de 64px com fundo translúcido e desfoque. Na área policial, a partir de 1200px, o cabeçalho vira menu lateral fixo de 248px em chassi, e o conteúdo fica em até 1180px com 40px de margem.

A home abre em grade 7/5: texto de comando e Ordem do dia à esquerda, foto da formação em retrato à direita (mínimo 560px de altura), com a régua amarela e os números em estêncil no rodapé da foto. Os blocos seguintes ("Para onde você vai", ingresso, subdivisões) ficam a 96px um do outro (64px no celular). As fileiras usam grade de colunas iguais com juntas verticais de 1px e linhas de 1px em cima e embaixo, não cartões espaçados.

Painéis internos usam 24px de respiro e cabeçalhos de 18–24px. Grades de cartões são auto-fill com mínimo de 280–340px e espaço de 12–16px.

Responsivo: até 1199px a navegação vira menu recolhível; até 1099px colunas laterais (calculadora penal, ouvidoria, ficha) descem para baixo e a home passa a uma coluna; até 760px fileiras de quatro viram uma coluna com a seta à direita, métricas viram 2×2, tabelas de efetivo e fila viram um cartão por linha, e ações de cabeçalho ocupam a largura toda. Funciona a partir de 360px.

## Elevation & Depth

O sistema é chapado. A profundidade vem de camadas tonais (asfalto, chassi, lataria) e de juntas de 1px; nada tem sombra em repouso. Sombra aparece apenas no que flutua sobre a página: submenu, menu móvel, modal e toast. O foco de campo é um anel amarelo translúcido, não uma sombra.

### Shadow Vocabulary
- **Submenu** (`box-shadow: 0 14px 34px rgba(0,0,0,.45)`): submenu da navegação aberto.
- **Menu móvel** (`box-shadow: 0 20px 40px rgba(0,0,0,.5)`): navegação recolhida aberta.
- **Modal** (`box-shadow: 0 30px 80px rgba(0,0,0,.6)`): janela modal, sobre fundo escurecido com desfoque de 3px.
- **Toast** (`box-shadow: 0 12px 30px rgba(0,0,0,.5)`): aviso em giz no rodapé da tela.
- **Foco de campo** (`box-shadow: 0 0 0 3px rgba(242,194,48,.18)`): anel ao redor de campo focado, com borda em amarelo.

### Named Rules
**The Chão Chapado Rule.** Superfícies são planas em repouso. Para destacar, sobe uma camada tonal (chassi para lataria); só o que flutua ganha sombra.

## Shapes

Cantos quase retos: 3px em botões, campos, avisos e chips quadrados; 6px em painéis, cartões, modal e foto. Pílula (999px) só para chips de situação, contadores e o selo "RP fictício". Bordas de 1px para juntas e painéis, 1.5px para controles. A forma assinatura é a marca de posição: quatro cantos em "L" de 12×2px pintados em amarelo nos cantos do item, desenhados com gradientes de fundo, nunca uma borda inteira. A outra é a linha pintada: um traço amarelo de 72×3px que inicia a divisória sob cabeçalhos de página e sobre a Ordem do dia.

## Components

### Buttons
Firmes e baixos, como placa de instrução.
- **Shape:** canto quase reto (3px), altura mínima de 42px (50px nas ações da home), borda de 1.5px.
- **Primary:** fundo amarelo de demarcação com texto asfalto em 700. Um por tela ou por bloco: é o próximo passo.
- **Secondary:** transparente, borda friso forte, texto giz; no hover a borda vira giz.
- **Danger:** borda vermelha a 60%, texto sirene; no hover enche de vermelho sirene com texto branco.
- **Link:** sem borda, sublinhado de 2px em friso forte que vira amarelo no hover.
- **Selecionado / ativo:** fundo lataria com a marca em "L" nos quatro cantos.
- **Hover / Focus:** transição de cor em 150ms; pressionado desce 1px; foco com contorno amarelo de 2px afastado 3px.

### Chips
- **Style:** pílula, Barlow 600 13px, padding 5px 10px, fundo tingido a 12% com borda a 30–35% da mesma cor.
- **State:** verde para ativo/aceito, laranja só para "Aguardando", vermelho para procurado/recusado/inativo, neutro em lataria para o resto.

### Cards / Containers
- **Corner Style:** 6px.
- **Background:** chassi sobre o asfalto; cartões dentro de painel voltam ao asfalto.
- **Shadow Strategy:** nenhuma (ver Elevation & Depth).
- **Border:** 1px friso; tracejado em friso forte para estados vazios e consulta de protocolo.
- **Internal Padding:** 20–24px; rodapé de ações separado por junta de 1px.

### Inputs / Fields
- **Style:** fundo asfalto, borda 1.5px friso forte, 3px, mínimo de 44px, Barlow 16px; rótulo em giz 600 acima.
- **Focus:** borda amarela e anel amarelo translúcido de 3px.
- **Error / Disabled:** erro em texto sirene 14px abaixo do campo; desabilitado a 50% de opacidade.
- **Opção em cartão (categoria do B.O., patente, armas):** cartão de 6px com borda friso; marcado ganha lataria e marca em "L".

### Navigation
- **Topo (público):** itens em Barlow 600 cor névoa; hover em giz sobre chassi; ativo em giz com traço amarelo de 3px na base. "Área policial" é o único item com borda.
- **Menu lateral (área policial, a partir de 1200px):** coluna em chassi com grupos rotulados em névoa 13px; item ativo em lataria com a marca em "L"; contador em pílula de giz.
- **Móvel:** menu recolhido abaixo do cabeçalho, itens de 46px, ativo em lataria com a marca em "L".

### Fileira de formação (assinatura)
Destinos, etapas e métricas lado a lado em colunas iguais, separados por juntas verticais de 1px, com número de posição em estêncil grande. A posição recomendada (por exemplo "Sou da equipe") recebe a marca em "L" e o número em amarelo; as demais ficam em giz. A seta de avanço desliza 6px no hover. No celular a fileira vira lista vertical.

### Cabeçalho de página
Título headline à esquerda com linha de apoio em névoa e ações à direita, sobre uma divisória de 1px iniciada pela linha amarela de 72px. Ao chegar na página a linha é "pintada" da esquerda para a direita (600ms).

### Movimento
Um único momento autoral por chegada de página: o conteúdo sobe 6px e ganha opacidade (360ms), a linha amarela é pintada, e na home os marcadores do efetivo entram em forma em sequência (14ms entre cada um). Curva `cubic-bezier(.16,1,.3,1)`. Re-renderizações de dados não repetem a animação, e `prefers-reduced-motion` desliga tudo.

## Do's and Don'ts

### Do:
- **Do** usar o amarelo de demarcação (#f2c230) só para posição, seleção, foco e próximo passo: marca em "L" (`--pos`), linha pintada de 72×3px sob o cabeçalho e botão principal.
- **Do** reservar o vermelho sirene para alerta, procurado e ação destrutiva; o laranja pendente só para o chip "Aguardando"; o verde rádio para ativo e aceito.
- **Do** usar Big Shoulders Stencil Display apenas em números de 40px ou mais.
- **Do** alinhar conteúdo em fileiras com juntas de 1px (friso) em vez de cartões soltos.
- **Do** separar camadas por tom (asfalto, chassi, lataria) e manter as superfícies sem sombra em repouso.
- **Do** usar só ícones Lucide (gerados em `js/icons.js`), em 1.15em ao lado do texto.
- **Do** manter o selo "RP fictício" junto da marca e o aviso de ficção no login e no rodapé.

### Don't:
- **Don't** colocar rótulos em caixa alta acima de títulos (kickers ou eyebrows); a classe existe oculta e não deve voltar a aparecer.
- **Don't** usar símbolos Unicode como ícone (✓, ×, ★, setas); use o ícone Lucide equivalente.
- **Don't** usar amarelo em ícones decorativos, títulos ou selos, nem vermelho como cor de destaque.
- **Don't** aplicar estêncil em protocolos, prefixos ou números pequenos.
- **Don't** montar a home como hero escuro com viatura, título enorme e três cartões iguais.
- **Don't** imitar painel tático de videogame: nada de neon, brilho ou HUD.
