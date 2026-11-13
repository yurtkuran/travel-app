FROM node:24.22.2-alpine3.24 AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

FROM base AS dependencies
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
RUN if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile; else pnpm install --no-frozen-lockfile; fi

FROM dependencies AS development
COPY . .
EXPOSE 3000
CMD ["pnpm", "dev", "--hostname", "0.0.0.0"]

FROM dependencies AS migration
COPY tsconfig.json ./
COPY drizzle ./drizzle
COPY src ./src
CMD ["pnpm", "db:migrate"]

FROM dependencies AS builder
COPY . .
RUN pnpm build

FROM node:24.22.2-alpine3.24 AS production
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
RUN mkdir -p /app/.local-data/media && chown -R nextjs:nodejs /app/.local-data
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV MEDIA_ROOT=/app/.local-data/media
CMD ["node", "server.js"]
