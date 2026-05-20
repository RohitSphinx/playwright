# Playwright Test Automation — CLAUDE.md

This file is the authoritative guide for writing, reviewing, and maintaining
Playwright tests in this project. Read it completely before writing a single
line of code.

---

## Project Overview

> **Fill in:** describe your app, tech stack, and what's being tested.
> Example: "React SaaS dashboard. Tests cover auth, billing, and settings flows."

---

## Stack & Configuration

```
Playwright version : (e.g. 1.44+)
Language           : TypeScript  ← preferred; use JS only if project is JS-only
Test runner        : @playwright/test (never Jest / Vitest)
Base URL           : process.env.BASE_URL || 'http://localhost:3000'
Browsers tested    : chromium, firefox, webkit
CI platform        : (GitHub Actions / GitLab CI / CircleCI / etc.)
```

---

## Folder Structure

Always use this layout. Never deviate without a comment explaining why.

```
project-root/
├── playwright.config.ts
├── .env                          # local only — gitignored
├── .env.qa                       # QA environment
├── .env.staging                  # staging environment
│
├── pages/                        # Page Object Models
│   ├── base/
│   │   └── BasePage.ts           # abstract base — all POMs extend this
│   ├── auth/
│   │   └── LoginPage.ts
│   └── [module]/                 # one subfolder per application module
│       └── [Feature]Page.ts
│
├── tests/
│   ├── auth/
│   │   └── login.spec.ts
│   ├── [module]/                 # functional tests — one subfolder per module
│   ├── e2e-flows/                # cross-module end-to-end flows
│   ├── ux/                       # UX, visual, responsive, a11y tests
│   │   ├── feedback.ux.spec.ts
│   │   ├── keyboard.ux.spec.ts
│   │   ├── responsive.ux.spec.ts
│   │   ├── visual.ux.spec.ts
│   │   ├── performance.ux.spec.ts
│   │   └── accessibility.ux.spec.ts
│   ├── security/                 # XSS, SQLi, RBAC, IDOR tests
│   │   ├── xss.security.spec.ts
│   │   ├── sqli.security.spec.ts
│   │   ├── auth.security.spec.ts
│   │   └── rbac.security.spec.ts
│   └── performance/              # load and response-time tests
│       └── load.perf.spec.ts
│
├── fixtures/
│   ├── data/                     # typed test data — one file per module
│   │   ├── auth.data.ts
│   │   ├── [module].data.ts
│   │   ├── ux.data.ts            # UX thresholds and viewport presets
│   │   └── security.data.ts      # XSS, SQLi, IDOR payloads
│   ├── factories/                # data factories for DB-seeded records
│   │   └── [entity].factory.ts
│   ├── users.ts                  # persona accounts and storageState paths
│   ├── seed.ts                   # beforeAll API seeders
│   └── teardown.ts               # afterAll API cleanup
│
├── helpers/
│   ├── auth.helper.ts            # login, logout, session management
│   ├── date.helper.ts            # relative date generation, date-picker util
│   ├── api.helper.ts             # direct API calls for setup / teardown / RBAC
│   ├── ux.helper.ts              # assertNoOverflow, measureLCP, assertA11y, etc.
│   └── assertions.helper.ts      # shared custom expect wrappers
│
└── playwright/.auth/             # saved session states — gitignored
    ├── admin.json
    ├── manager.json
    └── user.json
```

---

## Decision Flowchart — What to Create

Follow this sequence before writing any code.

```
Does a Page Object exist for this page?
  NO  → Create pages/[module]/[Name]Page.ts first, then the test
  YES → Import it; never duplicate locators in the test file

Does test data exist in fixtures/data/[module].data.ts?
  NO  → Add the interface and scenario there first
  YES → Import it; never hardcode values in the test

Does the test create a persistent record (DB, API)?
  YES → Use a factory from fixtures/factories/; seed in beforeAll; clean up in afterAll
  NO  → Use static data from fixtures/data/

Is this a UX concern (timing, layout, a11y, visual)?
  YES → tests/ux/
  NO  → Is it a security concern (XSS, SQLi, auth bypass, IDOR)?
    YES → tests/security/
    NO  → Is it a load or response-time concern?
      YES → tests/performance/
      NO  → tests/[module]/
```

---

## Page Object Model

### BasePage — every POM extends this

```typescript
// pages/base/BasePage.ts
import { Page, Locator, expect } from '@playwright/test';

export abstract class BasePage {
  constructor(protected page: Page) {}

  abstract get url(): string;

  async goto(): Promise<void> {
    await this.page.goto(this.url);
    await this.page.waitForLoadState('networkidle', { timeout: 15_000 });
  }

  async expectSuccessToast(msg?: string): Promise<void> {
    const toast = this.page.locator('[role="status"], .toast-success, .alert-success');
    await expect(toast).toBeVisible({ timeout: 5_000 });
    if (msg) await expect(toast).toContainText(msg);
  }

  async expectErrorToast(msg: string): Promise<void> {
    await expect(
      this.page.locator('[role="alert"], .toast-error, .alert-danger')
    ).toContainText(msg, { timeout: 3_000 });
  }
}
```

### Page object template

```typescript
// pages/[module]/[Name]Page.ts
import { Page, Locator, expect } from '@playwright/test';
import { BasePage }              from '../base/BasePage';
import { SomeDataType }          from '../../fixtures/data/[module].data';

export class [Name]Page extends BasePage {
  get url() { return '/path/to/page'; }

  // ── Locators — ALL private, ALL defined in constructor ──────
  private readonly fieldOne:  Locator;
  private readonly fieldTwo:  Locator;
  private readonly submitBtn: Locator;
  private readonly errorMsg:  Locator;

  constructor(page: Page) {
    super(page);
    this.fieldOne  = page.getByLabel('Field One');
    this.fieldTwo  = page.getByRole('combobox', { name: 'Category' });
    this.submitBtn = page.getByRole('button', { name: 'Save' });
    this.errorMsg  = page.locator('.field-error, [role="alert"]');
  }

  // ── Actions — describe business intent, not DOM steps ───────
  async doAction(data: SomeDataType): Promise<void> {
    await this.fieldOne.fill(data.fieldOne);
    await this.fieldTwo.selectOption(data.fieldTwo);
    await this.submitBtn.click();
  }

  // ── Assertions — always prefixed with expect* ────────────────
  async expectSuccess(): Promise<void> {
    await this.expectSuccessToast();
  }

  async expectValidationError(msg: string): Promise<void> {
    await expect(this.errorMsg).toContainText(msg);
  }
}
```

### Page object rules

| Rule | Correct | Wrong |
|---|---|---|
| Locators live | Constructor only | Scattered in methods |
| Locator visibility | `private readonly` | `public` |
| Method names | `submitForm()`, `expectSuccess()` | `clickButton()`, `checkResult()` |
| Test logic | Never inside POM | Inside POM |
| Cross-page calls | Never — tests compose POMs | POM calling another POM |
| Instance per test | Fresh `new Page(page)` per test | Shared across tests |

---

## Test Data Files

### Structure — one file per module

```typescript
// fixtures/data/[module].data.ts

// ── 1. Interfaces ───────────────────────────────────────────
export interface ItemData {
  name:   string;
  amount: number;
  date:   string;   // always '' — fill with date helper at use site
}

// ── 2. Option-value maps — all dropdown values live here ────
export const ItemStatus = {
  Active:   'active',
  Inactive: 'inactive',
  Pending:  'pending',
} as const;

// ── 3. Scenarios ────────────────────────────────────────────
export const itemData = {

  valid: {
    name:   'E2E_Valid Item',
    amount: 100,
    date:   '',        // e.g. futureDateStr(5)
  },

  zeroAmount: {
    name:   'E2E_Zero Amount',
    amount: 0,
    date:   '',
  },

  xssPayload: {
    name:   '<script>alert("xss")</script>',
    amount: 1,
    date:   '',
  },

} satisfies Record<string, ItemData>;
```

### Data file rules

- `satisfies Record<string, Interface>` — always. Never omit it.
- All test-created names / emails / codes use the `E2E_` prefix.
- Date fields are always `''` with a comment naming the helper to call.
- Dropdown values go in `as const` maps — never inline strings in tests.
- Passwords always from `process.env`. Never hardcoded.
- One interface per distinct data shape. Never use `any`.

### Data factories for seeded records

```typescript
// fixtures/factories/[entity].factory.ts
let seq = 0;

export function makeItem(overrides: Partial<ItemData> = {}): ItemData {
  const id = `${process.env.PW_WORKER_INDEX ?? '0'}${(++seq).toString().padStart(3, '0')}`;
  return {
    name:   `E2E_Item_${id}`,
    amount: 50,
    date:   '',
    ...overrides,
  };
}
```

The `PW_WORKER_INDEX` prefix prevents ID collisions in parallel runs.

---

## Environment Variables & Config

### .env files — never commit secrets

```bash
# .env.qa
QA_BASE_URL=https://app.example.com
QA_ADMIN_USER=qa.admin
QA_ADMIN_PASS=           # injected from vault in CI
QA_USER1_USER=qa.user1
QA_USER1_PASS=
API_ADMIN_TOKEN=
```

### Central config — always import from here, never `process.env` directly

```typescript
// fixtures/config.ts
import { config } from 'dotenv';
config({ path: `.env.${process.env.TEST_ENV ?? 'qa'}` });

export const ENV = {
  baseUrl:   process.env.QA_BASE_URL!,
  adminUser: process.env.QA_ADMIN_USER!,
  adminPass: process.env.QA_ADMIN_PASS!,
  user1User: process.env.QA_USER1_USER!,
  user1Pass: process.env.QA_USER1_PASS!,
  apiToken:  process.env.API_ADMIN_TOKEN!,
} as const;
```

---

## Helper Classes

### auth.helper.ts

All login / logout / session logic lives here — never in test files or POMs.

Key exports:
- `loginAs(page, username, password)` — fills form, waits for post-login URL
- `loginAsAdmin(page)`, `loginAsUser(page)` — persona shortcuts using `ENV`
- `saveSession(page, role)` — writes `storageState` to `playwright/.auth/[role].json`
- `logout(page)` — opens the user-menu dropdown first, then clicks the sign-out item
- `expireSession(page)` — overwrites session cookie with a past expiry (for timeout tests)
- `expectLoginError(page, msg?)` — asserts error visible; URL still on login page

> **Important:** sign-out links are typically hidden inside a dropdown. Always
> open the parent container before clicking the sign-out element:
>
> ```typescript
> await page.locator('[data-menu="user-menu"]').click();  // open dropdown
> await page.getByRole('menuitem', { name: 'Sign out' }).click();
> await page.waitForURL('**/login');
> ```

### date.helper.ts

All date generation lives here. Tests never call `new Date()` directly.

Key exports:
- `futureDateStr(daysAhead)` — `dd/mm/yyyy` N days from today
- `pastDateStr(daysBack)` — past date for negative tests
- `fillDatePicker(page, selector, dateStr)` — handles pickers that ignore `.fill()`
- `monthYear(offsetMonths?)` — `{ month, year }` for period dropdowns

### api.helper.ts

Direct HTTP to the application API. Used for test setup / teardown and
post-action assertions that verify server state.

Key exports:
- `apiGet(request, path)`, `apiPost(request, path, data)`, `apiDelete(request, path)`
- `apiCallWithSession(request, page, method, path)` — uses browser cookie for RBAC tests
- `waitForApiResponse(page, urlPattern, action)` — fires action and awaits response simultaneously

### ux.helper.ts

UX-specific helpers. All take `page: Page` as first argument.

Key exports:
- `assertNoHorizontalOverflow(page)` — `scrollWidth <= innerWidth`
- `assertNoConsoleErrors(page)` — attaches listener before navigation; asserts zero errors after networkidle
- `assertNoFailedRequests(page)` — attaches listener; asserts zero 4xx/5xx after networkidle
- `measureLCP(page): Promise<number>` — PerformanceObserver for Largest Contentful Paint
- `measureFCP(page): Promise<number>` — paint entry for First Contentful Paint
- `measureTTFB(response): number` — `response.timing().responseStart`
- `assertTouchTargets(page, selector)` — bounding box ≥ 44×44 px
- `assertHeadingOrder(page)` — no skipped heading levels (h1→h3 without h2 fails)
- `assertSingleH1(page)` — exactly one `<h1>` on the page
- `assertImageAltText(page)` — every `<img>` has non-empty `alt`

### assertions.helper.ts

Reusable `expect` wrappers shared across all test types.

Key exports:
- `expectSuccessToast(page, msg?)` — visible within 5 s
- `expectErrorMessage(page, partialText)` — error locator contains text
- `expectTableRowCount(page, n)` — `tbody tr` count equals n
- `expectStatusBadge(page, rowKey, status)` — row identified by key shows status text

---

## Fixtures — Seed & Teardown

### seed.ts — API only, never UI

```typescript
// fixtures/seed.ts
import { APIRequestContext } from '@playwright/test';
import { makeItem }          from './factories/[entity].factory';
import { apiPost }           from '../helpers/api.helper';

export async function seedItem(
  request: APIRequestContext
): Promise<{ id: string }> {
  const data = makeItem();
  const res  = await apiPost(request, '/items', data);
  if (!res.ok()) throw new Error(`seedItem: ${res.status()}`);
  const body = await res.json();
  return { id: body.id };
}
```

### teardown.ts — delete in FK-safe order

Always delete child records before parent records.

```typescript
// fixtures/teardown.ts
import { APIRequestContext } from '@playwright/test';
import { apiDelete, apiGet } from '../helpers/api.helper';

export async function teardownItem(
  request: APIRequestContext,
  id: string
): Promise<void> {
  const res = await apiDelete(request, `/items/${id}`);
  if (!res.ok() && res.status() !== 404)
    console.warn(`teardownItem: ${res.status()} for id=${id}`);
}

/** Safety sweep — cleans up anything missed by a crashed test */
export async function teardownAllE2ERecords(
  request: APIRequestContext
): Promise<void> {
  const res  = await apiGet(request, '/items?namePrefix=E2E_');
  const list = await res.json() as Array<{ id: string }>;
  for (const item of list) await teardownItem(request, item.id);
}
```

### Usage pattern in tests

```typescript
let item: { id: string };

test.beforeAll(async ({ request }) => {
  item = await seedItem(request);
});

test.afterAll(async ({ request }) => {
  await teardownItem(request, item.id);
});
```

---

## Core Coding Conventions

### Always use the built-in test runner

```typescript
import { test, expect } from '@playwright/test';
// Never import from jest, mocha, or vitest in test files
```

### Locator priority order

```typescript
// ✅ Prefer — resilient, readable
page.getByRole('button', { name: 'Save' })
page.getByLabel('Email address')
page.getByPlaceholder('Search…')
page.getByText('Confirmed', { exact: true })
page.getByTestId('summary-total')       // data-testid fallback

// ❌ Avoid — brittle
page.locator('.btn-primary')
page.locator('#form > div:nth-child(3) > input')
page.locator('xpath=//button[1]')
```

Priority: `getByRole` → `getByLabel` → `getByPlaceholder` → `getByText` →
`getByTestId` → CSS (last resort; comment why).

### Never add arbitrary waits

```typescript
// ❌ Never
await page.waitForTimeout(2000);

// ✅ Wait for a condition instead
await expect(page.getByRole('status')).toHaveText('Saved');
await page.getByRole('button', { name: 'Continue' }).waitFor();
await page.waitForURL('**/dashboard');
await page.waitForLoadState('networkidle');   // use sparingly
```

### Assertions use `expect` from `@playwright/test`

```typescript
// ✅ Auto-retrying (preferred)
await expect(locator).toBeVisible();
await expect(locator).toHaveText('Hello');
await expect(locator).toHaveValue('user@example.com');
await expect(page).toHaveURL('/dashboard');
await expect(page).toHaveTitle(/Dashboard/);

// ✅ Soft assertions — collect all failures before throwing
await expect.soft(locator).toBeVisible();
await expect.soft(page).toHaveTitle('Home');
expect(test.info().errors).toHaveLength(0);

// ❌ Loses auto-retry — avoid when a Playwright assertion exists
const text = await locator.textContent();
expect(text).toBe('Hello');
```

### One logical scenario per test

```typescript
test('user can reset password via email link', async ({ page }) => {
  // Arrange
  await page.goto('/login');

  // Act
  await page.getByRole('link', { name: 'Forgot password' }).click();
  await page.getByLabel('Email').fill('user@example.com');
  await page.getByRole('button', { name: 'Send reset link' }).click();

  // Assert
  await expect(page.getByRole('alert')).toHaveText('Check your email');
});
```

### Descriptive test names

```typescript
// ✅ Reads like a requirement
test('admin can deactivate a user account', ...)
test('payment fails when card is declined', ...)

// ❌ Vague
test('user test 1', ...)
test('button works', ...)
```

---

## Functional & E2E Test Templates

### Single module test

```typescript
// tests/[module]/[feature].spec.ts
import { test, expect }         from '@playwright/test';
import { [Name]Page }           from '../../pages/[module]/[Name]Page';
import { itemData, ItemStatus } from '../../fixtures/data/[module].data';
import { futureDateStr }        from '../../helpers/date.helper';
import { USERS }                from '../../fixtures/users';

test.use({ storageState: USERS.user.storageState });

test.describe('[Module] — [Feature]', () => {

  // TC-[MOD]-001
  test('valid submission creates record with Pending status', async ({ page }) => {
    const p = new NamePage(page);
    await p.goto();
    await p.doAction({ ...itemData.valid, date: futureDateStr(5) });
    await p.expectSuccess();
    await p.expectStatusInList(ItemStatus.Pending);
  });

  // TC-[MOD]-002
  test('zero amount shows validation error', async ({ page }) => {
    const p = new NamePage(page);
    await p.goto();
    await p.doAction(itemData.zeroAmount);
    await p.expectValidationError('Amount must be greater than zero');
  });

});
```

### E2E flow test (multiple personas)

```typescript
// tests/e2e-flows/[flow-name].spec.ts
test('E2E-FLOW-001: user submits — admin approves — status reflects',
  async ({ browser }) => {
    const userCtx  = await browser.newContext({ storageState: USERS.user.storageState });
    const adminCtx = await browser.newContext({ storageState: USERS.admin.storageState });

    const userPage   = await userCtx.newPage();
    const adminPage  = await adminCtx.newPage();
    const submitPage = new SubmitPage(userPage);
    const reviewPage = new ReviewPage(adminPage);

    await submitPage.goto();
    await submitPage.submit({ ...itemData.valid, date: futureDateStr(3) });
    await submitPage.expectSuccess();

    await reviewPage.goto();
    await reviewPage.approveFirstPending();

    const status = await getItemStatus(request, item.id);
    expect(status).toBe(ItemStatus.Approved);

    await userCtx.close();
    await adminCtx.close();
  }
);
```

---

## Authentication Strategy

### Overview — two modes

| Mode | When to use | How it works |
|---|---|---|
| **Automated** (username + password) | App has its own login form; no external IdP | Fill credentials, save `storageState` |
| **Manual / MFA** (Microsoft Entra ID, Okta, etc.) | Login goes through an external IdP or requires MFA | Open headed browser, human completes login, save `storageState` |

Both modes produce the same output — a `playwright/.auth/[role].json` file —
so every test consumes auth state identically regardless of which mode created it.

---

### Mode 1 — Automated login (no MFA)

```typescript
// support/global-setup.ts
import { chromium, FullConfig } from '@playwright/test';
import { ENV }                  from '../fixtures/config';

async function globalSetup(_config: FullConfig) {
  const browser = await chromium.launch();

  for (const [role, creds] of [
    ['admin', { user: ENV.adminUser, pass: ENV.adminPass }],
    ['user',  { user: ENV.user1User, pass: ENV.user1Pass }],
  ] as const) {
    const context = await browser.newContext();
    const page    = await context.newPage();

    await page.goto(`${ENV.baseUrl}/login`);
    await page.getByLabel('Username').fill(creds.user);
    await page.getByLabel('Password').fill(creds.pass);
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.waitForURL('**/dashboard');

    await context.storageState({ path: `playwright/.auth/${role}.json` });
    await context.close();
  }

  await browser.close();
}

export default globalSetup;
```

---

### Mode 2 — Manual MFA login (Microsoft Entra ID / Azure AD / Okta)

Use this when the app redirects to an external identity provider.
The browser opens headed; the developer completes login + MFA once;
the session is saved and reused for the entire test run.

```typescript
// support/global-setup.ts
import { chromium, FullConfig } from '@playwright/test';
import dotenv from 'dotenv';
import path   from 'path';
import fs     from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// One entry per persona that needs a separate session
const PERSONAS: Array<{ role: string; authFile: string }> = [
  { role: 'admin', authFile: 'playwright/.auth/admin.json' },
  { role: 'user',  authFile: 'playwright/.auth/user.json'  },
];

const BASE_URL   = process.env.QA_BASE_URL!;
const MFA_TIMEOUT = 3 * 60 * 1000;  // 3 minutes — enough for authenticator app

async function globalSetup(_config: FullConfig) {
  for (const persona of PERSONAS) {
    await setupPersona(persona);
  }
}

async function setupPersona({ role, authFile }: { role: string; authFile: string }) {
  // Skip if a recent valid session already exists (avoids re-login on every run)
  if (isSessionFresh(authFile)) {
    console.log(`[setup:${role}] Reusing existing session (less than 8 h old)`);
    return;
  }

  console.log(`\n[setup:${role}] ──────────────────────────────────────────`);
  console.log(`[setup:${role}] Opening browser — log in as the ${role} account.`);
  console.log(`[setup:${role}] Complete MFA when prompted, then wait for the`);
  console.log(`[setup:${role}] dashboard to fully load. Browser closes automatically.`);
  console.log(`[setup:${role}] ──────────────────────────────────────────\n`);

  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized'],
  });
  const context = await browser.newContext({
    viewport: null,                // use maximised window size
    ignoreHTTPSErrors: false,
  });
  const page = await context.newPage();

  // Navigate to app — it will redirect to the IdP automatically
  await page.goto(BASE_URL);

  // Wait until the browser is fully back on our domain, past the IdP and MFA screens
  await page.waitForURL(
    url =>
      url.toString().startsWith(BASE_URL) &&
      !url.toString().includes('login.microsoftonline.com') &&
      !url.toString().includes('login.windows.net') &&
      !url.toString().includes('/login'),
    { timeout: MFA_TIMEOUT }
  );

  // Wait for the page to settle — cookies are sometimes written after the redirect
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle', { timeout: 15_000 });

  console.log(`[setup:${role}] Landed on: ${page.url()}`);

  // Persist session
  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  await context.storageState({ path: authFile });
  await browser.close();

  // Validate the saved state is non-empty
  validateSession(authFile, role);
}

/** Returns true if the auth file exists and was written less than 8 hours ago. */
function isSessionFresh(authFile: string): boolean {
  if (!fs.existsSync(authFile)) return false;
  const ageMs = Date.now() - fs.statSync(authFile).mtimeMs;
  return ageMs < 8 * 60 * 60 * 1000;
}

/** Throws if the saved storageState has no cookies and no localStorage origins. */
function validateSession(authFile: string, role: string): void {
  const saved = JSON.parse(fs.readFileSync(authFile, 'utf-8'));
  const cookieCount = saved.cookies?.length ?? 0;
  const originCount = saved.origins?.length ?? 0;

  if (cookieCount === 0 && originCount === 0) {
    throw new Error(
      `[setup:${role}] Session saved to ${authFile} appears empty ` +
      `(0 cookies, 0 origins). Login may not have completed. ` +
      `Delete ${authFile} and re-run setup.`
    );
  }

  console.log(
    `[setup:${role}] Session saved — ${cookieCount} cookies, ${originCount} origins`
  );
}

export default globalSetup;
```

---

### Session freshness — when to re-authenticate

| Situation | Action |
|---|---|
| First run on a new machine | Delete `playwright/.auth/*.json` — setup opens headed browser |
| Session older than 8 h (configurable) | `isSessionFresh()` returns false — setup re-authenticates automatically |
| Azure AD token expired mid-suite | Delete `playwright/.auth/[role].json` and re-run `npx playwright test --project=setup` |
| New persona added | Add entry to `PERSONAS` array; run `npx playwright test --project=setup` |
| CI environment (no MFA) | Use a service account with MFA disabled or use app-only token auth — never try to automate MFA prompts |

---

### Forcing a session refresh

```bash
# Delete one persona's session and re-run setup
rm playwright/.auth/admin.json
npx playwright test --project=setup

# Nuke all sessions and start fresh
rm -rf playwright/.auth/
npx playwright test --project=setup
```

---

### CI considerations for MFA

**Option A — service account (recommended)**
Create a dedicated test account in Azure AD with MFA disabled or excluded from
the Conditional Access policy for the test runner's IP range. Store credentials
as CI secrets; use Mode 1 (automated) for that account.

**Option B — pre-baked session in CI secrets**
Run Mode 2 locally, copy the `playwright/.auth/admin.json` content into a CI
secret (`AUTH_ADMIN_JSON`), write it to disk at the start of the CI job:

```yaml
- name: Restore auth sessions
  run: |
    mkdir -p playwright/.auth
    echo '${{ secrets.AUTH_ADMIN_JSON }}' > playwright/.auth/admin.json
    echo '${{ secrets.AUTH_USER_JSON }}'  > playwright/.auth/user.json
```

> **Important:** Azure AD sessions typically last 1–24 hours depending on
> tenant policy. Rotate the secret on a schedule or your CI will start failing
> with silent redirects to the login page.

**Option C — `--headed` on a CI machine with display (less common)**
Use `xvfb-run` on Linux CI runners to open a headed browser, but this requires
a human to monitor and complete MFA — not practical for fully automated pipelines.

---

### How tests consume the session (unchanged regardless of mode)

```typescript
// fixtures/users.ts
export const USERS = {
  admin: { storageState: 'playwright/.auth/admin.json' },
  user:  { storageState: 'playwright/.auth/user.json'  },
} as const;
```

```typescript
// Any test file — same pattern whether MFA or not
import { test } from '@playwright/test';
import { USERS } from '@fixtures/users';

test.use({ storageState: USERS.admin.storageState });

test('admin sees the reports menu', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByRole('link', { name: 'Reports' })).toBeVisible();
});
```

```typescript
// playwright.config.ts — setup project depends on auth file existing
{
  name: 'setup',
  testMatch: /global\.setup\.ts/,
  // No storageState here — setup IS what creates the file
},
{
  name: 'functional',
  dependencies: ['setup'],
  use: { storageState: 'playwright/.auth/admin.json' },
  testIgnore: ['**/ux/**', '**/security/**', '**/performance/**'],
},
```

---

## API Mocking & Interception

```typescript
// Stub a failing endpoint
test('shows error when API fails', async ({ page }) => {
  await page.route('**/api/items', route =>
    route.fulfill({ status: 500, body: 'Internal Server Error' })
  );
  await page.goto('/items');
  await expect(page.getByRole('alert')).toHaveText('Failed to load items');
});

// Spy on a request payload
test('form submits correct payload', async ({ page }) => {
  let requestBody: unknown;
  await page.route('**/api/items', async route => {
    requestBody = JSON.parse(route.request().postData() ?? '{}');
    await route.continue();
  });
  // … perform action …
  expect(requestBody).toMatchObject({ status: 'active' });
});

// Block third-party noise to speed up tests
await page.route('**/*analytics*', route => route.abort());
await page.route('**/*hotjar*',    route => route.abort());
```

---

## UX Tests

All UX tests go in `tests/ux/`. Import thresholds from `fixtures/data/ux.data.ts`.
Set `retries: 0` in the ux-tests project — a flaky UX test is a UX bug.

```typescript
// tests/ux/feedback.ux.spec.ts

// TC-UX-FB-001
test('success toast appears and auto-dismisses', async ({ page }) => {
  await page.goto('/items/new');
  await page.getByRole('button', { name: 'Save' }).click();
  const toast = page.getByRole('status');
  await expect(toast).toBeVisible({ timeout: 3_000 });
  await expect(toast).not.toBeVisible({ timeout: uxData.toast.dismissTimeout });
});

// TC-UX-KEY-001
test('form tab order follows visual layout', async ({ page }) => {
  await page.goto('/login');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Username')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Password')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Log in' })).toBeFocused();
});

// TC-UX-RESP-001
test('no horizontal overflow on mobile viewport', async ({ page }) => {
  await page.goto('/dashboard');
  await assertNoHorizontalOverflow(page);
});

// TC-UX-VIS-001
test('dashboard matches visual baseline', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveScreenshot('tc-ux-vis-001-dashboard.png', {
    maxDiffPixels: uxData.visual.maxDiffPixels,
    mask: [page.locator('.live-clock, .user-avatar')],
  });
});

// TC-UX-PERF-001
test('dashboard LCP under threshold', async ({ page }) => {
  await page.goto('/dashboard');
  const lcp = await measureLCP(page);
  expect(lcp).toBeLessThan(uxData.perf.lcp);
});
```

---

## Security Tests

All security tests go in `tests/security/`. Import payloads from
`fixtures/data/security.data.ts`. These tests assert that attacks are rejected.

```typescript
// fixtures/data/security.data.ts
export const xssPayloads = [
  '<script>alert("xss")</script>',
  '"><img src=x onerror=alert(1)>',
  'javascript:alert(1)',
] as const;

export const sqliPayloads = [
  "' OR '1'='1",
  "'; DROP TABLE users; --",
  "1; SELECT * FROM accounts",
] as const;
```

```typescript
// tests/security/xss.security.spec.ts

// TC-SEC-XSS-001
for (const payload of securityData.xssPayloads) {
  test(`XSS payload rejected in login field: ${payload.slice(0, 30)}`,
    async ({ page }) => {
      let alertFired = false;
      page.on('dialog', async d => { alertFired = true; await d.dismiss(); });

      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(payload, 'anything');
      await loginPage.expectStillOnLoginPage();
      expect(alertFired).toBe(false);
    }
  );
}

// TC-SEC-RBAC-001
test('regular user session rejected by admin API', async ({ page, request }) => {
  await loginAsUser(page);
  const { status } = await apiCallWithSession(
    request, page, 'GET', '/api/admin/reports'
  );
  expect(status).toBe(403);
});

// TC-SEC-IDOR-001
test('user cannot access another user record via URL manipulation',
  async ({ page }) => {
    await loginAsUser(page);
    await page.goto(`/records/${otherUserId}`);
    const denied     = await page.getByRole('heading', { name: /access denied|not found/i }).isVisible();
    const redirected = page.url().includes('/dashboard') || page.url().includes('/login');
    expect(denied || redirected).toBe(true);
  }
);
```

---

## Performance Tests

All timing tests go in `tests/performance/`. All thresholds from `fixtures/data/ux.data.ts`.

```typescript
// TC-PERF-001
test('page TTFB under threshold', async ({ page }) => {
  const [response] = await Promise.all([
    page.waitForResponse('**/dashboard**'),
    page.goto('/dashboard'),
  ]);
  expect(measureTTFB(response)).toBeLessThan(uxData.perf.ttfb);
});

// TC-PERF-002
test('no failed requests on page load', async ({ page }) => {
  await assertNoFailedRequests(page);   // attaches listener
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
});

// TC-PERF-003 — concurrent mutation handled correctly
test('concurrent writes are serialised or one is rejected', async ({ browser }) => {
  const ctxA = await browser.newContext({ storageState: USERS.admin.storageState });
  const ctxB = await browser.newContext({ storageState: USERS.admin.storageState });

  const [resultA, resultB] = await Promise.all([
    new ActionPage(await ctxA.newPage()).performWrite(TEST_PERIOD),
    new ActionPage(await ctxB.newPage()).performWrite(TEST_PERIOD),
  ]);

  const results = [resultA, resultB];
  expect(results.filter(r => r === 'success')).toHaveLength(1);
  expect(results.filter(r => r === 'conflict')).toHaveLength(1);

  await ctxA.close();
  await ctxB.close();
});
```

---

## Accessibility Tests

```typescript
// tests/ux/accessibility.ux.spec.ts
import { checkA11y } from '@axe-core/playwright';

// TC-UX-A11Y-001
test('page passes WCAG 2.1 AA', async ({ page }) => {
  await page.goto('/dashboard');
  await checkA11y(page, undefined, {
    runOnly:         { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
    includedImpacts: ['critical', 'serious'],
  });
});

// TC-UX-A11Y-002
test('every form input has an associated label', async ({ page }) => {
  await page.goto('/items/new');
  const inputs = page.locator('input:not([type=hidden]), select, textarea');
  const count  = await inputs.count();
  for (let i = 0; i < count; i++) {
    const input = inputs.nth(i);
    const id    = await input.getAttribute('id');
    if (id) {
      await expect(
        page.locator(`label[for="${id}"]`),
        `No label for #${id}`
      ).toBeAttached();
    }
  }
});

// TC-UX-A11Y-003
test('page has exactly one h1', async ({ page }) => {
  await page.goto('/dashboard');
  await assertSingleH1(page);
});

// TC-UX-A11Y-004
test('heading levels are not skipped', async ({ page }) => {
  await page.goto('/dashboard');
  await assertHeadingOrder(page);
});
```

---

## `playwright.config.ts` — Reference Config

```typescript
import { defineConfig, devices } from '@playwright/test';
import { config }                from 'dotenv';
config({ path: `.env.${process.env.TEST_ENV ?? 'qa'}` });

export default defineConfig({
  testDir:        './tests',
  fullyParallel:  true,
  forbidOnly:     !!process.env.CI,
  retries:        process.env.CI ? 1 : 0,
  workers:        process.env.CI ? 4 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ...(process.env.CI ? [['github'] as [string]] : []),
  ],
  use: {
    baseURL:           process.env.QA_BASE_URL ?? 'http://localhost:3000',
    trace:             'on-first-retry',
    screenshot:        'only-on-failure',
    video:             'retain-on-failure',
    actionTimeout:     10_000,
    navigationTimeout: 30_000,
  },
  projects: [
    // ── Auth setup — runs once, saves session files ─────────
    { name: 'setup', testMatch: /global\.setup\.ts/ },

    // ── Functional tests ────────────────────────────────────
    {
      name:       'functional',
      testIgnore: ['**/ux/**', '**/security/**', '**/performance/**'],
      use:        { storageState: 'playwright/.auth/admin.json' },
      dependencies: ['setup'],
    },

    // ── UX tests — no retries, longer timeout ────────────────
    {
      name:        'ux-tests',
      testDir:     './tests/ux',
      timeout:     60_000,
      retries:     0,           // flaky UX test = UX bug — never retry
      snapshotDir: './tests/ux/snapshots',
      use:         { storageState: 'playwright/.auth/user.json' },
      dependencies: ['setup'],
    },

    // ── Security tests — no retries ──────────────────────────
    {
      name:    'security',
      testDir: './tests/security',
      retries: 0,
      dependencies: ['setup'],
    },

    // ── Performance tests ────────────────────────────────────
    {
      name:    'performance',
      testDir: './tests/performance',
      timeout: 120_000,
      retries: 0,
      dependencies: ['setup'],
    },

    // ── Mobile viewport (UX subset) ──────────────────────────
    {
      name:    'mobile',
      testDir: './tests/ux',
      use:     { ...devices['iPhone 14'] },
      dependencies: ['setup'],
    },

    // ── Cross-browser ────────────────────────────────────────
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit',   use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command:             'npm run dev',
    url:                 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout:             120_000,
  },
});
```

---

## CI / GitHub Actions

```yaml
# .github/workflows/playwright.yml
name: Playwright Tests

on:
  push:
    branches: [main, develop]
  pull_request:
  schedule:
    - cron: '0 2 * * *'   # nightly full suite

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        suite: [functional, ux-tests, security, performance]
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run ${{ matrix.suite }} tests
        run: npx playwright test --project=${{ matrix.suite }}
        env:
          TEST_ENV:        qa
          QA_BASE_URL:     ${{ secrets.QA_BASE_URL }}
          QA_ADMIN_USER:   ${{ secrets.QA_ADMIN_USER }}
          QA_ADMIN_PASS:   ${{ secrets.QA_ADMIN_PASS }}
          API_ADMIN_TOKEN: ${{ secrets.API_ADMIN_TOKEN }}

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report-${{ matrix.suite }}
          path: playwright-report/
          retention-days: 30
```

---

## Naming Conventions

| Item | Convention | Example |
|---|---|---|
| Spec files | `[feature].spec.ts` or `[feature].[suite].spec.ts` | `create-item.spec.ts`, `xss.security.spec.ts` |
| Page objects | `[Name]Page.ts` | `CreateItemPage.ts` |
| Data files | `[module].data.ts` | `items.data.ts` |
| Factory files | `[entity].factory.ts` | `item.factory.ts` |
| Helper files | `[concern].helper.ts` | `date.helper.ts` |
| Test IDs | `TC-[MOD]-[NNN]` | `TC-AUTH-003`, `TC-SEC-XSS-001` |
| Snapshot files | `tc-ux-vis-[nnn]-[page].png` | `tc-ux-vis-001-dashboard.png` |
| Test record prefix | `E2E_` | `E2E_Test_Item_001` |
| Env vars | `[ENV]_[SCOPE]_[FIELD]` | `QA_ADMIN_PASS`, `QA_BASE_URL` |

---

## Debugging

```bash
# Visual test explorer (best for local development)
npx playwright test --ui

# Run headed
npx playwright test --headed

# Single file
npx playwright test tests/[module]/feature.spec.ts

# Filter by title
npx playwright test -g "login"

# Interactive debugger
npx playwright test tests/auth/login.spec.ts --debug

# Record new tests
npx playwright codegen http://localhost:3000

# Open last HTML report
npx playwright show-report
```

---

## Tags & Test Selection

```typescript
// Tag tests for selective runs
test('submit flow @smoke', async ({ page }) => { ... });
test('bulk export @regression', async ({ page }) => { ... });

// npx playwright test --grep @smoke

// Skip — mandatory comment + issue link
test.skip('intermittent network failure — see #1234', async ({ page }) => { ... });

// Known failure — still runs, expected to fail
test.fail('upstream bug — #5678', async ({ page }) => { ... });

// Isolate during development — NEVER commit
test.only('debugging this scenario', async ({ page }) => { ... });
```

---

## Visual Testing

```typescript
// Full-page snapshot
await expect(page).toHaveScreenshot('dashboard.png', {
  maxDiffPixelRatio: 0.02,   // 2% tolerance
  mask: [page.locator('.live-clock, .user-avatar')],
});

// Component snapshot
await expect(page.getByTestId('summary-card')).toHaveScreenshot();

// Update: npx playwright test --update-snapshots
// Stored in: tests/ux/snapshots/  (configured in playwright.config.ts)
```

---

## Anti-Patterns — Never Do These

```typescript
// ✗ Locator in test file
await page.locator('#ddlCategory').selectOption('Active');
// ✓ Through POM
await itemPage.setCategory(ItemStatus.Active);

// ✗ Hardcoded credential
await loginPage.login('qa.admin', 'MyPassword123');
// ✓ From ENV / USERS
await loginPage.login(ENV.adminUser, ENV.adminPass);

// ✗ Hardcoded date
await page.fill('#datePicker', '15/06/2026');
// ✓ Relative date from helper
await fillDatePicker(page, '#datePicker', futureDateStr(5));

// ✗ Hardcoded threshold
expect(lcp).toBeLessThan(3000);
// ✓ Threshold from data file
expect(lcp).toBeLessThan(uxData.perf.lcp);

// ✗ Arbitrary wait
await page.waitForTimeout(2000);
// ✓ Condition-based wait
await expect(page.getByRole('status')).toHaveText('Saved');

// ✗ POM calling another POM
class SubmitPage {
  async submit() {
    await this.save();
    const review = new ReviewPage(this.page);   // NEVER
    await review.approve();
  }
}
// ✓ Test composes POMs
await submitPage.submit(data);
await reviewPage.approveFirstPending();

// ✗ Seed in beforeEach (re-creates every test — slow, causes collisions)
test.beforeEach(async ({ request }) => { item = await seedItem(request); });
// ✓ Seed once per describe block
test.beforeAll(async ({ request }) => { item = await seedItem(request); });

// ✗ Retries on UX / security / performance tests
retries: 2   // in ux-tests, security, or performance project
// ✓ Retries only on functional
retries: process.env.CI ? 1 : 0
```

---

## Pre-Commit Checklist

**Page Object**
- [ ] Extends `BasePage`
- [ ] `get url()` implemented
- [ ] All locators `private readonly`, defined in constructor
- [ ] Methods describe business actions, not DOM steps
- [ ] Assertion methods prefixed with `expect`
- [ ] No test logic inside the class
- [ ] No cross-POM calls

**Test File**
- [ ] TC-ID comment above every `test()`
- [ ] `test.use({ storageState })` at describe level, not per-test
- [ ] No inline `page.locator()` — all through POM
- [ ] No hardcoded dates — uses `date.helper.ts`
- [ ] No hardcoded credentials — uses `USERS` or `ENV`
- [ ] No hardcoded threshold numbers — uses data file
- [ ] `beforeAll` for seeding, `afterAll` for teardown
- [ ] Each test fully independent of others
- [ ] No committed `test.only`

**Data File**
- [ ] Interface exported for every data shape
- [ ] `as const` on all option-value maps
- [ ] `satisfies Record<string, Interface>` on every data object
- [ ] Date fields are `''` with a comment naming the helper
- [ ] Passwords from `process.env`, never hardcoded
- [ ] All test records use `E2E_` prefix

**Suite Placement**
- [ ] UX concerns → `tests/ux/`
- [ ] Security concerns → `tests/security/`
- [ ] Load / timing → `tests/performance/`
- [ ] Module functional → `tests/[module]/`
- [ ] Cross-module flows → `tests/e2e-flows/`

**Config**
- [ ] UX project: `retries: 0`, `timeout: 60_000`
- [ ] Security / performance projects: `retries: 0`
- [ ] Snapshots stored in `tests/ux/snapshots/`
- [ ] All secrets from CI vault, not committed files

---

## What Claude Should Always Do

- Use TypeScript; never use `any`
- Import from `@playwright/test` only — never jest / mocha / vitest
- Extend `BasePage` for every new page object
- Define all locators `private readonly` in the POM constructor
- Use `getByRole` / `getByLabel` before CSS selectors
- Use `await expect(locator).toX()` instead of raw DOM reads
- Put all date logic in `date.helper.ts`; never call `new Date()` in tests
- Put all thresholds in `fixtures/data/ux.data.ts`; never inline numbers
- Seed via API in `beforeAll`; tear down in `afterAll`
- Keep every test fully independent

## What Claude Should Never Do

- Add `waitForTimeout` for any reason
- Write locators directly in test files
- Hardcode credentials, dates, or threshold values
- Create POM methods that call other POMs
- Set retries on UX, security, or performance test projects
- Leave `test.only` or un-explained `test.skip` in committed code
- Put assertions inside page object action methods
- Seed test data in `beforeEach` when `beforeAll` is sufficient

---

## TypeScript Configuration

Every project must have a `tsconfig.json` with path aliases so imports are
short and refactoring-safe. Never use deep relative paths like `../../../../`.

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "target":      "ES2022",
    "module":      "commonjs",
    "lib":         ["ES2022"],
    "strict":      true,
    "noUnusedLocals":     true,
    "noUnusedParameters": true,
    "noImplicitAny":      true,
    "baseUrl": ".",
    "paths": {
      "@pages/*":    ["pages/*"],
      "@fixtures/*": ["fixtures/*"],
      "@helpers/*":  ["helpers/*"],
      "@tests/*":    ["tests/*"]
    },
    "outDir": "dist",
    "esModuleInterop": true,
    "resolveJsonModule": true
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules", "dist", "playwright-report"]
}
```

With aliases, imports become:

```typescript
// ✅ With alias
import { LoginPage }  from '@pages/auth/LoginPage';
import { itemData }   from '@fixtures/data/items.data';
import { futureDateStr } from '@helpers/date.helper';

// ❌ Without alias
import { LoginPage }  from '../../../../pages/auth/LoginPage';
```

---

## Linting & Formatting

### ESLint config

```jsonc
// .eslintrc.json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint", "playwright"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:playwright/recommended"
  ],
  "rules": {
    // Playwright-specific
    "playwright/no-wait-for-timeout":        "error",   // enforces no waitForTimeout
    "playwright/no-focused-test":            "error",   // no committed test.only
    "playwright/no-skipped-test":            "warn",    // warn on test.skip without reason
    "playwright/expect-expect":              "error",   // every test must have an assertion
    "playwright/no-conditional-in-test":     "warn",    // flag branching test logic
    "playwright/no-useless-await":           "error",

    // TypeScript
    "@typescript-eslint/no-explicit-any":    "error",
    "@typescript-eslint/no-floating-promises": "error", // catch missing await
    "@typescript-eslint/explicit-function-return-type": "off",

    // General
    "no-console": ["warn", { "allow": ["warn", "error"] }]
  }
}
```

### Prettier config

```jsonc
// .prettierrc
{
  "semi":         true,
  "singleQuote":  true,
  "printWidth":   100,
  "trailingComma": "es5",
  "tabWidth":     2
}
```

### Pre-commit hooks (Husky + lint-staged)

```bash
npm install --save-dev husky lint-staged
npx husky init
```

```jsonc
// package.json (relevant section)
{
  "lint-staged": {
    "**/*.ts": [
      "eslint --fix",
      "prettier --write"
    ]
  },
  "scripts": {
    "lint":        "eslint . --ext .ts",
    "lint:fix":    "eslint . --ext .ts --fix",
    "format":      "prettier --write .",
    "typecheck":   "tsc --noEmit",
    "test":        "playwright test",
    "test:smoke":  "playwright test --grep @smoke",
    "test:ux":     "playwright test --project=ux-tests",
    "test:security": "playwright test --project=security"
  }
}
```

```bash
# .husky/pre-commit
npx lint-staged
npx tsc --noEmit   # fail commit if TypeScript errors exist
```

---

## Test Reporting & Observability

### Allure reporter (recommended for enterprise)

```bash
npm install --save-dev allure-playwright
```

```typescript
// playwright.config.ts — reporter section
reporter: [
  ['list'],
  ['allure-playwright', {
    detail:      true,
    outputFolder: 'allure-results',
    suiteTitle:  false,
  }],
  ...(process.env.CI ? [['github'] as [string]] : []),
],
```

```bash
# View report locally
npx allure generate allure-results --clean -o allure-report
npx allure open allure-report
```

### Annotating tests for Allure

```typescript
import { test } from '@playwright/test';
import { allure } from 'allure-playwright';

test('TC-AUTH-001: valid login redirects to dashboard', async ({ page }) => {
  await allure.suite('Authentication');
  await allure.severity('critical');
  await allure.story('Login');
  await allure.description('Verifies that a valid user is redirected after login.');

  // … test body …
});
```

### Slack / Teams notification on CI failure

```yaml
# .github/workflows/playwright.yml — add after test step
- name: Notify Slack on failure
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {
        "text": "❌ Playwright *${{ matrix.suite }}* failed on `${{ github.ref_name }}`",
        "attachments": [{
          "color": "danger",
          "fields": [
            { "title": "Branch",   "value": "${{ github.ref_name }}", "short": true },
            { "title": "Run",      "value": "${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}", "short": false }
          ]
        }]
      }
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

---

## Flakiness Management & Quarantine

Never delete a flaky test. Never silently retry it away. Quarantine and track it.

### Quarantine pattern

```typescript
// helpers/quarantine.ts
import { test as base } from '@playwright/test';

/**
 * Marks a test as quarantined — runs it but does not fail the suite.
 * Every quarantined test MUST have a linked issue.
 * Review quarantine list every sprint.
 */
export function quarantine(issueUrl: string) {
  return base.extend({})
    .extend({ _quarantine: [async ({}, use) => { await use(undefined); }, { auto: true }] })
    .fail(`Quarantined — ${issueUrl}`);
}
```

```typescript
// Usage
import { quarantine } from '@helpers/quarantine';

// This test is known-flaky — tracked in issue #1234
// It still runs and its failure is expected, not suite-breaking
quarantine('https://github.com/org/repo/issues/1234')(
  'TC-PERF-003: dashboard load time under 2s',
  async ({ page }) => { /* … */ }
);
```

### Flakiness tracking in CI

```yaml
# playwright.config.ts — enable built-in flakiness detection
reporter: [
  ['html'],
  ['json', { outputFile: 'test-results/results.json' }],
],
```

```bash
# Identify flaky tests from JSON output
# A test that passes on retry = flaky candidate
jq '[.suites[].specs[] | select(.tests[].results | map(.retry > 0 and .status == "passed") | any)]' \
  test-results/results.json
```

---

## Multi-Environment Promotion Strategy

### Environment matrix

| Environment | Trigger | Suite | Gate |
|---|---|---|---|
| `local` | developer | smoke only | none |
| `qa` | every PR | functional + security | PR merge blocked on failure |
| `staging` | merge to `main` | full suite | deploy blocked on failure |
| `prod` | post-deploy | smoke only | rollback trigger |

### Environment-specific config files

```
.env.local     # developer machine — gitignored
.env.qa        # QA — committed (no secrets)
.env.staging   # staging — committed (no secrets)
.env.prod      # prod smoke — committed (no secrets; prod secrets from vault)
```

### Promoting test runs in CI

```yaml
# Run smoke only against production after deploy
- name: Post-deploy smoke check
  run: npx playwright test --grep @smoke --project=functional
  env:
    TEST_ENV: prod
    QA_BASE_URL: ${{ secrets.PROD_BASE_URL }}
```

---

## API-Only Tests (No Browser)

Some tests verify backend behaviour without needing a browser. These live
in `tests/api/` and use Playwright's `request` fixture directly.

```
tests/
└── api/                          # API-only tests — no page, no browser
    ├── auth.api.spec.ts
    ├── items.api.spec.ts
    └── rbac.api.spec.ts
```

```typescript
// tests/api/items.api.spec.ts
import { test, expect } from '@playwright/test';
import { ENV }          from '@fixtures/config';

// No storageState needed — uses API token directly
test.use({ baseURL: ENV.baseUrl });

test.describe('Items API', () => {

  // TC-API-001
  test('POST /items creates item and returns 201', async ({ request }) => {
    const res = await request.post('/api/items', {
      headers: { Authorization: `Bearer ${ENV.apiToken}` },
      data:    { name: 'E2E_API_Item', amount: 10 },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({ name: 'E2E_API_Item', status: 'pending' });
  });

  // TC-API-002
  test('GET /items/:id returns 404 for unknown id', async ({ request }) => {
    const res = await request.get('/api/items/nonexistent-id', {
      headers: { Authorization: `Bearer ${ENV.apiToken}` },
    });
    expect(res.status()).toBe(404);
  });

});
```

Add an `api` project in `playwright.config.ts`:

```typescript
{
  name:    'api',
  testDir: './tests/api',
  use:     { baseURL: process.env.QA_BASE_URL },
  // No browser — no storageState, no setup dependency needed for token-auth tests
},
```

---

## Network Conditions & Browser Context Options

```typescript
// Simulate slow network (e.g. for resilience tests)
test('form submission works on slow 3G', async ({ browser }) => {
  const context = await browser.newContext();
  const page    = await context.newPage();

  await context.route('**/*', async route => {
    await new Promise(r => setTimeout(r, 300));  // add 300ms latency
    await route.continue();
  });

  await page.goto('/items/new');
  // … proceed normally
  await context.close();
});

// Simulate offline
test('app shows offline banner when network is lost', async ({ page }) => {
  await page.goto('/dashboard');
  await page.context().setOffline(true);
  await page.getByRole('button', { name: 'Refresh' }).click();
  await expect(page.getByRole('alert')).toContainText('No internet connection');
  await page.context().setOffline(false);
});

// Geolocation
test('location-aware feature shows correct region', async ({ browser }) => {
  const context = await browser.newContext({
    geolocation: { latitude: 51.5074, longitude: -0.1278 },  // London
    permissions: ['geolocation'],
  });
  const page = await context.newPage();
  await page.goto('/settings/region');
  await expect(page.getByTestId('detected-region')).toHaveText('Europe/London');
  await context.close();
});

// Timezone
const context = await browser.newContext({ timezoneId: 'America/New_York' });

// Locale / language
const context = await browser.newContext({ locale: 'fr-FR' });
```

---

## `.gitignore` — Required Entries

```gitignore
# Playwright
playwright-report/
playwright/.auth/
allure-results/
allure-report/
test-results/
blob-report/
/dist

# Environment secrets
.env
.env.local
*.local

# Node
node_modules/

# OS
.DS_Store
Thumbs.db
```

> **Secret scanning:** add `gitleaks` or GitHub's push-protection to block
> committed secrets at the repo level. Never rely on `.gitignore` alone.

---

## Onboarding — Day-One Setup

Document this in `README.md`. Every new team member must be able to run
the full suite from scratch without asking anyone.

```markdown
## Running the tests

### Prerequisites
- Node.js 20+
- Access to the team's secrets vault (ask your lead for the `.env.qa` values)

### First-time setup
```bash
npm install
npx playwright install --with-deps   # install browsers
cp .env.example .env                 # copy template, then fill in secrets
```

### Run the suite
```bash
# All functional tests (QA env)
npm test

# Smoke only (fast — ~2 min)
npm run test:smoke

# UX suite
npm run test:ux

# Security suite
npm run test:security

# Single file
npx playwright test tests/auth/login.spec.ts

# Debug interactively
npx playwright test tests/auth/login.spec.ts --debug

# Visual test explorer
npx playwright test --ui
```

### Updating visual snapshots
```bash
npx playwright test --update-snapshots --project=ux-tests
# Review the diff in the HTML report before committing
npx playwright show-report
```

### Viewing reports
- HTML report auto-opens after a run, or: `npx playwright show-report`
- Allure report: `npx allure generate allure-results && npx allure open`
```

---

## `package.json` — Canonical Scripts

```jsonc
{
  "scripts": {
    "test":              "playwright test --project=functional",
    "test:smoke":        "playwright test --grep @smoke",
    "test:regression":   "playwright test --grep @regression",
    "test:ux":           "playwright test --project=ux-tests",
    "test:security":     "playwright test --project=security",
    "test:performance":  "playwright test --project=performance",
    "test:api":          "playwright test --project=api",
    "test:all":          "playwright test",
    "test:headed":       "playwright test --headed",
    "test:debug":        "playwright test --debug",
    "test:update-snapshots": "playwright test --update-snapshots --project=ux-tests",
    "lint":              "eslint . --ext .ts",
    "lint:fix":          "eslint . --ext .ts --fix",
    "typecheck":         "tsc --noEmit",
    "format":            "prettier --write .",
    "report":            "playwright show-report",
    "report:allure":     "allure generate allure-results --clean -o allure-report && allure open allure-report",
    "prepare":           "husky"
  }
}
```

---

## Test Coverage Strategy — Tagging Policy

Every test must carry exactly one priority tag and one or more type tags.

### Priority tags

| Tag | Meaning | When it runs |
|---|---|---|
| `@smoke` | Core happy paths — suite must pass before any deploy | Every PR + post-deploy |
| `@regression` | Full business-rule coverage | Nightly + pre-release |
| `@extended` | Edge cases, negative paths, low-risk areas | Nightly only |

### Type tags (combine with priority)

```typescript
test('TC-AUTH-001: valid login @smoke @auth',          ...)
test('TC-AUTH-005: session expires after timeout @regression @auth @security', ...)
test('TC-ITEM-012: bulk import 500 rows @extended @items @performance', ...)
```

### Running by tag

```bash
npx playwright test --grep "@smoke"
npx playwright test --grep "@regression"
npx playwright test --grep "@smoke and @auth"
npx playwright test --grep-invert "@extended"   # exclude slow tests
```

### Coverage matrix (fill in per project)

| Module | Smoke | Regression | Extended | Total |
|---|---|---|---|---|
| Auth | - | - | - | - |
| [Module] | - | - | - | - |
| API | - | - | - | - |
| Security | - | - | - | - |

---

## Folder Structure — Final Complete View

Combining all additions above, the canonical structure is:

```
project-root/
├── playwright.config.ts
├── tsconfig.json
├── .eslintrc.json
├── .prettierrc
├── .gitignore
├── .env.example                  # committed template — no real values
├── .env                          # local — gitignored
├── .env.qa
├── .env.staging
├── .env.prod
├── .husky/
│   └── pre-commit
│
├── pages/
│   ├── base/BasePage.ts
│   ├── auth/LoginPage.ts
│   └── [module]/[Feature]Page.ts
│
├── tests/
│   ├── auth/
│   ├── [module]/
│   ├── e2e-flows/
│   ├── api/                      # browser-free API contract tests
│   ├── ux/
│   ├── security/
│   └── performance/
│
├── fixtures/
│   ├── config.ts                 # ENV object — single source of truth
│   ├── users.ts
│   ├── seed.ts
│   ├── teardown.ts
│   ├── data/
│   └── factories/
│
├── helpers/
│   ├── auth.helper.ts
│   ├── date.helper.ts
│   ├── api.helper.ts
│   ├── ux.helper.ts
│   ├── assertions.helper.ts
│   └── quarantine.ts
│
├── support/
│   └── global-setup.ts
│
└── playwright/.auth/             # gitignored
    ├── admin.json
    └── user.json
```