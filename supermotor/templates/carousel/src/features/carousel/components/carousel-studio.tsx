"use client";

import { toPng } from "html-to-image";
import { ArrowLeft, ArrowRight, Download, Layers3, Plus, Sparkles, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

type Theme = "dark" | "coral" | "cream";
type Slide = { id: number; eyebrow: string; title: string; body: string; footer: string; theme: Theme };

const initialSlides: Slide[] = [
  { id: 1, eyebrow: "Uma ideia para guardar", title: "Seu conteúdo não precisa de mais volume.", body: "Precisa de uma ideia forte o bastante para atravessar o ruído.", footer: "Deslize para entender →", theme: "coral" },
  { id: 2, eyebrow: "O problema", title: "Informação sem direção vira decoração.", body: "Quando tudo parece importante, nada conduz a atenção — e a mensagem desaparece.", footer: "02 / 06", theme: "cream" },
  { id: 3, eyebrow: "Primeiro movimento", title: "Comece pelo que deve ficar na memória.", body: "Antes do layout, escreva em uma frase a transformação que o público precisa levar consigo.", footer: "03 / 06", theme: "dark" },
  { id: 4, eyebrow: "Depois", title: "Uma ideia. Um slide. Um avanço.", body: "Cada tela abre uma pergunta e entrega uma resposta que torna o próximo gesto inevitável.", footer: "04 / 06", theme: "coral" },
  { id: 5, eyebrow: "Na prática", title: "Gancho → tensão → clareza → prova.", body: "Essa sequência cria ritmo sem depender de frases vazias, listas intermináveis ou truques de atenção.", footer: "05 / 06", theme: "cream" },
  { id: 6, eyebrow: "Agora é com você", title: "Qual ideia merece ser lembrada hoje?", body: "Transforme conhecimento em uma narrativa que as pessoas queiram salvar e compartilhar.", footer: "Salve para usar no próximo carrossel.", theme: "dark" },
];

export function CarouselStudio() {
  const [slides, setSlides] = useState(initialSlides);
  const [activeIndex, setActiveIndex] = useState(0);
  const [exporting, setExporting] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const activeSlide = slides[activeIndex];

  function updateSlide(field: keyof Slide, value: string) {
    setSlides((current) => current.map((slide, index) => (index === activeIndex ? { ...slide, [field]: value } : slide)));
  }

  function move(direction: number) {
    setActiveIndex((current) => Math.min(Math.max(current + direction, 0), slides.length - 1));
  }

  function addSlide() {
    const nextSlide: Slide = { id: Date.now(), eyebrow: "Nova etapa", title: "Escreva uma ideia forte aqui.", body: "Use este espaço para avançar a narrativa com clareza.", footer: `${slides.length + 1} / ${slides.length + 1}`, theme: "cream" };
    setSlides((current) => [...current, nextSlide]);
    setActiveIndex(slides.length);
  }

  function removeSlide() {
    if (slides.length === 1) return;
    setSlides((current) => current.filter((_, index) => index !== activeIndex));
    setActiveIndex((current) => Math.max(0, current - 1));
  }

  async function exportSlide() {
    if (!canvasRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(canvasRef.current, { cacheBust: true, pixelRatio: 2, width: 540, height: 675 });
      const link = document.createElement("a");
      link.download = `__PROJECT_SLUG__-slide-${String(activeIndex + 1).padStart(2, "0")}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className="studio-shell">
      <header className="studio-header">
        <div className="studio-brand"><span>M</span><div><strong>Carousel Studio</strong><small>__PROJECT_NAME__</small></div></div>
        <div className="header-status"><Sparkles size={15} /><span>1080 × 1350 px</span></div>
        <button className="export-button" onClick={exportSlide} disabled={exporting}><Download size={17} /> {exporting ? "Exportando..." : "Exportar PNG"}</button>
      </header>

      <div className="studio-grid">
        <aside className="editor-panel">
          <div className="panel-title"><div><small>Conteúdo</small><h1>Slide {activeIndex + 1}</h1></div><span>{activeIndex + 1}/{slides.length}</span></div>
          <label><span>Chamada</span><input value={activeSlide.eyebrow} onChange={(event) => updateSlide("eyebrow", event.target.value)} maxLength={44} /></label>
          <label><span>Título</span><textarea value={activeSlide.title} onChange={(event) => updateSlide("title", event.target.value)} maxLength={110} rows={4} /></label>
          <label><span>Texto de apoio</span><textarea value={activeSlide.body} onChange={(event) => updateSlide("body", event.target.value)} maxLength={180} rows={4} /></label>
          <label><span>Rodapé / CTA</span><input value={activeSlide.footer} onChange={(event) => updateSlide("footer", event.target.value)} maxLength={70} /></label>
          <fieldset><legend>Paleta</legend><div className="theme-options">{(["coral", "cream", "dark"] as Theme[]).map((theme) => <button className={`${theme} ${activeSlide.theme === theme ? "selected" : ""}`} onClick={() => updateSlide("theme", theme)} aria-label={`Usar tema ${theme}`} key={theme}><span /></button>)}</div></fieldset>
          <div className="editor-actions"><button onClick={addSlide}><Plus size={16} /> Adicionar slide</button><button onClick={removeSlide} disabled={slides.length === 1}><Trash2 size={16} /> Remover</button></div>
        </aside>

        <section className="stage" aria-label="Prévia do carrossel">
          <div className="stage-toolbar"><button onClick={() => move(-1)} disabled={activeIndex === 0} aria-label="Slide anterior"><ArrowLeft size={18} /></button><span>Prévia</span><button onClick={() => move(1)} disabled={activeIndex === slides.length - 1} aria-label="Próximo slide"><ArrowRight size={18} /></button></div>
          <div className="canvas-wrap">
            <div className={`slide-canvas theme-${activeSlide.theme}`} ref={canvasRef}>
              <div className="canvas-grid" />
              <div className="shape shape-one" />
              <div className="shape shape-two" />
              <header><span className="canvas-brand">Mazyos®</span><span className="canvas-count">{String(activeIndex + 1).padStart(2, "0")}</span></header>
              <div className="slide-content"><p>{activeSlide.eyebrow}</p><h2>{activeSlide.title}</h2><div className="divider" /><span>{activeSlide.body}</span></div>
              <footer><span>{activeSlide.footer}</span><span className="footer-mark"><ArrowRight size={17} /></span></footer>
            </div>
          </div>
          <p className="export-note">A exportação gera um PNG em 1080 × 1350 px.</p>
        </section>

        <aside className="slides-panel">
          <div className="slides-heading"><Layers3 size={17} /><span>Narrativa</span><b>{slides.length}</b></div>
          <div className="thumbnail-list">
            {slides.map((slide, index) => (
              <button className={index === activeIndex ? "thumbnail active" : "thumbnail"} onClick={() => setActiveIndex(index)} key={slide.id}>
                <span>{String(index + 1).padStart(2, "0")}</span><div className={`thumb-art theme-${slide.theme}`}><small>{slide.eyebrow}</small><strong>{slide.title}</strong></div>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}
