# ---- dependencies (shared by test and build) ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .

# ---- test: `docker build --target test .` (Jenkins runs this before deploying) ----
FROM deps AS test
ENV CI=true
RUN npm run typecheck && npm test

# ---- build ----
FROM deps AS build
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
ARG APP_VERSION=dev
RUN test -n "$VITE_API_BASE_URL" || (echo "VITE_API_BASE_URL build arg is required" && exit 1)
RUN test "$VITE_USE_MOCK_API" != "true" || (echo "Refusing to build a deployable image with the mock API" && exit 1)
RUN npm run build \
 && printf '{"version":"%s","api":"%s"}\n' "$APP_VERSION" "$VITE_API_BASE_URL" > dist/version.json

# ---- serve ----
FROM nginx:1.27-alpine
ARG APP_VERSION=dev
LABEL org.opencontainers.image.title="tnbs-vendor-portal" org.opencontainers.image.version="$APP_VERSION"
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
# Source maps stay out of the public image (they'd publish the original source).
RUN find /usr/share/nginx/html -name '*.map' -delete
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=6 CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
CMD ["nginx", "-g", "daemon off;"]
