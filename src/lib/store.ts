"use client"

import { create } from "zustand"

export type ModuleKey =
  | "dashboard"
  | "sales"
  | "partners"
  | "stock"
  | "trading"
  | "reports"
  | "settings"

interface AppState {
  activeModule: ModuleKey
  setModule: (m: ModuleKey) => void
  sidebarOpen: boolean
  setSidebarOpen: (v: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  activeModule: "dashboard",
  setModule: (m) => set({ activeModule: m, sidebarOpen: false }),
  sidebarOpen: false,
  setSidebarOpen: (v) => set({ sidebarOpen: v }),
}))
