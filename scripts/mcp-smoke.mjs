import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const endpoint = process.env.TABD_MCP_URL;
const token = process.env.TABD_MCP_TOKEN;
if (!endpoint || !token)
  throw new Error("Set TABD_MCP_URL and TABD_MCP_TOKEN in your environment.");
const url = new URL(endpoint);
if (
  url.protocol !== "https:" &&
  !(
    url.protocol === "http:" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
  )
)
  throw new Error("Use HTTPS, or HTTP on localhost.");
const client = new Client({ name: "tabd-smoke", version: "1.0.0" });
try {
  await client.connect(
    new StreamableHTTPClientTransport(url, {
      requestInit: { headers: { Authorization: `Bearer ${token}` } },
    }),
  );
  const { tools } = await client.listTools();
  console.log("Available tools:", tools.map((tool) => tool.name).join(", "));
  async function call(name, args = {}) {
    const result = await client.callTool({ name, arguments: args });
    if (result.isError)
      throw new Error(`${name} failed; check server configuration.`);
    console.log(`${name}: passed`);
    return result.structuredContent;
  }
  const references = await call("search_library", { limit: 1 });
  await call("get_collection", { limit: 1 });
  await call("get_taste_profile");
  await call("get_design_context", {
    task: "Find dashboard inspiration",
    query: "dashboard OR sidebar",
    limit: 1,
  });
  if (references?.references?.[0]?.id)
    await call("get_reference", { reference_id: references.references[0].id });
  else console.log("get_reference: skipped (library is empty)");
} catch {
  process.exitCode = 1;
  console.error(
    "MCP smoke test failed. Check the endpoint, token, expiry, and database migration.",
  );
} finally {
  await client.close();
}
