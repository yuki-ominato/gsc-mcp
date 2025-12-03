# Dockerfile: ドッカーのイメージを作成するためのファイル

# FROM: イメージを作成するためのベースイメージ
# node:20-slim: ベースイメージ
# AS builder: イメージを作成するための名前
# WORKDIR: 作業ディレクトリを設定
# COPY: ファイルをコピー
# RUN: コマンドを実行
# npm install: 依存関係をインストール
# npm run build: ビルドを実行

# COPY --from=builder /app/dist ./dist: ビルド成果物をコピー
# EXPOSE: ポートを公開
# CMD: コマンドを実行

FROM node:20-slim AS builder
WORKDIR /app
COPY package.json tsconfig.json ./
COPY src ./src
RUN npm install
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 8080
CMD ["node", "dist/index.js"]
