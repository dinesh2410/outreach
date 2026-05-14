import { writeFileSync, mkdirSync } from "node:fs";
import { WebSocket } from "ws";

const tabs = await (await fetch("http://localhost:9222/json")).json();
const tab = tabs.find((t) => t.type === "page" && t.url.includes("/dashboard"));
if (!tab) {
  console.error("No /dashboard tab found");
  process.exit(1);
}

const ws = new WebSocket(tab.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const send = (method, params = {}) =>
  new Promise((res, rej) => {
    const msgId = ++id;
    pending.set(msgId, { res, rej });
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });

ws.on("message", (data) => {
  const msg = JSON.parse(data.toString());
  if (msg.id && pending.has(msg.id)) {
    const { res, rej } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
  }
});

await new Promise((res) => ws.once("open", res));

await send("Emulation.setDeviceMetricsOverride", {
  width: 1600,
  height: 1000,
  deviceScaleFactor: 2,
  mobile: false,
});
// Kill scrollbars — both the chrome-native one and any -webkit-scrollbar
// the page might render. Without this, headless Chrome bakes the scroll
// gutter into the screenshot when the page is taller than the viewport.
await send("Emulation.setScrollbarsHidden", { hidden: true }).catch(() => {});
await send("Page.enable");
await send("Page.addStyleToBeEvaluatedOnLoad", {
  scriptSource: "html,body{overflow:hidden!important}::-webkit-scrollbar{display:none!important}",
}).catch(() => {});
// Inject as a regular stylesheet too, since the tab is already loaded.
await send("Runtime.evaluate", {
  expression: `
    (() => {
      const s = document.createElement('style');
      s.textContent = 'html,body{overflow:hidden!important}::-webkit-scrollbar{display:none!important;width:0!important;height:0!important}';
      document.head.appendChild(s);
      window.scrollTo(0, 0);
    })();
  `,
});
await new Promise((r) => setTimeout(r, 600));

const { data } = await send("Page.captureScreenshot", {
  format: "png",
  captureBeyondViewport: false,
});

mkdirSync("public/hero", { recursive: true });
writeFileSync("public/hero/dashboard-v2.png", Buffer.from(data, "base64"));
console.log("saved public/hero/dashboard-v2.png");
ws.close();
