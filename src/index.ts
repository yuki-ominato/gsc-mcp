import express from 'express';
import helmet from 'helmet';
import type { NextFunction, Request, Response } from 'express';
import { appConfig } from './config.js';
import { logger } from './logger.js';
import { GoogleSearchConsoleClient } from './googleSearchConsole.js';
import { createMcpRouter } from './mcp-router.js';

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: appConfig.bodyLimit }));

app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok', siteUrl: appConfig.siteUrl });
});

const gscClient = new GoogleSearchConsoleClient(appConfig.siteUrl);
app.use('/mcp', createMcpRouter(gscClient));

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error', { error: err.message });
  res.status(400).json({
    error: err.message,
  });
});

app.listen(appConfig.port, appConfig.host, () => {
  logger.info('MCP server started', {
    port: appConfig.port,
    host: appConfig.host,
  });
});
