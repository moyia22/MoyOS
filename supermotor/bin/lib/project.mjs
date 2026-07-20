import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { color, ui } from "./ui.mjs";
import { ROOT, TEMPLATE_ROOT, DEFAULT_OUTPUT, TYPES, DEFAULT_BRAND, WACRM_REPOSITORY, WACRM_STABLE_REF } from "./constants.mjs";
import { normalizeType, slugify } from "./constants.mjs";
import { normalizeHexColor, validateFaviconInput, createFavicon, createCrmFavicon } from "./brand.mjs";
import { replaceTokens, replaceTokensInFile, projectTokens, collectFiles } from "./tokens.mjs";
import { copyTemplate, npmInstall, commandExists, runGit } from "./templates.mjs";
import { initializeProjectTracking } from "../supermotor-state.mjs";

async function createProjectFromAnswers(type, answers, slug, destination, options = {}) {
  if (type === "crm") {
    const repository = resolve(options.repository || WACRM_REPOSITORY);
    const sourceRef = String(options.sourceRef || WACRM_STABLE_REF).trim();

    if (!commandExists("git")) {
      throw new Error("Git e obrigatorio para criar um CRM a partir do wacrm.");
    }
    const crmTemplate = join(TEMPLATE_ROOT, TYPES.crm.template);
    if (!existsSync(crmTemplate)) {
      throw new Error("Template de integracao do wacrm ausente. Rode o diagnostico.");
    }

    ui.title(`Criando ${TYPES.crm.label}`);
    ui.info(`Base oficial: ${repository} (${sourceRef})`);
    ui.info(`Destino: ${destination}`);

    const clone = runGit(["clone", "--depth", "1", "--branch", sourceRef, repository, destination], {
      cwd: process.cwd(),
      stdio: "inherit",
    });
    if (clone.status !== 0) {
      throw new Error(`Nao foi possivel clonar a base do wacrm${clone.error ? `: ${clone.error.message}` : "."}`);
    }

    copyTemplate(crmTemplate, destination);
    copyTemplate(join(TEMPLATE_ROOT, "tracking"), join(destination, ".supermotor"));
    const tokens = projectTokens("crm", answers, slug, {
      CRM_REPOSITORY: repository,
      CRM_REF: sourceRef,
    });
    replaceTokens(join(destination, ".supermotor"), tokens);
    replaceTokensInFile(join(destination, "SUPERMOTOR.md"), tokens);

    const faviconSource = createCrmFavicon(destination, answers.favicon, answers.brandName, answers.accent);
    replaceTokens(join(destination, ".supermotor"), { FAVICON_SOURCE: faviconSource });
    initializeProjectTracking(destination, {
      projectType: "crm",
      name: answers.name.trim(),
      objective: answers.brief.trim(),
      success: answers.success.trim(),
      essentials: answers.essentials.trim(),
      constraints: answers.constraints.trim(),
      brand: answers.brandName.trim(),
      source: repository,
      sourceRef,
      upstream: WACRM_REPOSITORY,
      license: "MIT",
      motorVersion: "3.0.0",
    });

    ui.ok("wacrm clonado e contexto SUPERMOTOR aplicado");
    ui.ok(`Favicon: ${faviconSource}`);

    const displayPath = relative(process.cwd(), destination) || destination;
    console.log("\nProximos passos:\n");
    console.log(`  cd "${displayPath}"`);
    console.log("  Leia SUPERMOTOR.md e siga a preparacao.");
    console.log("  1. Crie uma conta gratis em supabase.com");
    console.log("  2. Configure o projeto Supabase e rode as migracoes");
    console.log("  3. Configure o Meta WhatsApp Business API");
    console.log("  4. Preencha .env.local com as credenciais");
    console.log("  5. npm install && npm run dev");
    console.log("\nDepois, peca a IA:");
    console.log('  "Leia AGENTS.md, SUPERMOTOR.md, .supermotor/CONVERSATION.md e .supermotor/SUPERPROMPT.md. Registre seu andamento, configure o Supabase, execute o CRM e adapte-o ao meu negocio."');
    console.log(`\n${color("32", "CRM criado com sucesso:")} ${destination}\n`);
    return;
  }

  const commonTemplate = join(TEMPLATE_ROOT, "common");
  const typeTemplate = join(TEMPLATE_ROOT, TYPES[type].template);
  if (!existsSync(commonTemplate) || !existsSync(typeTemplate)) {
    throw new Error(`Template incompleto para ${type}. Rode o diagnostico.`);
  }

  ui.title(`Criando ${TYPES[type].label}`);
  ui.info(`Destino: ${destination}`);
  mkdirSync(destination, { recursive: true });
  copyTemplate(commonTemplate, destination);
  copyTemplate(typeTemplate, destination);
  copyTemplate(join(TEMPLATE_ROOT, "tracking"), join(destination, ".supermotor"));

  replaceTokens(destination, projectTokens(type, answers, slug));

  const faviconSource = createFavicon(destination, answers.favicon, answers.brandName, answers.accent);
  replaceTokens(destination, { FAVICON_SOURCE: faviconSource });
  initializeProjectTracking(destination, {
    projectType: type,
    name: answers.name.trim(),
    objective: answers.brief.trim(),
    success: answers.success.trim(),
    essentials: answers.essentials.trim(),
    constraints: answers.constraints.trim(),
    brand: answers.brandName.trim(),
    motorVersion: "3.0.0",
  });

  ui.ok("Starter e contexto de IA criados");
  ui.ok(`Favicon: ${faviconSource}`);

  if (options.injectContext) {
    const contextDir = join(process.cwd(), "_contexto");
    if (existsSync(contextDir)) {
      const projectContextDir = join(destination, "_contexto");
      mkdirSync(projectContextDir, { recursive: true });
      for (const file of readdirSync(contextDir)) {
        if (file.startsWith(".")) continue;
        const src = join(contextDir, file);
        if (statSync(src).isFile()) {
          writeFileSync(join(projectContextDir, file), readFileSync(src, "utf8"), "utf8");
        }
      }
      ui.ok("Contexto do onboarding injetado no projeto");
    }
  }

  const skipInstall = Boolean(options.skipInstall);
  if (!skipInstall) npmInstall(destination);

  const skipBuild = Boolean(options.skipBuild);
  if (!skipInstall && !skipBuild) {
    const { runNpm } = await import("./templates.mjs");
    const { spinner: makeSpinner, formatDuration } = await import("./ui.mjs");
    const spin = makeSpinner("Executando typecheck + lint + build...");
    const buildStart = performance.now();
    spin.start();
    const check = runNpm(["run", "check"], { cwd: destination, stdio: "ignore" });
    const buildDuration = performance.now() - buildStart;
    if (check.status !== 0) {
      spin.fail(`Quality gate reprovada (${formatDuration(buildDuration)})`);
      ui.hint("Rode manualmente: cd \"" + displayPath + "\" && npm run check");
    } else {
      spin.succeed(`Quality gate aprovada (${formatDuration(buildDuration)})`);
    }
  }

  const displayPath = relative(process.cwd(), destination) || destination;
  console.log("\nProximos passos:\n");
  console.log(`  cd "${displayPath}"`);
  if (skipInstall) console.log("  npm install");
  console.log("  npm run dev");
  console.log("\nDepois, peca a IA:");
  console.log('  "Leia SUPERPROMPT.md, PRODUCT.md, CONVERSATION.md, BRAND.md, DESIGN.md e QUALITY.md. Registre seu andamento e execute o projeto ate passar em todos os criterios."');
  console.log(`\n${color("32", "Projeto criado com sucesso:")} ${destination}\n`);
}

function readOnboardingContext() {
  const contextDir = join(process.cwd(), "_contexto");
  if (!existsSync(contextDir)) return null;
  const onboardingPath = join(contextDir, "onboarding.md");
  if (!existsSync(onboardingPath)) return null;
  try {
    return readFileSync(onboardingPath, "utf8");
  } catch {
    return null;
  }
}

function parseOnboardingContext(text) {
  const data = {};
  const extract = (pattern) => {
    const match = text.match(pattern);
    return match ? match[1].trim() : "";
  };
  data.userName = extract(/\*\*Nome:\*\*\s*(.+)/);
  data.userEmail = extract(/\*\*Email:\*\*\s*(.+)/);
  data.userPhone = extract(/\*\*WhatsApp:\*\*\s*(.+)/);
  data.userInstagram = extract(/\*\*Instagram:\*\*\s*(.+)/);
  data.userLocation = extract(/\*\*Localizacao:\*\*\s*(.+)/);
  data.businessName = extract(/\*\*Nome do negocio:\*\*\s*(.+)/);
  data.businessIndustry = extract(/\*\*Area\/Industria:\*\*\s*(.+)/);
  data.businessDescription = extract(/\*\*Descricao:\*\*\s*(.+)/);
  data.targetAudience = extract(/\*\*Publico principal:\*\*\s*(.+)/);
  data.mainGoal = extract(/\*\*Objetivo principal:\*\*\s*(.+)/);
  data.projectType = extract(/\*\*Tipo de projeto:\*\*\s*(.+)/);
  data.projectName = extract(/\*\*Nome do projeto:\*\*\s*(.+)/);
  data.projectObjective = extract(/\*\*Objetivo do projeto:\*\*\s*(.+)/);
  data.projectFeatures = extract(/\*\*Funcionalidades essenciais:\*\*\s*(.+)/);
  data.brandName = extract(/\*\*Nome da marca:\*\*\s*(.+)/);
  data.brandTone = extract(/\*\*Tom de voz:\*\*\s*(.+)/);
  data.brandAccent = extract(/\*\*Cor de destaque:\*\*\s*(.+)/);
  data.differentiator = extract(/\*\*Diferencial competitivo:\*\*\s*(.+)/);
  data.successMetric = extract(/\*\*Metrica de sucesso:\*\*\s*(.+)/);
  data.projectConstraints = extract(/\*\*Restricoes tecnicas:\*\*\s*(.+)/);
  data.projectPages = extract(/\*\*Paginas\/secoes necessarias:\*\*\s*(.+)/);
  data.projectReferences = extract(/\*\*Referencias\/inspiracoes:\*\*\s*(.+)/);
  data.projectIntegrations = extract(/\*\*Integracoes necessarias:\*\*\s*(.+)/);
  return data;
}

async function promptForMissing(type, name, brief, options = {}) {
  if (!input.isTTY) {
    let piped = "";
    const readStdin = new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(piped), 5000);
      input.on("data", (chunk) => { piped += chunk; });
      input.on("end", () => { clearTimeout(timeout); resolve(piped); });
    });
    piped = await readStdin;
    const answers = piped.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
    const choice = type ? undefined : answers.shift();
    const resolvedType = type || { "1": "site", "2": "app", "3": "carousel", "4": "crm" }[choice] || normalizeType(choice);
    const resolvedName = name || answers.shift() || "";
    const resolvedBrief = brief || answers.shift() || "Criar uma experi\u00eancia digital memor\u00e1vel, clara e orientada a resultado.";
    const success = options.sucesso || answers.shift() || "O fluxo principal funciona de ponta a ponta, com clareza, qualidade e valida\u00e7\u00e3o real.";
    const essentials = options.essenciais || answers.shift() || "Experi\u00eancia principal completa, estados de erro e vazio, responsividade e acessibilidade.";
    const constraints = options.restricoes || options["restri\u00e7\u00f5es"] || answers.shift() || "Preservar seguran\u00e7a, desempenho, identidade da marca e compatibilidade mobile.";
    const brandName = options.marca || answers.shift() || resolvedName;
    const audience = options.publico || options["p\u00fablico"] || answers.shift() || DEFAULT_BRAND.audience;
    const tone = options.tom || answers.shift() || DEFAULT_BRAND.tone;
    const accent = normalizeHexColor(options.cor || answers.shift() || DEFAULT_BRAND.accent);
    const favicon = options.favicon || answers.shift() || "auto";
    return { type: resolvedType, name: resolvedName, brief: resolvedBrief, success, essentials, constraints, brandName, audience, tone, accent, favicon };
  }

  const terminal = createInterface({ input, output });
  ui.title("SUPERMOTOR \u2014 novo projeto");

  try {
    let resolvedType = type;
    if (!resolvedType) {
      console.log("1. Site premium");
      console.log("2. Aplica\u00e7\u00e3o / dashboard");
      console.log("3. Carrossel social edit\u00e1vel\n");
      console.log("4. CRM completo com WhatsApp\n");
      const choice = await terminal.question("Escolha o tipo [1-4]: ");
      resolvedType = { "1": "site", "2": "app", "3": "carousel", "4": "crm" }[choice.trim()] ?? normalizeType(choice);
    }

    const resolvedName = name || (await terminal.question("Nome do projeto: ")).trim();
    const resolvedBrief =
      brief ||
      (await terminal.question("Objetivo em uma frase (opcional): ")).trim() ||
      "Criar uma experi\u00eancia digital memor\u00e1vel, clara e orientada a resultado.";
    let success = options.sucesso || "O fluxo principal funciona de ponta a ponta, com clareza, qualidade e valida\u00e7\u00e3o real.";
    let essentials = options.essenciais || "Experi\u00eancia principal completa, estados de erro e vazio, responsividade e acessibilidade.";
    let constraints = options.restricoes || options["restri\u00e7\u00f5es"] || "Preservar seguran\u00e7a, desempenho, identidade da marca e compatibilidade mobile.";
    let brandName = options.marca || resolvedName;
    let audience = options.publico || options["p\u00fablico"] || DEFAULT_BRAND.audience;
    let tone = options.tom || DEFAULT_BRAND.tone;
    let accent = options.cor || DEFAULT_BRAND.accent;

    if (!options.rapido && !options["modo-r\u00e1pido"]) {
      success = options.sucesso || (await terminal.question("Como saberemos que o projeto deu certo? (opcional): ")).trim() || success;
      essentials = options.essenciais || (await terminal.question("O que precisa funcionar na primeira vers\u00e3o? (opcional): ")).trim() || essentials;
      constraints = options.restricoes || options["restri\u00e7\u00f5es"] || (await terminal.question("H\u00e1 integra\u00e7\u00f5es, limites ou algo proibido? (opcional): ")).trim() || constraints;
      const customize = (await terminal.question("Personalizar a marca agora? [S/n]: ")).trim().toLowerCase();
      if (!["n", "nao", "n\u00e3o"].includes(customize)) {
        brandName = options.marca || (await terminal.question(`Nome da marca [${resolvedName}]: `)).trim() || resolvedName;
        audience = options.publico || options["p\u00fablico"] || (await terminal.question("P\u00fablico principal (opcional): ")).trim() || DEFAULT_BRAND.audience;
        tone = options.tom || (await terminal.question("Personalidade da marca (opcional): ")).trim() || DEFAULT_BRAND.tone;
        accent = options.cor || (await terminal.question(`Cor de destaque [${DEFAULT_BRAND.accent}]: `)).trim() || DEFAULT_BRAND.accent;
      }
    }

    const favicon =
      options.favicon ||
      (options.rapido ? "auto" : (await terminal.question("Favicon: caminho para .ico/.png/.jpg/.svg ou Enter para gerar automaticamente: ")).trim()) ||
      "auto";

    return { type: resolvedType, name: resolvedName, brief: resolvedBrief, success, essentials, constraints, brandName, audience, tone, accent: normalizeHexColor(accent), favicon };
  } finally {
    terminal.close();
  }
}

async function createProject(parsed) {
  const rawType = parsed.positionals[1];
  const rawName = parsed.positionals.slice(2).join(" ");
  const initialType = normalizeType(rawType);
  const briefOption = parsed.options.brief || parsed.options.objetivo || "";

  const onboardingData = readOnboardingContext();
  if (onboardingData && !initialType && !rawName) {
    console.log();
    ui.info("Contexto de onboarding detectado em _contexto/onboarding.md");
    const parsed2 = parseOnboardingContext(onboardingData);
    if (parsed2.projectName) ui.info(`Projeto: ${parsed2.projectName}`);
    if (parsed2.businessName) ui.info(`Negocio: ${parsed2.businessName}`);
    if (parsed2.projectType && parsed2.projectType !== "Nao definido") ui.info(`Tipo: ${parsed2.projectType}`);
    console.log();
    const terminal = createInterface({ input, output });
    try {
      const use = (await terminal.question("Usar dados do onboarding? [S/n]: ")).trim().toLowerCase();
      if (!["n", "nao"].includes(use)) {
        const resolvedType = normalizeType(parsed2.projectType) || "site";
        const answers = {
          name: parsed2.projectName || parsed2.businessName || "",
          brief: parsed2.projectObjective || parsed2.mainGoal || "Criar uma experiencia digital memoravel, clara e orientada a resultado.",
          success: parsed2.successMetric || "O fluxo principal funciona de ponta a ponta, com clareza, qualidade e validacao real.",
          essentials: parsed2.projectFeatures || "Experiencia principal completa, estados de erro e vazio, responsividade e acessibilidade.",
          constraints: parsed2.projectConstraints || "Preservar seguranca, desempenho, identidade da marca e compatibilidade mobile.",
          brandName: parsed2.brandName || parsed2.businessName || parsed2.projectName || "",
          audience: parsed2.targetAudience || DEFAULT_BRAND.audience,
          tone: parsed2.brandTone || DEFAULT_BRAND.tone,
          accent: normalizeHexColor(parsed2.brandAccent || DEFAULT_BRAND.accent),
          favicon: "auto",
        };
        const slug = slugify(answers.name);
        const destination = parsed.options.saida ? resolve(process.cwd(), String(parsed.options.saida)) : join(DEFAULT_OUTPUT, slug);
        if (existsSync(destination)) throw new Error(`O destino ja existe: ${destination}\nDica: use --saida <outro-caminho> ou remova a pasta existente.`);
        await createProjectFromAnswers(resolvedType, answers, slug, destination, {
          injectContext: true,
          skipInstall: Boolean(parsed.options["sem-instalar"] || parsed.options["skip-install"]),
          skipBuild: Boolean(parsed.options["sem-build"]),
          repository: parsed.options["crm-repo"],
          sourceRef: parsed.options["crm-ref"],
        });
        return;
      }
    } finally {
      terminal.close();
    }
  }

  const answers = await promptForMissing(initialType, rawName, briefOption, parsed.options);
  const type = normalizeType(answers.type);

  if (!type) throw new Error("Tipo invalido. Use site, app, carrossel ou crm.");
  if (!answers.name?.trim()) throw new Error("Informe um nome para o projeto.");

  const slug = slugify(answers.name);
  if (!slug) throw new Error("O nome precisa conter letras ou numeros. Exemplo: \"Meu Site\"");

  validateFaviconInput(answers.favicon);

  const explicitOutput = parsed.options.saida || parsed.options.output;
  const destination = explicitOutput
    ? resolve(process.cwd(), String(explicitOutput))
    : join(DEFAULT_OUTPUT, slug);

  if (existsSync(destination)) throw new Error(`O destino ja existe: ${destination}\nDica: use --saida <outro-caminho> ou remova a pasta existente.`);

  await createProjectFromAnswers(type, answers, slug, destination, {
    skipInstall: Boolean(parsed.options["sem-instalar"] || parsed.options["skip-install"]),
    skipBuild: Boolean(parsed.options["sem-build"]),
    repository: parsed.options["crm-repo"],
    sourceRef: parsed.options["crm-ref"],
  });
}

async function validateProject(parsed) {
  const requestedPath = parsed.positionals[1] || ".";
  const project = resolve(process.cwd(), requestedPath);
  ui.title("SUPERMOTOR \u2014 valida\u00e7\u00e3o");
  ui.info(`Projeto: ${project}`);

  if (!existsSync(project) || !statSync(project).isDirectory()) {
    throw new Error(`Projeto nao encontrado: ${project}\nDica: rode supermotor listar para ver projetos registrados.`);
  }

  const crmMarker = join(project, ".supermotor", "project.json");
  if (existsSync(crmMarker)) {
    try {
      const metadata = JSON.parse(readFileSync(crmMarker, "utf8"));
      if (metadata.projectType === "crm") {
        validateCrmProject(project, parsed);
        return;
      }
    } catch {
      throw new Error("Metadados invalidos em .supermotor/project.json.\nDica: delete o arquivo e rode supermotor criar novamente para regenerar.");
    }
  }

  const failures = [];
  const pass = (condition, success, failure) => {
    if (condition) ui.ok(success);
    else {
      ui.fail(failure);
      failures.push(failure);
    }
  };

  for (const file of ["package.json", "PRODUCT.md", "CONVERSATION.md", "BRAND.md", "DESIGN.md", "QUALITY.md", "SUPERPROMPT.md", ".supermotor/project.json", ".supermotor/agent.mjs", ".supermotor/AGENT_PROTOCOL.md"]) {
    pass(existsSync(join(project, file)), file, `Arquivo obrigat\u00f3rio ausente: ${file}`);
  }

  const appDirectory = join(project, "src", "app");
  const appFiles = existsSync(appDirectory) ? readdirSync(appDirectory) : [];
  const hasFavicon = appFiles.some((file) => /^(favicon\.ico|icon\.(ico|jpe?g|png|svg|tsx?|jsx?))$/i.test(file));
  pass(hasFavicon, "Favicon configurado", "Favicon ausente em src/app");

  const sourceFiles = collectFiles(join(project, "src"));
  const readableFiles = sourceFiles.filter((file) => /\.(css|html|js|jsx|ts|tsx)$/i.test(file));
  const source = readableFiles.map((file) => readFileSync(file, "utf8")).join("\n");
  const contextFiles = ["package.json", "PRODUCT.md", "CONVERSATION.md", "BRAND.md", "DESIGN.md", "QUALITY.md", "SUPERPROMPT.md", "AGENTS.md", ".supermotor/project.json", ".supermotor/AGENT_PROTOCOL.md"]
    .map((file) => join(project, file))
    .filter((file) => existsSync(file));
  const projectContext = [...readableFiles, ...contextFiles].map((file) => readFileSync(file, "utf8")).join("\n");
  const forbiddenZoom = /userScalable\s*:\s*false|user-scalable\s*=\s*no|maximumScale\s*:\s*[01](?:\D|$)|maximum-scale\s*=\s*[01](?:\D|$)/i;
  pass(!forbiddenZoom.test(source), "Zoom acess\u00edvel preservado", "Configura\u00e7\u00e3o bloqueia o zoom do usu\u00e1rio");
  pass(/width\s*:\s*["']device-width["']/.test(source) && /initialScale\s*:\s*1/.test(source), "Viewport mobile correto", "Viewport width=device-width e initialScale=1 n\u00e3o encontrada");
  pass(/overflow-x\s*:\s*(clip|hidden)/i.test(source), "Overflow horizontal protegido", "Prote\u00e7\u00e3o contra overflow horizontal ausente");
  pass(/-webkit-text-size-adjust\s*:\s*100%/i.test(source), "Escala de texto mobile est\u00e1vel", "-webkit-text-size-adjust: 100% ausente");
  pass(/touch-action\s*:\s*manipulation/i.test(source), "Autozoom em controles reduzido", "touch-action: manipulation ausente nos controles");
  pass(/font-size\s*:\s*16px\s*!important/i.test(source), "Inputs mobile com tamanho seguro", "Prote\u00e7\u00e3o global de 16px para inputs mobile ausente");
  pass(!/__(PROJECT|BRAND|FAVICON)_/.test(projectContext), "Tokens substitu\u00eddos", "H\u00e1 tokens do template sem substitui\u00e7\u00e3o");

  if (failures.length > 0) {
    console.log(`\n${failures.length} problema(s) precisam ser corrigidos.`);
    ui.hint("Corrija os problemas acima e rode supermotor validar novamente.");
    process.exitCode = 1;
    return;
  }

  const skipBuild = Boolean(parsed.options["sem-build"] || parsed.options["static-only"]);
  if (skipBuild) {
    console.log("\nValida\u00e7\u00e3o est\u00e1tica aprovada.\n");
    return;
  }

  if (!existsSync(join(project, "node_modules"))) {
    ui.fail("Depend\u00eancias ausentes. Rode npm install ou use --sem-build.");
    process.exitCode = 1;
    return;
  }

  const { runNpm } = await import("./templates.mjs");
  const { spinner: makeSpinner, formatDuration } = await import("./ui.mjs");
  const spin = makeSpinner("Executando typecheck, lint e build...");
  const buildStart = performance.now();
  spin.start();
  const result = runNpm(["run", "check"], { cwd: project, stdio: "ignore" });
  const buildDuration = performance.now() - buildStart;
  if (result.status !== 0) {
    spin.fail(`Quality gate tecnica reprovada (${formatDuration(buildDuration)})`);
    ui.hint("Rode npm run check manualmente para ver os erros detalhados.");
    process.exitCode = result.status || 1;
    return;
  }

  spin.succeed(`Quality gate tecnica aprovada (${formatDuration(buildDuration)})`);
  console.log("\nProjeto aprovado pelo SUPERMOTOR.\n");
}

async function validateCrmProject(project, parsed) {
  const failures = [];
  const pass = (condition, success, failure) => {
    if (condition) ui.ok(success);
    else {
      ui.fail(failure);
      failures.push(failure);
    }
  };

  const requiredFiles = [
    "package.json",
    "AGENTS.md",
    "SUPERMOTOR.md",
    "src/app/layout.tsx",
    "next.config.ts",
    ".supermotor/project.json",
    ".supermotor/PRODUCT.md",
    ".supermotor/CONVERSATION.md",
    ".supermotor/BRAND.md",
    ".supermotor/QUALITY.md",
    ".supermotor/SUPERPROMPT.md",
    ".supermotor/agent.mjs",
    ".supermotor/AGENT_PROTOCOL.md",
  ];
  for (const file of requiredFiles) {
    pass(existsSync(join(project, file)), file, `Arquivo obrigat\u00f3rio ausente: ${file}`);
  }

  const publicDirectory = join(project, "public");
  const publicFiles = existsSync(publicDirectory) ? readdirSync(publicDirectory) : [];
  pass(publicFiles.some((file) => /^supermotor-icon\.(ico|jpe?g|png|svg)$/i.test(file)), "Favicon do CRM configurado", "Favicon do CRM ausente em public");

  const globalsPath = join(project, "src", "app", "globals.css");
  const css = existsSync(globalsPath) ? readFileSync(globalsPath, "utf8") : "";
  pass(!/user-scalable\s*=\s*no|maximum-scale\s*=\s*[01](?:\D|$)/i.test(css), "Zoom acess\u00edvel preservado", "Viewport do CRM bloqueia o zoom do usu\u00e1rio");
  pass(/overflow-x\s*:\s*(clip|hidden)/i.test(css), "Overflow horizontal protegido", "Prote\u00e7\u00e3o contra overflow horizontal ausente");
  pass(/-webkit-text-size-adjust\s*:\s*100%/i.test(css), "Escala de texto mobile est\u00e1vel", "Escala de texto mobile n\u00e3o protegida");
  pass(/touch-action\s*:\s*manipulation/i.test(css), "Intera\u00e7\u00f5es de toque protegidas", "touch-action: manipulation ausente");
  pass(/font-size\s*:\s*16px\s*!important/i.test(css), "Inputs mobile com tamanho seguro", "Prote\u00e7\u00e3o de 16px para inputs mobile ausente");

  const contextDirectory = join(project, ".supermotor");
  const contextFiles = existsSync(contextDirectory) ? collectFiles(contextDirectory).filter((file) => /\.(json|md)$/i.test(file)) : [];
  const context = [...contextFiles, join(project, "SUPERMOTOR.md")]
    .filter((file) => existsSync(file))
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");
  pass(!/__(PROJECT|BRAND|FAVICON|CRM)_/.test(context), "Tokens substitu\u00eddos", "H\u00e1 tokens do CRM sem substitui\u00e7\u00e3o");

  if (failures.length > 0) {
    console.log(`\n${failures.length} problema(s) precisam ser corrigidos.\n`);
    process.exitCode = 1;
    return;
  }

  const skipBuild = Boolean(parsed.options["sem-build"] || parsed.options["static-only"]);
  if (skipBuild) {
    console.log("\nValida\u00e7\u00e3o est\u00e1tica do wacrm aprovada.\n");
    return;
  }

  if (!existsSync(join(project, "node_modules"))) {
    ui.fail("Depend\u00eancias ausentes. Rode npm install ou use --sem-build.");
    process.exitCode = 1;
    return;
  }

  ui.info("Executando build do wacrm...");
  const { runNpm } = await import("./templates.mjs");
  const build = runNpm(["run", "build"], { cwd: project, stdio: "inherit" });
  if (build.status !== 0) {
    ui.fail("Build do wacrm reprovado");
    process.exitCode = build.status || 1;
    return;
  }

  ui.ok("Quality gate t\u00e9cnica do wacrm aprovada");
  console.log("\nCRM aprovado pelo SUPERMOTOR.\n");
}

export { createProject, createProjectFromAnswers, readOnboardingContext, parseOnboardingContext, validateProject, validateCrmProject, promptForMissing };
