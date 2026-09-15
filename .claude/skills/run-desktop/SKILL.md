---
name: run-desktop
description: Build, launch, and click through the idorendmaker-desktop Electron app for real (not a mock) — screenshots, form fills, and observing which backend calls actually fired. Use when asked to run, start, screenshot, or click through the desktop app, or to confirm a schedule-builder/rules/PDF change works in the real running app rather than just typechecking or unit-testing it.
---

Időrend Készítő is an Electron + React (Vite) desktop app backed by a Spring
Boot JAR (`idorendmaker-backend`), spawned as a child process on launch.
This skill drives the real running app via a Playwright CDP connection.

**For the "why" behind every step here — root causes, dead ends already
tried, things not to re-debug — read
[`documents/ELECTRON_CLICK_TESTING_SETUP.md`](../../../documents/ELECTRON_CLICK_TESTING_SETUP.md)
first if anything below doesn't just work.** This file is deliberately terse;
that one has the full story.

All paths below are relative to the repo root.

## Prerequisites (idempotent — skip whatever already exists)

```bash
ls idorendmaker-backend/target/*.jar || (cd idorendmaker-backend && ./mvnw -q clean package -DskipTests)
ls idorendmaker-desktop/node_modules/playwright-core || (cd idorendmaker-desktop && npm install --no-save playwright-core)
```

## Launch (in this exact order)

```bash
# 1. Renderer dev server FIRST (avoids a chrome-error:// page on launch)
cd idorendmaker-desktop && npx vite --config vite.renderer.config.ts --port 5173
# -> run_in_background: true; wait for "ready in"

# 2. Get a build, if idorendmaker-desktop/.vite/build/{main,preload}.js don't
#    already exist from an earlier session (they often do - check first)
cd idorendmaker-desktop && npx electron-forge start
# -> run_in_background: true. It WILL print "[exited with code 0]" - that's
#    expected here, not a failure. Wait for that or "Launched Electron app",
#    then move on. Do not debug the exit (see doc above for why).

# 3. Launch Electron directly against that build (bypasses forge's own,
#    broken-in-this-environment launch step)
cd idorendmaker-desktop && ELECTRON_ENABLE_LOGGING=1 ./node_modules/electron/dist/electron.exe . --remote-debugging-port=9223 --no-sandbox
# -> run_in_background: true AND dangerouslyDisableSandbox: true (both
#    required to get a GUI process that stays running)

# Wait for the CDP port before driving it:
until netstat -ano 2>/dev/null | grep -q ":9223"; do sleep 1; done
# -> its own backgrounded call with a timeout
```

This opens a real, visible window on the machine's desktop (not headless) —
the user may see it appear.

## Drive it

```bash
D=".claude/skills/run-desktop/driver.mjs"
node "$D" <command> [args...]
```

| command | what it does |
|---|---|
| `windows` | list open pages/windows (sanity check the app loaded) |
| `ss <name>` | screenshot → `idorendmaker-desktop/.claude-shots/<name>.png` — **read it with the Read tool**, a saved path alone proves nothing |
| `click <css-selector>` | DOM `.click()` — works even on Tailwind `opacity-0` hover-reveal buttons |
| `click-text <text>` | click the first button/link/`[role=button]` whose text matches or contains `<text>` |
| `click-nth-text <n> <text>` | same, but the Nth (0-based) match — use when a label appears more than once (e.g. two "Kezdés" buttons on the mode selector) |
| `fill <css-selector> <value>` | sets a React-controlled `<input>`/`<textarea>`/`<select>` correctly (native prototype setter + `input`/`change` events) |
| `clear-and-type <sel> <text>` | real keyboard events, for inputs `fill` doesn't work on |
| `text [css-selector]` | print `innerText` (omit selector for `document.body`) |
| `eval <js-expression>` | evaluate arbitrary JS in the page, print the JSON result |
| `wait <css-selector>` | wait up to 10s for a selector to appear |
| `url` | print the current page URL |
| `reload` | reload the page — needed once if it loaded before Vite was ready |
| `goto <url>` | navigate to a specific URL |
| `dump-clickable` | list every clickable element's text + `title` — use when `click-text` says `NOT_FOUND` |
| `install-log-capture` | start buffering the page's own `console.log` calls into `window.__logs` (persists across calls; `window.electronAPI` itself can't be monkey-patched — see doc) |
| `read-logs` | print + clear the buffer from `install-log-capture` |
| `clear-logs` | clear the buffer without printing |
| `wait-ms <ms>` | pace between calls (e.g. past a 500ms debounce) — foreground `sleep` is blocked in this harness |

## Clean up when done

```bash
tasklist | grep -iE "electron|node.exe|java.exe"   # kill the ones this session started
rm -rf idorendmaker-desktop/.claude-shots
rm -f idorendmaker-desktop/*.db idorendmaker-desktop/*.db-shm idorendmaker-desktop/*.db-wal
git status --short   # should show only intentional source edits
```

Two `java.exe` that report "access denied" on kill are pre-existing,
unrelated processes on this machine — leave them, don't chase them.
