# Create, Run, and Test a Declarative Agent with the ATK CLI

**Project name:** `simpledeclagent`

**Capability:** `declarative-agent`

**Language:** JavaScript (the declarative agent has no code; the language setting only affects the generated tooling)

**CLI reference:** [Introduction to Microsoft 365 Agents Toolkit CLI](https://learn.microsoft.com/en-us/microsoftteams/platform/toolkit/microsoft-365-agents-toolkit-cli#atk-new)

---

## Summary of this run

| Step | Command | Status in this session |
|---|---|---|
| 1. Install the ATK CLI | `npm install -g @microsoft/m365agentstoolkit-cli` | Done (version 1.1.18) |
| 2. Create the project | `atk new -c declarative-agent -n simpledeclagent -l javascript -f . -i false` | **Blocked.** The template download was refused by the sandbox egress policy (HTTP 403 on the Teams template host). The project was built from the copy of the same template that ships inside the CLI package. |
| 3. Review the project | Inspect files | Done |
| 4. Validate the manifests | `atk validate -m validation-rules` | Passed |
| 5. Validate the test cases | `atk validate -m test-cases` | Passed |
| 6. Build the app package | `atk package --env local` | Passed (`appPackage.local.zip`) |
| 7. Run locally in Microsoft 365 Copilot | `atk preview --env local` | **Needs your sign-in.** Not run here. See Part 7. |
| 8. Test the agent | Send prompts in Copilot | **Needs your sign-in.** Test cases are listed in Part 8. |

---

## Prerequisites

- **Node.js 22** (the template's README asks for version 22; the CLI itself needs npm)
- **npm**, latest version
- A **Microsoft 365 account for development** (work or school account)
- A **Microsoft 365 Copilot license** on that account
- An **Azure account** (only if you provision Azure resources)
- **Visual Studio Code** (optional, for editing and the debug launch configurations)

---

## Part 1: Install the ATK CLI

```bash
npm install -g @microsoft/m365agentstoolkit-cli
atk -v
atk -h
```

**Expected result:** `atk -v` prints the CLI version, and `atk -h` lists the commands.

**Check prerequisites (optional):**

```bash
atk doctor
```

---

## Part 2: Create the declarative agent project

### 2.1 Find the capability ID

```bash
atk list templates
```

The list includes `declarative-agent`, `declarative-agent-action`, and others. This project uses `declarative-agent`.

### 2.2 Create the project

```bash
atk new -c declarative-agent -n simpledeclagent -f . -i false
```

| Option | Meaning |
|---|---|
| `-c` / `--capability` | The app feature. `declarative-agent` creates a plain agent with instructions. |
| `-n` / `--app-name` | The project name, and the base name of the agent. |
| `-l` / `--programming-language` | `javascript`, `typescript`, or `csharp`. Default is `javascript`. |
| `-f` / `--folder` | Parent folder for the project. Default is `./`. |
| `-i false` | Run without prompts. |

**Expected result:** A new `simpledeclagent` folder appears.
---

## Part 3: Review the project structure

```text
simpledeclagent/
├── .vscode/                    VS Code launch and task files
├── appPackage/
│   ├── color.png               App icon (color)
│   ├── outline.png             App icon (outline)
│   ├── declarativeAgent.json   Agent definition
│   ├── instruction.txt         Agent instructions
│   └── manifest.json           Teams app manifest
├── env/
│   ├── .env.dev                Settings for the dev environment
│   └── .env.local              Settings for the local environment
├── evals/
│   └── prompts.json            Sample evaluation prompts
├── .gitignore
├── m365agents.yml              Main project file (provision, deploy, publish stages)
├── m365agents.local.yml        Local-environment project file
└── README.md
```

### 3.1 Key file: `appPackage/instruction.txt`

```text
You are a declarative agent created with Microsoft 365 Agents Toolkit. You should start every response and answer to the user with "Thanks for using Microsoft 365 Agents Toolkit to create your declarative agent!\n\n" and then answer the questions and help the user.
```

This text is the agent's behavior. Edit it to change how the agent responds.

### 3.2 Key file: `appPackage/declarativeAgent.json`

```json
{
    "$schema": "https://developer.microsoft.com/json-schemas/copilot/declarative-agent/v1.8/schema.json",
    "version": "v1.8",
    "name": "simpledeclagent${{APP_NAME_SUFFIX}}",
    "description": "Declarative agent created with Microsoft 365 Agents Toolkit",
    "instructions": "$[file('instruction.txt')]"
}
```

The `instructions` value loads `instruction.txt`. The `${{APP_NAME_SUFFIX}}` placeholder is filled in from the environment file (`local` or `dev`).

### 3.3 Key file: `appPackage/manifest.json` (excerpt)

```json
"manifestVersion": "1.30",
"id": "${{TEAMS_APP_ID}}",
"name": {
    "short": "simpledeclagent${{APP_NAME_SUFFIX}}",
    "full": "Full name for simpledeclagent"
},
"copilotAgents": {
    "declarativeAgents": [
        { "id": "declarativeAgent", "file": "declarativeAgent.json" }
    ]
}
```

The `copilotAgents` section links the manifest to `declarativeAgent.json`.

**Optional edit before testing:** Change `"full"` in `manifest.json`, and change the description text in `declarativeAgent.json`. Re-run Parts 4 to 6 after any edit.

---

## Part 4: Validate the project

Run these from inside the project folder, or add `--folder <path>`.

```bash
cd simpledeclagent
atk validate -m validation-rules --env local -i false
atk validate -m test-cases --env local -i false
```

**Results in this session:**

- `validation-rules`: **All passed.** The manifest and declarative agent files match the schemas.
- `test-cases`: **All passed.**

---

## Part 5: Build the app package

```bash
atk package --env local -i false
```

**Expected result:** `appPackage/build/appPackage.local.zip` is created.

**Result in this session:** The package built successfully. It contains:

| File | Purpose |
|---|---|
| `manifest.json` | Resolved app manifest |
| `declarativeAgent.json` | Resolved agent definition |
| `color.png`, `outline.png` | App icons |

The resolved `declarativeAgent.local.json` shows the name as `simpledeclagentlocal`, which confirms the `local` environment values were applied.

---

## Part 6: Sign in

Preview and provision both need a signed-in Microsoft 365 account.

```bash
atk auth login m365
```

Follow the prompts to sign in with your development account. Check the result:

```bash
atk auth list
```

**Note:** This session could not sign in. `atk auth list` reported no connected accounts.

---

## Part 7: Create app in Teams Developer Portal for App ID

- Login to the Teams Developer Portal using [https://dev.teams.microsoft.com/](https://dev.teams.microsoft.com/)
- Click on the  `Create new App` tile/buttom in the hoem page or select `Apps` from the navigation panel and click `New App`.
- Create a new app by providing the new app name.
- Got to the `Dashboard` of the app and Copy the App ID provided
- Open the `env/.env.local` file in the declarative agent project in VS Code
- Update the `TEAMS_APP_ID` environment variable with the copied value.
- Save the file. 

## Part 8: Run the agent locally

Start a local preview in Microsoft 365 Copilot:

```bash
atk preview --env local --m365-host office --browser edge
```

| Option | Meaning |
|---|---|
| `--m365-host` / `-m` | `teams`, `outlook`, or `office`. Use `office` to open the Microsoft 365 app. |
| `--env` | Environment name. Default is `local`. |
| `--browser` / `-b` | `chrome`, `edge`, or `default`. |
| `--open-only` / `-o` | Opens the web client without starting a local service. The declarative agent has no local service, so this option is not required. |

**Expected result:** A browser opens in Microsoft 365, and the agent appears in the Copilot app list.

**Alternative, for a remote preview:**

```bash
atk provision --env dev -i false
atk preview --env dev --m365-host office --browser edge
```

`atk provision` registers the app in your tenant. Use it if local preview does not show the agent.

**Result in this session:** Not run. Preview needs a signed-in account and a browser session, which this sandbox does not have.

---

## Part 8: Test the agent

### 8.1 Manual tests

Open the agent in Microsoft 365 Copilot and send these prompts. Check each reply against the expected result.

| # | Prompt | Expected result | Result |
|---|---|---|---|
| 1 | `Hi` | Reply starts with `Thanks for using Microsoft 365 Agents Toolkit to create your declarative agent!` | Not run |
| 2 | `What can you help me with?` | Same opening line, then an answer about the agent's purpose | Not run |
| 3 | `Summarize what a declarative agent is in two sentences.` | Same opening line, then a two-sentence summary | Not run |

### 8.2 Evaluation test

The template ships `evals/prompts.json` with one case: the prompt `Hi`, which must contain the greeting (case-insensitive). To run evaluations, install the evaluation CLI and provision the project first:

```bash
npm install -g @microsoft/m365-copilot-eval
atk provision --env dev -i false
runevals --env dev
```

The evaluation CLI needs Azure OpenAI values in `env/.env.dev`:

```text
AZURE_AI_OPENAI_ENDPOINT=
AZURE_AI_API_KEY=
AZURE_AI_API_VERSION=
AZURE_AI_MODEL_NAME=
```

**Note:** The evaluation service requires tenant-level admin consent. The template README gives the details.

**Result in this session:** Not run.

---

## Part 9: Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| `TemplateNotFoundError` on `atk new` | The template host is blocked or unreachable. Check your network or proxy. |
| `atk auth list` shows no accounts | Run `atk auth login m365` and sign in. |
| Agent does not appear in Copilot | Confirm your account has a Microsoft 365 Copilot license. Then run `atk provision --env dev`. |
| Agent ignores the greeting | Check that `instruction.txt` is saved and that you re-ran `atk package` and `atk preview` after editing it. |
| Validation fails after an edit | Check the JSON syntax of `manifest.json` and `declarativeAgent.json`. |

---

## Part 10: Clean up

To remove the app registration from your tenant:

```bash
cd ..
atk uninstall -i false --mode env --env dev --folder ./simpledeclagent --options 'm365-app,app-registration,bot-framework-registration'
```

To remove the local build output only, delete `appPackage/build`.

---

## Results checklist

- [x] ATK CLI installed (1.1.18)
- [ ] Project created with `atk new` (blocked here; built from the CLI's bundled copy of the template)
- [x] Project structure reviewed
- [x] `atk validate -m validation-rules` passed
- [x] `atk validate -m test-cases` passed
- [x] `atk package --env local` built `appPackage.local.zip`
- [ ] Signed in with `atk auth login m365`
- [ ] Agent previewed in Microsoft 365 Copilot
- [ ] Manual prompts tested (Part 8.1)
- [ ] Evaluation run (Part 8.2)
