import { monitored } from "@/lib/monitoring";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { ApiError, failure } from "@/lib/api";
import { mcpActor } from "@/lib/mcp/auth";
import { PersonalLibrary } from "@/lib/mcp/library";
import { createMcpServer } from "@/lib/mcp/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handlePOST(request: Request) {
  try {
    const actor = await mcpActor(request);
    // A fresh server per request prevents any cross-account session state.
    const server = createMcpServer(new PersonalLibrary(actor));
    const transport = new WebStandardStreamableHTTPServerTransport({
      enableJsonResponse: true,
      maxRequestBodySize: 20000,
    });
    await server.connect(transport);
    try {
      const response = await transport.handleRequest(request);
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    } finally {
      await server.close();
    }
  } catch (error) {
    const response = failure(error);
    if (error instanceof ApiError && error.status === 401)
      response.headers.set("WWW-Authenticate", 'Bearer realm="Tabd MCP"');
    return response;
  }
}

// This stateless endpoint uses JSON responses and has no persistent SSE session.
export function GET() {
  return new Response(null, {
    status: 405,
    headers: { Allow: "POST", "Cache-Control": "private, no-store" },
  });
}
export const DELETE = GET;

export const POST = monitored("POST /api/mcp", handlePOST);
