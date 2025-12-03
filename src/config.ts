import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

loadEnv();

// zメソッド
// object: オブジェクトのスキーマを定義
// coerce: 型変換
// number: 数値のスキーマを定義
// int: 整数のスキーマを定義
// positive: 正の数のスキーマを定義
// default: デフォルト値を設定
// max: 最大値を設定
// url: URLのスキーマを定義

// スキーマとは: データの構造を定義するもの
const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(8080),
  HOST: z.string().default('0.0.0.0'),
  GSC_SITE_URL: z.string().url({
    message: 'GSC_SITE_URL には https://example.com/ の形式を指定してください。',
  }),
  REQUEST_BODY_LIMIT: z.string().default('512kb'),
  DEFAULT_RANGE_DAYS: z.coerce.number().int().positive().max(90).default(7),
});

const parsed = envSchema.parse({
  PORT: process.env.PORT,
  HOST: process.env.HOST,
  GSC_SITE_URL: process.env.GSC_SITE_URL,
  REQUEST_BODY_LIMIT: process.env.REQUEST_BODY_LIMIT,
  DEFAULT_RANGE_DAYS: process.env.DEFAULT_RANGE_DAYS,
});

export const appConfig = {
  port: parsed.PORT,
  host: parsed.HOST,
  siteUrl: parsed.GSC_SITE_URL,
  bodyLimit: parsed.REQUEST_BODY_LIMIT,
  defaultRangeDays: parsed.DEFAULT_RANGE_DAYS,
};
