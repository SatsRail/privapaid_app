"use client";

import { createContext, useContext, useState, useSyncExternalStore, useCallback } from "react";

interface SidebarContextValue {
  collapsed: boolean;
  toggle: () => void;
}

const SidebarContext = createContext<SidebarContextValue>({
  collapsed: false,
  toggle: () => {},
});

function getClientCollapsed(): boolean {
  const isMobile = window.innerWidth < 1024;
  if (isMobile) return true;
  const stored = localStorage.getItem("sidebar-collapsed");
  return stored !== "false";
}

// noop subscribe — we only need the snapshot for initial client value
const noop = () => () => {};

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const clientInitial = useSyncExternalStore(noop, getClientCollapsed, () => true);
  const [collapsed, setCollapsed] = useState(clientInitial);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  }, []);

  return (
    <SidebarContext.Provider value={{ collapsed, toggle }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}
