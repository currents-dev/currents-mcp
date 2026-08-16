# Instrumenting tests to capture evidence

Snippets for capturing evidence artifacts that Currents stores and the
`currents-get-test-evidence` tool retrieves. Attachment names are the pairing
key for before/after comparisons — keep them deterministic and stable.

## Playwright

### Screenshot evidence

```ts
import { test, expect } from "@playwright/test";

test("evidence: order summary shows applied discount", async ({ page }, testInfo) => {
  await page.goto("/checkout");
  await page.getByRole("button", { name: "Apply coupon" }).click();
  await expect(page.getByTestId("order-summary")).toBeVisible();

  await testInfo.attach("evidence-order-summary.png", {
    body: await page.getByTestId("order-summary").screenshot({
      animations: "disabled",
    }),
    contentType: "image/png",
  });
});
```

Element screenshots (`locator.screenshot()`) beat full-page screenshots for
before/after diffs — less unrelated churn. For full pages, fix the viewport in
the config and mask dynamic regions:

```ts
await page.screenshot({
  fullPage: true,
  animations: "disabled",
  mask: [page.getByTestId("clock"), page.getByTestId("avatar")],
});
```

### Text / JSON output as attachment

For CLI output, API responses, or computed values — anything diffable:

```ts
test("evidence: pricing API returns discounted totals", async ({ request }, testInfo) => {
  const response = await request.get("/api/cart/total?coupon=SAVE10");
  const body = await response.json();

  await testInfo.attach("evidence-cart-total.json", {
    body: JSON.stringify(body, null, 2),
    contentType: "application/json",
  });

  expect(body.total).toBe(90);
});
```

Any file works the same way (`path` instead of `body`):

```ts
await testInfo.attach("evidence-report.txt", {
  path: outputFilePath,
  contentType: "text/plain",
});
```

### Video and trace

Controlled by `playwright.config.ts`. Defaults keep artifacts only for
failures; demo evidence usually comes from passing tests, so scope an
always-on policy to the evidence tests with a dedicated project:

```ts
export default defineConfig({
  use: {
    viewport: { width: 1280, height: 720 },
    screenshot: "on",
    video: "retain-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "evidence",
      testMatch: /.*evidence.*\.spec\.ts/,
      use: { video: "on", trace: "on" },
    },
  ],
});
```

The Currents reporter uploads screenshots, videos, traces, and attachments per
attempt automatically — no extra reporter config.

### GIF

Playwright does not produce GIFs. Record a video, download it from the
evidence manifest, then convert:

```bash
ffmpeg -i demo.webm -vf "fps=10,scale=720:-1" demo.gif
```

## Cypress

Requires `cypress-cloud` for artifact reporting to Currents (note: Currents
suspended integration for Cypress 13+ — verify version compatibility).

```js
it("evidence: order summary shows applied discount", () => {
  cy.visit("/checkout");
  cy.get("[data-testid=apply-coupon]").click();
  cy.get("[data-testid=order-summary]").should("be.visible");
  cy.screenshot("evidence-order-summary", { capture: "viewport" });
});
```

- Screenshots upload with their given name; videos record per spec file
  (`video: true` in `cypress.config.js`) and appear as spec-level evidence in
  the manifest, not per test.
- Text evidence: write it with `cy.writeFile()` and assert on it; there is no
  per-test attachment API, so prefer screenshots or migrate text evidence
  workflows to Playwright projects when possible.

## Naming conventions

- Prefix evidence artifacts with `evidence-` so they are easy to spot among
  incidental screenshots and traces.
- Same name in before and after runs; the run (branch/commit) distinguishes
  them, not the file name.
- Include the feature area in the test title (`"evidence: <feature> <claim>"`)
  so `testTitle: "evidence"` filters the manifest to exactly the evidence
  tests.
