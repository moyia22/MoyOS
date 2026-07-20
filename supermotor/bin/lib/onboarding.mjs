import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { join } from "node:path";
import { color, ui } from "./ui.mjs";
import { normalizeType } from "./constants.mjs";
import { normalizeHexColor } from "./brand.mjs";
import { generateDesignRecommendations, generateSuggestions } from "./design.mjs";
import { findBrandReferences, generateBrandKitMarkdown } from "./brand.mjs";
import { generateDesignMarkdown, generateSuggestionsMarkdown, generateProjectContextFromOnboarding } from "./design.mjs";
import { replaceTokens } from "./tokens.mjs";
import { copyTemplate, npmInstall, commandExists, runGit } from "./templates.mjs";
import { initializeProjectTracking } from "../supermotor-state.mjs";
import { ROOT, TEMPLATE_ROOT, TYPES, WACRM_REPOSITORY, WACRM_STABLE_REF, DEFAULT_BRAND } from "./constants.mjs";
import { createCrmFavicon } from "./brand.mjs";
import { resolve } from "node:path";

function onboardingProgress(current, total) {
  const filled = Math.round((current / total) * 20);
  const bar = "\u2588".repeat(filled) + "\u2591".repeat(20 - filled);
  console.log(color("2", `  [${bar}] ${current}/${total}\n`));
}

function onboardingGreeting() {
  console.log();
  console.log(color("1;38;5;208", "\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557"));
  console.log(color("1;38;5;208", "\u2551") + color("1;37", "                  SUPERMOTOR 3.0                          ") + color("1;38;5;208", "\u2551"));
  console.log(color("1;38;5;208", "\u2551") + color("36", "       O sistema operacional do seu negocio               ") + color("1;38;5;208", "\u2551"));
  console.log(color("1;38;5;208", "\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d"));
  console.log();
  console.log(color("37", "  Ola! Bem-vindo ao SUPERMOTOR."));
  console.log();
  console.log("  Vou te conhecer melhor para criar o projeto ideal para");
  console.log("  o seu negocio. Sao 10 fases rapidas.");
  console.log();
  console.log("  Cada pergunta tem um motivo. Vou explicar por que importa.");
  console.log("  Tudo fica salvo no contexto do projeto.\n");
  console.log(color("33", "  Dica: pressione Enter para pular perguntas opcionais."));
  console.log(color("33", "  Respostas em branco usam os valores padrao.\n"));
}

function onboardingSep() {
  console.log(color("2", "  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n"));
}

function onboardingQuestion(text) {
  console.log(color("1;36", `  ? ${text}`));
}

function onboardingHint(text) {
  console.log(color("2", `    ${text}`));
}

function onboardingInfo(text) {
  console.log(color("32", `  > ${text}`));
}

function onboardingPhase(num, title, total) {
  console.log();
  console.log(color("1;38;5;208", `  === Fase ${num}/${total}: ${title} ===`));
  console.log();
  onboardingProgress(num, total);
}

function colorBlock(hex, label) {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return `  ${hex || "????"}  ${label}`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `\u001b[48;2;${r};${g};${b}m        \u001b[0m  ${color("37", hex)}  ${label}`;
}

function colorSwatch(palette) {
  if (!palette) return;
  console.log();
  console.log(color("37", "  Paleta de cores sugerida:"));
  console.log(`    ${colorBlock(palette.Primary || palette.Accent || "#2563EB", "Primaria")}`);
  console.log(`    ${colorBlock(palette.Secondary || palette.Background || "#3B82F6", "Secundaria")}`);
  console.log(`    ${colorBlock(palette.Accent || "#EA580C", "Destaque (CTA)")}`);
  console.log(`    ${colorBlock(palette.Background || "#F8FAFC", "Fundo")}`);
  console.log(`    ${colorBlock(palette.Foreground || "#1E293B", "Texto")}`);
  console.log();
}

function generateOnboardingContext(data) {
  const lines = [];
  const date = new Date().toISOString().slice(0, 10);

  lines.push(`# Contexto do Onboarding \u2014 ${data.businessName || data.userName || "Novo usuario"}`);
  lines.push(`> Gerado em ${date} pelo SUPERMOTOR 3.0`);
  lines.push(`> Skill: ui-ux-pro-max v2.11.0 integrada\n`);

  lines.push("---\n");

  lines.push("## Sobre Voce\n");
  lines.push(`- **Nome:** ${data.userName || "Nao informado"}`);
  lines.push(`- **Email:** ${data.userEmail || "Nao informado"}`);
  lines.push(`- **WhatsApp:** ${data.userPhone || "Nao informado"}`);
  lines.push(`- **Instagram:** ${data.userInstagram || "Nao informado"}`);
  lines.push(`- **Localizacao:** ${data.userLocation || "Nao informado"}`);
  lines.push("");

  lines.push("## Sobre o Negocio\n");
  lines.push(`- **Nome do negocio:** ${data.businessName || "Nao informado"}`);
  lines.push(`- **Area/Industria:** ${data.businessIndustry || "Nao informado"}`);
  lines.push(`- **Descricao:** ${data.businessDescription || "Nao informado"}`);
  lines.push(`- **Tempo de mercado:** ${data.businessAge || "Nao informado"}`);
  lines.push(`- **Porte:** ${data.businessSize || "Nao informado"}`);
  lines.push(`- **Localizacao do negocio:** ${data.businessLocation || "Nao informado"}`);
  lines.push(`- **Site atual:** ${data.businessWebsite || "Nao possui"}`);
  lines.push(`- **Redes sociais:** ${data.businessSocial || "Nao informado"}`);
  lines.push("");

  lines.push("## Objetivos e Visao\n");
  lines.push(`- **Objetivo principal:** ${data.mainGoal || "Nao informado"}`);
  lines.push(`- **O que quer alcancar digitalmente:** ${data.digitalGoal || "Nao informado"}`);
  lines.push(`- **Principal desafio:** ${data.mainChallenge || "Nao informado"}`);
  lines.push(`- **Onde se ve em 1 ano:** ${data.visionOneYear || "Nao informado"}`);
  lines.push(`- **Metrica de sucesso:** ${data.successMetric || "Nao informado"}`);
  lines.push("");

  lines.push("## Publico-Alvo\n");
  lines.push(`- **Publico principal:** ${data.targetAudience || "Nao informado"}`);
  lines.push(`- **Idade/faixa etaria:** ${data.audienceAge || "Nao informado"}`);
  lines.push(`- **Genero predominante:** ${data.audienceGender || "Nao informado"}`);
  lines.push(`- **Classe social/Renda:** ${data.audienceClass || "Nao informado"}`);
  lines.push(`- **Dores e necessidades:** ${data.audiencePains || "Nao informado"}`);
  lines.push(`- **Onde o publico esta:** ${data.audienceWhere || "Nao informado"}`);
  lines.push(`- **Como o publico te encontra:** ${data.audienceFindYou || "Nao informado"}`);
  lines.push("");

  lines.push("## Modelo de Negocio\n");
  lines.push(`- **Como fatura/recebe:** ${data.revenueModel || "Nao informado"}`);
  lines.push(`- **Produtos/servicos principais:** ${data.mainProducts || "Nao informado"}`);
  lines.push(`- **Faixa de preco:** ${data.priceRange || "Nao informado"}`);
  lines.push(`- **Ticket medio:** ${data.averageTicket || "Nao informado"}`);
  lines.push(`- **Concorrentes principais:** ${data.competitors || "Nao informado"}`);
  lines.push(`- **Diferencial competitivo:** ${data.differentiator || "Nao informado"}`);
  lines.push("");

  lines.push("## Projeto Digital\n");
  lines.push(`- **Tipo de projeto:** ${data.projectType || "Nao definido"}`);
  lines.push(`- **Nome do projeto:** ${data.projectName || "Nao definido"}`);
  lines.push(`- **Objetivo do projeto:** ${data.projectObjective || "Nao definido"}`);
  lines.push(`- **Funcionalidades essenciais:** ${data.projectFeatures || "Nao definido"}`);
  lines.push(`- **Paginas/secoes necessarias:** ${data.projectPages || "Nao definido"}`);
  lines.push(`- **Referencias/inspiracoes:** ${data.projectReferences || "Nenhuma"}`);
  lines.push(`- **Integracoes necessarias:** ${data.projectIntegrations || "Nenhuma"}`);
  lines.push(`- **Restricoes tecnicas:** ${data.projectConstraints || "Nenhuma"}`);
  lines.push("");

  lines.push("## Identidade Visual\n");
  lines.push(`- **Nome da marca:** ${data.brandName || data.businessName || "Nao informado"}`);
  lines.push(`- **Tom de voz:** ${data.brandTone || "Nao informado"}`);
  lines.push(`- **Personalidade:** ${data.brandPersonality || "Nao informado"}`);
  lines.push(`- **Cores preferidas:** ${data.brandColors || "Nao informado"}`);
  lines.push(`- **Cor de destaque:** ${data.brandAccent || "#ff5a1f"}`);
  lines.push(`- **Tem logo:** ${data.hasLogo || "Nao"}`);
  lines.push(`- **Ja tem favicon:** ${data.hasFavicon || "Nao"}`);
  lines.push(`- **Referencias visuais:** ${data.visualReferences || "Nenhuma"}`);
  lines.push("");

  lines.push("## Aspectos Tecnicos\n");
  lines.push(`- **Hospedagem atual:** ${data.currentHosting || "Nao possui"}`);
  lines.push(`- **Dominio:** ${data.domain || "Nao possui"}`);
  lines.push(`- **Plataforma atual:** ${data.currentPlatform || "Nenhuma"}`);
  lines.push(`- **Precisa de SEO:** ${data.needsSEO || "Sim"}`);
  lines.push(`- **Precisa de analytics:** ${data.needsAnalytics || "Sim"}`);
  lines.push(`- **Idiomas:** ${data.languages || "Portugues (pt-BR)"}`);
  lines.push(`- **Acessibilidade:** ${data.accessibility || "Padrao WCAG"}`);
  lines.push("");

  lines.push("## Presenca Digital Atual\n");
  lines.push(`- **Ja tem site:** ${data.hasWebsite || "Nao"}`);
  lines.push(`- **Redes sociais ativas:** ${data.activeSocialMedia || "Nenhuma"}`);
  lines.push(`- **Frequencia de publicacao:** ${data.postingFrequency || "Nao publica"}`);
  lines.push(`- **E-mail marketing:** ${data.emailMarketing || "Nao utiliza"}`);
  lines.push(`- **Lista de contatos:** ${data.contactList || "Nao possui"}`);
  lines.push(`- **WhatsApp Business:** ${data.whatsappBusiness || "Nao utiliza"}`);
  lines.push("");

  lines.push("## Proximos Passos\n");
  lines.push(`- **Urgencia:** ${data.urgency || "Nao definida"}`);
  lines.push(`- **Orcamento estimado:** ${data.budget || "Nao definido"}`);
  lines.push(`- **Prazo desejado:** ${data.deadline || "Nao definido"}`);
  lines.push(`- **Quem decide:** ${data.decisionMaker || "O proprio usuario"}`);
  lines.push(`- **Tem equipe tecnica:** ${data.hasTechTeam || "Nao"}`);
  lines.push(`- **Quer gerenciar sozinho:** ${data.selfManage || "Sim"}`);
  lines.push("");

  lines.push("---\n");
  lines.push(`> Contexto completo. Use este arquivo como base para criar projetos.`);
  lines.push(`> O SUPERMOTOR pode ler estes dados automaticamente ao usar \`supermotor criar\`.\n`);

  return lines.join("\n");
}

async function runOnboarding() {
  const terminal = createInterface({ input, output });
  const TOTAL_PHASES = 10;

  const savePartial = () => {
    try {
      const partialDir = join(process.cwd(), "_contexto");
      mkdirSync(partialDir, { recursive: true });
      const partialPath = join(partialDir, ".onboarding-partial.json");
      writeFileSync(partialPath, JSON.stringify({ savedAt: new Date().toISOString(), data: terminal._partialData || {} }, null, 2), "utf8");
    } catch {}
  };

  process.on("SIGINT", () => {
    savePartial();
    console.log("\n\n  Progresso salvo em _contexto/.onboarding-partial.json");
    console.log("  Rode 'supermotor onboarding' novamente para continuar.\n");
    process.exit(0);
  });

  try {
    terminal._partialData = {};
    onboardingGreeting();
    const data = {};

    const ask = async (hint, question, field, fallback) => {
      if (hint) onboardingHint(hint);
      onboardingQuestion(question);
      const answer = (await terminal.question("  -> ")).trim();
      data[field] = answer || fallback || "";
      terminal._partialData[field] = data[field];
      if (answer) onboardingInfo(`${question.split("?")[0]}: ${answer.length > 60 ? answer.slice(0, 57) + "..." : answer}\n`);
      return answer;
    };

    // ━━━ FASE 1: Quem e voce ━━━
    onboardingPhase(1, "Quem e voce", TOTAL_PHASES);
    await ask(
      "Precisamos do seu nome para personalizar tudo. Seu contato para servicos externos.",
      "Qual e o seu nome?",
      "userName"
    );
    if (data.userName) onboardingInfo(`Prazer, ${data.userName}!\n`);

    await ask(null, "Seu e-mail (para contato e login em servicos)?", "userEmail");
    await ask(null, "Seu WhatsApp (com DDD)?", "userPhone");
    await ask(null, "Seu Instagram (se tiver)?", "userInstagram");
    await ask(null, "Onde voce esta? (cidade/estado)", "userLocation");
    onboardingSep();

    // ━━━ FASE 2: Seu negocio ━━━
    onboardingPhase(2, "Seu negocio", TOTAL_PHASES);
    await ask(
      "O nome do negocio e usado em todo o projeto: titulos, meta tags, brand kit, favicon.",
      "Qual e o nome do seu negocio/empresa?",
      "businessName"
    );
    if (data.businessName) onboardingInfo(`Negocio: ${data.businessName}\n`);

    await ask(
      "A area define qual estilo visual, paleta de cores e tipografia a skill ui-ux-pro-max vai recomendar.",
      "Em que area/industria voce atua? (ex: consultoria, e-commerce, educacao, saude, gastronomia)",
      "businessIndustry"
    );
    await ask(
      "Uma boa descricao ajuda a IA a entender o contexto e tomar decisoes de design e conteudo.",
      "Descreva seu negocio em 2-3 frases: o que faz, como ajuda, por que existe.",
      "businessDescription"
    );
    await ask(null, "Ha quanto tempo seu negocio existe?", "businessAge");
    await ask(null, "Qual o porte? (1 pessoa / pequena equipe 2-5 / media 6-20 / grande 20+)", "businessSize");
    await ask(null, "Onde fica seu negocio? (cidade/estado ou 'online/100% digital')", "businessLocation");
    await ask(null, "Voce ja tem site? Se sim, qual a URL?", "businessWebsite");
    await ask(null, "Quais redes sociais o negocio usa? (ex: @instagram, facebook.com/perfil)", "businessSocial");
    onboardingSep();

    // ━━━ FASE 3: Objetivos e visao ━━━
    onboardingPhase(3, "Objetivos e visao", TOTAL_PHASES);
    await ask(
      "O objetivo guia a estrategia do projeto: CTAs, copy, hierarquia de conteudo e estrutura de paginas.",
      "Qual e o principal objetivo do seu negocio agora? (ex: aumentar vendas, captar leads, fortalecer marca)",
      "mainGoal"
    );
    await ask(
      "Isso define o que o projeto precisa fazer: vender, informar, conectar, automatizar.",
      "O que voce quer alcancar com um projeto digital? (ex: vender online, mostrar portfolio, automatizar atendimento)",
      "digitalGoal"
    );
    await ask(
      "Entender o desafio ajuda a IA a priorizar o que e mais importante resolver primeiro.",
      "Qual e o maior desafio do seu negocio hoje?",
      "mainChallenge"
    );
    await ask(null, "Onde voce se ve daqui 1 ano com o projeto certo?", "visionOneYear");
    await ask(
      "A metrica de sucesso define como vamos medir se o projeto funcionou.",
      "Como voce vai medir se o projeto deu certo? (ex: vendas, contatos, engajamento)",
      "successMetric"
    );
    onboardingSep();

    // ━━━ FASE 4: Publico-alvo ━━━
    onboardingPhase(4, "Publico-alvo", TOTAL_PHASES);
    await ask(
      "Conhecer o publico e essencial para a skill de design recomendar o estilo visual correto. O publico define o tom, as cores e a tipografia.",
      "Quem e seu cliente ideal? (descreva em 1-2 frases)",
      "targetAudience"
    );
    await ask(null, "Qual a faixa etaria do seu publico? (ex: 25-40 anos)", "audienceAge");
    await ask(null, "Genero predominante? (masculino / feminino / ambos / todos)", "audienceGender");
    await ask(null, "Classe social / faixa de renda do publico? (classe A, B, C, misto)", "audienceClass");
    await ask(
      "As dores do publico sao usadas para criar copy que conecta e converte.",
      "Quais sao as principais dores ou necessidades desse publico?",
      "audiencePains"
    );
    await ask(null, "Onde esse publico esta? (Instagram, Google, WhatsApp, eventos, etc.)", "audienceWhere");
    await ask(null, "Como esse publico te encontra hoje? (indicacao, busca, anuncio, organico)", "audienceFindYou");
    onboardingSep();

    // ━━━ FASE 5: Modelo de negocio ━━━
    onboardingPhase(5, "Modelo de negocio", TOTAL_PHASES);
    await ask(
      "Como voce fatura define a estrutura do projeto: precificacao, checkout, funil de vendas, paginas de servicos.",
      "Como voce fatura? (por hora, por produto, assinatura, projeto, comissao)",
      "revenueModel"
    );
    await ask(null, "Quais sao seus principais produtos ou servicos?", "mainProducts");
    await ask(null, "Qual a faixa de preco dos seus servicos/produtos?", "priceRange");
    await ask(null, "Qual o ticket medio (valor medio por cliente)?", "averageTicket");
    await ask(
      "Conhecer os concorrentes ajuda a posicionar seu diferencial e evitar padroes genericos.",
      "Quem sao seus principais concorrentes? (nomes ou URLs)",
      "competitors"
    );
    await ask(
      "O diferencial e o que vai destacar seu projeto. Ele define o titulo principal e a proposta de valor.",
      "Qual e o seu diferencial? Por que alguem escolhe voce e nao o concorrente?",
      "differentiator"
    );
    onboardingSep();

    // ━━━ FASE 6: Projeto digital ━━━
    onboardingPhase(6, "Projeto digital", TOTAL_PHASES);
    onboardingHint("O tipo de projeto define qual template sera usado. Se nao souber, vou te ajudar a escolher.");

    console.log("  " + color("37", "Tipos de projeto disponiveis:\n"));
    console.log("  " + color("1;37", "1.") + " Site premium (landing page, institucional, portfolio)");
    console.log("  " + color("1;37", "2.") + " Aplicacao / dashboard (SaaS, sistema web, produto digital)");
    console.log("  " + color("1;37", "3.") + " Carrossel social editavel (Instagram / LinkedIn)");
    console.log("  " + color("1;37", "4.") + " CRM com WhatsApp (inbox, contatos, pipeline, automacoes)");
    console.log("  " + color("1;37", "5.") + " Ainda nao sei / me ajude a escolher\n");

    onboardingQuestion("Que tipo de projeto voce quer criar? [1-5]");
    const typeChoice = (await terminal.question("  -> ")).trim();
    const typeMap = { "1": "site", "2": "app", "3": "carousel", "4": "crm", "5": "auto" };
    data.projectType = typeMap[typeChoice] || normalizeType(typeChoice) || "auto";

    if (data.projectType === "auto") {
      console.log();
      console.log("  " + color("36", "Sem problemas! Vou te ajudar a escolher.\n"));

      onboardingQuestion("Voce quer vender algo online, mostrar seu trabalho ou gerenciar clientes?");
      const intent = (await terminal.question("  -> ")).trim().toLowerCase();

      if (/vend|produt|loja|e-commerce|compr|assina|preco/.test(intent)) {
        data.projectType = "app";
        console.log("  " + color("36", "-> Uma aplicacao/dashboard seria ideal para vender online.\n"));
      } else if (/mostr|portfolio|institucional|landing|pagina|presenc/.test(intent)) {
        data.projectType = "site";
        console.log("  " + color("36", "-> Um site premium seria perfeito para mostrar seu trabalho.\n"));
      } else if (/client|relacionamento|whatsapp|vendas|funil|crm|pipeline|contat/.test(intent)) {
        data.projectType = "crm";
        console.log("  " + color("36", "-> Um CRM com WhatsApp seria ideal para gerenciar seus clientes.\n"));
      } else if (/social|instagram|carrossel|conteudo|post|feed/.test(intent)) {
        data.projectType = "carousel";
        console.log("  " + color("36", "-> Um estudo de carrossel seria perfeito para criar conteudo.\n"));
      } else {
        data.projectType = "site";
        console.log("  " + color("36", "-> Comecando com um site premium, que e versatil e rapido de lancar.\n"));
      }
    }

    const typeLabel = { site: "Site premium", app: "Aplicacao", carousel: "Carrossel", crm: "CRM com WhatsApp" }[data.projectType] || "Projeto";
    onboardingInfo(`Tipo selecionado: ${typeLabel}\n`);

    await ask(null, "Qual o nome do projeto?", "projectName", data.businessName);

    await ask(
      "O objetivo do projeto e a frase mais importante: ela define o titulo, os CTAs e a hierarquia de conteudo.",
      "Qual o objetivo principal do projeto? (ex: captar clientes, vender produto X)",
      "projectObjective"
    );
    await ask(
      "Essas funcionalidades viram o checklist de implementacao no PRODUCT.md.",
      "Quais funcionalidades sao essenciais na primeira versao? (liste separado por virgula)",
      "projectFeatures"
    );
    await ask(null, "Quais paginas ou secoes o projeto precisa? (ex: home, sobre, servicos, blog, contato)", "projectPages");
    await ask(null, "Tem algum site/app que admira como referencia? (URL ou nome)", "projectReferences");
    await ask(null, "Precisa de alguma integracao? (ex: Supabase, WhatsApp API, Stripe)", "projectIntegrations");
    await ask(null, "Alguma restricao tecnica? (ex: custo zero, frameworks especificos)", "projectConstraints");
    onboardingSep();

    // ━━━ FASE 7: Identidade visual ━━━
    onboardingPhase(7, "Identidade visual", TOTAL_PHASES);
    onboardingHint("Essas informacoes sao cruzadas com ui-ux-pro-max para gerar recomendacoes de design personalizadas.");
    await ask(null, "Qual nome a marca vai usar? (pode ser diferente do nome do negocio)", "brandName", data.businessName);

    await ask(
      "O tom de voz define a personalidade da marca: como ela fala, como ela escreve, como ela se posiciona.",
      "Qual o tom de voz da marca? (ex: profissional, informal, ousado, acolhedor, tecnico)",
      "brandTone"
    );
    await ask(null, "Se a marca fosse uma pessoa, como voce a descreveria? (ex: confiante, moderna)", "brandPersonality");
    await ask(null, "Quais cores a marca usa? (ex: azul e branco, preto e dourado)", "brandColors");

    await ask(
      "A cor de destaque e usada em botoes, links e elementos de acao. Ela e o coracao da paleta.",
      "Cor de destaque em hex (ex: #ff5a1f) ou Enter para usar o padrao:",
      "brandAccent",
      "#ff5a1f"
    );
    try {
      data.brandAccent = normalizeHexColor(data.brandAccent);
    } catch {
      data.brandAccent = "#ff5a1f";
    }

    await ask(null, "Ja tem logo? (sim/nao/caminho do arquivo)", "hasLogo");
    await ask(null, "Ja tem favicon? (sim/nao/caminho do arquivo)", "hasFavicon");
    await ask(null, "Alguma referencia visual? (sites, cores, estilos que gosta)", "visualReferences");
    onboardingSep();

    // ━━━ FASE 8: Aspectos tecnicos ━━━
    onboardingPhase(8, "Aspectos tecnicos", TOTAL_PHASES);
    onboardingHint("Informacoes tecnicas ajudam a configurar o projeto corretamente desde o inicio.");
    await ask(null, "Ja tem hospedagem? (ex: Vercel, Netlify, AWS)", "currentHosting");
    await ask(null, "Ja tem dominio registrado? (ex: meusite.com.br)", "domain");
    await ask(null, "Usa alguma plataforma hoje? (ex: WordPress, Wix, Shopify)", "currentPlatform");

    await ask(null, "Precisa de SEO otimizado? [S/n]", "needsSEO", "Sim");
    if (data.needsSEO && data.needsSEO.toLowerCase() !== "n" && data.needsSEO.toLowerCase() !== "nao") data.needsSEO = "Sim";
    else data.needsSEO = "Nao";

    await ask(null, "Precisa de analytics/rastreamento? [S/n]", "needsAnalytics", "Sim");
    if (data.needsAnalytics && data.needsAnalytics.toLowerCase() !== "n" && data.needsAnalytics.toLowerCase() !== "nao") data.needsAnalytics = "Sim";
    else data.needsAnalytics = "Nao";

    await ask(null, "Em quais idiomas o projeto precisa?", "languages", "Portugues (pt-BR)");
    await ask(null, "Algum requisito de acessibilidade? (ex: WCAG 2.1, contraste alto)", "accessibility", "Padrao WCAG");
    onboardingSep();

    // ━━━ FASE 9: Presenca digital atual ━━━
    onboardingPhase(9, "Presenca digital", TOTAL_PHASES);
    onboardingHint("Entender sua presenca atual ajuda a definir o que integrar e o que criar do zero.");
    await ask(null, "Ja tem site funcionando? Se sim, qual URL?", "hasWebsite");
    await ask(null, "Quais redes sociais esta ativo? (ex: Instagram, TikTok, LinkedIn)", "activeSocialMedia");
    await ask(null, "Com que frequencia publica? (diario, semanal, mensal)", "postingFrequency");
    await ask(null, "Usa e-mail marketing? (ex: Mailchimp, RD Station)", "emailMarketing");
    await ask(null, "Ja tem lista de contatos/e-mails de clientes?", "contactList");
    await ask(null, "Usa WhatsApp Business? (sim/nao)", "whatsappBusiness");
    onboardingSep();

    // ━━━ FASE 10: Proximos passos ━━━
    onboardingPhase(10, "Proximos passos", TOTAL_PHASES);
    onboardingHint("Essas informacoes definem a prioridade e o escopo do projeto.");
    await ask(null, "Qual a urgencia? (urgente essa semana / 1 mes / 3 meses / sem pressa)", "urgency");
    await ask(null, "Qual o orcamento estimado para o projeto? (faixa ou 'sem definir')", "budget");
    await ask(null, "Qual o prazo desejado para lancar?", "deadline");
    await ask(null, "Quem toma a decisao final no projeto? (voce / socio / investidor)", "decisionMaker", "O proprio usuario");
    await ask(null, "Tem alguem com conhecimento tecnico na equipe? [S/n]", "hasTechTeam");
    await ask(null, "Quer gerenciar o projeto sozinho depois de pronto? [S/n]", "selfManage", "Sim");
    if (data.selfManage && data.selfManage.toLowerCase() !== "n" && data.selfManage.toLowerCase() !== "nao") data.selfManage = "Sim";
    else data.selfManage = "Nao";
    onboardingSep();

    // ━━━ DESIGN INTELIGENTE (usando skill ui-ux-pro-max) ━━━
    console.log();
    console.log(color("1;38;5;208", "  === Design Inteligente (skill ui-ux-pro-max) ===\n"));
    onboardingInfo("Analisando suas respostas com 6 bases de dados...\n");

    const designRecs = generateDesignRecommendations(data);

    if (designRecs.product) {
      console.log(color("1;37", "  Produto recomendado:"));
      console.log(color("37", `    Categoria: ${designRecs.product["Product Type"]}`));
      console.log(color("37", `    Estilo: ${designRecs.product["Primary Style Recommendation"]}`));
      console.log(color("37", `    Cores: ${designRecs.product["Color Palette Focus"]}`));
      console.log(color("37", `    Landing: ${designRecs.product["Landing Page Pattern"]}`));
      console.log(color("37", `    Dica: ${designRecs.product["Key Considerations"]}\n`));
    }

    if (designRecs.palette) {
      colorSwatch(designRecs.palette);
    }

    if (designRecs.typography) {
      console.log(color("1;37", "  Tipografia recomendada:"));
      console.log(color("37", `    Par: ${designRecs.typography["Font Pairing Name"]}`));
      console.log(color("37", `    Titulo: ${designRecs.typography["Heading Font"]}`));
      console.log(color("37", `    Corpo: ${designRecs.typography["Body Font"]}`));
      console.log(color("37", `    Mood: ${designRecs.typography["Mood/Style Keywords"]}`));
      if (designRecs.typography["Google Fonts URL"]) {
        console.log(color("2", `    URL: ${designRecs.typography["Google Fonts URL"].slice(0, 80)}...`));
      }
      console.log();
    }

    if (designRecs.style) {
      console.log(color("1;37", "  Estilo visual:"));
      console.log(color("37", `    Categoria: ${designRecs.style["Style Category"]}`));
      console.log(color("37", `    Melhor para: ${designRecs.style["Best For"]}`));
      console.log(color("37", `    NAO usar para: ${designRecs.style["Do Not Use For"]}`));
      console.log(color("37", `    Performance: ${designRecs.style.Performance}`));
      console.log(color("37", `    Acessibilidade: ${designRecs.style.Accessibility}`));
      console.log(color("37", `    Mobile: ${designRecs.style["Mobile-Friendly"]}`));
      console.log(color("37", `    Conversao: ${designRecs.style["Conversion-Focused"]}`));
      console.log();
    }

    if (designRecs.landing) {
      console.log(color("1;37", "  Padrao de landing page:"));
      console.log(color("37", `    Padrao: ${designRecs.landing["Pattern Name"]}`));
      console.log(color("37", `    CTA: ${designRecs.landing["Primary CTA Placement"]}`));
      console.log(color("37", `    Conversao: ${designRecs.landing["Conversion Optimization"]}`));
      console.log();
    }

    if (designRecs.reasoning) {
      console.log(color("1;37", "  Regras por industria:"));
      console.log(color("37", `    Anti-padroes: ${designRecs.reasoning.Anti_Patterns}`));
      console.log(color("37", `    Severidade: ${designRecs.reasoning.Severity}`));
      console.log();
    }

    // ━━━ REFERENCIAS DE MARCA (awesome-design-md) ━━━
    const brandRefs = findBrandReferences(data.businessIndustry, data.projectType, data.brandTone);
    if (brandRefs.length) {
      console.log(color("1;37", "  Referencias de marcas reais (awesome-design-md):"));
      for (const ref of brandRefs) {
        const colorInfo = ref.primaryColor ? ` | Cor: ${ref.primaryColor}` : "";
        console.log(color("37", `    ${ref.name}${colorInfo}`));
        if (ref.description) console.log(color("2", `      ${ref.description.slice(0, 100)}...`));
      }
      console.log();
    }

    // ━━━ SUGESTOES INTELIGENTES ━━━
    console.log(color("1;38;5;208", "  === Sugestoes Inteligentes ===\n"));
    const suggestions = generateSuggestions(data);
    const grouped = {};
    for (const s of suggestions) {
      if (!grouped[s.type]) grouped[s.type] = [];
      grouped[s.type].push(s.text);
    }
    const typeLabelsShort = {
      conteudo: "Conteudo", estrategia: "Estrategia", tecnico: "Tecnico",
      integracao: "Integracao", seo: "SEO", marketing: "Marketing",
      diferencial: "Diferencial", qualidade: "Qualidade",
    };
    for (const [type, items] of Object.entries(grouped)) {
      console.log(color("37", `  ${typeLabelsShort[type] || type}:`));
      for (const item of items) {
        console.log(color("2", `    ${item}`));
      }
    }
    console.log();

    // ━━━ SALVAR CONTEXTO ━━━
    console.log();
    console.log(color("1;38;5;208", "  === Salvando contexto ===\n"));

    const contextDir = join(process.cwd(), "_contexto");
    mkdirSync(contextDir, { recursive: true });

    const contextPath = join(contextDir, "onboarding.md");
    writeFileSync(contextPath, generateOnboardingContext(data), "utf8");
    onboardingInfo(`Contexto salvo em: ${contextPath}`);

    if (designRecs.product || designRecs.typography || designRecs.style) {
      const designPath = join(contextDir, "design-recommendations.md");
      writeFileSync(designPath, generateDesignMarkdown(designRecs, data), "utf8");
      onboardingInfo(`Design recomendado em: ${designPath}`);
    }

    const brandPath = join(contextDir, "brand-kit.md");
    writeFileSync(brandPath, generateBrandKitMarkdown(data), "utf8");
    onboardingInfo(`Brand Kit salvo em: ${brandPath}`);

    const suggestionsPath = join(contextDir, "suggestions.md");
    writeFileSync(suggestionsPath, generateSuggestionsMarkdown(suggestions, data), "utf8");
    onboardingInfo(`Sugestoes salvas em: ${suggestionsPath}`);

    const projectContextPath = join(contextDir, "project-context.md");
    writeFileSync(projectContextPath, generateProjectContextFromOnboarding(data, designRecs), "utf8");
    onboardingInfo(`Contexto do projeto salvo em: ${projectContextPath}\n`);

    // ━━━ PROMPT PARA IA ━━━
    const aiPrompt = [
      `Leia o contexto completo em _contexto/onboarding.md e _contexto/design-recommendations.md.`,
      `O projeto "${data.projectName || "\u2014"}" e um ${typeLabel} para o negocio "${data.businessName || "\u2014"}" (${data.businessIndustry || "\u2014"}).`,
      `Publico: ${data.targetAudience || "\u2014"}.`,
      `Diferencial: ${data.differentiator || "\u2014"}.`,
      `Objetivo: ${data.projectObjective || data.mainGoal || "\u2014"}.`,
      `Marca: ${data.brandName || "\u2014"} | Tom: ${data.brandTone || "\u2014"} | Cor: ${data.brandAccent || "\u2014"}.`,
      `Estilo recomendado: ${designRecs.product?.["Primary Style Recommendation"] || "Minimalism"}.`,
      `Tipografia: ${designRecs.typography?.["Font Pairing Name"] || "Modern Professional"}.`,
      `Funcionalidades: ${data.projectFeatures || "definir"}.`,
      `Paginas: ${data.projectPages || "definir"}.`,
      `Leia AGENTS.md, SUPERPROMPT.md, PRODUCT.md, CONVERSATION.md, BRAND.md, DESIGN.md e QUALITY.md antes de alterar codigo.`,
      `Registre seu andamento com node .supermotor/agent.mjs.`,
      `Implemente com autonomia, teste o resultado e informe o que concluiu.`,
    ].join("\n");

    console.log(color("1;37", "  Prompt pronto para a IA:\n"));
    console.log(color("2", `  "${aiPrompt.slice(0, 200)}..."`));
    console.log();

    // ━━━ RESUMO FINAL ━━━
    console.log();
    console.log(color("1;38;5;208", "  \u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557"));
    console.log(color("1;38;5;208", "  \u2551") + color("1;37", "                    RESUMO DO ONBOARDING                   ") + color("1;38;5;208", "  \u2551"));
    console.log(color("1;38;5;208", "  \u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d\n"));

    console.log(color("37", `  Usuario:      ${data.userName || "---"}`));
    console.log(color("37", `  Negocio:      ${data.businessName || "---"}`));
    console.log(color("37", `  Area:         ${data.businessIndustry || "---"}`));
    console.log(color("37", `  Objetivo:     ${data.mainGoal || "---"}`));
    console.log(color("37", `  Publico:      ${data.targetAudience || "---"}`));
    console.log(color("37", `  Projeto:      ${typeLabel} -- "${data.projectName || "---"}"`));
    console.log(color("37", `  Marca:        ${data.brandName || "---"}`));
    if (designRecs.palette) {
      console.log(`  Cores:        ${colorBlock(designRecs.palette.Primary || "#2563EB", "")} ${colorBlock(designRecs.palette.Accent || "#EA580C", "")}`);
    }
    console.log(color("37", `  Estilo:       ${designRecs.style?.["Style Category"] || "---"}`));
    console.log(color("37", `  Fontes:       ${designRecs.typography?.["Font Pairing Name"] || "---"}`));
    console.log(color("37", `  Urgencia:     ${data.urgency || "---"}`));
    console.log(color("37", `  Orcamento:    ${data.budget || "---"}`));
    console.log();

    // ━━━ CRIAR PROJETO ━━━
    onboardingQuestion("Quer que eu crie o projeto agora com base nesse contexto? [S/n]");
    const shouldCreate = (await terminal.question("  -> ")).trim();

    if (!shouldCreate || shouldCreate.toLowerCase() === "s" || shouldCreate.toLowerCase() === "sim") {
      console.log();
      onboardingInfo("Perfeito! Criando seu projeto...\n");

      const resolvedType = normalizeType(data.projectType);
      if (!resolvedType || !data.projectName) {
        ui.warn("Nao foi possivel criar o projeto automaticamente. Use supermotor criar com os dados do onboarding.");
        console.log(`\n  Exemplo: supermotor criar ${data.projectType} "${data.projectName || "Nome do Projeto"}"`);
      } else {
        const slug = (await import("./constants.mjs")).slugify(data.projectName);
        const destination = join((await import("./constants.mjs")).DEFAULT_OUTPUT, slug);

        if (existsSync(destination)) {
          ui.warn(`Ja existe um projeto com o nome "${data.projectName}" em projetos/${slug}`);
          console.log(`  Use supermotor criar ${resolvedType} "${data.projectName}" --saida <caminho>`);
        } else {
          const answers = {
            name: data.projectName,
            brief: data.projectObjective || data.mainGoal || "Criar uma experiencia digital memoravel, clara e orientada a resultado.",
            success: data.successMetric || "O fluxo principal funciona de ponta a ponta, com clareza, qualidade e validacao real.",
            essentials: data.projectFeatures || "Experiencia principal completa, estados de erro e vazio, responsividade e acessibilidade.",
            constraints: data.projectConstraints || "Preservar seguranca, desempenho, identidade da marca e compatibilidade mobile.",
            brandName: data.brandName || data.businessName || data.projectName,
            audience: data.targetAudience || DEFAULT_BRAND.audience,
            tone: data.brandTone || DEFAULT_BRAND.tone,
            accent: data.brandAccent || DEFAULT_BRAND.accent,
            favicon: data.hasFavicon && data.hasFavicon.toLowerCase() !== "nao" && data.hasFavicon.toLowerCase() !== "n" ? data.hasFavicon : "auto",
          };

          if (resolvedType === "crm") {
            const crmDestination = destination;
            const repository = (await import("./constants.mjs")).WACRM_REPOSITORY;
            const sourceRef = (await import("./constants.mjs")).WACRM_STABLE_REF;

            if (!commandExists("git")) {
              throw new Error("Git e obrigatorio para criar um CRM a partir do wacrm.");
            }

            const crmTemplate = join(TEMPLATE_ROOT, TYPES.crm.template);
            if (!existsSync(crmTemplate)) {
              throw new Error("Template de integracao do wacrm ausente. Rode o diagnostico.");
            }

            ui.title(`Criando ${TYPES.crm.label}`);
            ui.info(`Base oficial: ${repository} (${sourceRef})`);
            ui.info(`Destino: ${crmDestination}`);

            const clone = runGit(["clone", "--depth", "1", "--branch", sourceRef, repository, crmDestination], {
              cwd: process.cwd(),
              stdio: "inherit",
            });
            if (clone.status !== 0) {
              throw new Error(`Nao foi possivel clonar a base do wacrm${clone.error ? `: ${clone.error.message}` : "."}`);
            }

            copyTemplate(crmTemplate, crmDestination);
            copyTemplate(join(TEMPLATE_ROOT, "tracking"), join(crmDestination, ".supermotor"));
            const tokens = (await import("./tokens.mjs")).projectTokens("crm", answers, slug, {
              CRM_REPOSITORY: repository,
              CRM_REF: sourceRef,
            });
            replaceTokens(join(crmDestination, ".supermotor"), tokens);
            (await import("./tokens.mjs")).replaceTokensInFile(join(crmDestination, "SUPERMOTOR.md"), tokens);

            const faviconSource = createCrmFavicon(crmDestination, answers.favicon, answers.brandName, answers.accent);
            replaceTokens(join(crmDestination, ".supermotor"), { FAVICON_SOURCE: faviconSource });
            initializeProjectTracking(crmDestination, {
              projectType: "crm",
              name: answers.name.trim(),
              objective: answers.brief.trim(),
              success: answers.success.trim(),
              essentials: answers.essentials.trim(),
              constraints: answers.constraints.trim(),
              brand: answers.brandName.trim(),
              source: repository,
              sourceRef,
              upstream: repository,
              license: "MIT",
              motorVersion: "3.0.0",
            });

            ui.ok("wacrm clonado e contexto SUPERMOTOR aplicado");
            ui.ok(`Favicon: ${faviconSource}`);

            const displayPath = relative(process.cwd(), crmDestination) || crmDestination;
            console.log("\nPronto. Proximos passos:\n");
            console.log(`  cd "${displayPath}"`);
            console.log("  Leia SUPERMOTOR.md e siga a preparacao.");
            console.log("  1. Crie uma conta gratis em supabase.com");
            console.log("  2. Configure o projeto Supabase e rode as migracoes");
            console.log("  3. Configure o Meta WhatsApp Business API");
            console.log("  4. Preencha .env.local com as credenciais");
            console.log("  5. npm install && npm run dev");
            console.log("\nDepois, peca a IA:");
            console.log('  "Leia AGENTS.md, SUPERMOTOR.md, .supermotor/CONVERSATION.md e .supermotor/SUPERPROMPT.md. Registre seu andamento, configure o Supabase, execute o CRM e adapte-o ao meu negocio."');
            console.log(`\n${color("32", "CRM criado com sucesso:")} ${crmDestination}\n`);
          } else {
            const { slugify: slugFn, DEFAULT_OUTPUT: defaultOut } = await import("./constants.mjs");
            const { projectTokens: ptFn } = await import("./tokens.mjs");

            ui.title(`Criando ${TYPES[resolvedType].label}`);
            ui.info(`Destino: ${destination}`);
            mkdirSync(destination, { recursive: true });

            const commonTemplate = join(TEMPLATE_ROOT, "common");
            const typeTemplate = join(TEMPLATE_ROOT, TYPES[resolvedType].template);
            if (existsSync(commonTemplate) && existsSync(typeTemplate)) {
              copyTemplate(commonTemplate, destination);
              copyTemplate(typeTemplate, destination);
              copyTemplate(join(TEMPLATE_ROOT, "tracking"), join(destination, ".supermotor"));
              replaceTokens(destination, ptFn(resolvedType, answers, slug));
              const { createFavicon: cfFn } = await import("./brand.mjs");
              const faviconSource = cfFn(destination, answers.favicon, answers.brandName, answers.accent);
              replaceTokens(destination, { FAVICON_SOURCE: faviconSource });
              initializeProjectTracking(destination, {
                projectType: resolvedType,
                name: data.projectName,
                objective: data.projectObjective || data.mainGoal,
                success: data.successMetric,
                essentials: data.projectFeatures,
                constraints: data.projectConstraints,
                brand: data.brandName || data.businessName,
                motorVersion: "3.0.0",
              });

              const onboardingCtx = join(destination, "_contexto");
              mkdirSync(onboardingCtx, { recursive: true });
              writeFileSync(join(onboardingCtx, "onboarding.md"), generateProjectContextFromOnboarding(data, designRecs), "utf8");
              if (designRecs.product || designRecs.typography || designRecs.style) {
                writeFileSync(join(onboardingCtx, "design-recommendations.md"), generateDesignMarkdown(designRecs, data), "utf8");
              }
              writeFileSync(join(onboardingCtx, "brand-kit.md"), generateBrandKitMarkdown(data), "utf8");
              writeFileSync(join(onboardingCtx, "suggestions.md"), generateSuggestionsMarkdown(suggestions, data), "utf8");
              writeFileSync(join(onboardingCtx, "ai-prompt.txt"), aiPrompt, "utf8");

              ui.ok("Starter e contexto de IA criados");
              ui.ok(`Favicon: ${faviconSource}`);
              ui.ok("Contexto do onboarding injetado no projeto");
              npmInstall(destination);

              const displayPath = relative(process.cwd(), destination) || destination;
              console.log("\nPronto. Proximos passos:\n");
              console.log(`  cd "${displayPath}"`);
              console.log("  npm run dev");
              console.log("\nDepois, peca a IA:");
              console.log(`  "${aiPrompt.slice(0, 120)}..."`);
              console.log(`\nOu copie o prompt completo de: ${join(displayPath, "_contexto", "ai-prompt.txt")}`);
              console.log(`\n${color("32", "Projeto criado com sucesso:")} ${destination}\n`);
            }
          }
        }
      }
    } else {
      console.log();
      console.log("  " + color("36", "Sem problemas! Todos os arquivos foram salvos em _contexto/:"));
      console.log("    onboarding.md               Contexto completo do usuario/negocio");
      console.log("    design-recommendations.md   Recomendacoes da skill ui-ux-pro-max");
      console.log("    brand-kit.md                Kit de marca estruturado");
      console.log("    suggestions.md              Sugestoes de SEO, conteudo e estrategia");
      console.log("    project-context.md          Contexto do projeto para a IA");
      console.log();
      console.log("  " + color("36", "Quando quiser criar o projeto, use:"));
      console.log();
      console.log(`    supermotor criar ${data.projectType} "${data.projectName || "Nome do Projeto"}"`);
      console.log();
      console.log("  " + color("36", "Ou retome o onboarding a qualquer momento com:"));
      console.log("    supermotor onboarding\n");
    }

  } finally {
    terminal.close();
  }
}

export {
  onboardingProgress,
  onboardingGreeting,
  onboardingSep,
  onboardingQuestion,
  onboardingHint,
  onboardingInfo,
  onboardingPhase,
  colorBlock,
  colorSwatch,
  generateOnboardingContext,
  runOnboarding,
};
