---
name: enterprise-playwright-automation
description: >
  Complete guide for creating enterprise-grade Playwright (TypeScript) test
  automation frameworks from scratch or extending existing ones. Use this skill
  whenever the user asks to: scaffold a Playwright project, create Page Object
  Models (POM), write functional/E2E/UX/security/performance tests, set up test
  data files, configure environment variables, create helper classes, organise
  folder structures, or apply any Playwright best practice. Trigger on phrases
  like "create a test", "add a test case", "set up Playwright", "write a spec",
  "create a page object", "add a helper", "set up test data", "create a fixture",
  "write a UX test", "write a security test", "write a performance test", or any
  mention of test automation, test framework, or QA automation. Always use this
  skill — even for single test cases — because the patterns here ensure every
  output is consistent with enterprise standards.
---

# Enterprise Playwright Automation Skill

This skill produces production-ready Playwright TypeScript test automation that
follows enterprise patterns: Page Object Model, typed data files, environment
config, layered folder structure, and specialised suites for UX, security, and
performance. Read this file completely before writing a single line of code.

---

## Table of contents

1. [Canonical folder structure](#1-canonical-folder-structure)
2. [Decision flowchart — what to create](#2-decision-flowchart--what-to-create)
3. [Page Object Model rules](#3-page-object-model-rules)
4. [Test data files](#4-test-data-files)
5. [Environment variables and config](#5-environment-variables-and-config)
6. [Helper classes](#6-helper-classes)
7. [Fixtures — seed and teardown](#7-fixtures--seed-and-teardown)
8. [Functional and E2E tests](#8-functional-and-e2e-tests)
9. [UX tests](#9-ux-tests)
10. [Security tests](#10-security-tests)
11. [Performance tests](#11-performance-tests)
12. [Accessibility tests](#12-accessibility-tests)
13. [Playwright config](#13-playwright-config)
14. [CI/CD integration](#14-cicd-integration)
15. [Naming conventions](#15-naming-conventions)
16. [Anti-patterns — never do these](#16-anti-patterns--never-do-these)
17. [Quick-reference checklist](#17-quick-reference-checklist)

---

## 1. Canonical folder structure

Always scaffold with this exact layout. Never deviate without an explicit reason
stated in a comment.

```
project-root/
├── playwright.config.ts
├── .env                          # local only — gitignored
├── .env.qa                       # QA environment
├── .env.uat                      # UAT environment
├── .env.staging                  # staging environment
│
├── pages/                        # Page Object Models
│   ├── base/
│   │   └── BasePage.ts           # abstract base — all POMs extend this
│   ├── auth/
│   │   └── LoginPage.ts
│   ├── ess/                      # Employee Self Service
│   │   ├── ApplyLeavePage.ts
│   │   └── MyPayrollPage.ts
│   ├── mss/                      # Manager Self Service
│   │   └── LeaveDetailsPage.ts
│   ├── payroll/
│   │   └── RunPayrollPage.ts
│   └── [module]/                 # one subfolder per application module
│
├── tests/
│   ├── auth/
│   │   └── login.spec.ts
│   ├── e2e-flows/                # cross-module end-to-end flows
│   │   ├── leave-payroll.spec.ts
│   │   └── recruitment-onboard.spec.ts
│   ├── [module]/                 # one subfolder per module
│   ├── ux/                       # UX tests — separate suite
│   │   ├── feedback.ux.spec.ts
│   │   ├── keyboard.ux.spec.ts
│   │   ├── responsive.ux.spec.ts
│   │   ├── visual.ux.spec.ts
│   │   ├── performance.ux.spec.ts
│   │   └── accessibility.ux.spec.ts
│   ├── security/                 # security tests — separate suite
│   │   ├── xss.security.spec.ts
│   │   ├── sqli.security.spec.ts
│   │   ├── auth.security.spec.ts
│   │   └── rbac.security.spec.ts
│   └── performance/              # load and timing tests — separate suite
│       └── load.perf.spec.ts
│
├── fixtures/
│   ├── data/                     # typed test data — one file per module
│   │   ├── auth.data.ts
│   │   ├── employee.data.ts
│   │   ├── leave.data.ts
│   │   ├── payroll.data.ts
│   │   ├── recruitment.data.ts
│   │   ├── attendance.data.ts
│   │   ├── ux.data.ts            # UX thresholds and viewport presets
│   │   └── security.data.ts      # payloads: XSS, SQLi, IDOR inputs
│   ├── factories/                # data factories for DB-persisted records
│   │   ├── employee.factory.ts
│   │   └── candidate.factory.ts
│   ├── users.ts                  # persona accounts and storage state paths
│   ├── seed.ts                   # beforeAll API seeders
│   └── teardown.ts               # afterAll API cleanup
│
├── helpers/
│   ├── auth.helper.ts            # login, logout, session management
│   ├── date.helper.ts            # relative date generation, date picker util
│   ├── api.helper.ts             # direct API calls for setup/teardown/RBAC
│   ├── ux.helper.ts              # assertNoOverflow, measureLCP, assertA11y
│   └── assertions.helper.ts      # shared custom expect wrappers
│
└── playwright/.auth/             # saved session states — gitignored
    ├── admin.json
    ├── manager.json
    └── employee.json
```

---

## 2. Decision flowchart — what to create

When the user asks to "add a test", follow this sequence before writing code:

```
Does a Page Object exist for this page?
  NO  → Create pages/[module]/[Page]Page.ts first, then write the test
  YES → Import it; do not duplicate locators in the test file

Does test data already exist in fixtures/data/[module].data.ts?
  NO  → Add the interface and scenario to that file first
  YES → Import the existing scenario; do not hardcode values in the test

Does the test create a DB record (employee, leave request, candidate)?
  YES → Use a factory from fixtures/factories/; seed in beforeAll; teardown in afterAll
  NO  → Use static data from fixtures/data/

Is this a UX concern (timing, layout, accessibility, visual)?
  YES → Put it in tests/ux/; import helpers from helpers/ux.helper.ts
  NO  → Is it a security concern (XSS, SQLi, auth bypass, IDOR)?
    YES → Put it in tests/security/
    NO  → Is it a load or response-time test?
      YES → Put it in tests/performance/
      NO  → Put it in tests/[module]/
```

---

## 3. Page Object Model rules

Every page object must follow all of these rules. Violating any one of them
is an anti-pattern.

### BasePage — always extend this

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
    const toast = this.page.locator('.toast-success, .alert-success');
    await expect(toast).toBeVisible({ timeout: 5_000 });
    if (msg) await expect(toast).toContainText(msg);
  }

  async expectErrorToast(msg: string): Promise<void> {
    await expect(
      this.page.locator('.toast-error, .alert-danger')
    ).toContainText(msg, { timeout: 3_000 });
  }

  async navigate(menuPath: string[]): Promise<void> {
    for (const item of menuPath) {
      await this.page.getByRole('menuitem', { name: item }).click();
    }
  }
}
```

### Page object template

```typescript
// pages/[module]/[Name]Page.ts
import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base/BasePage';
import { SomeDataType } from '../../fixtures/data/[module].data';

export class [Name]Page extends BasePage {
  get url() { return '/path/to/page'; }

  // ── Locators — ALL private, ALL defined in constructor ─────────
  private readonly fieldOne:  Locator;
  private readonly fieldTwo:  Locator;
  private readonly submitBtn: Locator;
  private readonly errorMsg:  Locator;

  constructor(page: Page) {
    super(page);
    // Prefer getByRole/getByLabel over IDs where possible
    this.fieldOne  = page.getByLabel('Field One');
    this.fieldTwo  = page.locator('#specificId');   // ID fallback
    this.submitBtn = page.getByRole('button', { name: 'Save' });
    this.errorMsg  = page.locator('.field-error, .alert-danger');
  }

  // ── Actions — describe business intent, not DOM steps ─────────
  async doAction(data: SomeDataType): Promise<void> {
    await this.fieldOne.fill(data.fieldOne);
    await this.fieldTwo.fill(data.fieldTwo);
    await this.submitBtn.click();
  }

  // ── Assertions — prefix with expect* ──────────────────────────
  async expectSuccess(): Promise<void> {
    await this.expectSuccessToast();
  }

  async expectValidationError(msg: string): Promise<void> {
    await expect(this.errorMsg).toContainText(msg);
  }
}
```

### Page object rules — enforced

| Rule | Correct | Wrong |
|---|---|---|
| Locators live | Constructor only | Scattered in methods |
| Locator visibility | private | public |
| Method names | `doAction()`, `expectSuccess()` | `clickButton()`, `checkResult()` |
| Test logic | Never inside POM | Never inside POM |
| Cross-page calls | Never — tests compose POMs | POM calls another POM |
| Instance per test | Fresh `new Page(page)` | Shared across tests |

---

## 4. Test data files

### Structure — one file per module

```typescript
// fixtures/data/[module].data.ts

// ── 1. Interfaces ──────────────────────────────────────────────
export interface SomeData {
  field:   string;
  amount:  number;
  date:    string;   // '' if relative — fill with date helper at use site
}

// ── 2. Option-value maps — ALL dropdown values live here ───────
export const SomeType = {
  OptionA: 'value-a',   // label shown in the dropdown
  OptionB: 'value-b',
} as const;

// ── 3. Scenarios ───────────────────────────────────────────────
export const someData = {

  validEntry: {
    field:  'Valid input',
    amount: 2500,
    date:   '',          // fill with futureDateStr(5) at use site
  },

  zeroAmount: {
    field:  'Should be rejected',
    amount: 0,
    date:   '',
  },

  xssPayload: {
    field:  '<script>alert("xss")</script>',
    amount: 100,
    date:   '',
  },

} satisfies Record<string, SomeData>;
```

### Data file rules

- `satisfies Record<string, Interface>` — always. Never omit it.
- Passwords always from `process.env`. Never hardcoded.
- Relative dates always empty string `''` with a comment. Never `new Date()`.
- All test-created names/emails/codes use `E2E_` prefix.
- Dropdown values in `as const` maps — never inline strings in tests.
- One interface per distinct data shape. Never `any`.

### Data factories for DB records

```typescript
// fixtures/factories/employee.factory.ts
import { NewEmployeeData } from '../data/employee.data';
import { Department, Designation, Location } from '../data/employee.data';

let seq = 0;

export function makeEmployee(
  overrides: Partial<NewEmployeeData> = {}
): NewEmployeeData {
  const id = `${process.env.PW_WORKER_INDEX ?? '0'}${(++seq).toString().padStart(3,'0')}`;
  return {
    firstName:   'E2E_Test',
    lastName:    `Employee_${id}`,
    empCode:     `E2E${id}`,
    email:       `e2e.emp${id}@test.local`,
    department:  Department.Engineering,
    designation: Designation.SoftwareEngineer,
    location:    Location.HeadOffice,
    ...overrides,
  };
}
```

Worker index prefix (`PW_WORKER_INDEX`) prevents code collisions in parallel runs.

---

## 5. Environment variables and config

### .env files — never committed

```bash
# .env.qa
QA_BASE_URL=https://app.example.com
QA_ADMIN_USER=qa.superadmin
QA_ADMIN_PASS=           # from vault — never stored in file
QA_MGR1_USER=qa.manager1
QA_MGR1_PASS=
QA_EMP1_USER=qa.employee1
QA_EMP1_PASS=
API_ADMIN_TOKEN=
FAKER_SEED=42
```

### Central config object — always import from here

```typescript
// fixtures/config.ts
import { config } from 'dotenv';
config({ path: `.env.${process.env.TEST_ENV ?? 'qa'}` });

export const ENV = {
  baseUrl:    process.env.QA_BASE_URL!,
  adminUser:  process.env.QA_ADMIN_USER!,
  adminPass:  process.env.QA_ADMIN_PASS!,
  mgr1User:   process.env.QA_MGR1_USER!,
  mgr1Pass:   process.env.QA_MGR1_PASS!,
  emp1User:   process.env.QA_EMP1_USER!,
  emp1Pass:   process.env.QA_EMP1_PASS!,
  apiToken:   process.env.API_ADMIN_TOKEN!,
  fakerSeed:  parseInt(process.env.FAKER_SEED ?? '42'),
} as const;
```

Tests and helpers import `ENV`, never `process.env` directly.

---

## 6. Helper classes

### auth.helper.ts

Handles login, logout, session caching, and session expiry. All login steps
live here — never in test files or page objects.

Key exports:
- `loginAs(page, username, password)` — fills login form, waits for dashboard
- `loginAsAdmin(page)`, `loginAsManager(page)`, `loginAsEmployee(page)` — persona shortcuts
- `saveSession(page, role)` — saves storageState to `playwright/.auth/[role].json`
- `logout(page)` — opens avatar dropdown FIRST, then clicks Log Out
- `expireSession(page)` — overwrites session cookie with past expiry for TC-AUTH-014
- `expectLoginError(page, msg?)` — asserts error message visible, URL still login page

Critical implementation note for logout — the Log Out element is always hidden
inside a dropdown. Always open the parent container before clicking:

```typescript
export async function logout(page: Page): Promise<void> {
  await page.locator('li:has(#logOut)').click();   // open dropdown
  await page.locator('#logOut').click();            // now visible
  await page.waitForURL('**/LoginNew.aspx', { timeout: 15_000 });
}
```

### date.helper.ts

All date generation lives here. Tests never call `new Date()` directly.

Key exports:
- `futureDateStr(daysAhead)` — returns `dd/mm/yyyy` N days from today
- `pastDateStr(daysBack)` — returns past date for negative tests
- `firstDayNextMonth()` — skips weekends; used for payroll-period tests
- `monthYear(offsetMonths?)` — returns `{ month, year }` for payroll dropdowns
- `fillDatePicker(page, selector, dateStr)` — handles pickers that ignore `.fill()`
- `nextWeekday()`, `nextWeekend()` — for comp-off boundary tests

### api.helper.ts

Direct HTTP to the application API. Used for: test setup/teardown, RBAC testing,
and post-action assertions that verify server state.

Key exports:
- `apiGet(request, path)`, `apiPost(request, path, data)`, `apiDelete(request, path)`
- `apiCallWithSession(request, page, method, path)` — RBAC: uses browser cookie not admin token
- `getLeaveBalance(request, empCode, leaveType): Promise<number>`
- `setLeaveBalance(request, empCode, leaveType, balance)`
- `waitForApiResponse(page, urlPattern, action)` — fires action AND waits for response simultaneously

### ux.helper.ts

UX-specific assertions. All take `page: Page` as first argument.

Key exports:
- `assertNoHorizontalOverflow(page)` — scrollWidth <= innerWidth
- `assertNoConsoleErrors(page)` — listener before navigation, assert zero errors after networkidle
- `assertNoFailedRequests(page)` — listener for 4xx/5xx, assert zero after networkidle
- `measureLCP(page): Promise<number>` — PerformanceObserver for LCP
- `measureFCP(page): Promise<number>` — paint entry for FCP
- `measureTTFB(response): number` — response.timing().responseStart
- `assertTouchTargets(page, selector)` — boundingBox >= 44×44
- `assertHeadingOrder(page)` — no skipped heading levels
- `assertSingleH1(page)` — exactly one h1
- `assertImageAltText(page)` — every img has non-empty alt

### assertions.helper.ts

Reusable expect wrappers used across all test types.

Key exports:
- `expectSuccessToast(page, msg?)` — visible within 5s
- `expectErrorMessage(page, partialText)` — error locator contains text
- `expectTableRowCount(page, n)` — tbody tr count equals n
- `expectStatusBadge(page, empCode, status)` — row for empCode shows status

---

## 7. Fixtures — seed and teardown

### seed.ts — API seeders only, never UI

```typescript
// fixtures/seed.ts
export async function seedFullEmployee(
  request: APIRequestContext
): Promise<{ empCode: string; empId: number }> {
  const data = makeEmployee();
  const res  = await apiPost(request, '/employees', data);
  if (!res.ok()) throw new Error(`seedEmployee: ${res.status()}`);
  const body = await res.json();
  await setLeaveBalance(request, data.empCode, 'Annual Leave', 18);
  return { empCode: data.empCode, empId: body.employeeId };
}
```

### teardown.ts — delete in FK-safe order

Always delete child records before parent records.

```typescript
// fixtures/teardown.ts
export async function teardownEmployee(
  request: APIRequestContext,
  empCode: string
): Promise<void> {
  await teardownLeaveRequests(request, empCode);  // children first
  await teardownTimesheetEntries(request, empCode);
  await teardownAssets(request, empCode);
  const res = await apiDelete(request, `/employees/${empCode}`);
  if (!res.ok() && res.status() !== 404)
    console.warn(`teardownEmployee: ${res.status()} for ${empCode}`);
}

export async function teardownAllE2ERecords(
  request: APIRequestContext
): Promise<void> {
  // Safety sweep — catches anything teardown missed due to test crash
  const res  = await apiGet(request, '/employees?codePrefix=E2E_');
  const list = await res.json() as Array<{ empCode: string }>;
  for (const emp of list) await teardownEmployee(request, emp.empCode);
}
```

### Test usage pattern

```typescript
let emp: { empCode: string; empId: number };

test.beforeAll(async ({ request }) => {
  emp = await seedFullEmployee(request);
});

test.afterAll(async ({ request }) => {
  await teardownEmployee(request, emp.empCode);
});
```

---

## 8. Functional and E2E tests

### Single module test

```typescript
// tests/[module]/[feature].spec.ts
import { test, expect }          from '@playwright/test';
import { [Name]Page }            from '../../pages/[module]/[Name]Page';
import { someData, SomeType }    from '../../fixtures/data/[module].data';
import { futureDateStr }         from '../../helpers/date.helper';
import { USERS }                 from '../../fixtures/users';

test.use({ storageState: USERS.employee.storageState });

test.describe('[Module] — [Feature]', () => {

  // TC-[MOD]-001: [test name matching the plan]
  test('valid submission creates record with Pending status', async ({ page }) => {
    const p = new NamePage(page);
    await p.goto();
    await p.doAction({
      ...someData.validEntry,
      date: futureDateStr(5),   // date filled at use site
    });
    await p.expectSuccess();
    await p.expectStatusInHistory('Pending');
  });

  // TC-[MOD]-002
  test('zero amount shows validation error', async ({ page }) => {
    const p = new NamePage(page);
    await p.goto();
    await p.doAction(someData.zeroAmount);
    await p.expectValidationError('Amount must be greater than zero');
  });

});
```

### E2E flow test

```typescript
// tests/e2e-flows/[flow-name].spec.ts
// Uses multiple personas via separate browser contexts

test('E2E-FLOW-001: employee applies leave — manager approves — payroll reflects',
  async ({ browser }) => {
    const empCtx = await browser.newContext({
      storageState: USERS.employee.storageState,
    });
    const mgrCtx = await browser.newContext({
      storageState: USERS.manager.storageState,
    });

    const empPage   = await empCtx.newPage();
    const mgrPage   = await mgrCtx.newPage();
    const leavePage = new ApplyLeavePage(empPage);
    const approval  = new LeaveDetailsPage(mgrPage);

    await leavePage.goto();
    const before = await getLeaveBalance(request, emp.empCode, 'Annual Leave');
    await leavePage.applyLeave({
      ...leaveData.validOneDayLeave,
      fromDate: firstDayNextMonth(),
      toDate:   firstDayNextMonth(),
    });
    await leavePage.expectSuccess();

    await approval.goto();
    await approval.approveFirstPending('Approved');

    const after = await getLeaveBalance(request, emp.empCode, 'Annual Leave');
    expect(after).toBe(before - 1);

    await empCtx.close();
    await mgrCtx.close();
  }
);
```

---

## 9. UX tests

All UX tests go in `tests/ux/`. Import thresholds from `fixtures/data/ux.data.ts`.
Set `retries: 0` in the ux-tests Playwright project — a flaky UX test is a UX bug.

```typescript
// tests/ux/feedback.ux.spec.ts

// TC-UX-FB-001
test('success toast visible after save and auto-dismisses', async ({ page }) => {
  await page.goto(someUrl);
  await page.click('#btnSave');
  const toast = page.locator('.toast-success');
  await expect(toast).toBeVisible({ timeout: 3_000 });
  await expect(toast).not.toBeVisible({ timeout: uxData.toast.successTimeout });
});

// TC-UX-KEY-001
test('login form tab order: username → password → submit', async ({ page }) => {
  await page.goto('/LoginNew.aspx');
  await page.keyboard.press('Tab');
  await expect(page.locator('#txtUsername')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#txtPassword')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#btnSubmit')).toBeFocused();
});

// TC-UX-RESP-001 — run via viewport projects in playwright.config.ts
test('no horizontal overflow on mobile', async ({ page }) => {
  await page.goto('/dashboard/dashboard/dashboard');
  await assertNoHorizontalOverflow(page);
});

// TC-UX-VIS-001
test('login page matches visual baseline', async ({ page }) => {
  await page.goto('/LoginNew.aspx');
  await expect(page).toHaveScreenshot('tc-ux-vis-001-login.png', {
    maxDiffPixels: uxData.visual.maxDiffPixels,
    mask: [page.locator('.dynamic-clock')],
  });
});

// TC-UX-PERF-001
test('dashboard LCP under threshold', async ({ page }) => {
  await page.goto('/dashboard/dashboard/dashboard');
  const lcp = await measureLCP(page);
  expect(lcp).toBeLessThan(uxData.perf.lcp);
});
```

---

## 10. Security tests

All security tests go in `tests/security/`. Import payloads from
`fixtures/data/security.data.ts`. Never expect these tests to pass in
happy-path mode — they assert that attacks are rejected.

```typescript
// fixtures/data/security.data.ts
export const xssPayloads = [
  '<script>alert("xss")</script>',
  '"><img src=x onerror=alert(1)>',
  'javascript:alert(1)',
] as const;

export const sqliPayloads = [
  "' OR '1'='1",
  "'; DROP TABLE employees; --",
  "1; SELECT * FROM users",
] as const;
```

```typescript
// tests/security/xss.security.spec.ts

// TC-SEC-XSS-001
for (const payload of securityData.xssPayloads) {
  test(`XSS payload rejected in login username: ${payload.slice(0,30)}`,
    async ({ page }) => {
      let alertFired = false;
      page.on('dialog', async d => { alertFired = true; await d.dismiss(); });

      const loginPage = new LoginPage(page);
      await loginPage.login(payload, 'anything');
      await loginPage.expectStillOnLoginPage();
      expect(alertFired).toBe(false);
    }
  );
}

// TC-SEC-RBAC-001
test('employee session rejected by payroll API', async ({ page, request }) => {
  await loginAsEmployee(page);
  const { status } = await apiCallWithSession(
    request, page, 'GET', '/api/payroll/salary-register'
  );
  expect(status).toBe(403);
});

// TC-SEC-IDOR-001
test('employee cannot access another employee salary slip via URL',
  async ({ page }) => {
    await loginAsEmployee(page);
    await page.goto(`/Payroll/SalarySlip?empCode=${otherEmpCode}`);
    await expect(page.locator('.salary-data')).not.toBeVisible();
    // either redirected or access-denied shown
    const url = page.url();
    const denied = await page.locator('.access-denied').isVisible();
    expect(url.includes('LoginNew') || denied).toBe(true);
  }
);
```

---

## 11. Performance tests

All timing tests go in `tests/performance/`. Use `helpers/ux.helper.ts` for
measurement functions. All thresholds from `fixtures/data/ux.data.ts`.

```typescript
// tests/performance/load.perf.spec.ts

// TC-PERF-001
test('dashboard TTFB under threshold', async ({ page }) => {
  const [response] = await Promise.all([
    page.waitForResponse('**/dashboard/**'),
    page.goto('/dashboard/dashboard/dashboard'),
  ]);
  const ttfb = measureTTFB(response);
  expect(ttfb).toBeLessThan(uxData.perf.ttfb);
});

// TC-PERF-002
test('no failed requests on dashboard load', async ({ page }) => {
  await assertNoFailedRequests(page);  // attaches listener
  await page.goto('/dashboard/dashboard/dashboard');
  await page.waitForLoadState('networkidle');
  // assertNoFailedRequests asserts at networkidle internally
});

// TC-PERF-003 — concurrent payroll mutex
test('concurrent payroll run blocked by mutex', async ({ browser }) => {
  const ctxA = await browser.newContext({ storageState: USERS.admin.storageState });
  const ctxB = await browser.newContext({ storageState: USERS.admin.storageState });
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  const payrollA = new RunPayrollPage(pageA);
  const payrollB = new RunPayrollPage(pageB);

  await payrollA.goto();
  await payrollB.goto();

  const [resultA, resultB] = await Promise.all([
    payrollA.runPayroll(TEST_PAYROLL_PERIOD.month, TEST_PAYROLL_PERIOD.year),
    payrollB.runPayroll(TEST_PAYROLL_PERIOD.month, TEST_PAYROLL_PERIOD.year),
  ]);

  const results = [resultA, resultB];
  expect(results.filter(r => r === 'success')).toHaveLength(1);
  expect(results.filter(r => r === 'already-run')).toHaveLength(1);
  await ctxA.close();
  await ctxB.close();
});
```

---

## 12. Accessibility tests

```typescript
// tests/ux/accessibility.ux.spec.ts
import { checkA11y } from 'axe-playwright';  // npm install @axe-core/playwright

// TC-UX-A11Y-001
test('login page passes WCAG 2.1 AA', async ({ page }) => {
  await page.goto('/LoginNew.aspx');
  await checkA11y(page, undefined, {
    runOnly:            { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
    includedImpacts:    ['critical', 'serious'],  // fail only on these
  });
});

// TC-UX-A11Y-002
test('every form label is associated with an input', async ({ page }) => {
  await page.goto('/LeaveManagement/Ess_ApplyLeave/Ess_ApplyLeave');
  const inputs = page.locator('input:not([type=hidden]), select, textarea');
  const count  = await inputs.count();
  for (let i = 0; i < count; i++) {
    const input = inputs.nth(i);
    const id    = await input.getAttribute('id');
    if (id) {
      const label = page.locator(`label[for="${id}"]`);
      await expect(label).toBeAttached({ message: `No label for #${id}` });
    }
  }
});

// TC-UX-A11Y-003
test('page has exactly one h1', async ({ page }) => {
  await assertSingleH1(page);
});

// TC-UX-A11Y-004
test('heading levels are not skipped', async ({ page }) => {
  await assertHeadingOrder(page);
});
```

---

## 13. Playwright config

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';
config({ path: `.env.${process.env.TEST_ENV ?? 'qa'}` });

export default defineConfig({
  testDir:   './tests',
  timeout:   30_000,
  retries:   process.env.CI ? 1 : 0,  // 1 retry in CI; 0 local
  reporter:  [['html'], ['list']],
  use: {
    baseURL:     process.env.QA_BASE_URL,
    headless:    true,
    screenshot:  'only-on-failure',
    video:       'retain-on-failure',
    trace:       'on-first-retry',
  },
  projects: [
    // ── Auth setup — runs once, saves session files ─────────────
    { name: 'setup', testMatch: /auth\.setup\.ts/ },

    // ── Functional tests ────────────────────────────────────────
    {
      name: 'functional',
      testIgnore: ['**/ux/**', '**/security/**', '**/performance/**'],
      use: { storageState: 'playwright/.auth/admin.json' },
      dependencies: ['setup'],
    },

    // ── UX tests — no retries, longer timeout ───────────────────
    {
      name:        'ux-tests',
      testDir:     './tests/ux',
      timeout:     60_000,
      retries:     0,        // flaky UX test = UX bug — do not retry
      snapshotDir: './tests/ux/snapshots',
      use: { storageState: 'playwright/.auth/admin.json' },
      dependencies: ['setup'],
    },

    // ── Security tests ──────────────────────────────────────────
    {
      name:    'security',
      testDir: './tests/security',
      retries: 0,
      dependencies: ['setup'],
    },

    // ── Performance tests ───────────────────────────────────────
    {
      name:    'performance',
      testDir: './tests/performance',
      timeout: 120_000,
      retries: 0,
      dependencies: ['setup'],
    },

    // ── Mobile viewport ─────────────────────────────────────────
    {
      name: 'mobile',
      testDir: './tests/ux',
      use: { ...devices['iPhone 14'] },
      dependencies: ['setup'],
    },
  ],
});
```

---

## 14. CI/CD integration

```yaml
# .github/workflows/e2e.yml
name: Playwright E2E
on:
  push:     { branches: [main, develop] }
  pull_request:
  schedule: [{ cron: '0 2 * * *' }]   # nightly full suite

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        suite: [functional, ux-tests, security, performance]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test --project=${{ matrix.suite }}
        env:
          TEST_ENV:         qa
          QA_BASE_URL:      ${{ secrets.QA_BASE_URL }}
          QA_ADMIN_USER:    ${{ secrets.QA_ADMIN_USER }}
          QA_ADMIN_PASS:    ${{ secrets.QA_ADMIN_PASS }}
          API_ADMIN_TOKEN:  ${{ secrets.API_ADMIN_TOKEN }}
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report-${{ matrix.suite }}
          path: playwright-report/
          retention-days: 30
```

---

## 15. Naming conventions

| Item | Convention | Example |
|---|---|---|
| Spec files | `[feature].[suite].spec.ts` | `apply-leave.spec.ts`, `xss.security.spec.ts` |
| Page objects | `[Name]Page.ts` | `ApplyLeavePage.ts` |
| Data files | `[module].data.ts` | `leave.data.ts` |
| Factory files | `[module].factory.ts` | `employee.factory.ts` |
| Helper files | `[concern].helper.ts` | `auth.helper.ts` |
| Test IDs | `TC-[MOD]-[NNN]` | `TC-ESS-003`, `TC-SEC-XSS-001` |
| Snapshot names | `tc-ux-vis-[nnn]-[page].png` | `tc-ux-vis-001-login.png` |
| E2E_ prefix | All test-created DB records | `E2E_Test_Employee_001` |
| Env vars | `QA_[SCOPE]_[FIELD]` | `QA_ADMIN_PASS`, `QA_BASE_URL` |

---

## 16. Anti-patterns — never do these

```typescript
// ✗ WRONG — locator in test file
await page.locator('#ddlLeaveType').selectOption('Annual Leave');

// ✓ RIGHT — locator in page object, test calls method
await leavePage.applyLeave(leaveData.validOneDayLeave);

// ✗ WRONG — hardcoded credential
await loginPage.login('qa.superadmin', 'MyPassword123');

// ✓ RIGHT — from users.ts via env
await loginPage.login(USERS.admin.username, USERS.admin.password);

// ✗ WRONG — hardcoded date
await page.fill('#dtpFromDate', '15/06/2026');

// ✓ RIGHT — relative date from helper
await fillDatePicker(page, '#dtpFromDate', futureDateStr(5));

// ✗ WRONG — inline threshold
expect(lcp).toBeLessThan(3000);

// ✓ RIGHT — threshold from data file
expect(lcp).toBeLessThan(uxData.perf.lcp);

// ✗ WRONG — Log Out clicked directly (it is hidden in a dropdown)
await page.locator('a:has-text("Log Out")').click();

// ✓ RIGHT — open dropdown first
await page.locator('li:has(#logOut)').click();
await page.locator('#logOut').click();

// ✗ WRONG — shared mutable state between tests
let empCode: string;
test.beforeEach(async ({ request }) => {
  empCode = (await seedFullEmployee(request)).empCode; // re-creates every test
});

// ✓ RIGHT — seed once per describe block
test.beforeAll(async ({ request }) => {
  emp = await seedFullEmployee(request);
});

// ✗ WRONG — page object calls another page object
class ApplyLeavePage {
  async submit() {
    await this.save();
    const details = new LeaveDetailsPage(this.page); // NEVER
    await details.approve();
  }
}

// ✓ RIGHT — test composes two page objects
await leavePage.applyLeave(data);
await leaveDetailsPage.approveFirstPending('OK');

// ✗ WRONG — retry on UX or security tests
retries: 2   // in ux-tests or security project

// ✓ RIGHT — retries only on functional; never on UX/security/performance
retries: process.env.CI ? 1 : 0  // functional project only
```

---

## 17. Quick-reference checklist

Before marking any output as complete, verify every item:

**Page Object**
- [ ] Extends `BasePage`
- [ ] `get url()` implemented
- [ ] All locators `private readonly`, defined in constructor
- [ ] Methods describe actions, not DOM steps
- [ ] Assertion methods prefixed with `expect`
- [ ] No test logic inside the class
- [ ] No cross-POM calls

**Test file**
- [ ] TC-ID comment above every `test()`
- [ ] `test.use({ storageState })` at describe level
- [ ] No inline `page.locator()` — all through POM
- [ ] No hardcoded dates — uses `date.helper.ts`
- [ ] No hardcoded credentials — uses `USERS` or `ENV`
- [ ] No hardcoded threshold numbers — uses data file
- [ ] `beforeAll` for seeding, `afterAll` for teardown
- [ ] Each test fully independent

**Data file**
- [ ] Interface exported for every data shape
- [ ] `as const` on all option-value maps
- [ ] `satisfies Record<string, Interface>` on every data object
- [ ] Date fields are `''` with comment naming the helper to call
- [ ] Passwords from `process.env`, never hardcoded
- [ ] All test records use `E2E_` prefix

**Suite placement**
- [ ] UX concerns → `tests/ux/`
- [ ] Security concerns → `tests/security/`
- [ ] Load / timing → `tests/performance/`
- [ ] Module functional → `tests/[module]/`
- [ ] Cross-module flows → `tests/e2e-flows/`

**Config**
- [ ] UX project has `retries: 0` and `timeout: 60_000`
- [ ] Security project has `retries: 0`
- [ ] Snapshots stored in `tests/ux/snapshots/`
- [ ] All secrets come from CI secrets, not from committed files
