// Test client: simulates an elicitation-capable MCP client (like Cowork) and answers forms.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { ElicitRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const URL_ = process.env.MCP_URL || "http://localhost:3000/mcp";
// Answers queued for each elicitation request, in order: { action, content? }
const answers = JSON.parse(process.env.ANSWERS || "[]");

const client = new Client({ name: "lab7-test-client", version: "1.0.0" }, { capabilities: { elicitation: {} } });
client.setRequestHandler(ElicitRequestSchema, async (req) => {
  console.log("  [form shown]", req.params.message);
  console.log("  [schema]    ", JSON.stringify(req.params.requestedSchema.properties ? Object.keys(req.params.requestedSchema.properties) : []));
  const next = answers.shift() ?? { action: "cancel" };
  console.log("  [answer]    ", JSON.stringify(next));
  return next;
});

await client.connect(new StreamableHTTPClientTransport(new URL(URL_)));

const call = async (name, args = {}) => {
  console.log(`\n> ${name} ${JSON.stringify(args)}`);
  const r = await client.callTool({ name, arguments: args });
  console.log("  result:", r.content.map((c) => c.text).join(" | "));
};

await call("create_contact");
await call("list_contacts");
await call("delete_contact", { id: "c1" });
await call("delete_contact", { id: "c2" });
await call("list_contacts");
await client.close();
