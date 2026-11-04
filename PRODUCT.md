# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Integrante da ROTA (público principal).** Policial da unidade no servidor, que abre o portal todo dia antes e durante o turno. O que mais precisa achar rápido: comunicados do comando e a escala (operações em andamento e quem está no efetivo). Em seguida: caixa de B.O./Ouvidoria, prisões, procurados e Código Penal.
- **Cidadão / jogador da Legacy.** Registra B.O., fala com a Ouvidoria, acompanha o pedido pelo protocolo, consulta a blacklist e o Código Penal.
- **Candidato.** Quer entrar na ROTA: procura editais abertos, prazos, etapas da seleção e envia a ficha de recrutamento.
- **Visitante.** Acabou de conhecer a ROTA e quer entender o que ela é e qual o seu papel na cidade.
- **Administração (comando).** Publica comunicados e editais, aprova pedidos de acesso, emite tokens, mantém efetivo e blacklist.

## Product Purpose

Portal oficial da unidade ROTA (Ronda Ostensiva Tobias de Aguiar) da Cidade Virtual Legacy, servidor de roleplay policial no MTA (GTA San Andreas). Reúne a vitrine da unidade, o atendimento ao cidadão com protocolo e a área operacional da equipe. Sucesso: o integrante encontra ordens e escala em segundos; o cidadão registra e acompanha um pedido sem ajuda; o candidato se inscreve sem dúvidas.

## Positioning

Uma central só, em português, que junta vitrine pública, atendimento com protocolo e operação interna da polícia dentro do RP, com dados compartilhados entre os policiais em vez de planilhas e mensagens soltas no Discord.

## Operating Context

- Uso dentro de sessões de RP: muitas vezes com o jogo aberto, no PC (alt-tab) ou no celular ao lado.
- Comunicação da cidade acontece no Discord; o portal envia registros de prisão ao Discord (webhook opcional).
- Acesso policial por nome aprovado + token pessoal emitido pela administração; administração por usuário e senha do servidor.

## Capabilities and Constraints

- Site estático (HTML, CSS único `css/portal.css`, JavaScript sem framework em `js/app.js`), Cloudflare Pages Functions em `functions/` e Supabase (Postgres, Auth, Storage).
- Rotas por hash (`#inicio`, `#bo-solicitar`, `#acompanhar`, `#painel`…). Não trocar o stack sem motivo; não quebrar APIs, autenticação nem validações.
- Funções existentes: B.O. e Ouvidoria com protocolo e chave de acompanhamento; editais e ficha de recrutamento; comunicados; efetivo com carteirinha; blacklist pública; Código Penal com calculadora e regras de roubo; área policial (caixas de tickets, prisões com fotos, procurados, operações, registros, balanço); administração (pedidos de acesso, tokens, efetivo, candidaturas, histórico).
- "Escala" de quem está em serviço agora não existe como dado real compartilhado: o balanço usa dados locais de exemplo. Não apresentar como real.

## Brand Commitments

- Nome: ROTA, Ronda Ostensiva Tobias de Aguiar. Portal oficial da unidade na Cidade Legacy (a marca Legacy pode aparecer como oficial).
- É roleplay fictício: deixar isso claro em todo o portal e, com destaque, no login. Sem relação com a Polícia Militar de São Paulo; não pedir dados reais.
- Brasão da unidade (`assets/brasao-rota.png`, versão só do escudo em `assets/rota-escudo.png`) e marcas da cidade Legacy (`assets/legacy-*.png`).
- Todo texto em português brasileiro natural.

## Evidence on Hand

- Fotos do jogo: `assets/rota-viatura-noite.webp`, `rota-patrulha.webp`, `rota-equipe.webp`, `rota-integrante.webp`, `subdivision-*-scene.jpg`; emblemas das subdivisões ROCAM, DOAE, SPEED, COAR.
- Conteúdo real vem do banco: efetivo, editais, comunicados, blacklist, prisões, procurados, operações.
- Não existem: números de membros fixos, história oficial escrita, requisitos de ingresso fora dos editais, depoimentos. Não inventar.

## Product Principles

1. O integrante em turno vem primeiro: ordens e escala a um clique.
2. Ninguém precisa saber como o sistema funciona para usar: cada tela diz onde a pessoa está e qual o próximo passo.
3. Só dado real na tela; quando não há dado, um estado vazio que orienta.
4. Ficção explícita: autoridade de unidade de elite dentro do RP, nunca confundível com um órgão real.

## Accessibility & Inclusion

WCAG 2.1 AA (contraste, foco visível, navegação por teclado, `prefers-reduced-motion`). Funcionar bem em celular a partir de 360 px.
