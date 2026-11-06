#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "approval-demo", version: "1.0.0" });

// In-memory "database" for the demo
const customers = new Map([
  ["C001", { name: "Acme Ltd", email: "ops@acme.example", status: "active" }],
]);
const drafts = new Map(); // draft_id -> { customer_id, amount, reason, status }

// Helper to return JSON as MCP text content
const ok = (data) => ({
  content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
});

// ---- Gate 2a: read-only tool. Annotated so the platform does NOT prompt. ----
server.registerTool(
  "get_customer",
  {
    description: "Read a customer record. No side effects.",
    inputSchema: { customer_id: z.string() },
    annotations: { readOnlyHint: true },
  },
  async ({ customer_id }) => ok(customers.get(customer_id) ?? { error: "customer not found" })
);

// ---- Gate 1 + 2b: write tool. Not read-only, not destructive. ----
// Platform built-in approval should prompt because readOnlyHint is false.
server.registerTool(
  "update_customer_email",
  {
    description: "Change a customer's email address. Requires approval.",
    inputSchema: { customer_id: z.string(), new_email: z.string().email() },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
  async ({ customer_id, new_email }) => {
    const c = customers.get(customer_id);
    if (!c) return ok({ error: "customer not found" });
    c.email = new_email;
    return ok({ ok: true, customer_id, email: new_email });
  }
);

// ---- Gate 1 + 2c: destructive tool. Platform should show a stronger warning. ----
server.registerTool(
  "delete_customer",
  {
    description: "Permanently delete a customer record. Irreversible.",
    inputSchema: { customer_id: z.string() },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
  },
  async ({ customer_id }) => {
    if (!customers.delete(customer_id)) return ok({ error: "customer not found" });
    return ok({ ok: true, deleted: customer_id });
  }
);

// ---- Gate 3: draft and approve ----
// Step 1: the agent (including scheduled runs) can only STAGE the refund.
server.registerTool(
  "draft_refund",
  {
    description: "Prepare a refund draft. Does NOT move money. Returns a draft_id for a human to approve.",
    inputSchema: {
      customer_id: z.string(),
      amount: z.number().positive(),
      reason: z.string(),
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  async ({ customer_id, amount, reason }) => {
    if (!customers.has(customer_id)) return ok({ error: "customer not found" });
    const draft_id = randomUUID().slice(0, 8);
    drafts.set(draft_id, { customer_id, amount, reason, status: "pending_approval" });
    return ok({ draft_id, status: "pending_approval", amount });
  }
);

server.registerTool(
  "list_pending_drafts",
  {
    description: "Show drafts waiting for approval. Read-only.",
    inputSchema: {},
    annotations: { readOnlyHint: true },
  },
  async () =>
    ok(
      [...drafts.entries()]
        .filter(([, d]) => d.status === "pending_approval")
        .map(([draft_id, d]) => ({ draft_id, ...d }))
    )
);

// Step 2: only a person should trigger this. Irreversible, so it is marked destructive.
server.registerTool(
  "approve_refund",
  {
    description: "Execute an approved refund draft. Moves money. Irreversible.",
    inputSchema: { draft_id: z.string() },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
  },
  async ({ draft_id }) => {
    const draft = drafts.get(draft_id);
    if (!draft || draft.status !== "pending_approval") {
      return ok({ error: "no pending draft with that id" });
    }
    draft.status = "executed"; // a real system would call the payment API here
    return ok({ ok: true, draft_id, refunded: draft.amount });
  }
);

// ---- Start the server over stdio ----
const transport = new StdioServerTransport();
await server.connect(transport);
console.log("Server is running over stdio...");