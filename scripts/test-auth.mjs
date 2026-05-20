// Live email/password sign-IN flow check.
// 1. Signs out any current user (including the test account from a prior run).
// 2. Loads /auth and forces signin mode (defaults to signup).
// 3. Submits a deliberately-wrong credential.
// 4. Reports the surfaced error toast.
//
// Requires a Chrome at localhost:9222 (the CDP-instrumented one).

import { WebSocket } from "ws";

const ORIGIN = "https://outreach-psi-sooty.vercel.app";
const TARGET = `${ORIGIN}/auth`;

const newTab = await (
  await fetch(`http://localhost:9222/json/new?${encodeURIComponent(TARGET)}`, {
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

// Helper to run JS in the tab and get back the result.
async function evalJs(expression) {
  const { result } = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  return result.value;
}

console.log("→ waiting for auth page to settle…");
await new Promise((r) => setTimeout(r, 2500));

// 1. Confirm we're on /auth and not redirected (user might be logged in;
//    if so, /auth pushes to /dashboard — we need to detect that).
const initialUrl = await evalJs("location.href");
console.log("page URL:", initialUrl);

if (!initialUrl.includes("/auth")) {
  console.log("⚠ /auth redirected → user is already logged in.");
  console.log("Need to sign out first to test the email/password flow.");
  console.log("→ clicking sign-out via direct Firebase Auth signOut()...");
  // The Firebase Auth instance is on window via the AuthProvider; safest path
  // is to clear the persistence and reload.
  await evalJs(`
    (async () => {
      const keys = Object.keys(localStorage).filter((k) => k.includes('firebase:authUser'));
      keys.forEach((k) => localStorage.removeItem(k));
      const sk = Object.keys(sessionStorage).filter((k) => k.includes('firebase:authUser'));
      sk.forEach((k) => sessionStorage.removeItem(k));
      location.href = '${TARGET}';
    })();
  `);
  await new Promise((r) => setTimeout(r, 3000));
}

const urlNow = await evalJs("location.href");
console.log("after sign-out:", urlNow);

// 2. Verify the form fields exist.
const formCheck = await evalJs(`
  (() => {
    const email = document.querySelector('input[type="email"]');
    const password = document.querySelector('input[type="password"]');
    const submit = document.querySelector('button[type="submit"]');
    // Find any "Sign in" toggle button (the page defaults to signup mode).
    const toggles = [...document.querySelectorAll('button')].filter((b) =>
      /sign in/i.test(b.textContent || '')
    );
    return {
      hasEmail: !!email,
      hasPassword: !!password,
      hasSubmit: !!submit,
      submitText: submit?.textContent?.trim(),
      toggleCount: toggles.length,
      toggleTexts: toggles.map((t) => t.textContent?.trim()).slice(0, 3),
    };
  })()
`);
console.log("form check:", JSON.stringify(formCheck));

// 3. Switch to Sign in mode if currently in Sign up. The submit button text
//    changes from "Create account" → "Sign in", so we can use that as a
//    reliable post-condition.
const switched = await evalJs(`
  (async () => {
    const btns = [...document.querySelectorAll('button')];
    const signinToggle = btns.find((b) => {
      const t = (b.textContent || '').trim();
      return t === 'Sign in' || /^sign in$/i.test(t);
    });
    if (!signinToggle) return { clicked: false, submitText: null };
    signinToggle.click();
    await new Promise((r) => setTimeout(r, 400));
    const submit = document.querySelector('button[type="submit"]');
    return { clicked: true, submitText: submit?.textContent?.trim() };
  })()
`);
console.log("mode-toggle result:", JSON.stringify(switched));
if (switched.submitText !== "Sign in") {
  console.log("⚠ submit button still says:", switched.submitText, "— aborting before another accidental signup.");
  await fetch(`http://localhost:9222/json/close/${newTab.id}`).catch(() => {});
  ws.close();
  process.exit(1);
}

// 4. Fill the form with an obviously-wrong credential.
const fakeEmail = `does-not-exist-${Date.now()}@outreach-test.local`;
const fakePassword = "definitely-wrong-password-xyzzy";
await evalJs(`
  (() => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    const email = document.querySelector('input[type="email"]');
    const password = document.querySelector('input[type="password"]');
    setter.call(email, ${JSON.stringify(fakeEmail)});
    email.dispatchEvent(new Event('input', { bubbles: true }));
    setter.call(password, ${JSON.stringify(fakePassword)});
    password.dispatchEvent(new Event('input', { bubbles: true }));
  })()
`);
await new Promise((r) => setTimeout(r, 200));

// 5. Submit + wait for the response.
console.log(`→ submitting bad credential (${fakeEmail})...`);
await evalJs(`
  document.querySelector('form').requestSubmit();
`);
await new Promise((r) => setTimeout(r, 4000));

// 6. Check for toast text (the auth error surfaces via the ToastProvider).
const result = await evalJs(`
  (() => {
    // Find any text that looks like an error message rendered to the DOM.
    const all = [...document.querySelectorAll('*')]
      .map((el) => el.textContent || '')
      .filter((t) => t && t.length < 300);
    const errorLike = all.filter((t) =>
      /(invalid|wrong|incorrect|password|email|not found|user|auth)/i.test(t) &&
      !/sign in|sign up|forgot|already have|don't have|continue with|email\\?$/i.test(t)
    );
    return {
      urlAfter: location.href,
      toastCandidates: errorLike.slice(0, 5),
    };
  })()
`);
console.log("after submit:", JSON.stringify(result, null, 2));

await fetch(`http://localhost:9222/json/close/${newTab.id}`).catch(() => {});
ws.close();
console.log("\n→ done.");
