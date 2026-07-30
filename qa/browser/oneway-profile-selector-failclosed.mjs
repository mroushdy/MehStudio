#!/usr/bin/env node
import { readFile } from "node:fs/promises";

import { chromium } from "@playwright/test";

const TARGET = process.env.MEH_ONEWAY_PROFILE_QA_URL
  || "http://127.0.0.1:8520/shell.html?qa=oneway-profile-selector";
const SOURCE_ROOT = new URL("../../", import.meta.url);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
const browserErrors = [];
page.on("pageerror", (error) => browserErrors.push(String(error.stack || error)));
page.on("console", (message) => {
  if (message.type() === "error") browserErrors.push(message.text());
});

try {
  const [shellSource, profileLawsSource, engineSource, twoWaySource] =
    await Promise.all([
      readFile(new URL("shell.html", SOURCE_ROOT), "utf8"),
      readFile(new URL("profile-laws.js", SOURCE_ROOT), "utf8"),
      readFile(new URL("engine.js", SOURCE_ROOT), "utf8"),
      readFile(new URL("twoway-core.js", SOURCE_ROOT), "utf8"),
    ]);
  const runtimeSource = shellSource
    .replace("/*__PROFILE_LAWS__*/", profileLawsSource)
    .replace("/*__ENGINE__*/", engineSource)
    .replace("/*__TWOWAY__*/", twoWaySource)
    .replace("/*__CAD__*/", "/* one-way selector QA runtime */");
  await page.route("**/shell.html?*", (route) => route.fulfill({
    status: 200,
    contentType: "text/html; charset=utf-8",
    body: runtimeSource,
  }));
  await page.goto(TARGET, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  await page.waitForFunction(() => (
    typeof S !== "undefined"
    && typeof MEH2 !== "undefined"
    && Array.isArray(MEH2.BUILDS?.["1way"])
  ), null, { timeout: 30_000 });

  await page.evaluate(() => {
    const fixture = MEH2.BUILDS["1way"].find((entry) => entry.key === "fhx6");
    if (!fixture) throw new Error("missing fhx6 fixture");
    Object.assign(S, structuredClone(fixture.s), {
      topo: "1way",
      profileLaw: "conical",
    });
    rebuild();
  });
  await page.waitForFunction(() => (
    window.__profileLawUIQA?.topology === "1way"
    && window.__profileLawUIQA?.current === "conical"
  ), null, { timeout: 30_000 });

  const before = await page.evaluate(() => {
    const selector = document.getElementById("profileLaw");
    const options = Object.fromEntries(
      [...selector.options].map((option) => [option.value, {
        disabled: option.disabled,
        label: option.textContent,
        title: option.title,
      }]),
    );
    return {
      state: S.profileLaw,
      selector: selector.value,
      options,
      qa: structuredClone(window.__profileLawUIQA),
    };
  });
  for (const family of ["conical", "osse", "rosse"]) {
    assert(before.options[family]?.disabled === false,
      `${family}: compatible option disabled`);
    assert(before.qa.statuses[family]?.ok === true,
      `${family}: canonical preflight refused`);
  }
  assert(before.options.classicOS?.disabled === true,
    "Classic OS must be disabled for the fixed fhx6 handoff");
  assert(before.qa.statuses.classicOS?.ok === false,
    "Classic OS refusal is absent from the QA record");
  assert(before.qa.statuses.classicOS?.code
      === "PROFILE_HANDOFF_TANGENT_UNMATCHED",
    `unexpected refusal code: ${before.qa.statuses.classicOS?.code}`);
  assert(/unavailable for this coax/.test(before.options.classicOS.label),
    "Classic OS option lacks visible incompatibility text");
  assert(/PROFILE_HANDOFF_TANGENT_UNMATCHED/.test(
    before.options.classicOS.title,
  ), "Classic OS option lacks refusal details");

  const forced = await page.evaluate(() => {
    const selector = document.getElementById("profileLaw");
    selector.value = "classicOS";
    selector.onchange();
    return {
      state: S.profileLaw,
      selector: selector.value,
      note: document.getElementById("profileLawNote")?.textContent || "",
      refusal: structuredClone(window.__profileLawUIQA?.lastRefusal),
    };
  });
  assert(forced.state === "conical",
    "forced incompatible option mutated the canonical state");
  assert(forced.selector === "conical",
    "forced incompatible option did not roll the selector back");
  assert(
    /PROFILE OPTION REFUSED/.test(forced.note)
      && /PROFILE_HANDOFF_TANGENT_UNMATCHED/.test(forced.note),
    "visible refusal reason is missing",
  );
  assert(
    forced.refusal?.family === "classicOS"
      && forced.refusal?.code === "PROFILE_HANDOFF_TANGENT_UNMATCHED",
    "structured refusal witness is missing",
  );
  assert(browserErrors.length === 0,
    `browser errors:\n${browserErrors.join("\n")}`);
  console.log(
    "ONE-WAY PROFILE SELECTOR BROWSER PASS"
      + " · Classic OS refused and rolled back without state mutation",
  );
} finally {
  await browser.close();
}
