# GSC 向け MCP サーバー

Google Search Console（以下 GSC）のデータを Model Context Protocol（MCP）経由で扱う軽量サーバーです。Docker コンテナとして動作し、そのまま Google Cloud Run にデプロイして Agent Builder の外部ツールから呼び出せます。

## アーキテクチャ

- Node.js 20 / TypeScript / Express
- `googleapis` を利用して GSC API にアクセス
- MCP 互換の HTTP エンドポイント
  - `GET /mcp/tools`: 利用可能なツール定義を返却
  - `POST /mcp/tools/:name`: ツールを実行してレスポンスを返却
- 代表的なツール
  - `getSiteSummary`: 期間内のクリック数/表示回数/CTR/平均順位
  - `getTopQueries`: 上位クエリ別の指標
  - `listSitemaps`: 登録済みサイトマップ一覧
  - `submitSitemap`: サイトマップ送信

## セットアップ

1. Node.js 20 以上と npm を用意
2. GSC にプロパティ登録されているサイトをサービスアカウントに対して **所有者** または **フルユーザー** で招待
3. サービスアカウントの JSON キーをダウンロードし、`GOOGLE_APPLICATION_CREDENTIALS` で参照できる場所に配置

```bash
cp .env.example .env
vim .env     # GSC_SITE_URL や資格情報パスを編集
npm install
npm run dev
```

`GET http://localhost:8080/healthz` にアクセスすると稼働確認ができます。

## 環境変数

| 変数名 | 説明 |
| --- | --- |
| `GSC_SITE_URL` | Search Console で管理しているサイト URL（例: `https://example.com/`） |
| `GOOGLE_APPLICATION_CREDENTIALS` | サービスアカウント JSON へのパス。Cloud Run では Secret Manager を利用し、`/tmp/keys/credentials.json` などにマウントする想定 |
| `PORT` / `HOST` | HTTP サーバーのバインド先。Cloud Run では `PORT` を上書きしない |
| `DEFAULT_RANGE_DAYS` | 期間未指定時に遡る日数（最大 90 日） |
| `REQUEST_BODY_LIMIT` | Express の JSON パース許容量 |

## API の叩き方

ツール一覧:

```bash
curl http://localhost:8080/mcp/tools
```

ツール実行例（上位 10 クエリ取得）:

```bash
curl -X POST http://localhost:8080/mcp/tools/getTopQueries \
  -H "Content-Type: application/json" \
  -d '{"startDate":"2024-04-01","endDate":"2024-04-07","limit":10}'
```

## Docker

```bash
docker build -t gsc-mcp:local .
docker run --rm -p 8080:8080 \
  -e GSC_SITE_URL=https://example.com/ \
  -e GOOGLE_APPLICATION_CREDENTIALS=/secrets/creds.json \
  -v /path/to/creds.json:/secrets/creds.json:ro \
  gsc-mcp:local
```

 `.dockerignore` を設定済みのため、ビルドキャッシュは小さく保たれます。

## Cloud Run へのデプロイ

1. Artifact Registry にイメージをビルド & プッシュ

```bash
gcloud builds submit --tag "us-central1-docker.pkg.dev/PROJECT_ID/gsc-mcp/server:latest"
```

2. サービスアカウントキーを Secret Manager に格納

```bash
gcloud secrets create gsc-mcp-service-account \
  --data-file=/path/to/service-account.json
```

3. Cloud Run デプロイ

```bash
gcloud run deploy gsc-mcp \
  --image="us-central1-docker.pkg.dev/PROJECT_ID/gsc-mcp/server:latest" \
  --region=us-central1 \
  --allow-unauthenticated \
  --set-env-vars="GSC_SITE_URL=https://example.com/,DEFAULT_RANGE_DAYS=7" \
  --set-secrets="GOOGLE_APPLICATION_CREDENTIALS=gsc-mcp-service-account:latest" \
  --execution-environment=gen2
```

デプロイ後、`https://gsc-mcp-xxxx-uc.a.run.app` のような URL が発行されます。`/healthz` で動作確認を行ってください。

## Agent Builder からの利用

1. Agent Builder のコンソールで対象エージェントを開き、「**Tools > Model Context Protocol**」を選択
2. 「New MCP endpoint」を追加し、以下を設定
   - Base URL: `https://<Cloud Run URL>/mcp`
   - List tools method: `GET /mcp/tools`
   - Invoke tool method: `POST /mcp/tools/{toolName}`
3. 追加後、Agent Builder 側で `getSiteSummary`, `getTopQueries` などのツールが自動検出される
4. エージェントを実行すると、プロンプト内で「直近 7 日間の GSC 概況を教えて」などと尋ねるだけでツールが呼び出されます

Cloud Run で VPC 内公開にする場合は、Agent Builder からアクセスできるよう HTTPS Load Balancer + Identity Aware Proxy を組み合わせてください。

## トラブルシューティング

- `403 insufficientPermissions`: サービスアカウントを GSC に招待し、確認メールを承認しているかチェック
- `400 startDate と endDate`: `YYYY-MM-DD` 形式かつ start <= end になっているか確認
- Cloud Run での遅延: 同期 API のためウォームアップに 0.5〜1 秒程度かかる。必要に応じて最小インスタンス数を 1 以上に設定

## ライセンス

MIT License
