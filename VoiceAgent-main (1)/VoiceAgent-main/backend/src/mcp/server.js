import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { registerSharedTools } from './tools/shared.js';
import { registerEnquiryTools } from './tools/enquiry.js';
import { registerColdCallingTools } from './tools/coldCalling.js';
import { registerWarmLeadTools } from './tools/warmLead.js';
import { registerAdmissionTools } from './tools/admission.js';
import { registerStudentTools } from './tools/student.js';
import { registerFeeTools } from './tools/fee.js';
import { registerReviewTools } from './tools/review.js';
import { registerAcademicTools } from './tools/academic.js';

function createMcpServer() {
  const server = new McpServer({
    name: 'voice-crm',
    version: '1.0.0',
  });

  // Shared tools (used by multiple agents — registered first)
  registerSharedTools(server);

  // Agent-specific tools
  registerEnquiryTools(server);
  registerColdCallingTools(server);
  registerWarmLeadTools(server);
  registerAdmissionTools(server);
  registerStudentTools(server);
  registerFeeTools(server);
  registerReviewTools(server);
  registerAcademicTools(server);

  return server;
}

export const mcpHandler = async (req, res) => {
  if (req.body && req.body.method === 'tools/call') {
    console.log(`[MCP Tool Call] Executing tool: "${req.body.params?.name}"`);
    console.log(`[MCP Tool Call] Arguments:`, JSON.stringify(req.body.params?.arguments, null, 2));
  }

  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  res.on('close', () => transport.close());
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
};
