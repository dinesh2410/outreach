// Single source of truth for admin email addresses.
//
// The admin email list controls who can:
//   - See the "Admin · Usage & cost" sidebar entry (components/shared/AppShell.tsx)
//   - Open /admin/usage without being redirected (app/admin/usage/page.tsx)
//   - Read every user's /users/{uid}/usage subcollection (firestore.rules)
//
// IMPORTANT: this list MUST stay in sync with firestore.rules. The rules
// file enforces admin access independently — anything you add here also
// needs to be added in `firestore.rules` (and republished from Firebase
// Console) or the dashboard query will be denied.

export const ADMIN_EMAILS: readonly string[] = [
  "support@testerscommunity.com",
  "dinesh.ch@testerscommunity.com",
];

export function isAdmin(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase();
  return ADMIN_EMAILS.some((e) => e.toLowerCase() === normalized);
}
