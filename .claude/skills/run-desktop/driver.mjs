// Single-shot CDP driver for the idorendmaker-desktop Electron app.
//
// Why single-shot (connect, act, exit) instead of a long-lived REPL: Claude
// Code's Bash tool calls are independent processes with no shared stdin, so
// there is nowhere to pipe interactive commands into a persistent REPL
// across calls (no tmux on this Windows box). Each invocation of this
// script instead makes its own short CDP connection to the *already
// running* app window, does one thing, and exits. The app itself (and any
// state you stash on `window`, e.g. via `install-log-capture`) stays alive
// across calls - only this script's own process is short-lived.
//
// Usage: node driver.mjs <command> [args...]
// See SKILL.md in this directory for the full setup + command reference.

import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';

// Resolve playwright-core from idorendmaker-desktop's own node_modules
// regardless of where this script file lives on disk. A plain bare-specifier
// `import { chromium } from 'playwright-core'` resolves relative to *this
// file's* location - which is `.claude/skills/run-desktop/`, not inside
// `idorendmaker-desktop/`, so that import fails with ERR_MODULE_NOT_FOUND
// even when playwright-core is correctly installed in the app's
// node_modules. Binding `createRequire` to a path *inside*
// idorendmaker-desktop sidesteps that: require() resolution walks up from
// wherever you tell it to, not from the script's own path.
const APP_DIR = path.resolve(import.meta.dirname, '..', '..', '..', 'idorendmaker-desktop');
const appRequire = createRequire(path.join(APP_DIR, 'package.json'));
const { chromium } = appRequire('playwright-core');

const CDP_URL = process.env.CDP_URL || 'http://localhost:9223';
const SHOT_DIR = process.env.SCREENSHOT_DIR || path.join(APP_DIR, '.claude-shots');
fs.mkdirSync(SHOT_DIR, { recursive: true });

async function getPage(browser) {
  const pages = browser.contexts().flatMap(c => c.pages());
  const page = pages.find(p => !p.url().startsWith('devtools://')) ?? pages[0];
  if (!page) throw new Error('No pages found. Is the app actually running? Pages seen: ' + pages.map(p => p.url()).join(', '));
  return page;
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const browser = await chromium.connectOverCDP(CDP_URL);
  try {
    const page = await getPage(browser);

    switch (cmd) {
      case 'windows': {
        for (const ctx of browser.contexts()) {
          for (const p of ctx.pages()) console.log(p.url());
        }
        break;
      }

      case 'ss': {
        const name = rest[0] || `ss-${Date.now()}`;
        const f = path.join(SHOT_DIR, name + '.png');
        await page.screenshot({ path: f });
        console.log('screenshot:', f);
        break;
      }

      case 'click': {
        // DOM .click(), not Playwright's locator.click(): coordinate-based
        // clicks aren't needed here (single BrowserWindow, no BrowserView
        // overlay), and DOM click also fires on elements Tailwind hides via
        // opacity (group-hover reveal buttons) without needing a real hover
        // first - pointer-events isn't set on them, only opacity is.
        const sel = rest[0];
        const r = await page.evaluate(s => {
          const el = document.querySelector(s);
          if (!el) return 'NOT_FOUND';
          el.click();
          return 'OK';
        }, sel);
        console.log('click', sel, '->', r);
        break;
      }

      case 'click-text': {
        // Only matches <button>/<a>/[role=button] elements - most cards in
        // this app (race cards, rule cards) are NOT themselves the click
        // target, an inner hover-reveal icon button is. If this reports
        // NOT_FOUND for something that looks clickable, use `dump-clickable`
        // to find the real element, or `click` with a `[title=...]`
        // selector (several action buttons only carry a title, no visible
        // text).
        const text = rest.join(' ');
        const r = await page.evaluate(t => {
          const els = [...document.querySelectorAll('button, a, [role="button"]')];
          const el = els.find(e => e.textContent?.trim() === t) ?? els.find(e => e.textContent?.includes(t));
          if (!el) return 'NOT_FOUND';
          el.click();
          return 'OK: ' + el.tagName + ' "' + el.textContent.trim() + '"';
        }, text);
        console.log('click-text', JSON.stringify(text), '->', r);
        break;
      }

      case 'click-nth-text': {
        // Like click-text, but for the Nth match (0-based) when the same
        // label appears more than once on screen - e.g. this app's mode
        // selector has two "Kezdés" buttons.
        const [n, ...textParts] = rest;
        const text = textParts.join(' ');
        const r = await page.evaluate(({ t, n }) => {
          const els = [...document.querySelectorAll('button, a, [role="button"]')]
            .filter(e => e.textContent?.trim() === t || e.textContent?.includes(t));
          const el = els[Number(n)];
          if (!el) return `NOT_FOUND (${els.length} matches)`;
          el.click();
          return 'OK: ' + el.tagName;
        }, { t: text, n });
        console.log('click-nth-text', n, JSON.stringify(text), '->', r);
        break;
      }

      case 'fill': {
        // React-controlled inputs ignore a plain `el.value = x` - React's
        // synthetic onChange only fires from the *native* setter, so this
        // grabs the prototype's setter explicitly before dispatching the
        // input/change events.
        const [sel, ...valueParts] = rest;
        const value = valueParts.join(' ');
        const r = await page.evaluate(({ s, v }) => {
          const el = document.querySelector(s);
          if (!el) return 'NOT_FOUND';
          const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype
            : el.tagName === 'SELECT' ? window.HTMLSelectElement.prototype
            : window.HTMLInputElement.prototype;
          const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
          setter.call(el, v);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          return 'OK';
        }, { s: sel, v: value });
        console.log('fill', sel, '->', r);
        break;
      }

      case 'clear-and-type': {
        // Real keyboard events via Playwright, for inputs the native-setter
        // trick above fights with (rare in this app, but keep it around).
        const sel = rest[0];
        const text = rest.slice(1).join(' ');
        await page.click(sel);
        await page.keyboard.press('Control+A');
        await page.keyboard.type(text, { delay: 20 });
        console.log('clear-and-type', sel, JSON.stringify(text), '-> OK');
        break;
      }

      case 'text': {
        const sel = rest[0];
        const t = await page.evaluate(s => (s ? document.querySelector(s) : document.body)?.innerText ?? '(null)', sel || null);
        console.log(t);
        break;
      }

      case 'eval': {
        const expr = rest.join(' ');
        try {
          console.log(JSON.stringify(await page.evaluate(expr)));
        } catch (e) {
          console.log('ERROR:', e.message);
        }
        break;
      }

      case 'wait': {
        const sel = rest[0];
        try {
          await page.waitForSelector(sel, { timeout: 10000 });
          console.log('found:', sel);
        } catch {
          console.log('TIMEOUT:', sel);
        }
        break;
      }

      case 'url': {
        console.log(page.url());
        break;
      }

      case 'reload': {
        // Needed once, right after launch, if electron loaded before the
        // Vite dev server on :5173 was ready (page shows
        // chrome-error://chromewebdata/). Start the Vite server first and
        // this shouldn't be necessary - see SKILL.md.
        await page.reload({ waitUntil: 'load', timeout: 15000 });
        console.log('reloaded ->', page.url());
        break;
      }

      case 'goto': {
        const target = rest[0];
        await page.goto(target, { waitUntil: 'load', timeout: 15000 });
        console.log('goto ->', page.url());
        break;
      }

      case 'dump-clickable': {
        // Lists every button/link/role=button with visible text, to find
        // the actual click target when click-text says NOT_FOUND. Cards
        // themselves are often not clickable - a hover-revealed icon button
        // inside them is (see the `click` case comment).
        const els = await page.evaluate(() =>
          [...document.querySelectorAll('button, a, [role="button"]')].map(e => ({
            tag: e.tagName,
            text: e.textContent?.trim().slice(0, 60) || '',
            title: e.getAttribute('title') || '',
          })).filter(e => e.text || e.title)
        );
        console.log(JSON.stringify(els, null, 2));
        break;
      }

      case 'install-log-capture': {
        // window.electronAPI (exposed via Electron's contextBridge) is
        // frozen - assigning to its methods to count calls silently no-ops,
        // it does NOT throw, so a naive monkey-patch looks like it worked
        // and then always reports zero calls. console.log is NOT
        // contextBridge-protected and is the only reliable interception
        // point found so far. This only captures console.log (not
        // .error/.warn/.info) - the app's own logging in the paths this was
        // built for (ScheduleBuilder's rule-check flow) uses console.log.
        // Extend the override below if you need other levels.
        //
        // Also: Playwright's `page.on('console', ...)` CDP event listener
        // does NOT reliably see this app's console output (observed
        // directly - a plain console.log('x') from `eval` was seen, but the
        // app's own debounced-effect console.log calls were not, even
        // though the corresponding React state/UI update clearly happened).
        // Likely something about how Vite's dev-mode HMR runtime wraps
        // console. Don't spend time on page.on('console') here - use this
        // instead.
        const r = await page.evaluate(() => {
          if (window.__logs) return 'already installed';
          window.__logs = [];
          const orig = console.log.bind(console);
          console.log = (...args) => {
            window.__logs.push(args.map(String).join(' '));
            orig(...args);
          };
          return 'installed';
        });
        console.log(r);
        break;
      }

      case 'read-logs': {
        // Prints and clears the buffer captured by install-log-capture.
        const logs = await page.evaluate(() => {
          const l = window.__logs || [];
          window.__logs = [];
          return l;
        });
        console.log(`--- ${logs.length} messages ---`);
        console.log(logs.join('\n'));
        break;
      }

      case 'clear-logs': {
        await page.evaluate(() => { window.__logs = []; });
        console.log('cleared');
        break;
      }

      case 'wait-ms': {
        // A portable in-process sleep for pacing between commands (e.g.
        // past a 500ms debounce) - the harness blocks a literal foreground
        // `sleep`, and Bash's run_in_background is overkill for a plain
        // pause between two driver calls. Runs *after* connecting, so it
        // also incidentally keeps the CDP connection open for that long,
        // which is harmless.
        const ms = Number(rest[0]);
        await new Promise(r => setTimeout(r, ms));
        console.log(`waited ${ms}ms`);
        break;
      }

      default:
        console.log('unknown command:', cmd);
        console.log([
          'commands:',
          '  windows',
          '  ss <name>',
          '  click <css-selector>',
          '  click-text <text>',
          '  click-nth-text <n> <text>',
          '  fill <css-selector> <value>',
          '  clear-and-type <css-selector> <text>',
          '  text [css-selector]',
          '  eval <js-expression>',
          '  wait <css-selector>',
          '  url',
          '  reload',
          '  goto <url>',
          '  dump-clickable',
          '  install-log-capture',
          '  read-logs',
          '  clear-logs',
          '  wait-ms <milliseconds>',
        ].join('\n'));
    }
  } finally {
    // Deliberately NOT calling browser.close(): this is a connectOverCDP
    // session to an already-running, externally-launched Electron app.
    // Closing here would terminate the remote app, not just disconnect.
    process.exit(0);
  }
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
