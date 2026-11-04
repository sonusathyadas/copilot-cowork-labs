# Microsoft Work IQ CLI (`workiq`)

**Duration:** about 60 minutes

**Level:** Beginner to intermediate (basic terminal and Node.js knowledge)

---

## 1. Objectives

By the end of this lab you will be able to:

1. Install the Work IQ CLI from npm and confirm the installed version.
2. Accept the end user license agreement (EULA) required before first use.
3. Sign in and sign out of Work IQ.
4. Ask single questions against Microsoft 365 data with `workiq ask -q`.
5. Hold a multi-turn conversation in interactive mode and continue a conversation by ID.
6. Read and change CLI configuration (tenant ID and related settings).
7. Grant additional consent for extra permissions.
8. List available agents and inspect an agent card.
9. Run Work IQ as a local MCP server for use in editors and coding agents.
10. Troubleshoot the most common setup problems.

---

## 2. Prerequisites

| Requirement | Details |
|---|---|
| Node.js | Version 18 or later. `npm` and `npx` come with it. |
| Microsoft 365 account | A work or school account in a tenant where Work IQ is enabled. |
| Tenant consent | Access to Microsoft 365 tenant data needs administrative consent. On first access, a consent dialog appears. If the dialog is blocked, ask your tenant administrator. |
| Licensing | Confirm with your administrator that your tenant meets the licensing prerequisites before the lab. A third-party field guide reports that Entra admin consent and a Copilot Studio billing plan are required, so verify this for your organization. |
| Terminal | Any shell: PowerShell, Command Prompt, macOS Terminal, or a Linux shell. |

> **Note for instructors:** Work IQ is a Microsoft service. Exact command names, options, and consent steps can change between releases. Run `workiq --help` at the start of the lab and use the output for your installed version if it differs from this document.

---

## 3. Command Reference (Quick View)

| Command | Purpose |
|---|---|
| `workiq accept-eula` | Accept the EULA. Required once per user before the first query. |
| `workiq auth login` | Sign in with your Microsoft 365 account. |
| `workiq auth consent` | Grant additional permissions and provision the service principal. |
| `workiq auth logout` | Sign out and clear the local session. Replaces the older `workiq logout`. |
| `workiq ask -q "..."` | Ask a single natural-language question. |
| `workiq ask` | Start interactive, multi-turn mode. |
| `workiq ask ... --conversation-id <id>` | Continue an existing conversation. |
| `workiq ask ... --developer` | Show how the request was processed (developer mode). |
| `workiq config show` | Display current configuration. |
| `workiq config set <key> <value>` | Set a configuration value. |
| `workiq config unset <key>` | Remove a configuration key. |
| `workiq config reset` | Delete the configuration file. |
| `workiq agents list` | List available agents. Replaces `workiq list-agents`. |
| `workiq agents get-card` | Show an agent card. Replaces `workiq get-agent-card`. |
| `workiq mcp` | Run Work IQ as an MCP server. |
| `workiq version` | Show the installed version. |

**Global options**

| Option | Description | Default |
|---|---|---|
| `-t, --tenant-id <id>` | Microsoft Entra tenant ID | `common` |
| `--version` | Show version | — |
| `-h, --help` / `-?` | Show help | — |

---

## 4. Exercises

### Exercise 1: Install the CLI

**Goal:** Install `workiq` globally and confirm it works.

**Option A: Global install (recommended for repeated use)**

```bash
npm install -g @microsoft/workiq
```

**Option B: Run without installing (npx)**

```bash
npx -y @microsoft/workiq --help
```

**Verify**

```bash
workiq version
workiq --help
```

**Checkpoint:** `workiq version` prints a version number, and `--help` lists the commands in section 3.

**Update later**

```bash
npm update -g @microsoft/workiq
```

> If you use `npx`, the latest version is fetched each time, so no update step is needed.

---

### Exercise 2: Accept the EULA

**Goal:** Accept the license agreement before the first query.

```bash
workiq accept-eula
```

Read the license text when prompted and accept it. This is a one-time, per-user step.

**Checkpoint:** The command completes without an error. Re-running it should not ask again.

---

### Exercise 3: Sign in

**Goal:** Authenticate with your Microsoft 365 account.

```bash
workiq auth login
```

1. A browser window or sign-in prompt opens. Sign in with your work or school account.
2. If the consent dialog appears, read the requested permissions and accept only if your organization allows it.
3. Return to the terminal.

**Specify a tenant (optional)**

If you need to target a specific Microsoft Entra tenant, pass its ID:

```bash
workiq auth login --tenant-id <your-tenant-id>
```

Or set it once in configuration (see Exercise 6):

```bash
workiq config set tenant-id <your-tenant-id>
```

**Checkpoint:** Sign-in completes, and a test query in Exercise 4 returns results instead of an authentication error.

---

### Exercise 4: Query Microsoft 365 data

**Goal:** Ask questions about emails, meetings, documents, Teams messages, and people.

**4a. Confirm who you are**

```bash
workiq ask -q "Who am I? What is my role in the company?"
```

**4b. Calendar and meetings**

```bash
workiq ask -q "When is my next meeting?"
workiq ask -q "What's on my calendar tomorrow?"
workiq ask -q "What are my upcoming meetings this week?"
```

**4c. Email**

```bash
workiq ask -q "Summarize my recent emails from the engineering team"
workiq ask -q "Find unread emails about Q4 planning"
```

**4d. Documents**

```bash
workiq ask -q "Find documents I worked on yesterday"
workiq ask -q "Summarize the specification document for the user portal"
```

**4e. Teams messages**

```bash
workiq ask -q "Summarize today's messages in the Engineering channel"
workiq ask -q "What did the team decide about the API design in Teams?"
```

**4f. People**

```bash
workiq ask -q "Who is working on Project Alpha?"
```

**4g. Developer mode (see how the request was handled)**

```bash
workiq ask -q "What were the key decisions in last week's architecture review meeting?" --developer
```

**Exercise 4 tasks**

1. Write three questions about your own work and run them.
2. Run one question with and without `--developer`. Note what extra information appears.
3. Save one useful answer into a text file, for example `notes.txt`.

**Checkpoint:** At least three queries return answers drawn from your own Microsoft 365 data.

---

### Exercise 5: Multi-turn conversations

**Goal:** Use interactive mode and continue a conversation across commands.

**5a. Interactive mode**

```bash
workiq ask
```

At the prompt, ask a question, then ask a follow-up that depends on the first answer, for example:

```text
> What did John say about the proposal?
> Summarize his main concerns in three bullet points.
> Draft a short reply I can send him.
```

Exit the prompt using the exit method shown on screen (for example `exit` or `Ctrl+C`).

**5b. Continue a conversation by ID**

Some releases return a conversation ID you can reuse. Run a query with `--conversation-id`:

```bash
workiq ask -q "What was discussed in the standup this morning?" --conversation-id <id>
```

Use the ID from a previous response. Check `workiq ask --help` to confirm how your version returns and accepts IDs.

**Checkpoint:** A follow-up question is answered in the context of the earlier one.

---

### Exercise 6: Configuration

**Goal:** View and manage CLI settings.

```bash
# Show current settings
workiq config show

# Set the default tenant
workiq config set tenant-id <your-tenant-id>

# Confirm the change
workiq config show

# Remove a single key
workiq config unset tenant-id

# Reset everything (deletes the configuration file)
workiq config reset
```

**Exercise 6 tasks**

1. Record the value of `tenant-id` before you change it.
2. Set it, confirm it with `config show`, then restore the original value.
3. Run `config reset` only in a practice environment, because it removes all saved settings.

**Checkpoint:** `config show` reflects each change you make.

---

### Exercise 7: Additional consent

**Goal:** Grant extra permissions when a query needs them.

```bash
workiq auth consent
```

This command grants additional permissions and provisions the service principal for your tenant. Run it when a query fails with a permission message or when your administrator asks you to.

**Checkpoint:** After consent, the query that failed earlier now returns data, or you have confirmed with your administrator that consent is not permitted for your account.

---

### Exercise 8: Agents

**Goal:** List available agents and inspect one.

```bash
# List available agents
workiq agents list

# Show the agent card for one agent
workiq agents get-card --agent-name <agent-name>
```

Use the name returned by `agents list` in the second command.

**Checkpoint:** You can name at least one agent and describe what its card says it does.

---

### Exercise 9: Run Work IQ as an MCP server

**Goal:** Expose Work IQ to editors and coding agents through the Model Context Protocol.

**Start the server**

```bash
workiq mcp
```

Or without a global install:

```bash
npx -y @microsoft/workiq mcp
```

**Add it to an MCP client**

Example configuration (for example, in VS Code's MCP settings):

```json
{
  "workiq": {
    "command": "npx",
    "args": ["-y", "@microsoft/workiq@latest", "mcp"],
    "tools": ["*"]
  }
}
```

### Exercise 10: Sign out

**Goal:** End your session cleanly, especially on shared machines.

```bash
workiq auth logout
```

**Verify**

```bash
workiq ask -q "Who am I?"
```

**Checkpoint:** After logout, the query fails with an authentication message. Sign in again with `workiq auth login` to continue.

> **Older releases:** `workiq logout` is the previous command name. The current documentation uses `workiq auth logout`.

---

## 5. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `workiq: command not found` | Global install did not put the binary on your PATH | Reopen the terminal, or use `npx -y @microsoft/workiq ...` |
| Query asks you to accept terms | EULA not accepted | Run `workiq accept-eula` |
| Authentication error on query | Not signed in, or session expired | Run `workiq auth login`, then retry |
| Permission or consent error | Additional permissions needed | Run `workiq auth consent`, or ask your administrator |
| Results from the wrong tenant | Tenant ID not set correctly | Run `workiq config show`, then `workiq config set tenant-id <id>` |
| Empty or generic answers | Question too vague, or data not available to your account | Name the person, date, or document explicitly |
| Old command fails (`list-agents`, `get-agent-card`, `logout`) | Command renamed in newer releases | Use `agents list`, `agents get-card`, `auth logout` |
| Behavior differs from this lab | Newer or older release | Run `workiq --help` and `workiq version`, and follow the output |

---

## 6. Clean-up

1. Run `workiq auth logout`.
2. Optionally remove saved configuration with `workiq config reset`.
3. Optionally uninstall: `npm uninstall -g @microsoft/workiq`.

---

## 7. Lab Review Questions

1. What is the difference between `workiq ask -q` and `workiq ask`?
2. Why must the EULA be accepted before the first query?
3. When would you use `--tenant-id`, and where can it be stored?
4. What does `workiq mcp` let other tools do?
5. Which command grants additional permissions, and when would you run it?

---

## 8. Sources

- Microsoft Work IQ repository and README: https://github.com/microsoft/work-iq
- Work IQ npm package README (command list and rename table): https://cdn.jsdelivr.net/npm/@microsoft/workiq@1.0.0/README.md
- Microsoft Learn training module, Work IQ CLI mode: https://learn.microsoft.com/en-in/training/modules/integrate-foundry-agent-with-m365/5-access-m365-data-workiq
- Copilot Camp, Work IQ setup and CLI: https://microsoft.github.io/copilot-camp/pages/work-iq/01-work-iq-setup-and-cli/
- Third-party field guide on licensing and consent (verify with your administrator): https://vorplabs.com/agent-tools/microsoft-work-iq-cli
