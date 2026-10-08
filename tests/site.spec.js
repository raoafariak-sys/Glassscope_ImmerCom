// @ts-check
const { test, expect } = require('@playwright/test');

const STAGES = ['glasses', 'phone', 'backend', 'mediamtx', 'viewer'];
const REPO = 'https://github.com/raoafariak-sys/GlassScope';

/** Collects console errors and warnings, page errors, failed requests and HTTP errors for a page. */
function trackProblems(page) {
  const problems = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') problems.push(`console.${msg.type()}: ${msg.text()}`);
  });
  page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`));
  page.on('requestfailed', (req) => problems.push(`requestfailed: ${req.url()} (${req.failure()?.errorText})`));
  page.on('response', (res) => {
    if (res.status() >= 400) problems.push(`HTTP ${res.status()}: ${res.url()}`);
  });
  return problems;
}

async function expectSelected(page, stage) {
  for (const s of STAGES) {
    const selected = s === stage;
    await expect(page.locator(`#tab-${s}`)).toHaveAttribute('aria-selected', String(selected));
    if (selected) {
      await expect(page.locator(`#panel-${s}`)).toBeVisible();
    } else {
      await expect(page.locator(`#panel-${s}`)).toBeHidden();
    }
  }
}

test.describe('page load', () => {
  test('loads under the Pages subpath with no console errors, warnings or failed requests', async ({ page }) => {
    const problems = trackProblems(page);
    await page.goto('./');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    expect(problems).toEqual([]);
  });

  test('every local asset the page references resolves', async ({ page, request }) => {
    await page.goto('./');
    const urls = await page.evaluate(() => {
      const out = new Set();
      const add = (value) => value && out.add(new URL(value, document.baseURI).href);
      document.querySelectorAll('[href], [src]').forEach((el) => {
        add(el.getAttribute('href'));
        add(el.getAttribute('src'));
      });
      document.querySelectorAll('[srcset]').forEach((el) => {
        el.getAttribute('srcset').split(',').forEach((part) => add(part.trim().split(/\s+/)[0]));
      });
      return [...out];
    });
    const local = urls.filter((u) => u.startsWith(new URL('./', page.url()).href) && !u.includes('#'));
    expect(local.length).toBeGreaterThan(8);
    for (const url of local) {
      const res = await request.get(url);
      expect(res.status(), url).toBe(200);
    }
  });
});

test.describe('content', () => {
  test('header matches the paper', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('h1')).toHaveText('GlassScope: An Open-Source Measurement Layer for AI-Glass Live Streaming');
    const authors = page.locator('.publication-authors').first();
    for (const name of ['Raoa Faria Karim', 'John Cobio', 'Songling Bai', 'Wei Li', 'Yingshu Li', 'Ming Li']) {
      await expect(authors).toContainText(name);
    }
    await expect(page.locator('.publication-affiliations')).toContainText('The University of Texas at Arlington');
    await expect(page.locator('.publication-affiliations')).toContainText('Georgia State University');
    await expect(page.locator('.publication-venue')).toHaveText('ImmerCom ’26');

    const links = page.locator('.publication-links a');
    // The Paper button stays hidden until the DOI resolves (see README).
    await expect(links).toHaveText(['Code', 'Evaluation Logs', 'Setup Guide']);
    await expect(links.nth(0)).toHaveAttribute('href', REPO);
    await expect(links.nth(1)).toHaveAttribute('href', `${REPO}/tree/main/evaluation_logs`);
    await expect(links.nth(2)).toHaveAttribute('href', `${REPO}/blob/main/STARTUP_GUIDE_BYPASS.txt`);
  });

  test('results match Table 3 and leave first-frame numbers out', async ({ page }) => {
    await page.goto('./');
    const tables = page.locator('#results table');
    const tableText = (await tables.allInnerTexts()).join('\n').replace(/\s+/g, ' ');
    for (const value of [
      'Live latency (ms) 4,505 ± 849 2,575 ± 599', 'Frame rate (fps) 14.10 ± 0.08 14.72 ± 0.02',
      'Sessions with freezes 28/30 2/30', 'Startup timing in milliseconds',
      'SDK startup 2,895 ± 145 2,814 ± 284 2,923 ± 364', 'Full ingest startup hidden 3,411 ± 212 3,515 ± 368',
      'SDK-to-MediaMTX gap hidden 597 ± 89 592 ± 72',
    ]) {
      expect(tableText, value).toContain(value);
    }
    const text = await page.locator('body').innerText();
    for (const firstFrame of ['768', '494', '4,299', '4299', '594 ms']) {
      expect(text, `first-frame value ${firstFrame} should not be shown`).not.toContain(firstFrame);
    }
  });
});

test.describe('pipeline explorer', () => {
  test('starts on Local Backend and responds to mouse clicks', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('[data-stage-list]')).toHaveAttribute('role', 'tablist');
    await expectSelected(page, 'backend');
    for (const stage of STAGES) {
      await page.locator(`#tab-${stage}`).click();
      await expectSelected(page, stage);
      await expect(page.locator(`#tab-${stage}`)).toHaveClass(/is-selected/);
    }
  });

  test('supports arrow keys, Home and End with roving focus', async ({ page }) => {
    await page.goto('./');
    await page.locator('#tab-backend').focus();
    const steps = [
      ['ArrowRight', 'mediamtx'], ['ArrowRight', 'viewer'], ['ArrowRight', 'glasses'],
      ['ArrowLeft', 'viewer'], ['Home', 'glasses'], ['End', 'viewer'],
      ['ArrowUp', 'mediamtx'], ['ArrowDown', 'viewer'],
    ];
    for (const [key, stage] of steps) {
      await page.keyboard.press(key);
      await expectSelected(page, stage);
      await expect(page.locator(`#tab-${stage}`)).toBeFocused();
    }
    // Only the selected tab is in the tab order; Tab moves on to its panel.
    await expect(page.locator('[data-stage][tabindex="0"]')).toHaveCount(1);
    await page.keyboard.press('Tab');
    await expect(page.locator('#panel-viewer')).toBeFocused();
  });

  test('works with touch on a phone-sized screen', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    await page.goto('./');
    for (const stage of ['glasses', 'viewer', 'phone', 'mediamtx', 'backend']) {
      await page.locator(`#tab-${stage}`).tap();
      await expectSelected(page, stage);
    }
    await context.close();
  });

  test('keeps every explanation readable without JavaScript', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('./');
    for (const stage of STAGES) {
      await expect(page.locator(`#panel-${stage}`)).toBeVisible();
      await expect(page.locator(`#tab-${stage}`)).toBeDisabled();
    }
    await expect(page.locator('.gs-copy')).toBeHidden();
    await context.close();
  });

  test('lane nodes line up with the stage they mark on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('./');
    const offsets = await page.evaluate(() => {
      const startColumn = { control: 1, media: 0, trial: 2 };
      const tabs = [...document.querySelectorAll('[data-stage]')].map((t) => {
        const r = t.getBoundingClientRect();
        return r.left + r.width / 2;
      });
      const out = [];
      for (const [lane, start] of Object.entries(startColumn)) {
        document.querySelectorAll(`.gs-lane--${lane} .gs-node`).forEach((node) => {
          const k = Number(getComputedStyle(node).getPropertyValue('--k'));
          const r = node.getBoundingClientRect();
          out.push({ lane, k, delta: Math.abs(r.left + r.width / 2 - tabs[start + k - 1]) });
        });
      }
      return out;
    });
    expect(offsets).toHaveLength(10);
    for (const o of offsets) expect(o.delta, `${o.lane} node ${o.k}`).toBeLessThan(1.5);
  });
});

test.describe('citation', () => {
  test('copy button puts the BibTeX on the clipboard and announces it', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('./');
    const button = page.locator('.gs-copy');
    await expect(button).toBeVisible();
    await button.click();
    await expect(page.locator('#bibtex-status')).toHaveText('BibTeX copied to the clipboard.');
    await expect(button).toContainText('Copied');
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip).toBe(await page.locator('#bibtex-code').textContent());
    expect(clip).toContain('doi       = {10.1145/3842656.3843829}');
  });
});

test.describe('responsive layout', () => {
  for (const width of [320, 375]) {
    test(`results tables fit without sideways scrolling at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('./');
      const overflows = await page.evaluate(() => [...document.querySelectorAll('.gs-table-wrap')]
        .map((el) => el.scrollWidth - el.clientWidth));
      expect(overflows).toEqual([0, 0]);
    });
  }

  for (const width of [375, 768, 1440]) {
    test(`no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('./');
      await page.waitForLoadState('networkidle');
      const { scrollWidth, innerWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
      await page.screenshot({ path: `test-results/screens/home-${width}.png`, fullPage: true });
    });
  }
});
