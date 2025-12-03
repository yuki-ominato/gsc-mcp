import { Router } from 'express';
import { GoogleSearchConsoleClient } from './googleSearchConsole.js';
import { McpToolRegistry } from './mcp.js';
import { logger } from './logger.js';

export const createMcpRouter = (client: GoogleSearchConsoleClient) => {
  const router = Router();
  const registry = new McpToolRegistry(client);

  router.get('/tools', (_req, res) => {
    res.json({
      tools: registry.listTools(),
    });
  });

  router.post('/tools/:name', async (req, res, next) => {
    try {
      const data = await registry.callTool(req.params.name, req.body);
      res.json({ data });
    } catch (error) {
      logger.error('Tool execution failed', {
        name: req.params.name,
        error: error instanceof Error ? error.message : String(error),
      });
      next(error);
    }
  });

  return router;
};
