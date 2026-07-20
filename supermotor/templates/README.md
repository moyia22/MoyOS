# Catálogo de templates

- `common/`: contexto, Brand Kit, configuração Next.js e regras compartilhadas.
- `site/`: site premium e narrativa de conversão.
- `application/`: dashboard interativo e arquitetura de produto.
- `carousel/`: estúdio de carrossel com edição e exportação PNG.
- `crm/`: contexto aplicado sobre o repositório oficial `frappe/crm` no ramo estável.
- `tracking/`: protocolo e registrador local de atividades dos agentes.

Para site, aplicação e carrossel, o CLI copia primeiro `common/` e depois o template específico. Para CRM, clona `frappe/crm` e aplica somente o overlay `crm/`, preservando a arquitetura original. Tokens `__PROJECT_*__`, `__BRAND_*__`, `__FAVICON_*__` e `__CRM_*__` são substituídos durante a criação.
