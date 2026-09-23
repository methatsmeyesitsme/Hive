#!/usr/bin/env node
import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
  await page.setContent("<iframe id=\"preview\" title=\"Hive preview\" sandbox=\"allow-scripts allow-forms allow-modals\" style=\"width:100%;height:400px;border:0\"></iframe>");
  const html = "<!doctype html><html><body><button id=\"b\">Run</button><output id=\"o\">0</output><script>const b=document.getElementById('b');const o=document.getElementById('o');b.addEventListener('click',()=>{o.value=String(Number(o.value)+1)});</script></body></html>";
  await page.locator("#preview").evaluate((el, value) => { el.srcdoc = value; }, html);
  const frame = page.frameLocator("#preview");
  await frame.locator("#b").click();
  assert.equal(await frame.locator("#o").inputValue(), "1");
  console.log(JSON.stringify({ ok: true, preview: "sandboxed iframe scripts and forms execute" }));
} finally {
  await browser.close();
}
