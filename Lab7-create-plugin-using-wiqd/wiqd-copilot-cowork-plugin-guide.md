# Creating a Copilot Cowork Plugin with the wiqd CLI

This guide walks through creating a plugin with the `wiqd` CLI, from setup to sharing it with users. 

> **Note:** The `wiqd plugin` commands are alpha and may change. Check the official docs before you start.

## What you are building

A wiqd plugin is a Microsoft 365 app package. It can combine:

- A **declarative agent** (`declarativeAgent.json`)
- **Skills** (each one a `SKILL.md` file under `appPackage/skills/`)
- **Agent connectors**, either remote MCP servers or references to existing OpenAPI custom connectors

## Prerequisites

### Install wiqd

Windows (PowerShell):

```powershell
iex "& { $(irm 'https://aka.ms/wiqd/install.ps1') }"
```

macOS or Linux:

```bash
curl -fsSL https://aka.ms/wiqd/install.sh | bash
```

### (Optional) Install the WIQD authoring plugin

Install this if you want guided, conversational authoring inside GitHub Copilot CLI. Skip it if you will drive everything from the command line.

```bash
copilot plugin install wiqd@awesome-copilot
```

Or use the WIQD marketplace:

```bash
copilot plugin marketplace add microsoft/wiqd
copilot plugin install wiqd@wiqd
```

For Claude Code, add the `microsoft/wiqd` marketplace, install `wiqd@wiqd`, and start a new session.

### Sign in to Microsoft 365

Provisioning and sharing touch your Microsoft 365 tenant, so sign in first:

```bash
wiqd auth login --interactive
```

### Verify the environment

```bash
wiqd doctor
```

Fix any problems it reports before continuing.

## Step 1: Choose a build path

| Path | When to use it |
|------|----------------|
| **Conversational** | You want Copilot CLI (with the WIQD plugin) to run the wiqd commands for you and report each step. Describe the goal in plain language, such as "create a standalone plugin" or "add a skill to my plugin." |
| **CLI** | You want to run each command yourself. The steps below use this path. |

## Step 2: Scaffold the project

```bash
wiqd plugin create --name my-plugin
cd my-plugin
```

## Step 3: Add capabilities

Add any combination of the following.

### 3.1 Declarative agent

```bash
wiqd plugin add agent
```

This creates `declarativeAgent.json`. Edit it to set the agent's name, instructions, and capabilities.

### 3.2 Skill

```bash
wiqd plugin add skill --name "Triage Issues"
```

This scaffolds `appPackage/skills/triage-issues/SKILL.md` and registers the skill in the manifest. Open the file and write the skill's instructions. Each skill should describe one clear task, when to use it, and the steps to follow.

### 3.3 Remote MCP connector

```bash
wiqd plugin add connector --name "Contoso Tools" \
  --description "Contoso toolbelt over MCP" \
  --url https://tools.contoso.com/mcp
```

## Step 4: Validate offline

```bash
wiqd plugin validate --env dev
```

Fix any errors before moving on. This check does not contact the service.

## Step 5: Provision

```bash
wiqd plugin provision --env dev
```

This writes the `.env.dev` file that the `package` and `share` commands need.

## Step 6: Package

```bash
wiqd plugin package --env dev
```

This builds the deployable `.zip` file.

## Step 7: Deep-validate the package

```bash
wiqd plugin validate --env dev --mode deep
```

This checks the built package against the Teams Developer Portal (AVL), so it needs network access and a successful provision.

## Step 8: Share or publish

Choose the option that fits your audience.

### Option A: Share directly

Share with specific people:

```bash
wiqd plugin share --env dev --scope users --email you@contoso.com
```

Share with the whole tenant:

```bash
wiqd plugin share --env dev --scope tenant
```

Direct sharing requires `AGENT_SCOPE=shared` in the selected environment file. Otherwise it fails with `INVALID_AGENT_SCOPE` (exit code 1). Do not edit a personal deployment's values to get around this check. The `--scope` flag controls who can see the plugin, not where it is deployed.

### Option B: Publish to the org app catalog

```bash
wiqd plugin publish --env dev
```

Users in the tenant can find the plugin only after an admin approves it.

Run a dry run first:

```bash
wiqd plugin publish --dry-run --no-runtime --no-network --env dev
wiqd plugin publish --dry-run --env dev
```

### Option C: Public store

Build the package, then submit the `.zip` through Partner Center yourself. wiqd does not automate this step.

```bash
wiqd plugin package --env dev
```

## Step 9: Inspect and clean up

```bash
wiqd plugin show
wiqd plugin list --root .
wiqd plugin delete --env dev --yes
```

Use `delete` with care. The `--yes` flag skips the confirmation prompt.

## Ordering and environment rules

- Run `provision` before `package`, `share`, and deep validation.
- `--env` must be a single portable filename segment, such as `dev` or `test-west`.
- The environment folder comes from `environmentFolderPath` in `m365agents.yml` (default `./env`). It must stay inside the project.
- Use `local` for personal testing and `dev` for shared deployment.

## Key files

| File or key | Purpose |
|-------------|---------|
| `appPackage/manifest.json` | Default app manifest (override with `--manifest`) |
| `appPackage/skills/<skill-name>/SKILL.md` | Skill definition |
| `declarativeAgent.json` | Declarative agent definition |
| `m365agents.yml` | Project config; holds `environmentFolderPath` |
| `.env.<env>` | Environment file with `TEAMS_APP_ID` and `AGENT_SCOPE` |
| `${{TEAMS_APP_ID}}` | Manifest binding to the environment's app ID |
| `agentSkills[]`, `agentConnectors[]` | Skill and connector entries in the manifest |
| `openApiConnector`, `ConnectionVault` | OpenAPI connector reference (preview) |
| `*.zip` | Package produced by `wiqd plugin package` |


## Gaps to keep in mind

The official page does not cover some points you will need when targeting Copilot Cowork:

- **Installing into Copilot Cowork.** The page covers only the org catalog, direct sharing, and Partner Center. Check how Cowork picks up tenant-approved or shared plugins before you assume the publish path is enough.
- **Full manifest and config reference.** The page points to the plugin authoring reference and the CLI reference. Use those for field-level details.
- **Local testing.** The page has no dedicated local-testing section. Test by sharing to yourself (`--scope users --email ...`) on a `dev` environment.
- **Example source.** The page has no sample plugin. Scaffold one with `wiqd plugin create` and build from there.

## Troubleshooting checklist

- `wiqd doctor` reports a problem: fix it, then rerun the command.
- `INVALID_AGENT_SCOPE` when sharing: set `AGENT_SCOPE=shared` in the correct `.env.<env>` file for a shared deployment.
- Package or share fails with missing environment values: rerun `wiqd plugin provision --env <env>`.
- Deep validation fails: fix the errors it lists, then run `package` again before revalidating.
- A connector is not found: run `wiqd connector list --search "<name>"` and use the exact selector.

