import { ArrowUpRight, Gauge, Layers3, MoveRight, ShieldCheck, Sparkles } from "lucide-react";

const principles = [
  {
    number: "01",
    title: "Clareza antes do efeito",
    description: "A mensagem conduz o visual. Cada seção responde uma pergunta real do cliente.",
    icon: Sparkles,
  },
  {
    number: "02",
    title: "Sistema, não colagem",
    description: "Tipografia, cor, espaço e movimento formam uma linguagem única e reconhecível.",
    icon: Layers3,
  },
  {
    number: "03",
    title: "Velocidade percebida",
    description: "Carregamento rápido, leitura fluida e interações que respondem imediatamente.",
    icon: Gauge,
  },
];

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#inicio" aria-label="__PROJECT_NAME__ — início">
          <span className="brand-mark" aria-hidden="true">M</span>
          <span>__PROJECT_NAME__</span>
        </a>
        <nav aria-label="Navegação principal">
          <a href="#metodo">Método</a>
          <a href="#experiencia">Experiência</a>
          <a className="nav-cta" href="#contato">Começar <ArrowUpRight size={16} /></a>
        </nav>
      </header>

      <section className="hero" id="inicio">
        <div className="hero-copy">
          <p className="eyebrow"><span /> Experiências digitais com intenção</p>
          <h1>Ideias fortes merecem uma presença <em>inesquecível.</em></h1>
          <p className="hero-description">__PROJECT_BRIEF__</p>
          <div className="hero-actions">
            <a className="button button-primary" href="#contato">Construir agora <MoveRight size={19} /></a>
            <a className="text-link" href="#metodo">Conhecer o método <span>↓</span></a>
          </div>
        </div>

        <div className="hero-art" aria-label="Composição visual da marca">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="hero-disc">
            <span>clareza</span>
            <strong>×</strong>
            <span>impacto</span>
          </div>
          <div className="art-note art-note-top">Estratégia<br />que aparece</div>
          <div className="art-note art-note-bottom">Feito para<br />mover pessoas</div>
        </div>
      </section>

      <section className="manifesto" id="metodo">
        <p className="section-label">Nosso ponto de partida</p>
        <p className="manifesto-copy">Um bom site não decora uma empresa. Ele transforma o que ela tem de melhor em uma experiência que as pessoas <strong>entendem, sentem e escolhem.</strong></p>
      </section>

      <section className="principles" id="experiencia">
        <div className="section-heading">
          <div>
            <p className="section-label">Como construímos</p>
            <h2>Menos ruído.<br />Mais direção.</h2>
          </div>
          <p>Três princípios para uma presença digital que trabalha tão bem quanto parece.</p>
        </div>

        <div className="principle-grid">
          {principles.map(({ number, title, description, icon: Icon }) => (
            <article className="principle-card" key={number}>
              <div className="card-top"><span>{number}</span><Icon aria-hidden="true" size={26} strokeWidth={1.6} /></div>
              <h3>{title}</h3>
              <p>{description}</p>
              <a href="#contato" aria-label={`Aplicar princípio: ${title}`}><ArrowUpRight size={18} /></a>
            </article>
          ))}
        </div>
      </section>

      <section className="spotlight">
        <div className="spotlight-copy">
          <p className="section-label light">Sistema vivo</p>
          <h2>Bonito no primeiro olhar. Coerente em cada detalhe.</h2>
          <p>Uma base pronta para receber conteúdo real, crescer com o produto e manter a identidade sem perder velocidade.</p>
          <ul>
            <li><ShieldCheck size={19} /> Acessível e responsivo por padrão</li>
            <li><ShieldCheck size={19} /> Componentes guiados por tokens</li>
            <li><ShieldCheck size={19} /> Estrutura preparada para evolução</li>
          </ul>
        </div>
        <div className="spotlight-panel">
          <div className="panel-header"><span>Design system</span><span>v1.0</span></div>
          <div className="color-row"><span /><span /><span /><span /></div>
          <div className="type-sample"><span>Aa</span><p>Forma e função<br />na mesma direção.</p></div>
          <div className="panel-footer"><span>__PROJECT_NAME__</span><span>2026</span></div>
        </div>
      </section>

      <section className="final-cta" id="contato">
        <p className="section-label">Próximo movimento</p>
        <h2>Vamos transformar<br />a ideia em presença?</h2>
        <a className="button button-primary" href="mailto:contato@exemplo.com">Iniciar conversa <ArrowUpRight size={20} /></a>
      </section>

      <footer>
        <div className="brand"><span className="brand-mark">M</span><span>__PROJECT_NAME__</span></div>
        <p>Feito com direção, cuidado e SUPERMOTOR.</p>
        <a href="#inicio">Voltar ao topo ↑</a>
      </footer>
    </main>
  );
}
