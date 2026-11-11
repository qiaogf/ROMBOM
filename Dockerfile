# syntax=docker/dockerfile:1
# ============================================================
# 跨境独立站生产镜像（多阶段构建）
# 构建期需要连数据库：313 个商品页在 next build 时预渲染
# 因此 DATABASE_URL 必须作为 build-arg 传入，见 docker-compose.yml
# ============================================================

# ---------- 基础层：Node + pnpm + Prisma 运行库 ----------
FROM node:22-bookworm-slim AS base
ENV PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH" \
    NEXT_TELEMETRY_DISABLED=1
# openssl 是 Prisma 查询引擎的运行时依赖，slim 镜像默认没有
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && npm install -g pnpm@11.13.1
WORKDIR /app

# ---------- 依赖层 ----------
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
# --ignore-scripts: 跳过 postinstall 的 prisma generate（此时还没拷 schema）
RUN pnpm install --frozen-lockfile --ignore-scripts

# ---------- 构建层 ----------
FROM base AS builder
ARG DATABASE_URL
# NEXT_PUBLIC_* 在构建期被内联进客户端产物，必须作为 build-arg 传入
ARG NEXT_PUBLIC_APP_URL
ENV DATABASE_URL=$DATABASE_URL \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm exec prisma generate \
 && pnpm exec next build

# ---------- 运行层 ----------
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs nextjs \
 && mkdir -p /app/order-files \
 && chown -R nextjs:nodejs /app

WORKDIR /app
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# Prisma 客户端输出在 prisma/generated（源码树之外），standalone 追踪不可靠，单独补齐
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
