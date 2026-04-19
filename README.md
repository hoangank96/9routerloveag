# Antigravity model sync handoff

## Goal

Make the Antigravity model dropdown follow the current `9router` Antigravity MITM mapping:

- when MITM is enabled, show mapped model names from `9router`
- when MITM is disabled, restore the original Antigravity-friendly labels

This repo already contains the reproducible patch logic in `D:\Antigravity\9router\fix-nvidia.mjs`.

## Confirmed render source

The visible Antigravity dropdown is driven by:

- `C:\Users\Administrator\AppData\Local\Programs\Antigravity\resources\app\out\vs\workbench\workbench.desktop.main.js`

It is **not enough** to patch only:

- `...extensions\antigravity\out\media\chat.js`
- `...extensions\antigravity\dist\extension.js`

Those can affect other UI state, but the final visible dropdown labels came from `workbench.desktop.main.js`.

## Source of truth

The runtime mapping is read from:

- `C:\Users\Administrator\AppData\Roaming\9router\db.json`

Relevant fields:

- `settings.mitmEnabled`
- `mitmAlias.antigravity`

Example alias keys:

- `gemini-3.1-pro-high`
- `gemini-3.1-pro-low`
- `gemini-3-flash`
- `claude-sonnet-4-6`
- `claude-opus-4-6-thinking`
- `gpt-oss-120b-medium`

## Files patched

### 1. 9router models route

Patched file:

- `D:\Antigravity\9router\node_modules\9router\app\.next\server\app\api\v1beta\models\route.js`

Purpose:

- expose Antigravity alias entries as `models/<alias>`
- when MITM is enabled, set `displayName` to the mapped model
- when MITM is disabled, set `displayName` back to the original alias name
- add CORS so Antigravity workbench can fetch this route directly
- include `_9router.antigravityMitmEnabled` in the JSON response

Expected verification:

- `http://127.0.0.1:20128/api/v1beta/models`
- contains `_9router.antigravityMitmEnabled`
- contains entries like `models/claude-opus-4-6-thinking`

### 2. Antigravity workbench bundle

Patched file:

- `C:\Users\Administrator\AppData\Local\Programs\Antigravity\resources\app\out\vs\workbench\workbench.desktop.main.js`

Purpose:

- inject a dynamic helper into the model option conversion path
- fetch `http://127.0.0.1:20128/api/v1beta/models`
- map friendly labels to current `9router` alias display names
- revert labels when MITM is off
- install a `MutationObserver` plus periodic refresh to rewrite already-rendered DOM labels

Important detail:

- the option builder currently goes through `Oan(...)`
- the patched label field becomes:
  - `label:_9routerWorkbenchModelLabel(t.label,i)`

## Reproducible workflow

### Step 1: edit only the script in this repo

Primary maintenance file:

- `D:\Antigravity\9router\fix-nvidia.mjs`

Do **not** manually edit installed bundles first. Put the patch logic into `fix-nvidia.mjs`, then run it.

Current `fix-nvidia.mjs` responsibilities:

- patch `9router` MITM server behavior
- patch `9router` `v1beta/models` route
- patch Antigravity extension/main files
- patch Antigravity `workbench.desktop.main.js` for dropdown label sync

### Step 2: run the patcher

From `D:\Antigravity\9router`:

```powershell
node fix-nvidia.mjs
```

This reapplies the changes to installed runtime files.

### Step 3: restart both apps

Full restart is required after bundle changes:

1. stop Antigravity completely
2. stop any `9router` node processes
3. start `9router`
4. start Antigravity

## Verification procedure

### Verify 9router route first

Request:

- `http://127.0.0.1:20128/api/v1beta/models`

Check:

- `_9router.antigravityMitmEnabled` matches `db.json`
- alias entries return the current mapped display name

Example expected result when MITM is on:

- `models/claude-opus-4-6-thinking -> glm/glm-5.1`

Example expected result when MITM is off:

- `models/claude-opus-4-6-thinking -> claude-opus-4-6-thinking`

### Verify GUI behavior

Open Antigravity model dropdown and confirm:

- MITM on: dropdown shows mapped model names from `mitmAlias.antigravity`
- MITM off: dropdown reverts to original labels within about 2 seconds

## Debugging notes

### If the dropdown does not change

Check the route first. If the route is wrong, the GUI will also be wrong.

### If the route is right but GUI is stale

Check the workbench bundle contains:

- `_9routerWorkbenchMitmState`
- `_9routerWorkbenchLoadState`
- `_9routerWorkbenchInstallObserver`
- `http://127.0.0.1:20128/api/v1beta/models`
- `label:_9routerWorkbenchModelLabel(t.label,i)`

### If Antigravity fails to start

Most likely cause is malformed injection into `workbench.desktop.main.js`.

Validate with:

```powershell
node --check "C:\Users\Administrator\AppData\Local\Programs\Antigravity\resources\app\out\vs\workbench\workbench.desktop.main.js"
```

The helper must be inserted as an expression in the minified variable chain, not as a standalone `let` statement in an invalid location.

## Backups

Known backup directories:

- `C:\Users\Administrator\AppData\Roaming\9router\backups\antigravity-20260418-221939`
- `C:\Users\Administrator\AppData\Roaming\9router\backups\bundle-probe-20260419-011031`

If a future patch breaks startup, restore from backup first, then re-apply a corrected `fix-nvidia.mjs`.

## Practical rule

For this specific problem, the stable rule is:

- `db.json` is the source of truth
- `9router /api/v1beta/models` is the bridge
- `workbench.desktop.main.js` is the final GUI label renderer

Any future agent should start from those three points.
