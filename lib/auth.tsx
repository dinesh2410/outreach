"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { User, AppEntry, GenerationResult, Platform } from "./types";

interface AuthContextType {
  user: User | null;
  apps: AppEntry[];
  signIn: (email: string, password: string) => void;
  signUp: (firstName: string, lastName: string, email: string, password: string) => void;
  signOut: () => void;
  addApp: (app: AppEntry) => void;
  addGeneration: (appId: string, gen: GenerationResult) => void;
  updateUser: (updates: Partial<User>) => void;
  savedGenerations: GenerationResult[];
  saveGeneration: (gen: GenerationResult) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const GRADIENTS = [
  "linear-gradient(135deg, #B8331E, #D4972A)",
  "linear-gradient(135deg, #4A6D3D, #D4972A)",
  "linear-gradient(135deg, #8E2614, #B8331E)",
  "linear-gradient(135deg, #1A1714, #6E665B)",
  "linear-gradient(135deg, #D4972A, #B8331E)",
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [apps, setApps] = useState<AppEntry[]>([]);
  const [savedGenerations, setSavedGenerations] = useState<GenerationResult[]>([]);

  const signIn = useCallback((email: string, _password: string) => {
    const name = email.split("@")[0];
    setUser({
      id: "user-1",
      firstName: name.charAt(0).toUpperCase() + name.slice(1),
      lastName: "Developer",
      email,
      defaultPlatform: "android" as Platform,
      emailNotifications: true,
    });
  }, []);

  const signUp = useCallback(
    (firstName: string, lastName: string, email: string, _password: string) => {
      setUser({
        id: "user-1",
        firstName,
        lastName,
        email,
        defaultPlatform: "android" as Platform,
        emailNotifications: true,
      });
    },
    []
  );

  const signOut = useCallback(() => {
    setUser(null);
  }, []);

  const addApp = useCallback((app: AppEntry) => {
    setApps((prev) => [...prev, app]);
  }, []);

  const addGeneration = useCallback((appId: string, gen: GenerationResult) => {
    setApps((prev) =>
      prev.map((app) =>
        app.id === appId
          ? { ...app, generations: [...app.generations, gen] }
          : app
      )
    );
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : null));
  }, []);

  const saveGeneration = useCallback((gen: GenerationResult) => {
    setSavedGenerations((prev) => {
      if (prev.some((g) => g.id === gen.id)) return prev;
      return [...prev, gen];
    });

    // Also add to apps if not already there
    setApps((prev) => {
      const existing = prev.find((a) => a.name === gen.input.appName);
      if (existing) {
        if (existing.generations.some((g) => g.id === gen.id)) return prev;
        return prev.map((a) =>
          a.id === existing.id
            ? { ...a, generations: [...a.generations, gen] }
            : a
        );
      }
      const newApp: AppEntry = {
        id: `app-${Date.now()}`,
        name: gen.input.appName,
        category: gen.input.category,
        icon: GRADIENTS[prev.length % GRADIENTS.length],
        generations: [gen],
        createdAt: new Date().toISOString(),
      };
      return [...prev, newApp];
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        apps,
        signIn,
        signUp,
        signOut,
        addApp,
        addGeneration,
        updateUser,
        savedGenerations,
        saveGeneration,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
