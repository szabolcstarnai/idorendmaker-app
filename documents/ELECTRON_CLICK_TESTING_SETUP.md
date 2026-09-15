# Click-Through Testing the Electron App — Setup Guide

**Document Version**: 1.0
**Last Updated**: 2026-09-15
**Status**: ✅ Working, verified end-to-end on this Windows dev machine

---

## 📋 What this is

A record of how to actually **launch and click through the real, running
desktop app** from inside a Claude Code session — not a mock, not a
component test, the genuine Electron window with the genuine backend behind
it — so a future session doesn't have to rediscover any of this by trial and
error.

This capability is also packaged as a **project skill**:
[`.claude/skills/run-desktop/`](../.claude/skills/run-desktop/SKILL.md).
Claude Code's built-in `run` skill checks for a project skill like this one
*before* falling back to generic patterns, so in a future session just asking
to run/screenshot/click through the app should find it automatically. This
document is the "why" behind that skill — read it when the skill's terse
command reference isn't enough, when something in the setup breaks, or when
extending the driver.

Everything below was learned by hitting the actual problem, not by reading
docs — most of it is faster to read here than to rediscover.

---

## 🧩 Why this needed real engineering, not just `npm start`

Electron apps assume an interactive human clicking a real window. Claude
Code's tools are independent, non-interactive shell invocations with no
shared stdin between calls. Three specific mismatches had to be solved:

1. **`electron-forge start` (the normal dev command) doesn't work here.**
   It builds successfully — Vite bundles main/preload, the renderer dev
   server comes up — and then the whole process prints `[exited with code
   0]` and disappears, with **zero** console output from the app itself
   (not even the very first `console.log` in `main.ts`). This happens with
   or without extra CLI args, with or without `--enable-logging`. Root
   cause not found (best guess: how `@electron-forge/core` spawns/supervises
   its child process doesn't survive this environment's own process
   supervision). Workaround found instead: let it build once, then bypass
   its launch step entirely and start `electron.exe` directly.

2. **No persistent stdin across tool calls**, so a classic REPL driver
   (readline loop reading commands from stdin, the pattern Claude Code's
   generic `run` skill recommends) doesn't fit. `driver.mjs` in the skill
   folder is **single-shot** instead: each invocation opens its own short
   CDP connection (`chromium.connectOverCDP`) to the *already-running* app,
   does one thing, and exits. The Electron window itself — and anything you
   stash on `window` inside it — stays alive across calls; only the small
   Node script wrapping each command is short-lived. This turned out to
   compose *better* with Claude Code's tool-call model than a REPL would
   have, not worse.

3. **`window.electronAPI` (the app's Electron `contextBridge` API) is
   frozen.** Assigning to it — e.g. `window.electronAPI.getActiveRules = fn`
   to count calls — **silently no-ops** rather than throwing, so a
   monkey-patch-based instrumentation attempt looks like it worked and then
   reports zero calls, always, no matter what actually happened. Confirmed
   directly: re-assigning `getActiveRules` and then calling it still invoked
   the *real* implementation. Use `console.log` interception instead
   (`install-log-capture` in the driver) — it is not contextBridge-protected
   and the app's own code already calls it at the exact points that matter
   (e.g. right when rule validation actually runs).

---

## ⚡ Quick start

All commands assume the working directory is the repo root
(`idorendmaker-app/`) unless stated otherwise. Windows/Git Bash paths shown;
adjust if this ever runs somewhere else.

### 1. One-time prerequisites (per fresh checkout, or if missing)

```bash
# Backend JAR - without this the app launches but every schedule/race/rule
# API call fails, since BackendService.ts spawns this exact jar.
cd idorendmaker-backend && ./mvnw -q clean package -DskipTests && cd ..

# PDF processor JAR - only needed if the task touches PDF import. As of the
# devJarResolver fix (#62) this no longer needs any manual renaming - just
# build it normally and BackendService's sibling, PDFProcessorService, finds
# whatever versioned jar Maven produced.
cd idorendmaker-pdfprocessor && ./mvnw -q clean package -DskipTests && cd ..

# playwright-core - the CDP driver's only dependency. Deliberately installed
# with --no-save: it's a dev/test tool, not a real app dependency, and this
# keeps package.json/package-lock.json untouched. It has to be re-run after
# a clean `npm install` in idorendmaker-desktop wipes node_modules, since
# nothing tracks it.
cd idorendmaker-desktop && npm install --no-save playwright-core && cd ..
```

All three are idempotent — safe to re-run; skip whichever already has its
output (`idorendmaker-backend/target/*.jar`,
`idorendmaker-pdfprocessor/target/*.jar`,
`idorendmaker-desktop/node_modules/playwright-core`).

### 2. Start the renderer dev server **first**

```bash
cd idorendmaker-desktop
npx vite --config vite.renderer.config.ts --port 5173
```
Run with `run_in_background: true`. Wait for it to report `ready in`.

Starting this *before* Electron matters: the bundled `main.js` was built in
dev mode with `MAIN_WINDOW_VITE_DEV_SERVER_URL` baked in pointing at
`http://localhost:5173`. If Electron loads before that URL is reachable, the
window shows `chrome-error://chromewebdata/`
(`ERR_CONNECTION_REFUSED` in the log) and needs an explicit
`node driver.mjs reload` afterwards to recover. Starting Vite first avoids
that step entirely.

### 3. Get a build of `main.js`/`preload.js`, if `.vite/build/` doesn't have one

Check first — a build from an earlier session may still be sitting on disk
and is perfectly reusable:

```bash
ls idorendmaker-desktop/.vite/build/    # looking for main.js and preload.js
```

If missing, produce one (this *will* appear to fail — that's fine, see
point 1 above; the build itself still lands on disk before it does):

```bash
cd idorendmaker-desktop
npx electron-forge start
```
Run with `run_in_background: true`, wait for either `Launched Electron app`
or `[exited with code 0]` in its output (both mean the build finished), then
move on — don't debug the exit itself.

### 4. Launch Electron directly against that build

```bash
cd idorendmaker-desktop
ELECTRON_ENABLE_LOGGING=1 ./node_modules/electron/dist/electron.exe . --remote-debugging-port=9223 --no-sandbox
```
Run with `run_in_background: true` **and** `dangerouslyDisableSandbox: true`
on the tool call. Both were needed to get a GUI process that actually stays
running rather than exiting immediately, matching the same silent-exit
symptom as point 1. `--remote-debugging-port` is the Chromium flag that
opens the CDP endpoint the driver connects to; `--no-sandbox` avoids
Electron's sandbox needing OS privileges this environment doesn't grant it.

Wait for the CDP port before touching the driver:
```bash
until netstat -ano 2>/dev/null | grep -q ":9223"; do sleep 1; done
```
(As its own backgrounded call with a timeout — the harness blocks a literal
foreground `sleep`.)

This really does launch a **visible window on the real Windows desktop** —
this machine's shell runs in the same interactive session as the logged-in
user (confirmed via `[System.Diagnostics.Process]::GetCurrentProcess().SessionId`
matching `explorer.exe`'s), not a headless/service session. Expect the user
to be able to watch it happen, as they did the first time this was built.

### 5. Drive it

```bash
node .claude/skills/run-desktop/driver.mjs windows
node .claude/skills/run-desktop/driver.mjs ss 01-menu
node .claude/skills/run-desktop/driver.mjs click-text Kezdés
```

Screenshots land in `idorendmaker-desktop/.claude-shots/` — **read them**
with the Read tool; a saved PNG path is not itself confirmation of anything.
Full command reference: [`SKILL.md`](../.claude/skills/run-desktop/SKILL.md).

### 6. Clean up when done

```bash
# Kill everything this spun up. The two java.exe that refuse to die
# ("access denied") are pre-existing, unrelated processes on this machine -
# ignore those specifically, don't chase them.
tasklist | grep -iE "electron|node.exe|java.exe"
# then taskkill //F //PID <pid> for each one this session actually started

rm -rf idorendmaker-desktop/.claude-shots
rm -f idorendmaker-desktop/*.db idorendmaker-desktop/*.db-shm idorendmaker-desktop/*.db-wal
git status --short    # should be clean of anything but intentional source edits
```

---

## ⚠️ Setup gotchas

- **Rebuilding `main.js`/`preload.js` (step 3) can bake in a different Vite
  port than the one you started.** If port 5173 is already taken (a
  standalone `npx vite` instance left over from earlier in the same
  session, say), the `electron-forge start` rebuild picks the next free
  port (5174, ...) for *its own* internal dev server and bakes that URL
  into the fresh `main.js` — even though your actual standalone Vite
  server is still happily running on 5173. Symptom: `driver.mjs windows`
  reports `chrome-error://chromewebdata/` even after a `reload`, because
  reload retries the *wrong* port. Fix: `node driver.mjs goto
  "http://localhost:5173/"` (or whatever port your actual Vite instance is
  on) to point the window at the right one; or avoid the mismatch
  entirely by not leaving stale Vite instances running before a rebuild —
  grep `.vite/build/main.js` for `localhost:` to see what port it actually
  expects if this happens.
- **Native file pickers (`dialog.showOpenDialog`) are unreachable from CDP,
  full stop** — not a workaround-needed case, a hard boundary (it's not a
  web `<input type="file">`, which Playwright *can* intercept; it's an OS
  dialog spawned from the Electron main process, entirely outside the
  Chromium page). Before concluding a flow "can't be tested headlessly"
  because it starts with a file picker, check whether the actual
  processing step is a *separate* IPC call that takes a raw path — it
  usually is, decoupled from the dialog on purpose or not, and calling it
  directly exercises the real pipeline. Confirmed working this way for the
  PDF import flow — see `documents/PDF_AND_COMPETITOR_TRACKING.md`.

## 🔍 Interaction gotchas (found the hard way)

- **Cards are usually not the click target — a hover-revealed icon button
  inside them is.** Race cards and rule cards render an add/delete button
  with Tailwind's `opacity-0 group-hover:opacity-100` — invisible until
  real mouse hover, but **not** `pointer-events: none`, so a DOM `.click()`
  still fires it correctly without needing to simulate a hover first. The
  driver's `click`/`click-text` use `el.click()` specifically for this
  reason (Playwright's coordinate-based `locator.click()` isn't needed
  here — single window, no BrowserView overlay — and would be more fragile
  for this exact case anyway).
- **Some buttons only carry a `title` attribute, no visible text usable by
  `click-text`.** The race-add button in the schedule builder is one:
  `title="Hozzáadás az időrendhez"` in Egyszerű (simple) mode,
  **`title="Futamszint kiválasztása"` in Teljes (full) mode** — full mode
  opens a level-picker instead of adding directly, and reuses the icon
  with different `title` text. Use `click document.querySelector("button[title='...']")`
  or `dump-clickable` to find the right one when `click-text` reports
  `NOT_FOUND`.
- **The same label can appear more than once on screen.** The mode selector
  has two "Kezdés" buttons (Egyszerű mód / Teljes mód). `click-text` matches
  the *first* DOM match; use `click-nth-text <n> <text>` to pick a specific
  one.
- **React-controlled inputs ignore a plain `el.value = x`.** React's
  synthetic `onChange` only fires from the value set via the native
  property setter on the element's prototype, not a direct assignment. The
  driver's `fill` command does this correctly already; if writing a new
  `eval` snippet by hand, grab
  `Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set`
  and `.call(el, value)` before dispatching `input`/`change` events.
- **Native `<select>` elements need the same treatment** — the rule
  editor's condition dropdowns are plain `<select>`; use the
  `HTMLSelectElement.prototype` setter the same way (the `fill` command
  auto-detects the tag and picks the right prototype).
- **A bare `[role=checkbox]` (or any un-scoped selector) can match an
  element behind an open modal, not the one you're looking at.** Custom
  checkbox components (Radix-style, used in the level-picker modal and
  elsewhere) aren't real `<input type="checkbox">` elements, so `input[type=checkbox]`
  won't find them - but a generic `[role=checkbox]` selector matches
  *every* one on the page, including sidebar filter checkboxes sitting
  underneath the modal's overlay, and `document.querySelector` returns
  document order, not visual stacking order. Scope the selector to the
  modal's own container (or use `click-nth-text`/an explicit label match)
  rather than a bare role selector when more than one instance of a
  component exists on the page at once - which, with an overlay open, is
  almost always the case.

---

## 📡 Observing what the app actually did

Two techniques were dead ends before landing on the one that works:

1. **Monkey-patching `window.electronAPI` methods to count calls** — looks
   like it works (no exception), always reports zero, because
   `contextBridge.exposeInMainWorld` freezes what it exposes. Don't try
   this again; it wastes a debugging cycle every time.
2. **Playwright's `page.on('console', ...)` CDP event listener** — sanity-tested
   and does receive a message from a `console.log(...)` issued directly via
   `eval`, but did **not** reliably receive this app's own `console.log`
   calls from inside a debounced `useEffect`, even though the corresponding
   React state/UI update clearly happened (confirmed by reading the DOM).
   Best guess: Vite's dev-mode HMR runtime wraps `console` in a way that
   defeats CDP's console-event delivery. Not root-caused further; just
   avoid relying on it.

**What actually works**: overriding `console.log` *inside the page* and
buffering into `window.__logs`, via the driver's `install-log-capture` /
`read-logs` / `clear-logs` commands. `window` itself (unlike
`window.electronAPI`) is fully mutable, and this survives across separate
driver invocations because the *page* stays alive between them — only the
short-lived Node script wrapping each command exits.

```bash
D=".claude/skills/run-desktop/driver.mjs"
node "$D" install-log-capture
node "$D" click ...            # do the thing you want to observe
node "$D" wait-ms 1200         # past any debounce (e.g. the 500ms rule-check one)
node "$D" read-logs
```

This is exactly the technique used to verify the Schedule Builder
performance fixes (see git history / PR #61): confirmed a default-interval
setting change produced **zero** rule-check log lines, and adding a race
produced **exactly one** — the app's own `console.log('No active rules
available for validation')` / `console.log(\`Found ${n} active rules...\`)`
inside `checkRuleViolations` (`ScheduleBuilder.tsx`) as the observable
signal, since there is no direct way to count backend API calls from
outside contextBridge.

---

## 🧵 Process-management notes specific to this harness

- **Don't combine a trailing shell `&` with `run_in_background: true`.**
  Doing both meant the tool considered the *wrapper* script "done" almost
  instantly (it finishes right after backgrounding the real command with
  `&`), which then appeared to reap the detached child along with it — the
  long-running process died within seconds despite looking successfully
  launched. Pass the actual long-running command straight to
  `run_in_background: true` and let the harness manage the backgrounding;
  don't add your own `&`.
- **Foreground `sleep` is blocked.** For "wait until a condition is true"
  (a port opens, a log line appears), background an `until <check>; do
  sleep 1; done` loop with `run_in_background: true` and a `timeout`. For a
  plain fixed pause between two driver calls (e.g. past a debounce),
  `node -e "setTimeout(()=>{}, 1200)"` blocks that one call for exactly that
  long and then exits cleanly — or use the driver's own `wait-ms` command,
  which does the same thing from inside an already-open CDP connection.
- **A bare-specifier `import` in the driver script resolves relative to the
  *script's own file location*, not the working directory.** Since
  `driver.mjs` lives at `.claude/skills/run-desktop/`, a plain
  `import { chromium } from 'playwright-core'` fails with
  `ERR_MODULE_NOT_FOUND` even though `playwright-core` is correctly
  installed in `idorendmaker-desktop/node_modules`. The driver works around
  this with `createRequire(path.join(APP_DIR, 'package.json'))` — binding
  Node's `require()` resolution to a path *inside* `idorendmaker-desktop`
  regardless of where the script file itself sits on disk. If this driver
  ever needs another npm dependency, resolve it the same way, or install it
  as a real (or `--no-save`) dependency of `idorendmaker-desktop` — never
  assume a plain top-level `import` of a third-party package will resolve
  correctly from this script's location.

---

## 🗂️ Files involved

| Path | What |
|---|---|
| `.claude/skills/run-desktop/SKILL.md` | Terse command reference — the skill Claude Code auto-discovers |
| `.claude/skills/run-desktop/driver.mjs` | The actual CDP driver script (committed, not a throwaway) |
| `documents/ELECTRON_CLICK_TESTING_SETUP.md` | This document |
| `idorendmaker-desktop/.claude-shots/` | Screenshot output — gitignored (`idorendmaker-desktop/.gitignore`) |

Screenshots are debugging artifacts, not something to commit — deleting the
directory in cleanup (step 6 above) is still worth doing to keep the
workspace tidy even though `git status` won't flag it.
