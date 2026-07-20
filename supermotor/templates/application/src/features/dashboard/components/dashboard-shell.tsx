"use client";

import {
  ArrowUpRight,
  Bell,
  Boxes,
  Check,
  ChevronDown,
  CircleHelp,
  Command,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";

const navigation = [
  { label: "Visão geral", icon: LayoutDashboard },
  { label: "Projetos", icon: Boxes },
  { label: "Clientes", icon: Users },
  { label: "Automações", icon: Sparkles },
];

const metrics = [
  { label: "Receita recorrente", value: "R$ 84,2 mil", change: "+12,4%", tone: "orange" },
  { label: "Projetos ativos", value: "18", change: "+3 este mês", tone: "cream" },
  { label: "Taxa de conclusão", value: "92%", change: "+4,1%", tone: "mint" },
];

const bars = [46, 58, 53, 71, 64, 82, 76, 91, 85, 98, 88, 104];

const initialTasks = [
  { id: 1, title: "Revisar proposta comercial", meta: "Projeto Atlas · hoje", done: false },
  { id: 2, title: "Aprovar nova identidade visual", meta: "__BRAND_NAME__ Labs · amanhã", done: false },
  { id: 3, title: "Enviar relatório de performance", meta: "Conta Aurora · sexta", done: true },
];

export function DashboardShell() {
  const [active, setActive] = useState("Visão geral");
  const [period, setPeriod] = useState("30 dias");
  const [menuOpen, setMenuOpen] = useState(false);
  const [tasks, setTasks] = useState(initialTasks);

  function toggleTask(id: number) {
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, done: !task.done } : task)));
  }

  return (
    <div className="app-shell">
      <aside className={menuOpen ? "sidebar open" : "sidebar"}>
        <div className="sidebar-top">
          <a className="app-brand" href="#top"><span>__BRAND_INITIAL__</span><strong>__PROJECT_NAME__</strong></a>
          <button className="icon-button mobile-close" onClick={() => setMenuOpen(false)} aria-label="Fechar menu"><X size={19} /></button>
        </div>

        <div className="workspace-switcher">
          <span className="workspace-avatar">__BRAND_INITIAL__</span>
          <div><small>Workspace</small><strong>__BRAND_NAME__</strong></div>
          <ChevronDown size={16} />
        </div>

        <nav className="app-nav" aria-label="Menu da aplicação">
          <p>Workspace</p>
          {navigation.map(({ label, icon: Icon }) => (
            <button className={active === label ? "active" : ""} key={label} onClick={() => { setActive(label); setMenuOpen(false); }}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>{label === "Projetos" && <b>18</b>}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button><CircleHelp size={18} /> Central de ajuda</button>
          <button><Settings size={18} /> Configurações</button>
          <div className="user-card"><span className="user-avatar">__BRAND_INITIAL__</span><div><strong>__BRAND_NAME__</strong><small>Administrador</small></div><MoreHorizontal size={17} /></div>
        </div>
      </aside>

      {menuOpen && <button className="menu-backdrop" aria-label="Fechar menu" onClick={() => setMenuOpen(false)} />}

      <main className="dashboard" id="top">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Abrir menu"><Menu size={20} /></button>
          <label className="search-box"><Search size={18} /><input aria-label="Buscar" placeholder="Buscar em tudo..." /><kbd><Command size={12} /> K</kbd></label>
          <div className="top-actions">
            <button className="icon-button notification" aria-label="Notificações"><Bell size={19} /><span /></button>
            <button className="primary-action"><Plus size={18} /> Novo projeto</button>
          </div>
        </header>

        <div className="dashboard-content">
          <section className="welcome-row">
            <div><p>{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })} <span className="demo-badge">Dados de demonstração</span></p><h1>{active === "Visão geral" ? "Bom dia!" : active}</h1><span>Veja o que merece sua atenção hoje.</span></div>
            <button className="period-button">Últimos {period} <ChevronDown size={16} /></button>
          </section>

          <section className="metric-grid" aria-label="Métricas principais">
            {metrics.map((metric) => (
              <article className={`metric-card ${metric.tone}`} key={metric.label}>
                <div className="metric-label"><span>{metric.label}</span><ArrowUpRight size={19} /></div>
                <strong>{metric.value}</strong>
                <p><TrendingUp size={15} /> {metric.change}</p>
              </article>
            ))}
          </section>

          <section className="dashboard-grid">
            <article className="chart-card">
              <div className="card-heading"><div><span>Performance</span><h2>Crescimento do negócio</h2></div><div className="segmented">{["7 dias", "30 dias", "12 meses"].map((item) => <button className={period === item ? "active" : ""} onClick={() => setPeriod(item)} key={item}>{item}</button>)}</div></div>
              <div className="chart-summary"><strong>R$ 84.240</strong><span>+12,4% no período</span></div>
              <div className="bar-chart" aria-label="Gráfico de crescimento mensal">
                {bars.map((height, index) => <div className="bar-column" key={index}><span style={{ height: `${height}px` }} /><small>{index % 2 === 0 ? ["Jan", "Mar", "Mai", "Jul", "Set", "Nov"][index / 2] : ""}</small></div>)}
              </div>
            </article>

            <article className="activity-card">
              <div className="card-heading"><div><span>Agora</span><h2>Atividade recente</h2></div><button className="icon-button" aria-label="Mais opções"><MoreHorizontal size={19} /></button></div>
              <div className="activity-list">
                <div><span className="activity-avatar coral">AR</span><p><strong>Ana revisou</strong> a proposta do Projeto Atlas<small>há 12 minutos</small></p></div>
                <div><span className="activity-avatar dark">RC</span><p><strong>Rafael concluiu</strong> a etapa de desenvolvimento<small>há 48 minutos</small></p></div>
                <div><span className="activity-avatar mint">JS</span><p><strong>Joana comentou</strong> no design system<small>há 2 horas</small></p></div>
              </div>
              <button className="text-button">Ver todas as atividades <ArrowUpRight size={16} /></button>
            </article>
          </section>

          <section className="tasks-card">
            <div className="card-heading"><div><span>Prioridades</span><h2>Próximas tarefas</h2></div><button className="secondary-action"><Plus size={16} /> Adicionar</button></div>
            <div className="task-list">
              {tasks.map((task) => (
                <button className={task.done ? "task done" : "task"} key={task.id} onClick={() => toggleTask(task.id)}>
                  <span className="check-box">{task.done && <Check size={15} />}</span><span><strong>{task.title}</strong><small>{task.meta}</small></span><ArrowUpRight className="task-arrow" size={18} />
                </button>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
