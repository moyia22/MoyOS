# Direção visual — __BRAND_NAME__

## Princípio

O visual deve parecer intencional, autoral e adequado ao negócio. Não use aparência genérica de template SaaS. Cada escolha precisa reforçar hierarquia, confiança e ação.

## Base Mazyos

- **Personalidade:** precisa, ousada, humana e orientada a resultado.
- **Contraste:** superfícies claras e quentes com áreas escuras profundas.
- **Acento:** laranja energético usado com moderação para ação e foco.
- **Tipografia:** títulos expressivos; corpo extremamente legível.
- **Composição:** bastante respiro, assimetria controlada e ritmo editorial.

## Tokens iniciais

```css
:root {
  --ink: #11110f;
  --paper: #f4f1e9;
  --surface: #fffdf7;
  --muted: #6d6b63;
  --line: rgba(17, 17, 15, 0.12);
  --accent: __BRAND_ACCENT__;
  --accent-soft: __BRAND_ACCENT_SOFT__;
  --success: #1c8b5c;
  --radius-sm: 0.75rem;
  --radius-md: 1.25rem;
  --radius-lg: 2rem;
}
```

## Regras inegociáveis

- Uma ação primária evidente por tela.
- Hierarquia legível mesmo sem cor.
- Contraste WCAG AA para texto e controles.
- Estados de hover, foco, carregamento, vazio, sucesso e erro quando aplicáveis.
- Movimento com propósito; respeitar `prefers-reduced-motion`.
- Áreas clicáveis mínimas de 44 × 44 px.
- Layout fluido entre 320 px e telas largas.
- Nenhum overflow horizontal ou escala inesperada em telas pequenas.
- Inputs com pelo menos 16 px no mobile para evitar autozoom do navegador.
- O zoom por gesto permanece disponível para acessibilidade; nunca usar `user-scalable=no`.
- Imagens e ícones com função; nunca como preenchimento decorativo aleatório.

## Evitar

- Gradiente roxo/azul automático.
- Excesso de cartões aninhados.
- Ícones dentro de quadrados arredondados em toda seção.
- Centralizar todos os textos e todas as seções.
- Usar três ou mais estilos de sombra.
- Interações que dependem apenas de hover.
- Lorem ipsum, métricas inventadas ou depoimentos falsos na entrega.
