// Run against the source demo with an isolated Node service capped at two editors.
const assert = require("node:assert/strict");
const { chromium } = require(process.env.KAM_PLAYWRIGHT || "playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1150 } });
    page.setDefaultTimeout(10_000);
    const pageErrors = [];
    page.on("pageerror", error => pageErrors.push(error.message));
    await page.addInitScript(() => {
      const send = WebSocket.prototype.send;
      WebSocket.prototype.send = function (data) {
        if (window.dropCollaborationUpdates && new URL(this.url).pathname === "/kam-collab/ws") return;
        return send.call(this, data);
      };
    });
    await page.goto(process.env.KAM_AI_DEMO_URL || "http://127.0.0.1:4404");
    const frame = async index => (await page.locator("#clients iframe").nth(index).elementHandle()).contentFrame();
    const waitText = (frame, selector, pattern) => frame.waitForFunction(
      ([selector, source]) => new RegExp(source).test(document.querySelector(selector)?.textContent ?? ""),
      [selector, pattern.source],
    );
    const ready = frame => waitText(frame, "#status", /^协作中$/);
    const editable = (frame, value) => frame.locator(`.aie-content[contenteditable="${value}"]`).waitFor();
    const color = frame => frame.locator("#self-avatar").evaluate(el => getComputedStyle(el).backgroundColor);
    const a = await frame(0), b = await frame(1);
    await Promise.all([ready(a), ready(b), editable(a, true), editable(b, true)]);
    const originalA = await color(a), originalB = await color(b);
    assert.deepEqual(new Set([originalA, originalB]), new Set(["rgb(121, 134, 203)", "rgb(129, 199, 132)"]));

    await b.locator(".aie-content").click();
    await b.locator(".aie-content").press("Home");
    for (let i = 0; i < 4; i++) await b.locator(".aie-content").press("Shift+ArrowRight");
    await waitText(a, ".collaboration-cursor__label", /李四/);
    const cursor = await a.locator(".collaboration-cursor__label").evaluate(el => ({
      label: getComputedStyle(el).backgroundColor, caret: getComputedStyle(el.parentElement).borderColor,
    }));
    assert.deepEqual(cursor, { label: originalB, caret: originalB });
    const selection = await a.locator(".ProseMirror-yjs-selection").first().evaluate(el => getComputedStyle(el).backgroundColor);
    assert.match(selection, new RegExp(originalB.replace("rgb(", "rgba\\(").replace(")", ", 0\\.[0-9]+\\)")));

    await page.locator("#writer").click();
    const c = await frame(2);
    await waitText(c, "#status", /编辑席位已满.*未进入共享稿/);
    assert.equal(await c.locator(".aie-content").count(), 0);
    assert.equal(await color(c), "rgb(148, 163, 184)");
    await page.locator("#reader").click();
    const reader = await frame(3);
    await ready(reader);
    await editable(reader, false);

    // Drop only A's outbound updates for this task, leaving a genuine local Y.Doc change.
    await a.locator(".aie-content").evaluate(el => {
      const view = el.editor.view;
      el.dataset.preserved = "yes";
      window.dropCollaborationUpdates = true;
      try { view.dispatch(view.state.tr.insertText("本地待同步", 1)); }
      finally { window.dropCollaborationUpdates = false; }
      document.querySelector("#connection").click();
    });
    await editable(a, false);
    await waitText(a, ".aie-content", /本地待同步/);
    assert.doesNotMatch(await b.locator(".aie-content").textContent(), /本地待同步/);
    await waitText(page.mainFrame(), "#health", /服务总 WebSocket 连接 2（/);
    await c.locator("#connection").click();
    await ready(c);
    assert.equal(await color(c), originalA);

    await a.locator("#connection").click();
    await waitText(a, "#status", /编辑席位已满.*本端修改保留/);
    await editable(a, false);
    await waitText(a, ".aie-content[data-preserved=yes]", /本地待同步/);
    await a.locator(".aie-content").evaluate(el => {
      const view = el.editor.view;
      view.dispatch(view.state.tr.insertText("不应写入", 1));
    });
    assert.doesNotMatch(await a.locator(".aie-content").textContent(), /不应写入/);
    assert.doesNotMatch(await reader.locator(".aie-content").textContent(), /本地待同步/);

    await b.locator("#connection").click();
    await waitText(page.mainFrame(), "#health", /服务总 WebSocket 连接 2（/);
    await a.locator("#connection").click();
    await ready(a);
    await editable(a, true);
    await waitText(reader, ".aie-content", /本地待同步/);
    assert.equal(await color(a), originalB);
    assert.equal(await color(c), originalA);
    assert.deepEqual(pageErrors, []);
    console.log("AiEditor browser: distinct colors, cursor/label/selection, first denial, read-only, retained Y.Doc and recolored retry passed");
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
