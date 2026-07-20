import { ArrowRight, CheckCircle, Mail, Phone, MapPin } from "lucide-react";

const features = [
  { title: "Rapido e leve", description: "Carregamento instantaneo que mantem o visitante engajado." },
  { title: "Design responsivo", description: "Experiencia perfeita em qualquer dispositivo." },
  { title: "SEO otimizado", description: "Visibilidade organica desde o primeiro dia." },
];

const steps = [
  { number: "01", title: "Descubra", description: "Entenda seu publico e defina sua mensagem principal." },
  { number: "02", title: "Construa", description: "Desenvolva uma pagina que converte visitantes em clientes." },
  { number: "03", title: "Lance", description: "Publique e comece a atrair leads qualificados." },
];

export default function Home() {
  return (
    <main>
      <header className="landing-header">
        <a className="brand" href="#hero" aria-label="__PROJECT_NAME__">
          <span className="brand-mark" aria-hidden="true">__BRAND_INITIAL__</span>
          <span>__PROJECT_NAME__</span>
        </a>
        <nav aria-label="Navegacao principal">
          <a href="#features">Diferenciais</a>
          <a href="#how">Como funciona</a>
          <a className="nav-cta" href="#contact">Comecar agora <ArrowRight size={16} /></a>
        </nav>
      </header>

      <section className="hero" id="hero">
        <div className="hero-inner">
          <p className="eyebrow"><span /> __PROJECT_NAME__</p>
          <h1>__PROJECT_BRIEF__</h1>
          <p className="hero-sub">Transforme sua ideia em uma presenca digital que gera resultados reais.</p>
          <div className="hero-actions">
            <a className="btn btn-primary" href="#contact">Comecar agora <ArrowRight size={18} /></a>
            <a className="btn btn-ghost" href="#features">Saiba mais</a>
          </div>
        </div>
      </section>

      <section className="features" id="features">
        <div className="section-inner">
          <p className="section-label">Por que nos</p>
          <h2>Diferenciais que importam</h2>
          <div className="feature-grid">
            {features.map((f) => (
              <article className="feature-card" key={f.title}>
                <CheckCircle size={24} className="feature-icon" />
                <h3>{f.title}</h3>
                <p>{f.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="how" id="how">
        <div className="section-inner">
          <p className="section-label">Metodo</p>
          <h2>Como funciona</h2>
          <div className="steps-grid">
            {steps.map((s) => (
              <article className="step-card" key={s.number}>
                <span className="step-number">{s.number}</span>
                <h3>{s.title}</h3>
                <p>{s.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="cta" id="contact">
        <div className="section-inner cta-inner">
          <h2>Pronto para comecar?</h2>
          <p>Entre em contato e descubra como podemos ajudar seu negocio a crescer.</p>
          <a className="btn btn-primary btn-lg" href="#contact">Fale conosco <ArrowRight size={20} /></a>
        </div>
      </section>

      <footer>
        <div className="footer-inner">
          <div className="brand"><span className="brand-mark">__BRAND_INITIAL__</span><span>__PROJECT_NAME__</span></div>
          <div className="footer-links">
            <a href="#features">Diferenciais</a>
            <a href="#how">Metodo</a>
            <a href="#contact">Contato</a>
          </div>
          <p className="footer-copy">Feito com SUPERMOTOR.</p>
        </div>
      </footer>
    </main>
  );
}
