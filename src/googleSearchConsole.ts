import { google, searchconsole_v1 } from 'googleapis';
import { logger } from './logger.js';

const SCOPES = [
  'https://www.googleapis.com/auth/webmasters',
  'https://www.googleapis.com/auth/webmasters.readonly',
];

export type PerformanceRow = {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  keys?: string[];
};

export class GoogleSearchConsoleClient {
  // ?の意味: オプショナルなプロパティ
  // オプショナルなプロパティは、undefinedかもしれないということを表す
  private searchConsole?: searchconsole_v1.Searchconsole;
  private readonly siteUrl: string;


  // this: インスタンス自身を指す pythonのselfに相当
  constructor(siteUrl: string) {
    this.siteUrl = siteUrl;
  }

  // async: 非同期処理を行う関数を定義するためのキーワード
  // 非同期処理が必要な理由: GSC API は非同期で処理されるため
  private async ensureClient() {
    if (this.searchConsole) {
      return this.searchConsole;
    }

    const auth = new google.auth.GoogleAuth({
      scopes: SCOPES,
    });

    const authClient = await auth.getClient();
    google.options({ auth: authClient });

    this.searchConsole = google.searchconsole('v1');
    logger.info('Connected to Google Search Console API', { siteUrl: this.siteUrl });
    return this.searchConsole;
  }

  async getPerformanceSummary(params: {
    startDate: string;
    endDate: string;
  }): Promise<PerformanceRow> {
    const client = await this.ensureClient();

    const response = await client.searchanalytics.query({
      siteUrl: this.siteUrl,
      requestBody: {
        startDate: params.startDate,
        endDate: params.endDate,
        dimensions: [],
        type: 'web',
        rowLimit: 1,
      },
    });

    const row = response.data.rows?.[0];

    return {
      clicks: row?.clicks ?? 0,
      impressions: row?.impressions ?? 0,
      ctr: row?.ctr ?? 0,
      position: row?.position ?? 0,
    };
  }

  async getTopQueries(params: {
    startDate: string;
    endDate: string;
    rowLimit: number;
  }): Promise<PerformanceRow[]> {
    const client = await this.ensureClient();
    const response = await client.searchanalytics.query({
      siteUrl: this.siteUrl,
      requestBody: {
        startDate: params.startDate,
        endDate: params.endDate,
        dimensions: ['query'],
        rowLimit: params.rowLimit,
        type: 'web',
        dataState: 'final',
      },
    });

    return (response.data.rows ?? []).map((row) => ({
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: row.ctr ?? 0,
      position: row.position ?? 0,
      keys: row.keys,
    }));
  }

  async listSitemaps() {
    const client = await this.ensureClient();
    const response = await client.sitemaps.list({ siteUrl: this.siteUrl });
    return response.data.sitemap ?? [];
  }

  async submitSitemap(sitemapUrl: string) {
    const client = await this.ensureClient();
    await client.sitemaps.submit({ siteUrl: this.siteUrl, feedpath: sitemapUrl });
  }
}
