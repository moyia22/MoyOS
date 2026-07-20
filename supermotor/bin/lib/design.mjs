import { readCSV, scoreMatch } from "./csv.mjs";

function findBestProductType(industry, description, goal) {
  const products = readCSV("products.csv");
  if (!products.length) return null;
  const searchText = [industry, description, goal].filter(Boolean).join(" ");
  let best = null;
  let bestScore = 0;
  for (const row of products) {
    const score = scoreMatch(searchText, row.Keywords);
    if (score > bestScore) {
      bestScore = score;
      best = row;
    }
  }
  return best;
}

function findBestColorPalette(productType) {
  const colors = readCSV("colors.csv");
  if (!colors.length) return null;
  const search = productType || "";
  let best = null;
  let bestScore = 0;
  for (const row of colors) {
    const score = scoreMatch(search, row["Product Type"]) + (row["Product Type"] === productType ? 10 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = row;
    }
  }
  return best;
}

function findBestTypography(tone, personality, industry) {
  const typography = readCSV("typography.csv");
  if (!typography.length) return null;
  const searchText = [tone, personality, industry].filter(Boolean).join(" ");
  let best = null;
  let bestScore = 0;
  for (const row of typography) {
    const score = scoreMatch(searchText, row["Mood/Style Keywords"]);
    if (score > bestScore) {
      bestScore = score;
      best = row;
    }
  }
  if (!best) best = typography[0];
  return best;
}

function findBestStyle(productType, tone) {
  const styles = readCSV("styles.csv");
  if (!styles.length) return null;
  const searchText = [productType, tone].filter(Boolean).join(" ");
  let best = null;
  let bestScore = 0;
  for (const row of styles) {
    const score = scoreMatch(searchText, row.Keywords) + scoreMatch(searchText, row["Best For"]);
    if (score > bestScore) {
      bestScore = score;
      best = row;
    }
  }
  return best;
}

function findBestLandingPattern(projectType, goal) {
  const landing = readCSV("landing.csv");
  if (!landing.length) return null;
  const searchText = [projectType, goal].filter(Boolean).join(" ");
  let best = null;
  let bestScore = 0;
  for (const row of landing) {
    const score = scoreMatch(searchText, row.Keywords);
    if (score > bestScore) {
      bestScore = score;
      best = row;
    }
  }
  return best;
}

function findReasoningRules(industry) {
  const reasoning = readCSV("ui-reasoning.csv");
  if (!reasoning.length) return null;
  let best = null;
  let bestScore = 0;
  for (const row of reasoning) {
    const score = scoreMatch(industry, row.UI_Category);
    if (score > bestScore) {
      bestScore = score;
      best = row;
    }
  }
  return best;
}

function generateDesignRecommendations(data) {
  const product = findBestProductType(data.businessIndustry, data.businessDescription, data.digitalGoal);
  const palette = findBestColorPalette(product?.["Product Type"]);
  const typography = findBestTypography(data.brandTone, data.brandPersonality, data.businessIndustry);
  const style = findBestStyle(product?.["Product Type"], data.brandTone);
  const landing = findBestLandingPattern(data.projectType, data.digitalGoal);
  const reasoning = findReasoningRules(data.businessIndustry);

  return { product, palette, typography, style, landing, reasoning };
}

function generateDesignMarkdown(recs, data) {
  const lines = [];
  lines.push("# Design Inteligente \u2014 Recomenda\u00e7\u00f5es UI/UX");
  lines.push(`> Gerado pelo SUPERMOTOR 3.0 com a skill ui-ux-pro-max\n`);

  if (recs.product) {
    lines.push("## Tipo de Produto Recomendado\n");
    lines.push(`- **Categoria:** ${recs.product["Product Type"]}`);
    lines.push(`- **Estilo principal:** ${recs.product["Primary Style Recommendation"]}`);
    lines.push(`- **Estilos secund\u00e1rios:** ${recs.product["Secondary Styles"]}`);
    lines.push(`- **Padr\u00e3o de landing:** ${recs.product["Landing Page Pattern"]}`);
    lines.push(`- **Dashboard:** ${recs.product["Dashboard Style (if applicable)"]}`);
    lines.push(`- **Paleta de cores:** ${recs.product["Color Palette Focus"]}`);
    lines.push(`- **Considera\u00e7\u00f5es:** ${recs.product["Key Considerations"]}`);
    lines.push("");
  }

  if (recs.palette) {
    lines.push("## Paleta de Cores Recomendada\n");
    lines.push(`| Fun\u00e7\u00e3o | Cor |`);
    lines.push(`|--------|-----|`);
    lines.push(`| Prim\u00e1ria | ${recs.palette.Primary} |`);
    lines.push(`| Secund\u00e1ria | ${recs.palette.Secondary} |`);
    lines.push(`| Destaque | ${recs.palette.Accent} |`);
    lines.push(`| Fundo | ${recs.palette.Background} |`);
    lines.push(`| Texto | ${recs.palette.Foreground} |`);
    lines.push(`| Card | ${recs.palette.Card} |`);
    lines.push(`| Bordas | ${recs.palette.Border} |`);
    lines.push(`| Erro | ${recs.palette.Destructive} |`);
    lines.push(`| Foco | ${recs.palette.Ring} |`);
    lines.push(`\n> ${recs.palette.Notes}\n`);
  }

  if (recs.typography) {
    lines.push("## Tipografia Recomendada\n");
    lines.push(`- **Par de fontes:** ${recs.typography["Font Pairing Name"]}`);
    lines.push(`- **Fonte de t\u00edtulo:** ${recs.typography["Heading Font"]}`);
    lines.push(`- **Fonte de corpo:** ${recs.typography["Body Font"]}`);
    lines.push(`- **Categoria:** ${recs.typography.Category}`);
    lines.push(`- **Mood:** ${recs.typography["Mood/Style Keywords"]}`);
    lines.push(`- **Melhor para:** ${recs.typography["Best For"]}`);
    lines.push(`\n### Importa\u00e7\u00e3o Google Fonts\n`);
    lines.push("```css");
    lines.push(recs.typography["CSS Import"] || "");
    lines.push("```\n");
    lines.push("### Configura\u00e7\u00e3o Tailwind\n");
    lines.push("```js");
    lines.push(recs.typography["Tailwind Config"] || "");
    lines.push("```\n");
    lines.push(`> ${recs.typography.Notes}\n`);
  }

  if (recs.style) {
    lines.push("## Estilo Visual Recomendado\n");
    lines.push(`- **Categoria:** ${recs.style["Style Category"]}`);
    lines.push(`- **Tipo:** ${recs.style.Type}`);
    lines.push(`- **Melhor para:** ${recs.style["Best For"]}`);
    lines.push(`- **N\u00c3O usar para:** ${recs.style["Do Not Use For"]}`);
    lines.push(`- **Performance:** ${recs.style.Performance}`);
    lines.push(`- **Acessibilidade:** ${recs.style.Accessibility}`);
    lines.push(`- **Mobile:** ${recs.style["Mobile-Friendly"]}`);
    lines.push(`- **Convers\u00e3o:** ${recs.style["Conversion-Focused"]}`);
    lines.push(`- **Complexidade:** ${recs.style.Complexity}`);
    lines.push(`- **Era/Origem:** ${recs.style["Era/Origin"]}`);
    lines.push(`\n### Prompt para IA\n`);
    lines.push(`> ${recs.style["AI Prompt Keywords"]}\n`);
    lines.push(`### Vari\u00e1veis de Design System\n`);
    lines.push("```css");
    lines.push(recs.style["Design System Variables"] || "");
    lines.push("```\n");
    lines.push(`### Checklist de Implementa\u00e7\u00e3o\n`);
    lines.push((recs.style["Implementation Checklist"] || "").split(", ").map((item) => `- ${item}`).join("\n"));
    lines.push("");
  }

  if (recs.landing && (data.projectType === "site" || data.projectType === "carousel")) {
    lines.push("## Padr\u00e3o de Landing Page\n");
    lines.push(`- **Padr\u00e3o:** ${recs.landing["Pattern Name"]}`);
    lines.push(`- **Ordem das se\u00e7\u00f5es:** ${recs.landing["Section Order"]}`);
    lines.push(`- **CTA principal:** ${recs.landing["Primary CTA Placement"]}`);
    lines.push(`- **Estrat\u00e9gia de cores:** ${recs.landing["Color Strategy"]}`);
    lines.push(`- **Efeitos recomendados:** ${recs.landing["Recommended Effects"]}`);
    lines.push(`- **Otimiza\u00e7\u00e3o de convers\u00e3o:** ${recs.landing["Conversion Optimization"]}`);
    lines.push("");
  }

  if (recs.reasoning) {
    lines.push("## Regras de Racioc\u00ednio por Ind\u00fastria\n");
    lines.push(`- **Padr\u00e3o recomendado:** ${recs.reasoning.Recommended_Pattern}`);
    lines.push(`- **Prioridade de estilo:** ${recs.reasoning.Style_Priority}`);
    lines.push(`- **Mood de cores:** ${recs.reasoning.Color_Mood}`);
    lines.push(`- **Mood de tipografia:** ${recs.reasoning.Typography_Mood}`);
    lines.push(`- **Efeitos chave:** ${recs.reasoning.Key_Effects}`);
    lines.push(`- **Anti-padr\u00f5es:** ${recs.reasoning.Anti_Patterns}`);
    lines.push(`- **Severidade:** ${recs.reasoning.Severity}`);
    lines.push("");
  }

  lines.push("---");
  lines.push("> Estas recomenda\u00e7\u00f5es foram geradas automaticamente pela skill ui-ux-pro-max.");
  lines.push("> Use como base para DESIGN.md do projeto.\n");

  return lines.join("\n");
}

function generateSuggestions(data) {
  const suggestions = [];

  if (data.projectType === "site" || data.projectType === "carousel") {
    if (data.mainGoal) {
      if (/vend|convert|compr|lead/.test(data.mainGoal.toLowerCase())) {
        suggestions.push({ type: "conteudo", text: "CTA de conversao acima da dobra (hero) com linguagem orientada a acao" });
        suggestions.push({ type: "conteudo", text: "Prova social visivel: depoimentos, logos de clientes, numeros de resultados" });
      }
      if (/marc|brand|conhec/.test(data.mainGoal.toLowerCase())) {
        suggestions.push({ type: "conteudo", text: "Secao de historia/missao que conecta emocionalmente com o visitante" });
        suggestions.push({ type: "conteudo", text: "Galeria de trabalhos ou portfolio com imagens de alta qualidade" });
      }
    }
    if (data.targetAudience) {
      if (/empres|b2b|corporat/.test(data.targetAudience.toLowerCase())) {
        suggestions.push({ type: "estrategia", text: "Linguagem formal e focada em ROI, cases de sucesso e numeros" });
      } else if (/jov|teen|gen\s*z|social/.test(data.targetAudience.toLowerCase())) {
        suggestions.push({ type: "estrategia", text: "Visual moderno, linguagem informal, integracao com redes sociais" });
      }
    }
  }

  if (data.projectType === "app") {
    suggestions.push({ type: "tecnico", text: "Defina roles de usuario e fluxos criticos antes de criar telas" });
    suggestions.push({ type: "tecnico", text: "Modele entidades e estados com Zod antes de implementar forms" });
    if (data.projectIntegrations && /supabase/i.test(data.projectIntegrations)) {
      suggestions.push({ type: "tecnico", text: "Configure RLS (Row Level Security) desde o inicio para seguranca" });
    }
  }

  if (data.projectType === "crm") {
    suggestions.push({ type: "integracao", text: "Configure o Meta WhatsApp Business API antes de usar o CRM" });
    suggestions.push({ type: "integracao", text: "Crie templates de mensagem para automacoes no-code" });
  }

  if (data.needsSEO === "Sim") {
    suggestions.push({ type: "seo", text: "Defina 5-10 palavras-chave principais baseadas no publico e objetivo" });
    suggestions.push({ type: "seo", text: "Configure meta tags (title, description, og:image) em cada pagina" });
    suggestions.push({ type: "seo", text: "Adicione schema.org/JSON-LD para dados estruturados (LocalBusiness, Product)" });
  }

  if (data.activeSocialMedia) {
    suggestions.push({ type: "marketing", text: "Integre botoes de compartilhamento e feeds de redes sociais no site" });
  }

  if (data.whatsappBusiness && data.whatsappBusiness.toLowerCase() === "sim") {
    suggestions.push({ type: "integracao", text: "Adicione botao flutuante de WhatsApp com mensagem pre-definida" });
  }

  if (data.competitors) {
    suggestions.push({ type: "estrategia", text: "Analise os sites dos concorrentes: o que funciona e o que falta" });
    suggestions.push({ type: "diferencial", text: `Seu diferencial e: ${data.differentiator || "destaque-o na homepage"}` });
  }

  if (!data.hasWebsite || data.hasWebsite.toLowerCase() === "nao") {
    suggestions.push({ type: "seo", text: "Registre um dominio profissional (.com.br ou .com) antes de lancar" });
  }

  suggestions.push({ type: "qualidade", text: "Teste em 3 tamanhos: mobile (375px), tablet (768px), desktop (1440px)" });
  suggestions.push({ type: "qualidade", text: "Garanta contraste WCAG AA (4.5:1) em todo texto sobre fundo" });

  return suggestions;
}

function generateSuggestionsMarkdown(suggestions, data) {
  const lines = [];
  lines.push("# Sugestoes Inteligentes");
  lines.push(`> Geradas pelo SUPERMOTOR 3.0 baseadas nas suas respostas\n`);

  const grouped = {};
  for (const s of suggestions) {
    if (!grouped[s.type]) grouped[s.type] = [];
    grouped[s.type].push(s.text);
  }

  const typeLabels = {
    conteudo: "Conteudo e Copy",
    estrategia: "Estrategia",
    tecnico: "Tecnico",
    integracao: "Integracao",
    seo: "SEO e Visibilidade",
    marketing: "Marketing",
    diferencial: "Diferencial",
    qualidade: "Qualidade",
  };

  for (const [type, items] of Object.entries(grouped)) {
    lines.push(`## ${typeLabels[type] || type}\n`);
    for (const item of items) {
      lines.push(`- ${item}`);
    }
    lines.push("");
  }

  lines.push("---");
  lines.push("> Estas sugestoes sao automaticas. Discuta com a IA qual priorizar.\n");
  return lines.join("\n");
}

function generateProjectContextFromOnboarding(data, recs) {
  const lines = [];
  lines.push(`# Contexto do Onboarding \u2014 ${data.projectName || data.businessName}`);
  lines.push("> Dados coletados pelo SUPERMOTOR 3.0 durante o onboarding interativo.\n");

  lines.push("## Resumo Rapido\n");
  lines.push(`- **Negocio:** ${data.businessName || "\u2014"} (${data.businessIndustry || "\u2014"})`);
  lines.push(`- **Projeto:** ${data.projectName || "\u2014"} \u2014 ${data.projectType || "\u2014"}`);
  lines.push(`- **Marca:** ${data.brandName || "\u2014"} | Tom: ${data.brandTone || "\u2014"} | Cor: ${data.brandAccent || "\u2014"}`);
  lines.push(`- **Publico:** ${data.targetAudience || "\u2014"}`);
  lines.push(`- **Objetivo:** ${data.projectObjective || data.mainGoal || "\u2014"}`);
  lines.push(`- **Sucesso:** ${data.successMetric || "\u2014"}`);
  lines.push("");

  lines.push("## Sobre o Negocio\n");
  lines.push(`- **Nome:** ${data.businessName || "\u2014"}`);
  lines.push(`- **Area:** ${data.businessIndustry || "\u2014"}`);
  lines.push(`- **Descricao:** ${data.businessDescription || "\u2014"}`);
  lines.push(`- **Porte:** ${data.businessSize || "\u2014"}`);
  lines.push(`- **Localizacao:** ${data.businessLocation || "\u2014"}`);
  lines.push(`- **Tempo de mercado:** ${data.businessAge || "\u2014"}`);
  lines.push("");

  lines.push("## Publico-Alvo\n");
  lines.push(`- **Cliente ideal:** ${data.targetAudience || "\u2014"}`);
  lines.push(`- **Idade:** ${data.audienceAge || "\u2014"}`);
  lines.push(`- **Genero:** ${data.audienceGender || "\u2014"}`);
  lines.push(`- **Renda:** ${data.audienceClass || "\u2014"}`);
  lines.push(`- **Dores:** ${data.audiencePains || "\u2014"}`);
  lines.push(`- **Onde esta:** ${data.audienceWhere || "\u2014"}`);
  lines.push("");

  lines.push("## Modelo de Negocio\n");
  lines.push(`- **Como fatura:** ${data.revenueModel || "\u2014"}`);
  lines.push(`- **Produtos:** ${data.mainProducts || "\u2014"}`);
  lines.push(`- **Preco:** ${data.priceRange || "\u2014"}`);
  lines.push(`- **Ticket medio:** ${data.averageTicket || "\u2014"}`);
  lines.push(`- **Concorrentes:** ${data.competitors || "\u2014"}`);
  lines.push(`- **Diferencial:** ${data.differentiator || "\u2014"}`);
  lines.push("");

  if (data.projectFeatures) {
    lines.push("## Funcionalidades Essenciais\n");
    lines.push(data.projectFeatures.split(",").map((f) => `- ${f.trim()}`).join("\n"));
    lines.push("");
  }

  if (data.projectPages) {
    lines.push("## Paginas/Secoes\n");
    lines.push(data.projectPages.split(",").map((p) => `- ${p.trim()}`).join("\n"));
    lines.push("");
  }

  lines.push("---\n");
  lines.push("> Leia este arquivo junto com PRODUCT.md, BRAND.md e DESIGN.md para ter o contexto completo do projeto.\n");

  return lines.join("\n");
}

export {
  findBestProductType,
  findBestColorPalette,
  findBestTypography,
  findBestStyle,
  findBestLandingPattern,
  findReasoningRules,
  generateDesignRecommendations,
  generateDesignMarkdown,
  generateSuggestions,
  generateSuggestionsMarkdown,
  generateProjectContextFromOnboarding,
};
