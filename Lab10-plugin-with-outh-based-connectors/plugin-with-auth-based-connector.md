# Lab: Cowork plugin with connectors the uses Oauth authentication

**Time:** About 30 minutes

**Products:** GitHub Copilot, Visual Studio Code, Dev Tunnels

---

## Overview

In this lab you run an MCP server on your own computer, expose it to the internet with a Dev Tunnel, test it in Visual Studio Code with GitHub Copilot, and then add it as a tool to a Copilot Studio agent.

This lab uses the copy of the app in the **`Lab9/jokes-mcp`** folder.

| Stage | What it is | Where it happens |
|---|---|---|
| 1. Local MCP server | Runs on your computer and exposes the jokes tools `get_random_joke` and `search_jokes` | `Lab10/jokes-mcp` |
| 2. HTTPS tunnel | Publishes the local server over HTTPS so Microsoft 365 can reach it | Dev Tunnels |



**Security note:** A Dev Tunnel with anonymous access lets anyone on the internet reach your local server if they can guess the tunnel ID. Keep the tunnel open only while you do this lab, and delete it at the end.

---

## Prerequisites

1. **Visual Studio Code.** Download from `https://code.visualstudio.com/download`.
2. **Node.js v22.** Install it directly or through nvm (`https://github.com/nvm-sh/nvm`, or `https://github.com/coreybutler/nvm-windows` on Windows).
3. **Dev Tunnels CLI (`devtunnel`).** On Windows, run `winget install Microsoft.devtunnel`. Check the install with `devtunnel --version`.
4. **A Microsoft account or Microsoft Entra work account** for `devtunnel user login`.
5. **A Copilot Studio trial or developer account** with access to the Microsoft Copilot harness.
6. **GitHub Copilot** in Visual Studio Code, with a signed-in account that has access.
7. **The `Lab10/jokes-mcp` folder** on your computer.

---

## Lab 1.1: Set Up the MCP Server From `Lab10/jokes-mcp`

### Step 1: Open the server folder

1. Open Visual Studio Code.
2. Select **File > Open Folder** and open the `jokes-mcp` folder inside `Lab10`. For example: `C:\Labs\Lab10\jokes-mcp`.
3. Open the integrated terminal:
   - Windows/Linux: `` Ctrl + ` ``
   - Mac: `` Cmd + ` ``

### Step 2: Check the project before you start

In the Explorer, confirm that these files are in `jokes-mcp`:

- `package.json`, with `build` and `start` scripts
- The server source files that the scripts build and run

Open `package.json` and check the `start` script. Note the port the server listens on. The sample app uses **port 3000**. If your copy uses a different port, use that port in every step below.

> **Note:** This lab uses the `Lab10/jokes-mcp` copy as the MCP server. It fetches Chuck Norris and dad jokes on demand, and it serves an MCP endpoint at `/mcp`.

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
### Step 6: Register the MCP Server and OAuth Client in Microsoft Entra ID

You create two app registrations in Microsoft Entra ID. The first is the protected resource, which is your MCP server. The second is the OAuth client that Copilot uses to get tokens for it.

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

6. In the **Jokes MCP Server** app registration, select **Expose an API**.
7. Select **Add** beside **Application ID URI**.
8. Enter this value and select **Save**:

   ```text
   api://<JOKES-MCP-SERVER-CLIENT-ID>
   ```

9. Select **Add a scope** and enter these values:

   | Field | Value |
   |---|---|
   | Scope name | `MCP.Access` |
   | Who can consent | **Admins and users** |
   | Admin consent display name | `Access Jokes MCP Server` |
   | Admin consent description | `Allow access to the Jokes MCP Server` |
   | State | **Enabled** |

10. Select **Add scope**.

    The full scope is:
    
    ```text
    api://<JOKES-MCP-SERVER-CLIENT-ID>/MCP.Access
    ```

    This is the permission the OAuth client requests. It is not an MCP tool name.

### Step 7: Create the OAuth client app registration

1. Go to **Entra ID > App registrations > New registration**.
2. Enter these values:

   | Field | Value |
   |---|---|
   | Name | `Jokes MCP OAuth Client` |
   | Supported account types | **Accounts in this organizational directory only** (single tenant) |
   | Platform | **Web** |
   | Redirect URI | `https://teams.microsoft.com/api/platform/v1.0/oAuthRedirect` |

   The redirect URI is the Microsoft Teams OAuth callback. It is **not** your MCP server endpoint.

3. On the **Overview** page, copy the **Application (client) ID**. This is `<OAUTH-CLIENT-ID>`.
4. In **Jokes MCP OAuth Client**, select **Certificates & secrets**.
5. Select **New client secret**.
6. Enter the description `Jokes MCP Demo` and choose an expiration.
7. Select **Add**.
8. Copy the secret **Value** now. Store it securely. You cannot view it again after you leave this page.

   This is `<OAUTH-CLIENT-SECRET>`.

9. In **Jokes MCP OAuth Client**, select **API permissions**.
10. Select **Add a permission**.
11. Select **My APIs**, then **Jokes MCP Server**.
12. Select **Delegated permissions**, then **MCP.Access**.
13. Select **Add permissions**.
14. If your tenant requires administrator consent, grant consent before you continue.

**Expected result:** You now have two Entra registrations:

| Registration | Role |
|---|---|
| **Jokes MCP Server** | Resource application. Owns the API scope and represents the protected MCP server. |
| **Jokes MCP OAuth Client** | OAuth client application. Has the client ID, client secret, redirect URI, and the delegated `MCP.Access` permission. |

### Step 8: Find the tenant-specific endpoints

1. In **Jokes MCP OAuth Client**, select **Endpoints**.
2. Copy these values. Replace `<TENANT-ID>` with your directory (tenant) ID if the page shows a placeholder:

   | Endpoint | Value |
   |---|---|
   | Authorization | `https://login.microsoftonline.com/<TENANT-ID>/oauth2/v2.0/authorize` |
   | Token | `https://login.microsoftonline.com/<TENANT-ID>/oauth2/v2.0/token` |
   | Refresh | `https://login.microsoftonline.com/<TENANT-ID>/oauth2/v2.0/token` |

---

### Step 9: Register the OAuth Configuration in the Teams Developer Portal

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
7. The portal generates the **OAuth auth configuration ID**. It looks like `Yjc4ZjU2MDgtN2M0OC00ZWJmLTgwY2QtMGQzYjlkNzQ2M2M0IyM3YWE4NTgxYXXXXXXXXXXXXXXXXX`, though the real value will differ. Copy it. 

> **Note:** The auth configuration ID goes in the manifest. The client ID and secret stay in Microsoft's secure token store.

---
### Step 10: Create a custom plugin using `wiqd` CLI

1. Install wiqd

    Windows (PowerShell):
    
    ```powershell
    iex "& { $(irm 'https://aka.ms/wiqd/install.ps1') }"
    ```
    
    macOS or Linux:
    
    ```bash
    curl -fsSL https://aka.ms/wiqd/install.sh | bash
    ```

2. Sign in to Microsoft 365

    Provisioning and sharing touch your Microsoft 365 tenant, so sign in first:
    
    ```bash
    wiqd auth login --interactive
    ```

3. Verify the environment

    ```bash
    wiqd doctor
    ```

4. Scaffold the project

    ```bash
    wiqd plugin create --name jokes-plugin
    cd jokes-plugin
    ```

5. Add skill and connectorcapabilities to plugin project

    ```bash
    wiqd plugin add skill --name "Triage Issues"
    ```

    This scaffolds `appPackage/skills/triage-issues/SKILL.md` and registers the skill in the manifest. Open the file and write the skill's instructions. Each skill should describe one clear task, when to use it, and the steps to follow.

6. Add Remote MCP connector by using the MCP Server URL generated in step 4. Update the `<OAUTH-REFERENCE-ID>` with the configuration id copied from step 9.

    ```bash
    wiqd plugin add connector --name "Joke MCP Tools" `
      --description "Generate jokes using the MCP Server" `
      --url <MCP-SERVER-URL> `
      --auth-type oauth `
      --auth-reference-id "<OAUTH-REFERENCE-ID>" `
    ```
7. Update the plugin's short name, long name, descriptions, developer details in the `appPackage/manifest.json` file.
8. Validate the plugin offline

    ```bash
    wiqd plugin validate --env dev
    ```

    Fix any errors before moving on. This check does not contact the service.

9. To use the plugin in your M365 Copilot cowork, you can either run the `wiqd plugin provision` command or `wiqd plugin package` command. `wiqd plugin provision` provisions your standalone plugin into a Microsoft 365 environment so that you can install and test it in Copilot Cowork. `wiqd plugin package` command creates a `zip` file that you can manually upload to the copilot cowork account. 

    Provision the plugin to M365 environment

    ```bash
    wiqd plugin provision --env dev
    ```

    OR Package the plugin to the `zip` format and manually upload it. 

    ```bash
    wiqd plugin package --env dev
    ```

    This builds the deployable `.zip` file.
