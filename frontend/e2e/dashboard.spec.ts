import { devices, expect, test } from "@playwright/test";
import { installFakeApi, rel } from "./fake-api";

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/6XnV2UAAAAASUVORK5CYII=", "base64");

test("overview shows backend KPIs, deals by urgency, and recent receipts", async ({ page }) => {
  await installFakeApi(page);
  await page.goto("/");
  await expect(page.getByTestId("kpi-active")).toHaveText("3");
  await expect(page.getByTestId("kpi-at-risk")).toHaveText("2");
  await expect(page.getByTestId("kpi-spend")).toHaveText("$16,800.00");
  const rows = page.locator("tbody tr");
  await expect(rows.nth(0)).toContainText("Triangle Sports Supply");
  await expect(rows.nth(0)).toContainText("40 of 200 units");
  await expect(rows.nth(0)).toContainText("At Risk");
  await expect(page.getByRole("row", { name: /Bull City Burger/ })).toContainText("On Track");
  await expect(page.getByRole("row", { name: /Durham Bagel/ })).toContainText("Ended");
  await expect(page.getByRole("button", { name: /Bull City Burger Team dinner, away trip \$412/ })).toBeVisible();
});

test("partnerships search, sort, and detail page", async ({ page }) => {
  await installFakeApi(page);
  await page.goto("/partnerships");
  await page.getByLabel("Sort by").selectOption("name");
  await expect(page.locator(".deal-card").first()).toContainText("Bull City Burger");
  await page.getByLabel("Search partners").fill("triangle");
  await expect(page.locator(".deal-card")).toHaveCount(1);
  await page.locator(".deal-card").click();
  await expect(page.getByRole("heading", { name: /Triangle Sports Supply/ })).toBeVisible();
  await expect(page.getByTestId("deal-progress")).toHaveText("40 of 200 units • 12 days left");
  await expect(page.getByText("Social post at home opener")).toBeVisible();
  await expect(page.getByRole("img", { name: /Actual progress/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /Batting gloves/ })).toContainText("12");
});

test("upload photo: OCR fills the form, save posts the receipt, progress updates", async ({ page }) => {
  const api = await installFakeApi(page);
  api.ocrResult = {
    vendor: "Carolina Charter Bus", purchase_date: rel(-1), total: 1234.56, line_items: [],
    raw_text: "CAROLINA CHARTER BUS\nTOTAL 1234.56", image_path: "2026-11/abc.jpg", suggested_partnership_id: "p-ccb",
  };
  await page.goto("/");
  await page.getByRole("button", { name: /Add Receipts/ }).click();
  await expect(page.getByRole("menuitem", { name: /Upload photo/ })).toBeVisible();
  await page.getByTestId("add-receipt-file").setInputFiles({ name: "receipt.png", mimeType: "image/png", buffer: PNG });

  await expect(page).toHaveURL(/\/receipts\/new$/);
  await expect(page.getByRole("heading", { name: "Check what we read" })).toBeVisible();
  await expect(page.getByLabel("Vendor *")).toHaveValue("Carolina Charter Bus");
  await expect(page.getByLabel("Total $ *")).toHaveValue("1234.56");
  await expect(page.getByLabel("Partnership *")).toHaveValue("p-ccb");
  await page.getByLabel("Trip / event").fill("Bus to Clemson");
  await page.getByRole("button", { name: "Save receipt" }).click();

  await expect(page.getByText("Receipt saved")).toBeVisible();
  const post = api.calls.find((c) => c.method === "POST" && c.path === "/receipts");
  expect(post?.body).toMatchObject({ partnership_id: "p-ccb", vendor: "Carolina Charter Bus", amount: 1234.56, event: "Bus to Clemson", image_path: "2026-11/abc.jpg" });
  await page.getByRole("link", { name: "See Carolina Charter Bus progress" }).click();
  await expect(page.getByTestId("deal-progress")).toContainText("$11,035 of $25,000");
});

test("enter manually: duplicate warning, then save anyway", async ({ page }) => {
  const api = await installFakeApi(page);
  await page.goto("/receipts");
  await page.getByRole("button", { name: /Add Receipts/ }).click();
  await page.getByRole("menuitem", { name: /Enter manually/ }).click();
  await expect(page.getByRole("heading", { name: "Enter receipt" })).toBeVisible();
  await page.getByLabel("Partnership *").selectOption("p-bcb");
  await page.getByLabel("Vendor *").fill("Bull City Burger");
  await page.getByLabel("Date *").fill(rel(-22));
  await page.getByLabel("Total $ *").fill("412");
  await page.getByRole("button", { name: "Save receipt" }).click();
  await expect(page.getByText(/Possible duplicate/)).toBeVisible();
  expect(api.calls.some((c) => c.method === "POST" && c.path === "/receipts")).toBe(false);
  await page.getByRole("button", { name: "Save anyway" }).click();
  await expect(page.getByText("Receipt saved")).toBeVisible();
});

test("new partnership posts the backend's shape and opens its page", async ({ page }) => {
  const api = await installFakeApi(page);
  await page.goto("/partnerships");
  await page.getByRole("link", { name: "+ New Partnership" }).click();
  await page.getByLabel("Company name").fill("Bulls Pizza");
  await page.getByRole("button", { name: "Buy units" }).click();
  await page.getByLabel("Target (units)").fill("150");
  await page.getByLabel("Start date").fill("2026-09-01");
  await page.getByLabel("End date").fill("2027-05-31");
  await page.getByLabel("Deliverable 1").fill("Banner in left field");
  await page.getByRole("button", { name: "+ Add deliverable" }).click();
  await page.getByLabel("Deliverable 2").fill("Two PA reads");
  await page.getByRole("button", { name: "Create" }).click();

  await expect(page.getByRole("heading", { name: /Bulls Pizza/ })).toBeVisible();
  await expect(page.getByTestId("deal-progress")).toContainText("0 of 150 units");
  const post = api.calls.find((c) => c.method === "POST" && c.path === "/partnerships");
  expect(post?.body).toEqual({
    company: "Bulls Pizza", contact_name: null, contact_email: null, commitment_type: "units", target: 150,
    start_date: "2026-09-01", end_date: "2027-05-31", discount_pct: null, deliverables: "Banner in left field\nTwo PA reads", tags: [],
  });

  // Back on the list (via the arrow) the new deal shows up, and the receipt form can pick it.
  await page.getByRole("link", { name: "Back to partnerships" }).click();
  await expect(page.locator(".deal-card", { hasText: "Bulls Pizza" })).toBeVisible();
  await page.goto("/receipts/new?manual=1");
  await expect(page.getByLabel("Partnership *").locator("option", { hasText: "Bulls Pizza" })).toBeAttached();
});

test("receipts table filters by partner", async ({ page }) => {
  await installFakeApi(page);
  await page.goto("/receipts");
  await expect(page.locator("tbody tr")).toHaveCount(7);
  await page.getByLabel("Partner").selectOption({ label: "Carolina Charter Bus" });
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await expect(page.locator("tbody tr").first()).toContainText("$2,150.00");
});

test("backend down shows the setup banner instead of failing silently", async ({ page }) => {
  await page.route("**/api/**", (r) => r.abort());
  await page.goto("/partnerships");
  await expect(page.getByText("Backend not reachable.")).toBeVisible();
  await expect(page.getByText(/Couldn't load partnerships/)).toBeVisible();
});

test("after the backend comes back, Retry reloads the page's data", async ({ page }) => {
  await installFakeApi(page);
  let down = true;
  await page.route("**/api/**", (r) => (down ? r.fulfill({ status: 500, body: "proxy error" }) : r.fallback()));
  await page.goto("/");
  await expect(page.getByText("Backend not reachable.")).toBeVisible();
  await expect(page.getByText(/Couldn't load the overview/)).toBeVisible();
  down = false;
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByText("Backend not reachable.")).toBeHidden();
  await expect(page.getByText(/Couldn't load the overview/)).toBeHidden();
  await expect(page.getByTestId("kpi-active")).toHaveText("3");
});

test("upload from a deal's page: OCR with no partner match falls back to that deal; photo link shows", async ({ page }) => {
  const api = await installFakeApi(page);
  api.ocrResult = {
    vendor: "TSS STORE #4", purchase_date: rel(-1), total: 99.5, line_items: [],
    raw_text: "TSS STORE #4\nTOTAL 99.50", image_path: "2026-11/tss.jpg", suggested_partnership_id: null,
  };
  await page.goto("/partnerships/p-tss");
  await page.getByRole("button", { name: /Add Receipts/ }).click();
  await page.getByTestId("add-receipt-file").setInputFiles({ name: "receipt.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByLabel("Partnership *")).toHaveValue("p-tss");
  await page.getByLabel("Units").fill("4");
  await page.getByRole("button", { name: "Save receipt" }).click();
  await expect(page.getByText("Receipt saved")).toBeVisible();
  await page.getByRole("link", { name: "See Triangle Sports Supply progress" }).click();
  const row = page.getByRole("row", { name: /TSS STORE #4/ });
  const [photoTab] = await Promise.all([page.waitForEvent("popup"), row.getByRole("button", { name: "View" }).click()]);
  await expect(photoTab).toHaveURL(/\/fake-storage\/2026-11\/tss\.jpg$/);
});

test("desktop: Upload photo opens a normal file picker (no camera)", async ({ page }) => {
  await installFakeApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Add Receipts/ }).click();
  await expect(page.getByRole("menuitem", { name: /Upload photo/ })).toBeVisible();
  await expect(page.getByTestId("add-receipt-file")).not.toHaveAttribute("capture");
});

test("overview: clicking a deal, KPI or month opens its detail in a side panel, without leaving the page", async ({ page }) => {
  await installFakeApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Triangle Sports Supply", exact: true }).click();
  const panel = page.locator("aside .insight");
  await expect(panel.getByRole("heading", { name: "Triangle Sports Supply" })).toBeVisible();
  await expect(panel.getByTestId("insight-progress")).toHaveText("40 of 200 units");
  await expect(panel).toContainText("Behind by");
  await expect(page).toHaveURL(/\/$/);
  // The page shifts left: the panel sits to the right of the deal table.
  const table = await page.locator(".overview-main .table").boundingBox();
  const side = await panel.boundingBox();
  expect(side!.x).toBeGreaterThan(table!.x + table!.width);

  await page.getByRole("button", { name: /^At Risk/ }).click();
  await expect(panel.getByRole("heading", { name: "At risk" })).toBeVisible();
  await expect(panel.locator(".mini-list li")).toHaveCount(2);
  await panel.getByRole("button", { name: /Carolina Charter Bus/ }).click();
  await expect(panel.getByRole("heading", { name: "Carolina Charter Bus" })).toBeVisible();

  await page.locator(".vbar.peak").click(); // the biggest month in the fake data: $15,800
  await expect(panel).toContainText("$15,800");
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);

  await page.locator(".receipt-card").first().click();
  await expect(panel.getByRole("heading", { name: "Triangle Sports Supply" })).toBeVisible();
  await panel.getByRole("button", { name: "Close details" }).click();
  await expect(panel).toHaveCount(0);
});

test.describe("on a phone", () => {
  const { defaultBrowserType: _ignored, ...pixel } = devices["Pixel 7"];
  test.use(pixel);

  test("Add Receipts offers Take photo, which opens the rear camera", async ({ page }) => {
    await installFakeApi(page);
    await page.goto("/");
    await page.getByRole("button", { name: /Add Receipts/ }).click();
    await expect(page.getByRole("menuitem", { name: /Take photo/ })).toBeVisible();
    await expect(page.getByTestId("add-receipt-file")).toHaveAttribute("capture", "environment");

    await page.goto("/receipts/new");
    await expect(page.getByText("Tap to take a photo of the receipt")).toBeVisible();
    await expect(page.getByTestId("capture-file")).toHaveAttribute("capture", "environment");
  });

  test("overview: tapping a deal drops its detail down right under that row", async ({ page }) => {
    await installFakeApi(page);
    await page.goto("/");
    await page.getByRole("button", { name: "Carolina Charter Bus", exact: true }).click();
    await expect(page.locator("aside")).toHaveCount(0);
    const row = page.locator("tbody tr", { hasText: "Carolina Charter Bus" }).first();
    const drop = row.locator("xpath=following-sibling::tr[1]");
    await expect(drop).toHaveClass(/expand/);
    await expect(drop.getByRole("heading", { name: "Carolina Charter Bus" })).toBeVisible();
    await page.getByRole("button", { name: "Carolina Charter Bus", exact: true }).click();
    await expect(page.locator(".insight")).toHaveCount(0);
  });

  test("no page scrolls sideways on a small phone, and the nav links stay visible", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await installFakeApi(page);
    for (const path of ["/", "/partnerships", "/partnerships/p-tss", "/partnerships/new", "/receipts", "/receipts/new"]) {
      await page.goto(path);
      await expect(page.locator("main")).not.toContainText("Loading");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${path} is wider than the screen`).toBeLessThanOrEqual(0);
      for (const name of ["Overview", "Partnerships", "Receipts"]) {
        await expect(page.getByRole("navigation").getByRole("link", { name, exact: true })).toBeInViewport({ ratio: 1 });
      }
    }
  });
});
