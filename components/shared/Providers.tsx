"use client";

import { AuthProvider } from "@/lib/auth";
import { ToastProvider } from "@/components/shared/ToastProvider";
import { IconProvider } from "@/components/shared/Icon";
import type { ReactNode } from "react";

// Single client-side wrapper for everything that needs a client boundary.
// AuthProvider owns the user / session state (localStorage-backed for now).
// IconProvider locks every Phosphor icon to the workspace duotone palette.

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <IconProvider>{children}</IconProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
