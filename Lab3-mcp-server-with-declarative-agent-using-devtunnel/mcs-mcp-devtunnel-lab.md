# Lab: Connect a Local MCP Server to Microsoft Copilot Studio Using Dev Tunnels

**Time:** About 30 minutes

**Products:** GitHub Copilot, Visual Studio Code, Dev Tunnels

---

## Overview

In this lab you run an MCP server on your own computer, expose it to the internet with a Dev Tunnel, test it in Visual Studio Code with GitHub Copilot, and then add it as a tool to a Copilot Studio agent.

This lab uses the copy of the app in the **`Lab3/jokes-mcp`** folder.

| Stage | What it is | Where it happens |
|---|---|---|
| 1. Local MCP server | Runs on your computer and exposes the jokes tools `get_random_joke` and `search_jokes` | `Lab3/jokes-mcp` |
| 2. HTTPS tunnel | Publishes the local server over HTTPS so Microsoft 365 can reach it | Dev Tunnels |
| 3. Entra registrations | The MCP server is the protected resource. The OAuth client gets tokens for it. | Microsoft Entra admin center |
| 4. Teams portal registration | Stores the OAuth configuration that lets Copilot authenticate to your MCP server | Teams Developer Portal |
| 5. Declarative agent | Scaffolds the agent project and adds the MCP server as an action | Microsoft 365 Agents Toolkit CLI (`atk`) |
| 6. OAuth wiring and local run | Connects the action to the OAuth configuration, provisions it, and previews the agent | `atk provision` and `atk preview` |


**Security note:** A Dev Tunnel with anonymous access lets anyone on the internet reach your local server if they can guess the tunnel ID. Keep the tunnel open only while you do this lab, and delete it at the end.

---

## Prerequisites

1. **Visual Studio Code.** Download from `https://code.visualstudio.com/download`.
2. **Node.js v22.** Install it directly or through nvm (`https://github.com/nvm-sh/nvm`, or `https://github.com/coreybutler/nvm-windows` on Windows).
3. **Dev Tunnels CLI (`devtunnel`).** On Windows, run `winget install Microsoft.devtunnel`. Check the install with `devtunnel --version`.
4. **A Microsoft account or Microsoft Entra work account** for `devtunnel user login`.
5. **A Copilot Studio trial or developer account** with access to the Microsoft Copilot harness.
6. **GitHub Copilot** in Visual Studio Code, with a signed-in account that has access.
7. **The `Lab3/joke-mcp` folder** on your computer.

---

## Lab 1.1: Set Up the MCP Server From `Lab3/jokes-mcp`

### Step 1: Open the server folder

1. Open Visual Studio Code.
2. Select **File > Open Folder** and open the `jokes-mcp` folder inside `Lab3`. For example: `C:\Labs\Lab3\jokes-mcp`.
3. Open the integrated terminal:
   - Windows/Linux: `` Ctrl + ` ``
   - Mac: `` Cmd + ` ``

### Step 2: Check the project before you start

In the Explorer, confirm that these files are in `jokes-mcp`:

- `package.json`, with `build` and `start` scripts
- The server source files that the scripts build and run

Open `package.json` and check the `start` script. Note the port the server listens on. The sample app uses **port 3000**. If your copy uses a different port, use that port in every step below.

> **Note:** This lab uses the `Lab3/jokes-mcp` copy as the MCP server. It fetches Chuck Norris and dad jokes on demand, and it serves an MCP endpoint at `/mcp`.

### Step 3: Install dependencies, then build and start the server

In the terminal, run:

```bash
npm install
```

Then build and start the server:

```bash
npm run build && npm run start
```

**Expected result:** The terminal shows that the server is running and names the port, for example `3000`. Leave this terminal open. The server must keep running while you test.

### Step 4: Create a Dev Tunnel

Open a **second** terminal in VS Code (**Terminal > New Terminal**). Do not stop the server.

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

### Step 5: Test the endpoint in a browser

1. Open a browser, paste the MCP URL into the address bar, and press **Enter**.

**Expected result:** You see this JSON error:

```json
{"jsonrpc":"2.0","error":{"code":-32000,"message":"Method not allowed."},"id":null}
```

This response is normal. It means the tunnel reaches the server, and the server rejects a plain browser GET request.

> **Troubleshooting:** If the browser shows a tunnel error, check that `devtunnel host` is still running and that the port matches the server's port. If you see a 502 or connection error, confirm that `npm run start` is still running.

2. You can also test the MCP server connection using the tool `@modelcontextprotocol/inspector`. Open the terminal and run the following command.
    ```bash
    npx @modelcontextprotocol/inspector@latest
    ```
3. Add a new server and specify the MCP server URL and connection type as `http`. Click on the Connect switch. 
4. View the list of available tools in the tools tab. 
---

## Lab 1.2: Use the Jokes MCP Server in Visual Studio Code

Add the server to Visual Studio Code so GitHub Copilot can call it. Use your MCP URL from Lab 1.1.

1. Open the Command Palette:
   - Windows/Linux: `Ctrl + Shift + P`
   - Mac: `Cmd + Shift + P`

   Type `MCP`.
2. Select **MCP: Add Server...**.
3. Select **HTTP (HTTP or Server-Sent Events)**.
4. Paste your MCP URL into the input box. Make sure it ends with `/mcp`.
5. Press **Enter**.
6. Enter a server name, for example `JokesMCP`.
7. Select **Workspace** to add MCP server to the current workspace.
8. Select **mcp.json** not the **.vscode/mcp.json** 
9. Open **GitHub Copilot** in Visual Studio Code.
9. Set the mode to **Agent**.
10. Select the tools icon and confirm that the **JokesMCP** server's actions are selected.
11. Send this prompt:
    ```text
    Get a chuck norris joke from the Dev category
    ```

**Expected result:** GitHub Copilot responds with a Chuck Norris joke from the Dev category.

---

## Lab 1.3: Register the MCP Server and OAuth Client in Microsoft Entra ID

You create two app registrations in Microsoft Entra ID. The first is the protected resource, which is your MCP server. The second is the OAuth client that Copilot uses to get tokens for it.


### Step 1: Create the MCP server app registration

1. Open the Microsoft Entra admin center at `https://entra.microsoft.com` and sign in.
2. Go to **Entra ID > App registrations > New registration**.
3. Enter these values:

   | Field | Value |
   |---|---|
   | Application name | `Jokes MCP Server` |
   | Supported account types | **Accounts in this organizational directory only** (single tenant) |
   | Redirect URI | Leave blank |

4. Select **Register**.
5. On the **Overview** page, copy these values:
   - **Application (client) ID**. In the steps below, this is `<JOKES-MCP-SERVER-CLIENT-ID>`.
   - **Directory (tenant) ID**. This is `<TENANT-ID>`.

### Step 2: Expose the MCP server API

1. In the **Jokes MCP Server** app registration, select **Expose an API**.
2. Select **Add** beside **Application ID URI**.
3. Enter this value and select **Save**:

   ```text
   api://<JOKES-MCP-SERVER-CLIENT-ID>
   ```

4. Select **Add a scope** and enter these values:

   | Field | Value |
   |---|---|
   | Scope name | `MCP.Access` |
   | Who can consent | **Admins and users** |
   | Admin consent display name | `Access Jokes MCP Server` |
   | Admin consent description | `Allow access to the Jokes MCP Server` |
   | State | **Enabled** |

5. Select **Add scope**.

The full scope is:

```text
api://<JOKES-MCP-SERVER-CLIENT-ID>/MCP.Access
```

This is the permission the OAuth client requests. It is not an MCP tool name.

### Step 3: Create the OAuth client app registration

1. Go to **Entra ID > App registrations > New registration**.
2. Enter these values:

   | Field | Value |
   |---|---|
   | Name | `Jokes MCP OAuth Client` |
   | Supported account types | **Accounts in this organizational directory only** (single tenant) |
   | Platform | **Web** |
   | Redirect URI | `https://teams.microsoft.com/api/platform/v1.0/oAuthRedirect` |

   The redirect URI is the Microsoft Teams OAuth callback. It is **not** your MCP server endpoint.

3. Select **Register**.
4. On the **Overview** page, copy the **Application (client) ID**. This is `<OAUTH-CLIENT-ID>`.

### Step 4: Create the client secret

1. In **Jokes MCP OAuth Client**, select **Certificates & secrets**.
2. Select **New client secret**.
3. Enter the description `Jokes MCP Demo` and choose an expiration.
4. Select **Add**.
5. Copy the secret **Value** now. Store it securely. You cannot view it again after you leave this page.

   This is `<OAUTH-CLIENT-SECRET>`.

### Step 5: Add the API permission

1. In **Jokes MCP OAuth Client**, select **API permissions**.
2. Select **Add a permission**.
3. Select **My APIs**, then **Jokes MCP Server**.
4. Select **Delegated permissions**, then **MCP.Access**.
5. Select **Add permissions**.
6. If your tenant requires administrator consent, grant consent before you continue.

**Expected result:** You now have two Entra registrations:

| Registration | Role |
|---|---|
| **Jokes MCP Server** | Resource application. Owns the API scope and represents the protected MCP server. |
| **Jokes MCP OAuth Client** | OAuth client application. Has the client ID, client secret, redirect URI, and the delegated `MCP.Access` permission. |

### Step 6: Find the tenant-specific endpoints

1. In **Jokes MCP OAuth Client**, select **Endpoints**.
2. Copy these values. Replace `<TENANT-ID>` with your directory (tenant) ID if the page shows a placeholder:

   | Endpoint | Value |
   |---|---|
   | Authorization | `https://login.microsoftonline.com/<TENANT-ID>/oauth2/v2.0/authorize` |
   | Token | `https://login.microsoftonline.com/<TENANT-ID>/oauth2/v2.0/token` |
   | Refresh | `https://login.microsoftonline.com/<TENANT-ID>/oauth2/v2.0/token` |

---

## Lab 1.4: Register the OAuth Configuration in the Teams Developer Portal

The Teams Developer Portal stores the OAuth configuration that lets Copilot authenticate to your MCP server. Copilot uses it to send the Entra token to your server.

1. Open the Teams Developer Portal at `https://dev.teams.microsoft.com` and sign in with your tenant account.
2. Select **Tools**, then **OAuth client registration**.
3. Select **Register client**.
4. Enter these values:

   | Portal field | Value |
   |---|---|
   | Registration name | `Jokes MCP OAuth` |
   | Base URL | Your Dev Tunnel Base URL from Lab 1.1, for example `https://abc123-3000.euw.devtunnels.ms`. Do not include `/mcp`. |
   | Restrict usage by org | **My organization only** |
   | Restrict usage by app | **Any Teams app** |
   | Client ID | `<OAUTH-CLIENT-ID>` from Lab 1.3, Step 3 (the Jokes MCP OAuth Client application ID) |
   | Client Secret | `<OAUTH-CLIENT-SECRET>` from Lab 1.3, Step 4 |
   | Authorization endpoint | The authorization endpoint from Lab 1.3, Step 6 |
   | Token endpoint | The token endpoint from Lab 1.3, Step 6 |
   | Refresh endpoint | The refresh endpoint from Lab 1.3, Step 6 (same value as the token endpoint) |
   | Scope | `api://<JOKES-MCP-SERVER-CLIENT-ID>/MCP.Access` |
   | PKCE | **Enabled** |

5. If you need refresh tokens, add `offline_access` to the scope field:

   ```text
   api://<JOKES-MCP-SERVER-CLIENT-ID>/MCP.Access offline_access
   ```

6. Keep PKCE enabled. Select **Save**.
7. The portal generates the **OAuth auth configuration ID**. It looks like `jokes-mcp-auth-123456`, though the real value will differ. Copy it. You need it for the manifest in Lab 1.5.

> **Note:** The auth configuration ID goes in the manifest. The client ID and secret stay in Microsoft's secure token store.

---

## Lab 1.5: Create the Declarative Agent Project With the ATK CLI

This lab uses the Microsoft 365 Agents Toolkit CLI (`atk`) to create a declarative agent, connect the Jokes MCP server, configure OAuth, and preview the agent in Microsoft 365 Copilot. It does not depend on `atk preview --remote`.

### Step 1: Verify the ATK CLI

Open PowerShell or the VS Code terminal and check the version:

```powershell
atk --version
```

Check the available commands:

```powershell
atk --help
```

If you installed the CLI globally, `atk --version` and `atk --help` work too.

### Step 2: Create the project

1. Create a folder for the agent and go into it:

   ```powershell
   mkdir jokes-declarative-agent
   cd jokes-declarative-agent
   ```

2. Create the project with the MCP action template:

   ```powershell
   atk new -c declarative-agent -n jokes-mcp-agent -i false
   ```

   > **Note:** The template is downloaded from a Microsoft service. If the command fails with `TemplateNotFoundError` or a network error, check your network or proxy settings. A blocked template host cannot be fixed by editing files in the project.

### Step 3: Inspect the project

1. List the files, including hidden ones:

   ```powershell
   Get-ChildItem -Force
   ```

2. Open the folder in VS Code:

   ```powershell
   cd jokes-mcp-agent
   code .
   ```

   If `code` is not available, open VS Code and select **File > Open Folder**.

**Expected result:** The project contains the agent instructions, the declarative agent manifest, the plugin or action configuration, the MCP runtime configuration, and the ATK project and environment files. Look for `m365agents.yml` and `m365agents.local.yml`. The toolkit uses both to configure the project.

---

## Lab 1.6: Add the Jokes MCP Server as an Action

### Step 1: Add MCP Server action

Run the following command, replace the `<MCP-SERVER-BASEURL>` with the MCP server URL value.

```powershell
atk add action `
  --api-plugin-type mcp `
  --mcp-da-server-url "<MCP-SERVER-BASEURL>/mcp" `
  --mcp-tools-file-path "./mcp-tools.json" `
  --interactive false
```

**Expected result:** The CLI generates the action configuration from the server URL and the tool definitions. Check the project for new files and for the server URL.

> **Note:** The `atk add action` command also has options for static OAuth (`--mcp-da-auth-type`, `--mcp-da-client-id`, `--mcp-da-client-secret`, `--mcp-da-scopes`). This lab does not use them. The OAuth configuration is connected in Lab 1.7 so that the Teams Developer Portal stays the single source of the OAuth settings.

---

### Step 2: Update the agent instructions to use the MCP server

Adding the action gives the agent access to the tools, but the agent only calls them when its instructions tell it to. Update the instructions so the agent uses `get_random_joke` and `search_jokes` for joke requests.

1. Open the instructions file in your project. It is usually `appPackage/instruction.txt`. Check the file name in your project if it differs.
2. Replace the contents with these instructions:

   ```text
   You are a jokes assistant. Your only job is to share jokes and help users find them.

   When the user asks for a random joke, call the get_random_joke tool and share the joke it returns.

   When the user asks for a joke about a topic, a keyword, or a subject, call the search_jokes tool with the keyword the user gave, and share the matching joke. If the user does not give a keyword, ask for one.

   Share only jokes that a tool returned. Do not make up jokes.

   If a tool returns no jokes, say so, and offer to search for a different keyword.

   If a tool call fails, tell the user that the joke service is not available right now, and suggest they try again later.

   Keep each joke short and clearly formatted, and do not explain the joke unless the user asks.
   ```

3. Save the file.
4. Rebuild the agent so the new instructions are used. Run the preview again in Lab 1.8, Step 4, or run `atk provision --env dev` if you have already provisioned.

**Expected result:** The instructions name both MCP tools and say when to call each one. Lab 1.9 tests this behavior.

---

## Lab 1.7: Configure OAuth Authentication

Now you connect the MCP action to your Entra OAuth registration. You need these values from earlier labs:

| Registration | Purpose | Where it comes from |
|---|---|---|
| **Jokes MCP Server** | Protected MCP resource. Its client ID appears in the scope. | Lab 1.3, Step 1 |
| **Jokes MCP OAuth Client** | OAuth client. Its client ID and secret are used in this lab. | Lab 1.3, Steps 3 and 4 |
| OAuth configuration in Teams Developer Portal | Authentication configuration. Its ID is used in the runtime. | Lab 1.4, Step 7 |

The scope is:

```text
api://<JOKES-MCP-SERVER-CLIENT-ID>/MCP.Access offline_access
```

The MCP server must validate the resulting access token.

### Step 1: Let ATK create the OAuth configuration

1. Open `m365agents.yml` and find the `provision` lifecycle.
2. Add an `oauth/register` step before the app package is finalized. Replace `<TENANT-ID>`, `<JOKES-MCP-SERVER-CLIENT-ID>`, and the `baseUrl` with your values:

   ```yaml
   provision:
     - uses: teamsApp/create
       with:
         name: ${{APP_NAME_SUFFIX}}
       writeToEnvironmentFile:
         teamsAppId: TEAMS_APP_ID

     - uses: oauth/register
       with:
         name: jokes-mcp-oauth
         appId: ${{TEAMS_APP_ID}}
         clientId: ${{JOKES_MCP_CLIENT_ID}}
         clientSecret: ${{JOKES_MCP_CLIENT_SECRET}}
         authorizationUrl: https://login.microsoftonline.com/<TENANT-ID>/oauth2/v2.0/authorize
         tokenUrl: https://login.microsoftonline.com/<TENANT-ID>/oauth2/v2.0/token
         refreshUrl: https://login.microsoftonline.com/<TENANT-ID>/oauth2/v2.0/token
         scope: api://<JOKES-MCP-SERVER-CLIENT-ID>/MCP.Access
         flow: authorizationCode
         identityProvider: Custom
         isPKCEEnabled: true
         tokenExchangeMethodType: PostRequestBody
         baseUrl: https://wjrr4fvv-3000.inc1.devtunnels.ms
       writeToEnvironmentFile:
         configurationId: JOKES_MCP_AUTH_ID
   ```

3. Add the same `oauth/register` step to the `provision` lifecycle in `m365agents.local.yml`. The local preview uses that file.

- `appId` is the **Teams app ID**. It is not the Entra OAuth client ID.
- `baseUrl` is your Dev Tunnel Base URL from Lab 1.1, without `/mcp`. Do not keep the placeholder `https://jokes-mcp.example.com`.
- The `oauth/register` step creates an auth config in the Teams token store. It does not create the Entra app registration. The Entra registrations from Lab 1.3 are still required.
- For MCP, the registration must be configured for **Any Teams app**. Binding it to a specific Teams app can cause MCP calls to fail with 404.

### Step 3: Add the environment variables

1. Open `env/.env.dev` and add:

   ```text
   TEAMS_APP_ID=
   JOKES_MCP_AUTH_ID=
   ```

2. Open `env/.env.dev.user` and add the OAuth client values from Lab 1.3:

   ```text
   JOKES_MCP_CLIENT_ID=<OAUTH-CLIENT-ID>
   JOKES_MCP_CLIENT_SECRET=<OAUTH-CLIENT-SECRET>
   ```

   `JOKES_MCP_CLIENT_ID` is the **Jokes MCP OAuth Client** ID, not the Jokes MCP Server ID.

3. Do not commit the `.user` file. Check that your `.gitignore` excludes it.

### Step 4: Add the runtime reference

In the MCP runtime configuration that the action generated, set the auth block and the server URL. The file name depends on your CLI version. Look for the `RemoteMCPServer` entry from Lab 1.6:

```json
{
  "type": "RemoteMCPServer",
  "auth": {
    "type": "OAuthPluginVault",
    "reference_id": "${{JOKES_MCP_AUTH_ID}}"
  },
  "spec": {
    "url": "https://abc123-3000.euw.devtunnels.ms/mcp"
  }
}
```

Replace the `url` with your MCP URL. The `reference_id` is filled from the environment file during provisioning, so keep the placeholder.

**Expected result:** The manifest references the auth configuration ID that the environment file supplies.

---

## Lab 1.8: Provision and Run the Agent Locally

### Step 1: Sign in to Microsoft 365

In the project root, run:

```powershell
atk auth login m365
```

Follow the prompts. Check the result:

```powershell
atk auth list
```

### Step 2: Provision

Run:

```powershell
atk provision --env dev
```

Then open `env/.env.dev`.

**Expected result:** `JOKES_MCP_AUTH_ID` contains the OAuth auth configuration ID. For Option A, it matches the Lab 1.4 value. For Option B, ATK generated it.

### Step 3: Check the server and tunnel

Before you preview, confirm that these are still running:

- The Jokes MCP server (`npm run start` in `Lab3/joke-mcp`)
- The Dev Tunnel (`devtunnel host <TUNNEL_ID>`)

Open the MCP URL in a browser. You should see the JSON `Method not allowed` error from Lab 1.1.

### Step 4: Preview the agent locally

Open a **second** terminal in the declarative agent project root. This is the folder that contains `m365agents.yml`. Run:

```powershell
atk preview --env dev --m365-host office --browser edge --run-command "echo 'started'"
```

| Option | Meaning |
|---|---|
| `--env local` | Uses the local environment. |
| `--m365-host office` | Opens the agent in the Microsoft 365 app. |
| `--browser edge` | Opens Microsoft Edge. Use `chrome` if you prefer Chrome. |
| `--run-command "echo 'started'"` | Replaces the default start command with a no-op. The MCP server already runs separately, so ATK does not need to start a local service. |

**Expected result:** Edge opens to Microsoft 365 Copilot, and your agent is available in the Copilot app. If you are asked to sign in, sign in with the account you used in Step 1.

> **Note:** This lab does not use `atk preview --remote`. The attached procedure says that command is not supported in this workflow.

---

## Lab 1.9: Test the Agent in Microsoft 365 Copilot

### Step 1: Open the agent

1. In Microsoft 365 Copilot, open the **jokes-agent** agent from the Copilot app list.
2. If Copilot asks for permission to use the connection, select **Allow** or **Connect**, and sign in if prompted.

### Step 2: Send these prompts, one at a time

| # | Prompt | Expected tool | Expected result |
|---|---|---|---|
| 1 | `Get a random joke` | `get_random_joke` | A random joke from the server |
| 2 | `Find a joke about programming` | `search_jokes` with keyword `programming` | A joke that matches the keyword |
| 3 | `Get a chuck norris joke from the Dev category` | `get_random_joke` or `search_jokes` | A Chuck Norris joke, if your server supports that category |

**Expected result:** The agent calls the MCP tools through your Dev Tunnel and returns the jokes.

> **Troubleshooting:** If a prompt returns no tool result, check the tool-call status in the agent response, then check the server and tunnel. If the server returns 401 or 403, check that it validates the Entra token and checks the `MCP.Access` scope.

---

## Lab 1.4: Stop the Tunnel and Clean Up

Do this when you finish testing.

1. In the terminal running `devtunnel host`, press **Ctrl+C**. This stops the tunnel and ends client connections.
2. In the terminal running the server, press **Ctrl+C** to stop `npm run start`.
3. Delete the persistent tunnel so its URL can no longer be used:

   ```powershell
   devtunnel delete <TUNNEL_ID>
   ```

4. Optionally, remove the Jokes MCP Server tool from the Copilot Studio agent if you do not plan to use it again.

---

## Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| `devtunnel` is not recognized | Reopen the terminal after installing, or run `winget install Microsoft.devtunnel` again. |
| `devtunnel user login` fails in the browser | Use `devtunnel user login -d` for a device code. |
| Browser shows a tunnel error or 502 | Confirm that `npm run start` is still running and that the port in `devtunnel port create` matches it. |
| Copilot Studio cannot connect to the server | Confirm the URL ends with `/mcp`. Confirm that `devtunnel host` is still running, since the tunnel closes when you stop it. |
| GitHub Copilot does not list the server's tools | Check the tools icon in Agent mode, and confirm the JokesMCP entry in `settings.json`. |
| Tunnel URL changed after restart | Create a new tunnel or reuse the same tunnel ID with `devtunnel host <TUNNEL_ID>`, then update the URL in Copilot Studio and VS Code. |

---

## Lab Completion Checklist

- [ ] `Lab3/joke-mcp` opened in VS Code, and `package.json` checked for the port
- [ ] `npm install`, `npm run build`, and `npm run start` run successfully
- [ ] Dev Tunnel created, port added, and hosting started
- [ ] MCP URL returns the expected `Method not allowed` JSON error in a browser
- [ ] Server added to VS Code, and a Chuck Norris joke returned by GitHub Copilot
- [ ] Agent created in Copilot Studio with the Microsoft Copilot harness
- [ ] Jokes MCP Server added as a tool and connected
- [ ] Chuck Norris and dad jokes returned in preview mode
- [ ] Tunnel stopped and deleted, and server stopped
