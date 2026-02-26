---
name: metabase-full-app-to-modular-upgrade
description: Migrates a project from Metabase Full App / Interactive (iframe-based) embedding to Modular (web-component-based) embedding. Use when the user wants to replace Metabase iframes with Modular Embedding web components.
model: opus
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, WebFetch, Task, TaskCreate, TaskUpdate, TaskList, TaskGet, AskUserQuestion
---

## Non-negotiable execution contract (anti-skip)

You MUST follow the workflow steps in order and MUST NOT skip any step.
You MUST create a checklist first, then execute each step, and explicitly mark it done with evidence.
You MUST NOT cut corners or skip steps. Always re-evaluate the proper order of your steps.
If you cannot complete a step due to missing info or tool failure, you must:

1. record the step as ❌ blocked,
2. explain exactly what is missing / what failed,
3. stop (do not proceed to later steps).

### Required output structure

Your response MUST contain these sections in this exact order:

1. **Migration Plan Checklist** (Step 0)
2. **Step 1 Results: Project Scan**
3. **Step 2 Results: iframe Analysis & Web Component Mapping**
4. **Step 3: Migration Plan**
5. **Step 4: Applied Code Changes**
6. **Step 5: Validation**
7. **Step 6: Final Summary**

Each step section MUST end with a status line:

- `Status: ✅ complete` or `Status: ❌ blocked`

### Step gating rules (hard)

- You MUST NOT start Step 2 until Step 1 is ✅ complete (Step 2 depends on Step 1's inventory).
- You MUST NOT start Step 3 until Step 2 is ✅ complete.
- You MUST NOT start Step 4 until Step 3 is ✅ complete.
- You MUST NOT start Step 5 until Step 4 is ✅ complete.
- You MUST NOT output Step 6 until Step 5 is ✅ complete (or explicitly report ❌ blocked).

### Evidence requirements (hard)

- Step 1 evidence: list every file path containing Metabase iframes or SSO/JWT code. State the backend language/framework, template engine, layout/head file path, and every Metabase-related environment variable or constant.
- Step 2 evidence: for each iframe, show: file path, full iframe HTML or code generating it, the Metabase URL pattern, embedded content type (dashboard/question/collection/home), all URL parameters, and the exact replacement web component HTML with all attributes.
- Step 3 evidence: a file-by-file change plan listing old code → new code for every modification.
- Step 4 evidence: show the exact diffs applied via Edit tool (or file edits described precisely).
- Step 5 evidence: list every check performed and its pass/fail result. Show Grep output proving embed.js appears exactly once and `window.metabaseConfig` is set exactly once.

## Architectural conformance (hard)

All changes MUST follow the existing app's architecture, patterns, and conventions. Specifically:

- If the app uses a template engine (EJS, Handlebars, Pug, etc.) for rendering pages, new or modified pages MUST also use that template engine — do NOT switch to inline `res.send()` HTML strings (or vice versa).
- If the app uses a layout/partial system (e.g., `head.ejs` + `foot.ejs`), new pages MUST use the same includes — do NOT create standalone HTML pages that bypass the layout.
- Match the existing code style: variable naming conventions (`const` vs `var`, camelCase vs snake_case), indentation, quote style, semicolon usage, etc.
- If the app passes data to templates via `res.render("view", { data })`, continue using that pattern — do NOT embed server-side variables directly into inline HTML strings.
- If the app has middleware for shared template variables (`res.locals`), prefer adding new shared variables there rather than duplicating them across route handlers.
- Preserve the existing route structure and naming conventions.

## Important performance notes

- Maximize parallelism within each step. Use parallel Grep/Glob/Read calls in single messages wherever possible.
- Do NOT use sub-agents for project scanning — results MUST remain in the main context for cross-referencing.
- Do NOT parse repo branches, commits, PRs, or issues.

## Scope

This skill converts Full App / Interactive Embedding (iframe-based) to Modular Embedding (web-component-based via `embed.js`).

**The consumer's app may be written in ANY backend language** (Node.js, Python, Ruby, PHP, Java, Go, .NET, etc.) with ANY template engine. All instructions MUST be language-agnostic unless a specific language is detected in Step 1.

### What this skill handles

- Replacing `<iframe>` elements pointing to Metabase with appropriate web components
- Adding the `embed.js` script tag (EXACTLY ONCE at app layout level)
- Adding `window.metabaseConfig` setup code (EXACTLY ONCE at app layout level)
- Modifying SSO/JWT endpoints to support modular embedding's JSON response format
- Mapping iframe URL customization parameters to theme config and component attributes

## AskUserQuestion triggers (hard — you MUST ask before proceeding)

You MUST use AskUserQuestion and halt until answered if:

- The Metabase instance URL cannot be determined from project code or environment variables
- An iframe URL pattern does not match any known content type (dashboard, question, collection, home)
- No SSO/JWT endpoint can be identified in the project
- No layout/head file can be identified (unclear where to inject embed.js)
- Multiple layout files exist and it is unclear which one(s) to use
- The backend language cannot be determined
- The Metabase instance version cannot be determined from the project code

## Pre-workflow

### Migration Plan Checklist (required before any other work)

Create a TODO list with these items:

- [ ] Step 1: Scan project (backend, templates, iframes, SSO, config)
- [ ] Step 2: Analyze iframes and map to web components
- [ ] Step 3: Plan all migration changes
- [ ] Step 4: Apply code changes
- [ ] Step 5: Validate changes
- [ ] Step 6: Final summary

---

## Workflow

### Step 1: Scan the project (NO sub-agent)

Perform ALL of the following scans. Use parallel tool calls within a single message wherever there are no dependencies.

#### 1a: Identify backend language and framework

- Check for `package.json`, `requirements.txt`, `Pipfile`, `pyproject.toml`, `Gemfile`, `pom.xml`, `build.gradle`, `go.mod`, `composer.json`, `*.csproj`, or equivalent.
- Identify the template engine: EJS, Handlebars, Pug, Jinja2, Django templates, ERB, Blade, Thymeleaf, JSX/TSX, Vue SFC, Svelte, plain HTML, or inline HTML strings in server code.
- Record the language and framework.

#### 1b: Find ALL Metabase iframes

Use Grep to search for ALL of these patterns (in parallel):

- `<iframe` in all template/HTML/JSX/view files
- `iframe` in all server-side code files (JS/TS/Python/Ruby/Go/Java/PHP) — catches iframes built via string concatenation or template literals
- `auth/sso` adjacent to `iframe` or `src` attributes

For EACH file with a match, Read the ENTIRE file.

#### 1c: Find SSO/JWT authentication code

Use Grep to search for ALL of these patterns (in parallel):

- `/auth/sso`
- `/sso/metabase` or similar SSO route patterns
- `jwt.sign` or `jwt.encode` or `JWT` or `jsonwebtoken` or `PyJWT` or `jose`
- `JWT_SHARED_SECRET` or `METABASE_JWT_SHARED_SECRET`
- `return_to` (Metabase SSO redirect parameter)
- `redirect` near `auth/sso` (catches the SSO redirect logic)

For EACH matching file, Read the ENTIRE file.

#### 1d: Find the layout/head file(s)

This is CRITICAL — `embed.js` and `window.metabaseConfig` MUST be injected into the correct layout file exactly once.

Search for:

- `<head>` or `<!DOCTYPE` or `<html` in template/view files
- Layout/wrapper patterns: `include('head')`, `<%- include`, `{% extends`, `{% block`, `layout`, `base.html`, `_layout`, `application.html`, `master.blade.php`, `app.html`
- If the app builds HTML via inline strings in server code (e.g., `res.send(...)` in Express), identify the response(s) that generate the full HTML page

Determine the SINGLE file (or common code path) where the HTML `<head>` section is defined. This is where embed.js will go.

If templates use a partial/include system, identify the head partial (e.g., `head.ejs`, `_head.html.erb`, `head.blade.php`).

If no template engine is used and HTML is assembled via string concatenation in server code, identify the code location where the `<head>` content is generated.

#### 1e: Find Metabase configuration

Use Grep to search for:

- `METABASE_SITE_URL` or `METABASE_URL` or `METABASE_INSTANCE_URL` or `MB_SITE_URL`
- `METABASE_DASHBOARD_PATH` or similar dashboard path variables
- `METABASE_JWT_SHARED_SECRET`
- Any other `METABASE_` prefixed variables
- The config mechanism: `process.env`, `os.environ`, `ENV[]`, `getenv()`, `System.getenv()`, etc.

Record every Metabase-related variable name and where it is read.

#### Output: Structured Project Inventory

Compile all findings into:

```
Backend: {language}, {framework}, {template engine}
Metabase config:
  - Site URL variable: {name} (read at {file}:{line})
  - Dashboard path variable: {name} (read at {file}:{line})
  - JWT secret variable: {name} (read at {file}:{line})
  - Other variables: ...
Layout/head file: {path}:{line range} (or "inline HTML in {file}:{line range}")
Iframes found: {count}
  - {file}:{line} — {brief description}
  - ...
SSO endpoint: {file}:{line} — {route} ({method})
```

---

### Step 2: Analyze iframes and map to web components (ONLY after Step 1 ✅)

For EACH iframe found in Step 1:

#### 2a: Parse the iframe URL

Extract from the iframe `src` attribute (which may be a template expression, variable, or literal):

- **Metabase base URL**: may come from env var, constant, or be hardcoded
- **Content path**: the path after the base URL, e.g., `/dashboard/1`, `/question/entity/abc123`, `/collection/5`
- **Content type**: `dashboard`, `question`, `collection`, or `home` (if path is `/`)
- **Entity ID or numeric ID**: the identifier in the path
- **URL hash/query parameters** used for UI customization (e.g., `#logo=false&top_nav=false`)
- **SSO wrapping**: whether the iframe goes through an SSO endpoint first (e.g., `/sso/metabase?return_to=...`)

#### 2b: Map content type to web component

| Full App iframe path pattern | Modular Web Component | Required Attribute |
|---|---|---|
| `/dashboard/{id}` or `/dashboard/entity/{eid}` | `<metabase-dashboard>` | `dashboard-id="{id or eid}"` |
| `/question/{id}` or `/question/entity/{eid}` | `<metabase-question>` | `question-id="{id or eid}"` |
| `/collection/{id}` or `/collection/entity/{eid}` | `<metabase-browser>` | `initial-collection="{id or eid}"` |
| `/` (Metabase home / root) | `<metabase-browser>` | `initial-collection="root"` |

If the iframe path is built dynamically from a variable, the web component attribute MUST use the same variable/expression.

If an iframe path does not match any known pattern → AskUserQuestion.

#### 2c: Map URL customization parameters

**Parameters to DROP** (not applicable — modular web components do not include Metabase application chrome):

| Full App Parameter | Why it is dropped |
|---|---|
| `top_nav` | Web components have no Metabase top navigation bar |
| `side_nav` | Web components have no Metabase sidebar |
| `logo` | Web components have no Metabase logo |
| `search` | Web components have no Metabase search bar |
| `new_button` | No `+ New` button (use `with-new-question` / `with-new-dashboard` on `<metabase-browser>` if applicable) |
| `breadcrumbs` | Web components have no Metabase breadcrumbs |

**Parameters that map to web component ATTRIBUTES:**

| Full App Parameter | Modular Equivalent |
|---|---|
| `header=false` | `with-title="false"` on the component |
| `action_buttons=false` | `drills="false"` on the component |

**Parameters requiring manual Metabase admin configuration (note for user):**

| Full App Parameter | Manual Step |
|---|---|
| `locale={code}` | Configure locale in Metabase admin settings |

#### 2d: Output Migration Mapping Table

For each iframe, output:

```
iframe #{n}: {file}:{line}
  Old: {full iframe HTML or code}
  Content type: {dashboard|question|collection|home}
  ID: {static value or variable expression}
  Dropped params: {list}
  Mapped attributes: {list}
  New: {exact replacement web component HTML}
```

---

### Step 3: Plan migration changes (ONLY after Step 2 ✅)

Create a COMPLETE file-by-file change plan covering ALL areas below. Every change MUST be specified with the target file, the old code, and the new code.

#### 3a: embed.js script injection — EXACTLY ONCE per app

- **Target**: the layout/head file identified in Step 1d
- **Location**: inside `<head>` (or as close as possible to other `<script>` tags)
- **Code to add**:
  ```html
  <script defer src="{METABASE_SITE_URL}/app/embed.js"></script>
  ```
- The `{METABASE_SITE_URL}` MUST be rendered dynamically using the same mechanism the project already uses for server-side values in templates.
  - EJS: `<%= metabaseSiteUrl %>`
  - Handlebars: `{{ metabaseSiteUrl }}`
  - Jinja2: `{{ metabase_site_url }}`
  - ERB: `<%= @metabase_site_url %>`
  - Inline string: template literal or concatenation using the existing variable
  - etc.
- If the Metabase URL variable is only available in specific routes (not globally), plan how to pass it to the layout. Options:
  - Add it to `res.locals` / template context globally (e.g., via middleware)
  - Or pass it to every `render()` call that uses the layout
- **CRITICAL**: Verify this will appear EXACTLY ONCE in the rendered HTML regardless of which page the user visits. If templates include the head partial multiple times or on different pages, ensure the script appears only once.

#### 3b: metabaseConfig — EXACTLY ONCE per app

Modular embedding reads its configuration from `window.metabaseConfig`. There is no `defineMetabaseConfig()` function — you must assign the config object directly.

- **Target**: same layout/head file as 3a
- **Location**: BEFORE the embed.js script tag (must be set before embed.js loads)
- **Code to add** (minimum required config):
  ```html
  <script>
    window.metabaseConfig = {
      instanceUrl: "{METABASE_SITE_URL}",
      jwtProviderUri: "{SSO_ENDPOINT_URL}",
    };
  </script>
  ```
- The `instanceUrl` MUST be rendered dynamically using the same mechanism as the embed.js src.
- **`jwtProviderUri`** (Metabase v59+): MUST be a **full absolute URL** including protocol and host (e.g., `http://localhost:9090/sso/metabase`). Relative paths like `/sso/metabase` will NOT work — embed.js requires the complete URL to make cross-origin requests. The URL MUST be rendered dynamically using the app's origin (protocol + host). To achieve this:
  - Pass the app's origin as a template variable (e.g., via middleware: `res.locals.appUrl = \`${req.protocol}://${req.get("host")}\``)
  - Then render: `jwtProviderUri: "{APP_URL}/sso/metabase"` using the template engine's expression syntax
  - This ensures the URL is correct regardless of the deployment environment (localhost, staging, production)
  This tells embed.js where to fetch JWT tokens for authentication. On Metabase v59 and above, setting `jwtProviderUri` in the client-side config is the preferred approach — it allows embed.js to handle authentication automatically without requiring the JWT Identity Provider URI to be configured in Metabase admin settings. For Metabase versions below v59, this property is not supported and the JWT Identity Provider URI must be configured in admin settings instead (see Step 3g).
- **CRITICAL**: `window.metabaseConfig` MUST be set EXACTLY ONCE. It must NOT appear inside any per-iframe replacement code.

#### 3c: SSO endpoint modification

The existing SSO endpoint currently REDIRECTS the browser to Metabase's `/auth/sso?jwt={token}&return_to={path}`.

For modular embedding, the embed.js SDK sends requests to the JWT Identity Provider URI with the query parameter `response=json`. The endpoint MUST detect this and return JSON instead of redirecting.

**The endpoint MUST support BOTH behaviors** to allow gradual migration and because Metabase itself may call the endpoint in redirect mode.

Refer to the Metabase authentication documentation for the expected endpoint behavior: https://www.metabase.com/docs/latest/embedding/authentication

**CRITICAL constraints:**
- Do NOT modify the JWT signing logic — only change how the response is delivered
- Do NOT remove the existing redirect behavior — add the JSON path alongside it
- The JSON check MUST come BEFORE the existing redirect logic
- The JSON response body MUST be exactly `{ "jwt": "<token>" }` — no other fields

#### 3d: iframe replacement plan

For EACH iframe from Step 2d's Migration Mapping Table:

- Specify: file path, exact old code to replace, exact new code
- The new web component MUST preserve any dynamic ID expressions from the original iframe URL
- If the iframe had explicit `width`/`height` attributes, wrap the web component in a `<div>` with equivalent CSS dimensions (web components expand to fill their container)
- If the iframe was inside a container element with styles, keep that container
- Remove any server-side SSO URL construction that was used ONLY for the iframe src (e.g., building `/sso/metabase?return_to=...`). But do NOT remove the SSO endpoint itself — it is still needed.
- If the iframe src was built via a server-side route handler that sends inline HTML (e.g., Express `res.send('<iframe ...')`), replace the iframe HTML within that handler's response string

#### 3e: Dead code removal

After replacing iframes, identify and remove:

- Variables that built the iframe `src` URL (e.g., `iframeUrl`, `mbUrl`) IF they are no longer used anywhere
- URL parameter/modifier strings that were appended to iframe URLs (e.g., `mods = "logo=false"`)
- Helper functions that constructed Metabase iframe URLs IF they are no longer called
- Do NOT remove: the SSO endpoint, JWT signing function, environment variable reads, or any code that is used by other parts of the application

#### 3g: Metabase admin configuration notes (manual steps for the user)

List these as part of the plan — they will be included in the final summary:

1. **Enable modular embedding**: Admin > Embedding > toggle "Enable modular embedding"
2. **Configure CORS origins**: Admin > Embedding > Modular embedding > add the host app's domain (e.g., `http://localhost:9090`)
3. **Configure JWT Identity Provider URI** (required for Metabase < v59; optional on v59+ if `jwtProviderUri` is set in `window.metabaseConfig`): Admin > Authentication > JWT > set to the full URL of the SSO endpoint (e.g., `http://localhost:9090/sso/metabase`)
4. **JWT shared secret**: No change needed — reuse the existing shared secret from Full App embedding setup

---

### Step 4: Apply code changes (ONLY after Step 3 ✅)

Apply ALL changes from Step 3 in this EXACT order:

1. **First**: Modify the SSO endpoint to add JSON response support (Step 3c)
   - This is backend-only and does not break existing functionality
2. **Second**: Add `window.metabaseConfig` assignment and embed.js script tag to the layout/head file (Step 3b + 3a, config BEFORE embed.js)
3. **Third**: Replace each iframe with its web component (Step 3d), one file at a time
4. **Fourth**: Remove dead code (Step 3e)

**IMPORTANT constraints:**

- Use the Edit tool with precise `old_string` / `new_string` for every change
- Do NOT delete or modify files unrelated to the migration
- Do NOT change environment variable names — preserve existing configuration
- Do NOT add new package dependencies (no `npm install`, `pip install`, etc.) — modular embedding requires ONLY the embed.js script served by the Metabase instance
- Preserve ALL existing CSS classes, IDs, and styles on container elements around iframes
- If a file requires multiple edits, apply them in order from TOP to BOTTOM of the file to avoid offset issues

---

### Step 5: Validate changes (ONLY after Step 4 ✅)

Perform ALL of these checks. Each check MUST have an explicit pass/fail result.

#### 5a: No remaining Metabase iframes

Use Grep to search for `<iframe` and `iframe` across ALL project files (excluding `node_modules`, `.git`, lockfiles).
Verify that NO iframes pointing to Metabase URLs remain.
Non-Metabase iframes (if any) should be untouched.

**Pass criteria**: zero Metabase-related iframes found.

#### 5b: embed.js appears exactly once

Use Grep to search for `embed.js` across ALL project files (excluding `node_modules`, `.git`).
**Pass criteria**: exactly ONE occurrence in the layout/head file.

#### 5c: window.metabaseConfig is set exactly once

Use Grep to search for `window.metabaseConfig` across ALL project files (excluding `node_modules`, `.git`).
**Pass criteria**: exactly ONE occurrence (the assignment in the layout/head file).

#### 5d: SSO endpoint supports JSON response

Read the SSO endpoint file. Verify it contains:
- A check for `response` query parameter equaling `"json"`
- A JSON response returning `{ jwt: token }`
- The original redirect logic still present

**Pass criteria**: all three elements present.

#### 5e: Web components have required attributes

For each web component added in Step 4, verify it has the correct required attribute:
- `<metabase-dashboard>` MUST have `dashboard-id`
- `<metabase-question>` MUST have `question-id`
- `<metabase-browser>` MUST have `initial-collection`

**Pass criteria**: every web component has its required attribute.

#### 5f: Template syntax is valid

Read each modified template file. Verify:
- No unclosed tags
- Template expressions are syntactically correct for the detected template engine
- Script blocks have matching opening/closing tags

**Pass criteria**: no obvious syntax errors.

#### 5g: No orphaned variables

Grep for any variables identified in Step 3e (dead code). Verify they have been removed.

**Pass criteria**: none of the identified dead-code variables remain.

If ANY check fails:
- Fix the issue immediately
- Re-run the specific check
- If unable to fix after 3 attempts, mark Step 5 ❌ blocked and report which check failed and why

---

### Step 6: Output summary

Organize the final output into these sections:

1. **Changes applied**: list every file modified and a one-line description of each change
2. **Web component mapping**: table showing each old iframe → new web component
3. **Dropped parameters**: list of Full App iframe parameters that were dropped, with brief explanation of why they don't apply to modular embedding
4. **Theme configuration**: any theme/appearance settings mapped into `window.metabaseConfig`
5. **Manual steps required** (Metabase admin configuration from Step 3g):
   - Enable modular embedding
   - Configure CORS origins
   - Configure JWT Identity Provider URI
   - Any other admin steps identified
6. **Behavioral differences the user should be aware of**:
   - Users can no longer navigate between dashboards/questions/collections within a single embed (each web component is standalone)
   - The Metabase application shell (nav, sidebar, search) is no longer present
   - Any iframe parameters that could not be mapped

## Retry policy

If any file Read or Grep operation fails:

- Retry once immediately (same parameters)
- If still failing, mark that step ❌ blocked and stop

If AskUserQuestion returns an ambiguous answer:

- Ask a more specific follow-up question
- If still unclear after 2 attempts, mark ❌ blocked and explain what information is needed
