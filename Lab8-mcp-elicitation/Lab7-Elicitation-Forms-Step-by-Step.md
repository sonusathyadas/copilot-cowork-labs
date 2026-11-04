# Configuring Elicitation Forms in Copilot Cowork

---

## Read this first: what "configuration" means here

Elicitation forms are not switched on from a settings page. The form is produced by the **MCP server's code**. Cowork advertises elicitation support automatically during the MCP handshake. So the configuration work has three parts:

| Part | Where it happens | What you do |
|---|---|---|
| A. Server code | Your MCP server | Call the elicitation request with a flat schema, and handle `accept`, `decline` and `cancel` |
| B. Connection | Cowork connectors panel | Register the server's HTTPS URL as a custom connector |
| C. Verification | Cowork chat | Ask for an action that triggers a form, then test each response type |

The Learn article does not include portal menu paths, so **Part B's menu names below come from third-party guides, not from Microsoft's page.** Check them against your tenant's Cowork screens before relying on them.

---

## Prerequisites

1. Access to Copilot Cowork with permission to add custom MCP connectors. Your administrator may need to allow this.
2. Node.js 18 or later (tested on Node 22.23.4).
3. A text editor and a terminal.
4. A way to give the server a public **HTTPS** address. Cowork has to reach it from the internet. Localhost alone will not work. Options include a tunnel tool such as `cloudflared` or `ngrok`, or a server you already host.

---

## Step 1 — Install the sample server

```bash
cd mcp-server
npm install
```

This installs `@modelcontextprotocol/sdk`, `express`, and `zod`. The lock file pins the versions.

**Check:** `node_modules/` exists and `package-lock.json` is present.

---

## Step 2 — Understand the elicitation code

Open `mcp-server/src/index.js`. The code follows the same pattern in each tool.

### 2.1 Check that the client supports forms

```js
const supportsElicitation = () =>
  Boolean(server.server.getClientCapabilities()?.elicitation);
```

Elicitation is optional for the client, so check before you ask. If the client does not support it, use a chat fallback. The `create_contact` tool does this by accepting the values as ordinary arguments.

### 2.2 Build a flat schema

```js
requestedSchema: {
  type: "object",
  properties: {
    first_name: { type: "string", title: "First name", description: "Given name" },
    email:      { type: "string", format: "email", title: "Email address" },
    role:       { type: "string", title: "Role", enum: ["Engineering", "Sales", "Support"] },
    subscribed: { type: "boolean", title: "Subscribe to newsletter", default: false }
  },
  required: ["first_name", "email", "role"]
}
```

Schema rules, from the Learn article:

| Rule | Detail |
|---|---|
| Flat only | Top-level properties with primitive values. No nested objects and no arrays of objects. |
| Supported types | `string` (formats `email`, `uri`, `date`, `date-time`), `number`, `integer`, `boolean`, and `enum` on a string |
| Labels | Set `title` and `description`. They become the field labels and help text. |
| Size | Keep it to about 5–7 fields. Longer forms need a richer UI. |

### 2.3 Handle all three outcomes

```js
const result = await server.server.elicitInput({ message, requestedSchema });

if (result.action !== "accept") {
  return { content: [{ type: "text", text: `Not done (user action: ${result.action}).` }] };
}
// result.content holds the submitted values
```

| `action` | Meaning | `content` present? | What to do |
|---|---|---|---|
| `accept` | User submitted the form | Yes | Use `result.content` |
| `decline` | User explicitly refused | No | Stop, and report that nothing changed |
| `cancel` | User dismissed the form (Escape, navigated away, or sent a new message) | No | Stop safely; do not retry automatically |

### 2.4 Guidelines to follow

- **Never ask for secrets** such as passwords, API keys or tokens through a form.
- **One form at a time.** Only one elicitation can be pending per session, so do not run forms in parallel.
- **Destructive actions:** ask for an explicit confirmation field, as `delete_contact` does, and only act when it is `true`.

### 2.5 What the sample's three tools do

| Tool | Form shown | Demonstrates |
|---|---|---|
| `create_contact` | Name, email, role (enum), newsletter (boolean) | Multi-field form, enum, boolean, fallback when forms are not supported |
| `delete_contact` | Single confirm checkbox | Confirmation before a destructive action, handling of decline and cancel |
| `list_contacts` | None | Read-only tool used to check the result |

---

## Step 3 — Run the server locally

```bash
npm start
```

You should see:

```
MCP server listening on http://localhost:3000/mcp
```

Leave this terminal open.

---

## Step 4 — Test with the simulated client

Open a second terminal in `server/`. The test client declares elicitation support and answers each form from a scripted list. This lets you check the server without Cowork.

**Windows PowerShell:**

```powershell
$env:ANSWERS = '[{"action":"accept","content":{"first_name":"Jane","last_name":"Smith","email":"jane.smith@example.com","role":"Engineering"}},{"action":"accept","content":{"confirm":true}},{"action":"decline"}]'
node test/client-test.js
```

**macOS / Linux:**

```bash
ANSWERS='[{"action":"accept","content":{"first_name":"Jane","last_name":"Smith","email":"jane.smith@example.com","role":"Engineering"}},{"action":"accept","content":{"confirm":true}},{"action":"decline"}]' node test/client-test.js
```

**Expected output (abridged):**

```
> create_contact {}
  [form shown] Enter the new contact's details.
  [answer]     {"action":"accept", ...}
  result: Created contact c3: Jane Smith <jane.smith@example.com>
> delete_contact {"id":"c1"}
  [form shown] Delete contact Ada Lovelace (c1)? This cannot be undone.
  result: Deleted contact c1.
> delete_contact {"id":"c2"}
  result: Nothing deleted (user action: decline).
```

Each answer in `ANSWERS` is used for the next form, in order. If the list runs out, the test client sends `cancel`.

**Test the no-forms fallback:**

```bash
node test/fallback-test.js
```

This client does not declare elicitation. The server should skip the form and create the contact from the arguments it was given.

**Test the response-validation check:** send `{"action":"accept","content":{}}` for the delete confirmation. The SDK rejects it with a schema error, because `confirm` is required. This is the same kind of check a real client performs.

---

## Step 5: Create a Dev Tunnel

1. Sign in to Dev Tunnels:

   ```powershell
   devtunnel user login
   ```

   Use `devtunnel user login -g` to sign in with GitHub, or `devtunnel user login -d` for a device code.

2. Create a persistent tunnel that allows anonymous access:

   ```powershell
   devtunnel create -a
   ```

   The output includes the tunnel ID. Copy it. You need it in later steps.

3. Add the server port to the tunnel. Use `http` because the local server speaks plain HTTP:

   ```powershell
   devtunnel port create -p 3000 --protocol http
   ```

   Use the port from Step 2 if it is not 3000.

4. Start hosting the tunnel. Replace `<TUNNEL_ID>` with the ID from step 2:

   ```powershell
   devtunnel host <TUNNEL_ID>
   ```

   **Expected result:** The output shows a public URL for the port. It looks like `https://<tunnel-id>-3000.<region>.devtunnels.ms`.

5. Copy the URL and add `/mcp` to the end. This is your **MCP URL**. For example:

   ```text
   https://abc123-3000.euw.devtunnels.ms/mcp
   ```

   Keep this URL for the next labs.
---

## Step 6: Choose a build path


Create a plugin for CoWork

```bash
wiqd plugin create --name demo-plugin
cd demo-plugin
```

## Step 7: Add MCP connector to Plugin

Add any combination of the following. Replace the `<MCP-SERVER-URL>` with the MCP server running in the devtunner.

```bash
wiqd plugin add connector --name "Contoso Tools" \
  --description "Contoso toolbelt over MCP" \
  --url <MCP-SERVER-URL>/mcp
```

## Step 8: Validate offline

```bash
wiqd plugin validate --env dev
```

Fix any errors before moving on. This check does not contact the service.

## Step 9: Provision

```bash
wiqd plugin provision --env dev
```

This writes the `.env.dev` file that the `package` and `share` commands need.

## Step 10: Package

```bash
wiqd plugin package --env dev
```

This builds the deployable `.zip` file.

## Step 11: Deep-validate the package

```bash
wiqd plugin validate --env dev --mode deep
```

This checks the built package against the Teams Developer Portal (AVL), so it needs network access and a successful provision.


## Step 12 — Add the plugin to Cowork

1. Open Copilot Cowork in your browser.
2. Click on **Customize** from left panel.
3. Click on the **Add** button and choose **Upload** option
4. Select the `.zip` file generated in the step 10
5. Choose the **Only you** and click on **Publish**.
6. The plugin will list under the added plugins.
---

## Step 13 — Trigger and test the forms in Cowork

Start a new chat in Cowork. Each test below should show a form.

| # | Prompt to type | Action to take on the form | Expected result |
|---|---|---|---|
| 1 | "Add a new contact using the Contacts tool." | Fill in all required fields and submit | Chat confirms `Created contact c3: …` |
| 2 | "Show me all contacts." | — | New contact appears in the list |
| 3 | "Delete contact c1." | Tick the confirm box and submit | `Deleted contact c1.` |
| 4 | "Delete contact c2." | Tick the confirm box, then select decline or close the form | `Nothing deleted (user action: decline).` |
| 5 | "Add a new contact." | Press Escape or close the form | `Contact not created (user action: cancel).` |
| 6 | Start test 1, then send a new chat message before submitting | — | The pending form is auto-cancelled |

Test 6 reflects a rule from the Learn article: sending a new message or losing the session cancels a pending form.

---

## Limitations

- Only **form mode** is supported. URL-mode elicitation (sending the user to a web page) is not supported yet.
- You control the fields, types and help text. You do not control the form's appearance.
- Forms are for short, simple input. Searchable lists, nested data and visual previews are better handled by another UI.
