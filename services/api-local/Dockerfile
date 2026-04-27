FROM node:20-alpine
WORKDIR /app

# Copy workspace root for pnpm resolution
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY services/api-local/package.json ./services/api-local/

RUN npm install -g pnpm && pnpm install --filter @wfl/api-local --frozen-lockfile

COPY services/api-local/ ./services/api-local/

WORKDIR /app/services/api-local
EXPOSE 4000
CMD ["node", "--loader", "tsx/esm", "src/index.ts"]
