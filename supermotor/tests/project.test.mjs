import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseOnboardingContext, readOnboardingContext } from "../bin/lib/project.mjs";

describe("parseOnboardingContext", () => {
  it("extracts fields from onboarding markdown", () => {
    const md = `# Contexto do Onboarding — Moy
> Gerado em 2026-01-01 pelo SUPERMOTOR 3.0

---

## Sobre Voce

- **Nome:** Moy
- **Email:** moy@test.com
- **WhatsApp:** 11999999999
- **Instagram:** @moy
- **Localizacao:** SP

## Sobre o Negocio

- **Nome do negocio:** Moy Labs
- **Area/Industria:** SaaS
- **Descricao:** Plataforma de vendas

## Objetivos e Visao

- **Objetivo principal:** Aumentar vendas
- **Metrica de sucesso:** 2x receita

## Publico-Alvo

- **Publico principal:** Empreendedores

## Projeto Digital

- **Tipo de projeto:** app
- **Nome do projeto:** Moy Dashboard
- **Objetivo do projeto:** Gerenciar vendas
- **Funcionalidades essenciais:** Dashboard, CRM

## Identidade Visual

- **Nome da marca:** Moy
- **Tom de voz:** Profissional
- **Cor de destaque:** #0066ff

## Modelo de Negocio

- **Diferencial competitivo:** Velocidade

## Restricoes Tecnicas

- **Restricoes tecnicas:** Custo zero
- **Paginas/secoes necessarias:** Home, Dashboard
- **Referencias/inspiracoes:** Linear
- **Integracoes necessarias:** Stripe`;

    const data = parseOnboardingContext(md);
    assert.equal(data.userName, "Moy");
    assert.equal(data.userEmail, "moy@test.com");
    assert.equal(data.userPhone, "11999999999");
    assert.equal(data.userInstagram, "@moy");
    assert.equal(data.userLocation, "SP");
    assert.equal(data.businessName, "Moy Labs");
    assert.equal(data.businessIndustry, "SaaS");
    assert.equal(data.businessDescription, "Plataforma de vendas");
    assert.equal(data.mainGoal, "Aumentar vendas");
    assert.equal(data.successMetric, "2x receita");
    assert.equal(data.targetAudience, "Empreendedores");
    assert.equal(data.projectType, "app");
    assert.equal(data.projectName, "Moy Dashboard");
    assert.equal(data.projectObjective, "Gerenciar vendas");
    assert.equal(data.projectFeatures, "Dashboard, CRM");
    assert.equal(data.brandName, "Moy");
    assert.equal(data.brandTone, "Profissional");
    assert.equal(data.brandAccent, "#0066ff");
    assert.equal(data.differentiator, "Velocidade");
    assert.equal(data.projectConstraints, "Custo zero");
    assert.equal(data.projectPages, "Home, Dashboard");
    assert.equal(data.projectReferences, "Linear");
    assert.equal(data.projectIntegrations, "Stripe");
  });

  it("returns empty strings for missing fields", () => {
    const md = "# Contexto do Onboarding\n\n## Sobre Voce\n\n- **Nome:** Test";
    const data = parseOnboardingContext(md);
    assert.equal(data.userName, "Test");
    assert.equal(data.businessName, "");
    assert.equal(data.projectType, "");
  });

  it("handles empty input", () => {
    const data = parseOnboardingContext("");
    assert.equal(data.userName, "");
    assert.equal(data.businessName, "");
  });
});

describe("readOnboardingContext", () => {
  it("reads onboarding.md from _contexto/", () => {
    const dir = join(tmpdir(), `sm-test-read-ctx-${Date.now()}`);
    const ctxDir = join(dir, "_contexto");
    mkdirSync(ctxDir, { recursive: true });
    writeFileSync(join(ctxDir, "onboarding.md"), "# Contexto", "utf8");
    const originalCwd = process.cwd();
    try {
      process.chdir(dir);
      const result = readOnboardingContext();
      assert.equal(result, "# Contexto");
    } finally {
      process.chdir(originalCwd);
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("returns null when no onboarding exists", () => {
    const dir = join(tmpdir(), `sm-test-read-ctx-empty-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const originalCwd = process.cwd();
    try {
      process.chdir(dir);
      const result = readOnboardingContext();
      assert.equal(result, null);
    } finally {
      process.chdir(originalCwd);
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
