# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Instala dependências primeiro (cache layer)
COPY package.json package-lock.json* ./
RUN npm ci

# Copia código e faz o build
COPY . .
RUN npm run build

# ── Stage 2: imagem final (só o dist) ─────────────────────────────────────────
FROM nginx:1.25-alpine

# Remove config padrão do nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copia o build do React
COPY --from=builder /app/dist /var/www/frontend

# Expõe porta (informativo — nginx.conf define o roteamento)
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
