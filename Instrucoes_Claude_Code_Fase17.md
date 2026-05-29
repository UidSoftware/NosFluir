# Instrucoes Claude Code — Fase 17
> Conformidade com padrão global Uid Software
> Data: 29/05/2026

---

## O que foi feito

### Alinhamento ao padrão tipográfico global da Uid

As fontes do Studio Fluir estavam fora do padrão definido em `~/.claude/CLAUDE.md` (regras globais Uid).

**Antes:**
- `Sora` (display/body)
- `JetBrains Mono` (mono)

**Depois:**
- `DM Sans` — fonte body (`font-sans`)
- `Plus Jakarta Sans` — fonte display (`font-display`)

**Arquivos alterados:**

`frontend/index.html`
- Tag `<link>` do Google Fonts atualizada para carregar `Plus Jakarta Sans` (300–800) e `DM Sans` (300–700)

`frontend/tailwind.config.js`
- `fontFamily.sans`: `['Sora']` → `['DM Sans', 'sans-serif']`
- `fontFamily.mono` removida → substituída por `fontFamily.display: ['Plus Jakarta Sans', 'sans-serif']`

---

## Deploy

```bash
# 1. Commit e push local
git add frontend/index.html frontend/tailwind.config.js
git commit -m "feat: troca fontes Sora+JetBrains Mono → DM Sans+Plus Jakarta Sans"
git push origin main  # houve rebase (VPS tinha commit de docs à frente)

# 2. Na VPS (como root)
cd /var/www/studio-fluir
git pull origin main

# 3. Build do frontend via Docker multi-stage
docker build -t nosfluir-frontend-builder ./frontend
docker create --name nosfluir-frontend-build nosfluir-frontend-builder
rm -rf ./frontend/dist && mkdir -p ./frontend/dist
docker cp nosfluir-frontend-build:/var/www/frontend/. ./frontend/dist/
docker rm nosfluir-frontend-build
docker rmi nosfluir-frontend-builder

# 4. Reiniciar nginx (OBRIGATÓRIO após rm -rf dist/)
docker compose restart nginx
```

---

## Bug encontrado durante deploy

**Sintoma:** `500 Internal Server Error` no nginx após o build.

**Causa raiz:** O processo de build deleta e recria o diretório `frontend/dist/` enquanto o container nginx está rodando. O bind mount Docker aponta para o inode do diretório original — quando o diretório é deletado e recriado, o inode muda e o container nginx fica apontando para um diretório vazio.

**Evidência no log nginx:**
```
rewrite or internal redirection cycle while internally redirecting to "/sistema/index.html"
```

**Solução:** `docker compose restart nginx` após o build.

**Regra para próximos deploys:** Sempre reiniciar o nginx após rebuild do frontend que use `rm -rf dist/`.

---

## Observações

- As cores do Studio Fluir **não foram alteradas** — somente a tipografia
- O padrão global Uid (Plus Jakarta Sans + DM Sans) agora está aplicado em todos os projetos ativos
- O `~/.claude/CLAUDE.md` global foi criado nesta sessão com as regras que valem para todos os projetos Uid
