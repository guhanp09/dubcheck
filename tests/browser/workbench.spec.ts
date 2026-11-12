import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";

async function accept(
  page: Page,
  note = "Compared the original and translated passage.",
) {
  await page.getByRole("radio", { name: "Meaning preserved" }).check();
  await page.getByLabel("Reviewer", { exact: true }).fill("Bilingual Reviewer");
  await page.getByLabel("Reason / evidence").fill(note);
  await page
    .getByRole("button", { name: "Save decision", exact: true })
    .click();
  await expect(page.getByText("Current decision recorded")).toBeVisible();
}
async function correct(page: Page) {
  await page.getByRole("radio", { name: "Needs correction" }).check();
  await page
    .getByLabel("Proposed dub text")
    .fill("इस अध्ययन में 24 लोग भाग लेते हैं।");
  await page.getByLabel("Reviewer", { exact: true }).fill("Bilingual Reviewer");
  await page
    .getByLabel("Reason / evidence")
    .fill("The original says 24 participants; the dub incorrectly says 48.");
  await page
    .getByRole("button", { name: "Save decision", exact: true })
    .click();
  await expect(page.getByText("Current decision recorded")).toBeVisible();
}
const captions = (text: string, start = "00:00:00,000", end = "00:00:05,000") =>
  `1\n${start} --> ${end}\n${text}\n`;
async function downloadFile(page: Page, name: string | RegExp) {
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name }).click();
  const download = await event,
    buffer = await readFile((await download.path())!);
  return { name: download.suggestedFilename(), buffer };
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("shows a useful sample, explicit scope and no preselected verdict", async ({
  page,
}) => {
  await expect(
    page.getByRole("heading", { name: "Every language. The same idea." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Quantity may have changed" }),
  ).toBeVisible();
  await expect(
    page
      .locator(".metric")
      .filter({ hasText: "Flagged passages" })
      .locator("strong"),
  ).toHaveText("4 / 10");
  expect(await page.getByRole("radio", { checked: true }).count()).toBe(0);
  await expect(
    page.getByText(
      "Illustrative transcripts with seeded errors · no sample audio",
    ),
  ).toBeVisible();
});

test("records a correction, persists it and retains the original evidence", async ({
  page,
}) => {
  await correct(page);
  await expect(page.locator(".transcript.target")).toContainText("48 लोग");
  await expect(
    page.locator(".metric").filter({ hasText: "Reviewed" }).locator("strong"),
  ).toHaveText("1 / 10");
  await page.reload();
  await expect(page.getByLabel("Proposed dub text")).toHaveValue(
    "इस अध्ययन में 24 लोग भाग लेते हैं।",
  );
  await expect(page.getByLabel("Reason / evidence")).toHaveValue(
    /original says 24/,
  );
  await expect(
    page.getByText("Saved in this browser", { exact: true }),
  ).toBeVisible();
});

test("exports a draft corrected script, report, CSV and a restorable audit backup", async ({
  page,
}) => {
  await correct(page);
  await page.getByRole("button", { name: "Export handoff" }).click();
  await expect(
    page.getByText("9 passages still need a decision", { exact: false }),
  ).toBeVisible();
  const srt = await downloadFile(page, /Corrected script · SRT/);
  expect(srt.name).toBe("dubcheck-draft-hi.srt");
  expect(srt.buffer.toString()).toContain("24 लोग");
  expect(srt.buffer.toString()).toContain("00:00:00,000 --> 00:00:07,000");
  const report = await downloadFile(page, /Reviewer handoff · Markdown/);
  expect(report.buffer.toString()).toContain("Status: DRAFT");
  expect(report.buffer.toString()).toContain("Original dub transcript:");
  expect(report.buffer.toString()).toContain("48 लोग");
  const csv = await downloadFile(page, /Review log · CSV/);
  expect(csv.buffer.toString()).toContain("Bilingual Reviewer");
  const backup = await downloadFile(page, /Workspace backup · JSON/);
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Try a sample" }).click();
  await page.getByRole("button", { name: /English.*Tamil/ }).click();
  await expect(page.locator(".language-pill").last()).toHaveText("Tamil");
  await page.getByLabel("Restore workspace backup").setInputFiles({
    name: backup.name,
    mimeType: "application/json",
    buffer: backup.buffer,
  });
  await expect(page.getByLabel("Proposed dub text")).toHaveValue(
    "इस अध्ययन में 24 लोग भाग लेते हैं।",
  );
  await expect(page.locator(".language-pill").last()).toHaveText("Hindi");
});

test("makes a saved decision stale after an updated dub transcript and excludes stale corrections", async ({
  page,
}) => {
  await correct(page);
  await page
    .locator(".transcript.target")
    .getByRole("button", { name: "Update transcript" })
    .click();
  await page
    .getByLabel("Or paste dub captions")
    .fill(
      captions("इस अध्ययन में 72 लोग भाग लेते हैं।", "00:00:00,000", "00:00:07,000"),
    );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Update transcript", exact: true })
    .click();
  await expect(
    page.getByText("The evidence or comparison settings changed.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(page.locator(".state-tag")).toHaveText("Review again");
  await page.getByRole("button", { name: "Export handoff" }).click();
  const srt = await downloadFile(page, /Corrected script · SRT/);
  expect(srt.buffer.toString()).toContain("72 लोग");
  expect(srt.buffer.toString()).not.toContain("24 लोग");
});

test("imports WebVTT and SRT without executing embedded markup", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Import transcripts" }).click();
  await page.getByLabel("Project title").fill("My own episode");
  await page.getByLabel("Upload source captions").setInputFiles({
    name: "original.vtt",
    mimeType: "text/vtt",
    buffer: Buffer.from(
      "WEBVTT\n\n00:00.000 --> 00:05.000\nThere are 10 people.\n",
    ),
  });
  await page
    .getByLabel("Or paste dub captions")
    .fill(captions("<img src=x onerror=alert(1)>20 लोग हैं।"));
  await page.getByRole("button", { name: "Create workspace" }).click();
  await expect(
    page.getByRole("heading", { name: "My own episode" }),
  ).toBeVisible();
  await expect(page.locator(".transcript.target")).toContainText("20 लोग हैं।");
  expect(await page.locator(".transcript.target img").count()).toBe(0);
  await expect(
    page.getByText("Caption formatting tags are removed", { exact: false }),
  ).toBeVisible();
});

test("rejects malformed caption imports and keeps the existing workspace", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Import transcripts" }).click();
  await page.getByLabel("Project title").fill("Invalid");
  await page.getByLabel("Or paste original captions").fill("not captions");
  await page.getByLabel("Or paste dub captions").fill(captions("नमस्ते"));
  await page.getByRole("button", { name: "Create workspace" }).click();
  await expect(page.getByRole("alert")).toContainText("valid timestamp");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(
    page.getByRole("heading", { name: "A little more evidence" }),
  ).toBeVisible();
});

test("filters, searches and navigates unflagged passages without treating them as approved", async ({
  page,
}) => {
  await page.getByLabel("Filter passages").selectOption("flagged");
  expect(await page.locator(".queue-item").count()).toBe(4);
  await page.getByLabel("Search passages").fill("Correlation");
  expect(await page.locator(".queue-item").count()).toBe(1);
  await page.locator(".queue-item").click();
  await expect(
    page.getByRole("heading", { name: "Possible reversal of meaning" }),
  ).toBeVisible();
  await page.getByLabel("Search passages").fill("");
  await page.getByLabel("Filter passages").selectOption("all");
  await page.getByRole("button", { name: "Go to 00:28", exact: true }).click();
  await expect(
    page.getByText("No supported checks triggered", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".state-tag")).toHaveText("To review");
  await accept(page, "60 seconds and one minute are equivalent.");
  await page.getByLabel("Filter passages").selectOption("reviewed");
  expect(await page.locator(".queue-item").count()).toBe(1);
});

test("records a second opinion without marking the passage reviewed", async ({
  page,
}) => {
  await page.getByRole("radio", { name: "Second opinion" }).check();
  await page.getByLabel("Reviewer", { exact: true }).fill("Reviewer");
  await page
    .getByLabel("Reason / evidence")
    .fill("Need a Hindi speaker to check this phrasing.");
  await page.getByRole("button", { name: "Save decision" }).click();
  await expect(page.locator(".state-tag")).toHaveText("Second opinion");
  await expect(
    page.locator(".metric").filter({ hasText: "Reviewed" }).locator("strong"),
  ).toHaveText("0 / 10");
});

test("requires a real correction instead of accepting an unchanged script", async ({
  page,
}) => {
  await page.getByRole("radio", { name: "Needs correction" }).check();
  await page.getByLabel("Reviewer", { exact: true }).fill("Reviewer");
  await page.getByLabel("Reason / evidence").fill("The quantity is wrong.");
  await page.getByRole("button", { name: "Save decision" }).click();
  await expect(page.getByRole("alert")).toContainText("Edit at least one");
});

test("offset changes trigger re-review and glossary aliases can resolve a terminology flag", async ({
  page,
}) => {
  await accept(page);
  await page.getByRole("button", { name: "Timing & terms" }).click();
  await page.getByLabel("Dub starts later by (seconds)").fill("0.1");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.locator(".state-tag")).toHaveText("Review again");
  await page.getByRole("button", { name: "Timing & terms" }).click();
  await page
    .getByLabel("Hindi variants 1")
    .fill("यादृच्छिक आवंटन | रैंडम असाइनमेंट | यादृच्छिक नमूना");
  await page.getByRole("button", { name: "Save settings" }).click();
  await page.getByRole("button", { name: "Go to 00:20", exact: true }).click();
  // A creator can override terminology; the app never treats this as semantic validation.
  await expect(
    page.getByText("No supported checks triggered", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".state-tag")).toHaveText("To review");
});

test("manual pairing keeps every cue visible and can be reset", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Adjust pairing" }).click();
  const original = page.getByRole("group", { name: "Original cues" }),
    target = page.getByRole("group", { name: "Dub cues" });
  await original.getByRole("checkbox").nth(1).check();
  await target.getByRole("checkbox").nth(1).check();
  await page.getByRole("button", { name: "Save pairing" }).click();
  await expect(
    page.getByText("Manually paired", { exact: false }),
  ).toBeVisible();
  await expect(page.locator(".project-identity p")).toContainText("9 passages");
  await page.getByRole("button", { name: "Adjust pairing" }).click();
  await page
    .getByRole("button", { name: "Reset all to timestamp matching" })
    .click();
  await expect(page.locator(".project-identity p")).toContainText(
    "10 passages",
  );
});

test("offers recovery for corrupted saved state without overwriting it", async ({
  page,
}) => {
  await page.evaluate(() =>
    localStorage.setItem("dubcheck.workspace.v1", "{broken"),
  );
  await page.reload();
  await expect(page.getByRole("alert")).toContainText(
    "Saved workspace could not be opened",
  );
  await accept(page);
  expect(
    await page.evaluate(() => localStorage.getItem("dubcheck.workspace.v1")),
  ).toBe("{broken");
  await expect(
    page.getByRole("button", { name: "Download unreadable data" }),
  ).toBeVisible();
});

test("rejects invalid restored backups with no loss of current work", async ({
  page,
}) => {
  await correct(page);
  await page.getByLabel("Restore workspace backup").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"schemaVersion":99}'),
  });
  await expect(
    page.getByText("Invalid DubCheck v1 workspace:", { exact: false }),
  ).toBeVisible();
  await expect(page.getByLabel("Proposed dub text")).toHaveValue(
    "इस अध्ययन में 24 लोग भाग लेते हैं।",
  );
});

test("prevents a second tab from silently overwriting saved review decisions", async ({
  page,
  context,
}) => {
  const other = await context.newPage();
  await other.goto("/");
  await accept(page);
  await expect(other.getByRole("alert")).toContainText("Another tab changed");
  await other.getByRole("button", { name: "Load saved copy" }).click();
  await expect(other.getByText("Current decision recorded")).toBeVisible();
  await other.close();
});

test("keeps work usable and exportable when browser storage is unavailable", async ({
  context,
}) => {
  await context.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    };
  });
  const page = await context.newPage();
  await page.goto("/");
  await correct(page);
  await expect(page.getByRole("alert")).toContainText(
    "Not saved in this browser",
  );
  const file = await downloadFile(page, "Download this copy");
  expect(JSON.parse(file.buffer.toString()).decisions).toHaveLength(1);
  await page.close();
});

test("protects unsaved edits when navigating, and discards them only after confirmation", async ({
  page,
}) => {
  await page.getByLabel("Reason / evidence").fill("Unsaved reasoning");
  page.once("dialog", (d) => d.dismiss());
  await page.getByRole("button", { name: "Next passage" }).click();
  await expect(page.getByLabel("Reason / evidence")).toHaveValue(
    "Unsaved reasoning",
  );
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Next passage" }).click();
  await expect(page.getByLabel("Reason / evidence")).toHaveValue("");
});

test("plays and seeks attached local audio and excludes media from backups", async ({
  page,
}) => {
  const sampleRate = 8000,
    length = 80 * sampleRate * 2,
    wave = Buffer.alloc(44 + length);
  wave.write("RIFF", 0);
  wave.writeUInt32LE(36 + length, 4);
  wave.write("WAVEfmt ", 8);
  wave.writeUInt32LE(16, 16);
  wave.writeUInt16LE(1, 20);
  wave.writeUInt16LE(1, 22);
  wave.writeUInt32LE(sampleRate, 24);
  wave.writeUInt32LE(sampleRate * 2, 28);
  wave.writeUInt16LE(2, 32);
  wave.writeUInt16LE(16, 34);
  wave.write("data", 36);
  wave.writeUInt32LE(length, 40);
  await page.locator(".listen-section summary").click();
  await page.getByLabel("Attach original media").setInputFiles({
    name: "synthetic-silence.wav",
    mimeType: "audio/wav",
    buffer: wave,
  });
  await expect
    .poll(() =>
      page.locator("audio").evaluate((el: HTMLAudioElement) => el.readyState),
    )
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: "Go to 00:14", exact: true }).click();
  await page
    .getByRole("button", { name: "Listen to original at 00:14", exact: true })
    .click();
  await expect
    .poll(() =>
      page.locator("audio").evaluate((el: HTMLAudioElement) => el.currentTime),
    )
    .toBeGreaterThanOrEqual(14);
  await page.getByRole("button", { name: "Export handoff" }).click();
  const backup = await downloadFile(page, /Workspace backup · JSON/);
  expect(backup.buffer.toString()).not.toContain("blob:");
  expect(backup.buffer.toString()).not.toContain("synthetic-silence");
});

test("works with Tamil and allows keyboard dismissal with focus restoration", async ({
  page,
}) => {
  const opener = page.getByRole("button", { name: "Try a sample" });
  await opener.click();
  await page.keyboard.press("Escape");
  await expect(opener).toBeFocused();
  await opener.click();
  await page.getByRole("button", { name: /English.*Tamil/ }).click();
  await expect(page.locator(".transcript.target")).toContainText("48 பேர்");
  await expect(page.locator(".language-pill").last()).toHaveText("Tamil");
  await page.getByRole("button", { name: "Go to 00:28" }).click();
  await expect(
    page.getByText("No supported checks triggered", { exact: true }),
  ).toBeVisible();
});

for (const width of [320, 390, 768, 1440])
  test(`has no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "Import transcripts" }).click();
    expect(
      await page
        .getByRole("dialog")
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
  });

test("passes automated WCAG A/AA checks in the main workspace and key dialogs", async ({
  page,
}) => {
  const inspect = async () => {
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        targets: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  };
  await inspect();
  for (const button of [
    "Import transcripts",
    "Timing & terms",
    "Export handoff",
    "Adjust pairing",
    "How it works",
  ]) {
    await page.getByRole("button", { name: button, exact: true }).click();
    await inspect();
    await page.getByRole("button", { name: "Close dialog" }).click();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await inspect();
});

test("does not upload transcripts or call external services while reviewing", async ({
  page,
}) => {
  const external: string[] = [],
    errors: string[] = [];
  page.on("request", (request) => {
    if (
      !request.url().startsWith("http://127.0.0.1:4174/") &&
      !request.url().startsWith("blob:") &&
      !request.url().startsWith("data:")
    )
      external.push(request.url());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.reload();
  await correct(page);
  await page.getByRole("button", { name: "Export handoff" }).click();
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});

test("keeps long transcript navigation usable without clipping the passage map", async ({
  page,
}) => {
  const time = (n: number) =>
    `00:${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")},000`;
  const source = Array.from(
    { length: 60 },
    (_, i) =>
      `${i + 1}\n${time(i * 4)} --> ${time(i * 4 + 3)}\nPassage ${i + 1} contains evidence.`,
  ).join("\n\n");
  const target = Array.from(
    { length: 60 },
    (_, i) =>
      `${i + 1}\n${time(i * 4)} --> ${time(i * 4 + 3)}\nभाग ${i + 1} में प्रमाण है।`,
  ).join("\n\n");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Import transcripts" }).click();
  await page.getByLabel("Project title").fill("A longer lesson");
  await page.getByLabel("Or paste original captions").fill(source);
  await page.getByLabel("Or paste dub captions").fill(target);
  await page.getByRole("button", { name: "Create workspace" }).click();
  await expect(page.locator(".project-identity p")).toContainText(
    "60 passages",
  );
  expect(await page.locator(".passage-map button").count()).toBe(24);
  await page.getByLabel("Search passages").fill("Passage 60");
  await page.locator(".queue-item").click();
  await expect(
    page.getByText("PASSAGE 60 OF 60", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".timeline-range")).toContainText("37–60 of 60");
  expect(
    await page
      .locator(".passage-map")
      .evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  await expect(
    page.getByRole("button", { name: "Next passage" }),
  ).toBeDisabled();
});
