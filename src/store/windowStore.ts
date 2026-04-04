/**
 * windowStore — tracks slim vs normal window mode.
 *
 * "slim"   → 340px wide, docked to right edge, always-on-top, nav sidebar hidden.
 * "normal" → full 1280×800 window, centred, sidebar visible.
 *
 * The store persists the last mode so the app restores correctly on relaunch.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { invoke } from "@tauri-apps/api/core";

export type WindowMode = "normal" | "slim";

interface WindowState {
  mode: WindowMode;

  /** Switch to slim docked mode — call Rust to resize + reposition the OS window. */
  enterSlimMode: () => Promise<void>;

  /** Restore to normal full-screen mode. */
  exitSlimMode: () => Promise<void>;

  /** Toggle between slim and normal. */
  toggleMode: () => Promise<void>;

  /** Hide the OS window entirely (app keeps running). */
  hideWindow: () => Promise<void>;
}

export const useWindowStore = create<WindowState>()(
  persist(
    (set, get) => ({
      mode: "normal",

      enterSlimMode: async () => {
        await invoke("set_window_mode", { mode: "slim" }).catch(console.error);
        set({ mode: "slim" });
      },

      exitSlimMode: async () => {
        await invoke("set_window_mode", { mode: "normal" }).catch(console.error);
        set({ mode: "normal" });
      },

      toggleMode: async () => {
        const current = get().mode;
        if (current === "slim") {
          await get().exitSlimMode();
        } else {
          await get().enterSlimMode();
        }
      },

      hideWindow: async () => {
        await invoke("hide_window").catch(console.error);
      },
    }),
    {
      name: "nordtodo-window-mode",
      // Only persist the mode string — actions are reconstructed
      partialize: (s) => ({ mode: s.mode }),
    }
  )
);
