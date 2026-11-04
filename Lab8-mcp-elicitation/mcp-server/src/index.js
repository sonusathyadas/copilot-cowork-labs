// Lab 7 - Sample MCP server that uses elicitation forms with Copilot Cowork.
// Transport: Streamable HTTP on /mcp (Cowork needs a remote, HTTPS-reachable URL).

import express from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const PORT = Number(process.env.PORT) || 3000;

// In-memory "database" so the lab is self-contained.
// Ids c1 and c2 are seeded; new ids come from a counter so a deleted id is never reused.
let nextId = 3;
const contacts = new Map([
  ["c1", { first_name: "Ada", last_name: "Lovelace", email: "ada@example.com", role: "Engineering" }],
  ["c2", { first_name: "Grace", last_name: "Hopper", email: "grace@example.com", role: "Sales" }],
]);

/** Stores a contact and returns a confirmation message. */
function createContact(data) {
  const id = `c${nextId++}`;
  contacts.set(id, { ...data });
  return `Created contact ${id}: ${data.first_name} ${data.last_name} <${data.email}>`;
}

/** Builds a fresh McpServer for each MCP session. */
function buildServer() {
  const server = new McpServer({ name: "mcp-elicitation-server", version: "1.0.0" });

  // Helper: elicitation is optional for clients, so check before asking.
  const supportsElicitation = () =>
    Boolean(server.server.getClientCapabilities()?.elicitation);

  // ---------------------------------------------------------------
  // Tool 1: create_contact - collects a multi-field form via elicitation
  // ---------------------------------------------------------------
  server.registerTool(
    "create_contact",
    {
      title: "Create contact",
      description:
        "Creates a new contact. If the client supports forms, asks the user for the details in a form. Otherwise pass first_name, last_name, email and role as arguments.",
      inputSchema: {
        first_name: z.string().optional(),
        last_name: z.string().optional(),
        email: z.string().optional(),
        role: z.enum(["Engineering", "Sales", "Support"]).optional(),
      },
    },
    async (args) => {
      // Fallback: client has no elicitation support, so use arguments supplied in chat.
      if (!supportsElicitation()) {
        const missing = ["first_name", "last_name", "email", "role"].filter((k) => !args[k]);
        if (missing.length) {
          return { content: [{ type: "text", text: `Missing ${missing.join(", ")}. Ask the user in chat, then call create_contact again with those values.` }] };
        }
        return { content: [{ type: "text", text: createContact(args) }] };
      }

      const result = await server.server.elicitInput({
        message: "Enter the new contact's details.",
        requestedSchema: {
          type: "object",
          properties: {
            first_name: { type: "string", title: "First name", description: "Given name" },
            last_name: { type: "string", title: "Last name", description: "Family name" },
            email: { type: "string", format: "email", title: "Email address" },
            role: {
              type: "string",
              title: "Role",
              description: "Department the contact belongs to",
              enum: ["Engineering", "Sales", "Support"],
            },
            subscribed: { type: "boolean", title: "Subscribe to newsletter", default: false },
          },
          required: ["first_name", "last_name", "email", "role"],
        },
      });

      if (result.action !== "accept") {
        return { content: [{ type: "text", text: `Contact not created (user action: ${result.action}).` }] };
      }
      return { content: [{ type: "text", text: createContact(result.content) }] };
    }
  );

  // ---------------------------------------------------------------
  // Tool 2: delete_contact - confirms a destructive action with a yes/no form
  // ---------------------------------------------------------------
  server.registerTool(
    "delete_contact",
    {
      title: "Delete contact",
      description: "Deletes a contact by id after the user confirms.",
      inputSchema: { id: z.string().describe("Contact id, for example c1") },
    },
    async ({ id }) => {
      const contact = contacts.get(id);
      if (!contact) {
        return { content: [{ type: "text", text: `No contact with id ${id}.` }], isError: true };
      }

      if (!supportsElicitation()) {
        return { content: [{ type: "text", text: `Confirmation needed: ask the user to confirm deleting ${id}, then retry with confirm=true.` }] };
      }

      const result = await server.server.elicitInput({
        message: `Delete contact ${contact.first_name} ${contact.last_name} (${id})? This cannot be undone.`,
        requestedSchema: {
          type: "object",
          properties: {
            confirm: { type: "boolean", title: "Yes, delete this contact", default: false },
          },
          required: ["confirm"],
        },
      });

      if (result.action === "accept" && result.content?.confirm === true) {
        contacts.delete(id);
        return { content: [{ type: "text", text: `Deleted contact ${id}.` }] };
      }
      return { content: [{ type: "text", text: `Nothing deleted (user action: ${result.action}).` }] };
    }
  );

  // ---------------------------------------------------------------
  // Tool 3: list_contacts - read-only helper to verify changes
  // ---------------------------------------------------------------
  server.registerTool(
    "list_contacts",
    { title: "List contacts", description: "Lists all contacts.", inputSchema: {} },
    async () => ({
      content: [{ type: "text", text: JSON.stringify([...contacts.entries()].map(([id, c]) => ({ id, ...c })), null, 2) }],
    })
  );

  return server;
}

// ---------------- HTTP wiring (Streamable HTTP transport) ----------------
const app = express();
app.use(express.json());
const transports = {}; // sessionId -> transport

app.post("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];
  let transport = sessionId ? transports[sessionId] : undefined;

  if (!transport && !sessionId && isInitializeRequest(req.body)) {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => { transports[id] = transport; },
    });
    transport.onclose = () => { if (transport.sessionId) delete transports[transport.sessionId]; };
    await buildServer().connect(transport);
  } else if (!transport) {
    return res.status(400).json({ jsonrpc: "2.0", error: { code: -32000, message: "No valid session" }, id: null });
  }

  await transport.handleRequest(req, res, req.body);
});

const handleSession = async (req, res) => {
  const transport = transports[req.headers["mcp-session-id"]];
  if (!transport) return res.status(400).send("Invalid or missing session");
  await transport.handleRequest(req, res);
};
app.get("/mcp", handleSession);
app.delete("/mcp", handleSession);

app.listen(PORT, () => console.log(`MCP server listening on http://localhost:${PORT}/mcp`));
