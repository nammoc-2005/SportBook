# ── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files trước để tận dụng Docker layer cache
COPY package*.json ./

# Chỉ cài production dependencies
RUN npm ci --omit=dev

# ── Stage 2: Production image ─────────────────────────────────────────────────
FROM node:20-alpine AS production

# Cài timezone Việt Nam
RUN apk add --no-cache tzdata \
  && cp /usr/share/zoneinfo/Asia/Ho_Chi_Minh /etc/localtime \
  && echo "Asia/Ho_Chi_Minh" > /etc/timezone \
  && apk del tzdata

WORKDIR /app

# Copy node_modules từ builder (không cài lại)
COPY --from=builder /app/node_modules ./node_modules

# Copy source code
COPY package*.json ./
COPY src/ ./src/

# Tạo thư mục uploads (sẽ mount volume lên đây)
RUN mkdir -p uploads/avatars uploads/venues public/admin

# Chạy bằng user non-root để bảo mật
RUN addgroup -g 1001 -S nodejs \
  && adduser -S sportbook -u 1001 \
  && chown -R sportbook:nodejs /app

USER sportbook

EXPOSE 5000

# Health check tự động
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

CMD ["node", "src/index.js"]
