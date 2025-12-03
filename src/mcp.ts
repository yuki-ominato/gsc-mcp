// zod: データの構造を定義するためのライブラリ
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { GoogleSearchConsoleClient } from './googleSearchConsole.js';
import { resolveDateRange } from './date-range.js';

// type XXX <YYY> {ZZZ} の意味:
// XXX: 型名 ToolDefinition
// YYY: 型引数 TSchema
// ZZZ: 型の中身
// extends: 型の継承 Tschemaの型はz.ZodTypeAnyであるということを示す
type ToolDefinition<TSchema extends z.ZodTypeAny> = {
  name: string;
  description: string;
  inputSchema: TSchema;
  handler: (input: z.infer<TSchema>) => Promise<unknown>;
};

const toJsonSchema = (schema: z.ZodTypeAny) => zodToJsonSchema(schema, 'input');

export class McpToolRegistry {
  private readonly tools: ToolDefinition<z.ZodTypeAny>[];

  // constructor: インスタンスを作成するためのメソッド
  constructor(private readonly gsc: GoogleSearchConsoleClient) {
    const rangeSchema = z.object({
      startDate: z
        .string()
        .optional()
        .describe('YYYY-MM-DD 形式。未指定時は DEFAULT_RANGE_DAYS で遡る。'),
      endDate: z
        .string()
        .optional()
        .describe('YYYY-MM-DD 形式。未指定時は当日。'),
    });

    const topQuerySchema = rangeSchema.extend({
      limit: z.number().int().positive().max(250).default(25),
    });

    const submitSitemapSchema = z.object({
      sitemapUrl: z.string().url(),
    });

    this.tools = [
      {
        name: 'getSiteSummary',
        description: '指定した期間のクリック数や表示回数などの概況を取得します。',
        inputSchema: rangeSchema,
        handler: async (input) => {
          const { startDate, endDate } = resolveDateRange(input.startDate, input.endDate);

          return this.gsc.getPerformanceSummary({ startDate, endDate });
        },
      },
      {
        name: 'getTopQueries',
        description: '検索クエリ別の指標を返します。',
        inputSchema: topQuerySchema,
        handler: async (input) => {
          const { startDate, endDate } = resolveDateRange(input.startDate, input.endDate);
          return this.gsc.getTopQueries({
            startDate,
            endDate,
            rowLimit: input.limit,
          });
        },
      },
      {
        name: 'submitSitemap',
        description: '指定 URL のサイトマップを送信します。',
        inputSchema: submitSitemapSchema,
        handler: async (input) => {
          await this.gsc.submitSitemap(input.sitemapUrl);
          return { status: 'submitted', sitemapUrl: input.sitemapUrl };
        },
      },
      {
        name: 'listSitemaps',
        description: '現在登録済みのサイトマップ一覧を取得します。',
        inputSchema: z.object({}),
        handler: async () => this.gsc.listSitemaps(),
      },
    ];
  }

  listTools() {
    return this.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: toJsonSchema(tool.inputSchema),
    }));
  }

  async callTool(name: string, input: unknown) {
    const tool = this.tools.find((item) => item.name === name);
    if (!tool) {
      throw new Error(`ツール ${name} は存在しません。`);
    }

    const parsed = tool.inputSchema.parse(input ?? {});
    return tool.handler(parsed);
  }
}
