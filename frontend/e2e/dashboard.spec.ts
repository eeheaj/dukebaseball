import { expect, test } from "@playwright/test";
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
  await expect(page.getByRole("link", { name: /Bull City Burger Team dinner, away trip \$412/ })).toBeVisible();
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
