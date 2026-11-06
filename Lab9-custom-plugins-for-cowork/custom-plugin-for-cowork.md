# Lab: Create custom plugin for Copilot Cowork

**Time:** About 30 minutes

**Products:** GitHub Copilot, Visual Studio Code, Dev Tunnels

---

## Overview

In this lab you run an MCP server on your own computer, expose it to the internet with a Dev Tunnel, test it in Visual Studio Code with GitHub Copilot, and then add it as a tool to a Copilot Studio agent.

This lab uses the copy of the app in the **`Lab9/jokes-mcp`** folder.

| Stage | What it is | Where it happens |
|---|---|---|
| 1. Local MCP server | Runs on your computer and exposes the jokes tools `get_random_joke` and `search_jokes` | `Lab9/jokes-mcp` |
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
7. **The `Lab9/jokes-mcp` folder** on your computer.

---

## Lab 1.1: Set Up the MCP Server From `Lab3/jokes-mcp`

### Step 1: Open the server folder

1. Open Visual Studio Code.
2. Select **File > Open Folder** and open the `jokes-mcp` folder inside `Lab9`. For example: `C:\Labs\Lab9\jokes-mcp`.
3. Open the integrated terminal:
   - Windows/Linux: `` Ctrl + ` ``
   - Mac: `` Cmd + ` ``

### Step 2: Check the project before you start

In the Explorer, confirm that these files are in `jokes-mcp`:

- `package.json`, with `build` and `start` scripts
- The server source files that the scripts build and run

Open `package.json` and check the `start` script. Note the port the server listens on. The sample app uses **port 3000**. If your copy uses a different port, use that port in every step below.

> **Note:** This lab uses the `Lab9/jokes-mcp` copy as the MCP server. It fetches Chuck Norris and dad jokes on demand, and it serves an MCP endpoint at `/mcp`.

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

### Step 6: Create a custom plugin using `wiqd` CLI

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

6. Add Remote MCP connector by using the MCP Server URL generated in step 4.

    ```bash
    wiqd plugin add connector --name "Joke MCP Tools" `
      --description "Generate jokes using the MCP Server" `
      --url <MCP-SERVER-URL>
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
