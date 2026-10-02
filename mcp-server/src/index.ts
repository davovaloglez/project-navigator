#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { registerProjectTools } from './tools/projects.js';
import { registerTaskTools } from './tools/tasks.js';
import { registerPeopleTools } from './tools/people.js';
import { registerCourseTools } from './tools/courses.js';
import { registerCostTools } from './tools/costs.js';
import { registerPortfolioTools } from './tools/portfolio.js';
import { registerTeamTools } from './tools/team.js';
import { registerGlossaryTools } from './tools/glossary.js';
import { registerEvaluationTools } from './tools/evaluations.js';

async function main(): Promise<void> {
  const server = new McpServer({
    name: 'project-navigator',
    version: '0.4.0',
  });

  registerProjectTools(server);
  registerTaskTools(server);
  registerPeopleTools(server);
  registerCourseTools(server);
  registerCostTools(server);
  registerPortfolioTools(server);
  registerTeamTools(server);
  registerGlossaryTools(server);
  registerEvaluationTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  process.stderr.write('[project-navigator-mcp] ready\n');
}

main().catch((err) => {
  process.stderr.write(`[project-navigator-mcp] fatal: ${err instanceof Error ? err.stack || err.message : String(err)}\n`);
  process.exit(1);
});
