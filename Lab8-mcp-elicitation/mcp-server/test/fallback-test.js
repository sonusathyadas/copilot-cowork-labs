// Client WITHOUT elicitation capability: server must fall back to chat.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
const client = new Client({ name: "no-forms-client", version: "1.0.0" }, { capabilities: {} });
await client.connect(new StreamableHTTPClientTransport(new URL("http://localhost:3000/mcp")));
const r = await client.callTool({ name: "create_contact", arguments: {first_name:"Lee",last_name:"Park",email:"lee@example.com",role:"Sales"} });
console.log("fallback:", r.content[0].text);
await client.close();
