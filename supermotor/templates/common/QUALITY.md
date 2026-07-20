# Quality Gate — __PROJECT_NAME__

O projeto só está pronto quando todos os itens aplicáveis estiverem verificados.

## Produto

- [ ] A proposta de valor é entendida nos primeiros 5 segundos.
- [ ] O fluxo principal funciona de ponta a ponta.
- [ ] Botões e links executam a ação prometida.
- [ ] Não há conteúdo genérico, falso ou contraditório.
- [ ] Estados vazios, erros e carregamentos foram considerados.

## Visual

- [ ] Existe uma direção visual clara e consistente.
- [ ] Tipografia, espaçamento, cores, raios e sombras seguem tokens.
- [ ] A página não parece um template genérico de IA.
- [ ] O CTA principal domina sem competir com vários CTAs equivalentes.
- [ ] Movimento melhora compreensão e feedback.

## Responsividade e acessibilidade

- [ ] Testado em 320, 768, 1024 e 1440 px.
- [ ] Não existe rolagem horizontal ou conteúdo cortado em 320 px.
- [ ] Inputs usam pelo menos 16 px em telas móveis e não causam autozoom ao receber foco.
- [ ] A viewport usa `width=device-width, initial-scale=1` sem bloquear pinch zoom.
- [ ] Navegação por teclado funciona e o foco é visível.
- [ ] HTML semântico, rótulos e textos alternativos estão corretos.
- [ ] Contraste atende WCAG AA.
- [ ] `prefers-reduced-motion` é respeitado.

## Engenharia

- [ ] `npm run typecheck` passa.
- [ ] `npm run lint` passa.
- [ ] `npm run build` passa.
- [ ] Não há segredos, chaves ou dados pessoais no repositório.
- [ ] Componentes têm responsabilidade clara e nomes compreensíveis.
- [ ] Dependências existem por uma necessidade real.

## Entrega

- [ ] Favicon real ou monograma aprovado está configurado e visível na aba.
- [ ] O README explica instalação, execução e personalização.
- [ ] A experiência foi inspecionada visualmente no navegador.
- [ ] Não existem erros relevantes no console.
- [ ] A entrega informa o que foi feito e qualquer limitação real.
- [ ] Agentes registraram etapas, testes, bloqueios e conclusão em `.supermotor/`.
