// Sign in through the live /auth UI with a known-good test credential.
// Verifies the React form → Firebase Auth SDK chain on production.

import { WebSocket } from "ws";

const ORIGIN = "https://outreach-psi-sooty.vercel.app";
const EMAIL = "does-not-exist-1778763761577@outreach-test.local";
const PASSWORD = "definitely-wrong-password-xyzzy";

const newTab = await (
  await fetch(`http://localhost:9222/json/new?${encodeURIComponent(ORIGIN + "/auth")}`, {
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
await send("Page.enable");

const evalJs = async (expression) => {
  const { result } = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  return result.value;
};

console.log("→ waiting for /auth to settle…");
await new Promise((r) => setTimeout(r, 2500));

// 1. If already signed in (redirected to /dashboard), force a sign-out by
//    clearing Firebase's IndexedDB storage + cookies + reloading.
let url = await evalJs("location.href");
console.log("initial URL:", url);
if (url.includes("/dashboard")) {
  console.log("→ clearing Firebase auth state + reloading…");
  await evalJs(`
    (async () => {
      // Clear Firebase IndexedDB storage where the SDK persists auth.
      const dbs = await indexedDB.databases();
      for (const d of dbs) {
        if (d.name && /firebase/i.test(d.name)) {
          await new Promise((resolve) => {
            const req = indexedDB.deleteDatabase(d.name);
            req.onsuccess = req.onerror = req.onblocked = resolve;
          });
        }
      }
      Object.keys(localStorage).filter(k => k.includes('firebase')).forEach(k => localStorage.removeItem(k));
      Object.keys(sessionStorage).filter(k => k.includes('firebase')).forEach(k => sessionStorage.removeItem(k));
    })();
  `);
  await evalJs(`location.href = '${ORIGIN}/auth';`);
  await new Promise((r) => setTimeout(r, 3500));
}

url = await evalJs("location.href");
console.log("post-cleanup URL:", url);
if (!url.includes("/auth")) {
  console.log("⚠ Couldn't get back to /auth — already authenticated through a path I can't clear.");
  process.exit(1);
}

// 2. Confirm form renders.
const initialForm = await evalJs(`
  (() => {
    const submit = document.querySelector('button[type="submit"]');
    return { submitText: submit?.textContent?.trim(), defaultMode: submit?.textContent?.includes('Create') ? 'signup' : 'signin' };
  })()
`);
console.log("initial form mode:", JSON.stringify(initialForm));

// 3. Toggle to Sign in if needed, and HARD-VERIFY the switch worked.
if (initialForm.defaultMode !== "signin") {
  await evalJs(`
    (() => {
      const btns = [...document.querySelectorAll('button')];
      const t = btns.find(b => /^sign in$/i.test((b.textContent || '').trim()));
      if (t) t.click();
    })()
  `);
  await new Promise((r) => setTimeout(r, 500));
  const after = await evalJs(`document.querySelector('button[type="submit"]')?.textContent?.trim()`);
  console.log("after toggle, submit says:", after);
  if (!/sign in/i.test(after || "")) {
    console.log("⚠ Toggle failed — aborting before another accidental signup.");
    process.exit(1);
  }
}

// 4. Fill credentials.
await evalJs(`
  (() => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    const email = document.querySelector('input[type="email"]');
    const password = document.querySelector('input[type="password"]');
    setter.call(email, ${JSON.stringify(EMAIL)});
    email.dispatchEvent(new Event('input', { bubbles: true }));
    setter.call(password, ${JSON.stringify(PASSWORD)});
    password.dispatchEvent(new Event('input', { bubbles: true }));
  })()
`);

// 5. Submit.
console.log("→ submitting sign-in form…");
await evalJs(`document.querySelector('form').requestSubmit()`);
await new Promise((r) => setTimeout(r, 5000));

const finalUrl = await evalJs("location.href");
console.log("final URL:", finalUrl);

if (finalUrl.includes("/dashboard")) {
  console.log("✓ Sign-in succeeded — landed on dashboard.");
} else {
  console.log("✗ Sign-in did not redirect to /dashboard.");
  const toast = await evalJs(`
    [...document.querySelectorAll('*')].map(e=>e.textContent||'').filter(t=>t&&t.length<300&&/error|invalid|wrong/i.test(t)).slice(0,3)
  `);
  console.log("toasts/errors visible:", JSON.stringify(toast));
}

await fetch(`http://localhost:9222/json/close/${newTab.id}`).catch(() => {});
ws.close();
