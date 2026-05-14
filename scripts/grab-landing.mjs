import { writeFileSync } from "node:fs";
import { WebSocket } from "ws";

const target = "http://localhost:3000/";
const newTab = await (
  await fetch(`http://localhost:9222/json/new?${encodeURIComponent(target)}`, {
    method: "PUT",
  })
).json();

const ws = new WebSocket(newTab.webSocketDebuggerUrl);
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
  width: 1440,
  height: 900,
  deviceScaleFactor: 1.5,
  mobile: false,
});
await send("Page.enable");
await new Promise((r) => setTimeout(r, 2500));
const { data } = await send("Page.captureScreenshot", { format: "png" });
writeFileSync("scripts/landing-hero.png", Buffer.from(data, "base64"));
console.log("saved scripts/landing-hero.png");
// close the tab
await fetch(`http://localhost:9222/json/close/${newTab.id}`);
ws.close();
