"use client";

import { AuthProvider } from "@/lib/auth";
import { ToastProvider } from "@/components/shared/ToastProvider";
import type { ReactNode } from "react";

// Single client-side wrapper for everything that needs a client boundary.
// AuthProvider owns the user / session state (localStorage-backed for now).

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>{children}</ToastProvider>
    </AuthProvider>
  );
}
