# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
# Build-time configuration (Vite inlines VITE_* variables into the bundle).
ARG VITE_API_BASE_URL
ARG VITE_VENDOR_API_BASE_URL=
ARG VITE_WS_BASE_URL=
ARG VITE_USE_MOCK_API=false
ARG VITE_GOOGLE_MAPS_API_KEY=
ARG VITE_OFFLINE_PAYMENT_METHODS=cash
ARG VITE_POS_STALE_CATALOGUE_MINUTES=60
ARG VITE_POS_SERVER_IDEMPOTENCY=false
ARG VITE_POLL_INTERVAL_MS=20000
RUN test -n "$VITE_API_BASE_URL" || (echo "VITE_API_BASE_URL build arg is required" && exit 1)
RUN npm run build

# ---- serve ----
FROM nginx:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
CMD ["nginx", "-g", "daemon off;"]
