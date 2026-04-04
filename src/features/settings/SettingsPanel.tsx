import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { X, Download, Upload, Database, Monitor, Keyboard, Info, RefreshCw, Link, Unlink, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { usePreferences, useUpdatePreferences } from "@/hooks/usePreferences";
import * as api from "@/lib/tauriApi";
import type { IntegrationStatus, SyncResult } from "@/lib/tauriApi";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

type SettingsTab = "general" | "appearance" | "keyboard" | "integrations" | "data" | "about";

export function SettingsPanel() {
  const { setSettingsOpen } = useAppStore();
  const { data: prefs } = usePreferences();
  const updatePrefs = useUpdatePreferences();
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [autoSyncInput, setAutoSyncInput] = useState("0");

  // ── Google Tasks integration state ────────────────────────────────────────
  const [googleStatus, setGoogleStatus] = useState<IntegrationStatus | null>(null);
  const [googleClientId, setGoogleClientId] = useState("");
  const [googleClientSecret, setGoogleClientSecret] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [authCode, setAuthCode] = useState("");
  const [showCodeInput, setShowCodeInput] = useState(false);

  const loadGoogleStatus = useCallback(async () => {
    try {
      const s = await api.googleStatus();
      setGoogleStatus(s);
    } catch {
      // not yet configured — ignore
    }
  }, []);

  useEffect(() => {
    if (activeTab === "integrations") loadGoogleStatus();
  }, [activeTab, loadGoogleStatus]);

  useEffect(() => {
    setAutoSyncInput(String(prefs?.autoSyncSeconds ?? 0));
  }, [prefs?.autoSyncSeconds]);

  const handleGoogleConnect = async () => {
    if (!googleClientId.trim() || !googleClientSecret.trim()) {
      toast.error("Enter both your Google Client ID and Client Secret");
      return;
    }
    setGoogleLoading(true);
    try {
      // Persist credentials so the Rust backend can read them
      await api.updatePreferences({ googleClientId: googleClientId.trim(), googleClientSecret: googleClientSecret.trim() } as never);
      const { url } = await api.googleAuthUrl();
      // Open in default browser via Tauri shell plugin
      const { open } = await import("@tauri-apps/plugin-shell");
      await open(url);
      setShowCodeInput(true);
      toast("Browser opened. After signing in, Google will show you a code — copy it and paste it below.", { duration: 8000 });
    } catch (e: unknown) {
      const msg = typeof e === "string" ? e : (e as { message?: string })?.message ?? JSON.stringify(e);
      toast.error(`Failed to start OAuth: ${msg}`);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleExchange = async () => {
    if (!authCode.trim()) { toast.error("Paste the authorization code first"); return; }
    setGoogleLoading(true);
    try {
      const status = await api.googleExchangeCode(authCode.trim());
      setGoogleStatus(status);
      setShowCodeInput(false);
      setAuthCode("");
      toast.success(`Connected as ${status.email ?? "Google Account"}`);
    } catch (e: unknown) {
      const msg = typeof e === "string" ? e : (e as { message?: string })?.message ?? JSON.stringify(e);
      toast.error(`Connection failed: ${msg}`);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleSync = async () => {
    setGoogleLoading(true);
    setSyncResult(null);
    try {
      const result = await api.syncGoogleTasks();
      setSyncResult(result);
      await loadGoogleStatus();
      toast.success(`Sync complete — ${result.imported} imported, ${result.updated} updated, ${result.pushed} pushed`);
    } catch (e: unknown) {
      const msg = typeof e === "string" ? e : (e as { message?: string })?.message ?? JSON.stringify(e);
      toast.error(`Sync failed: ${msg}`);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleDisconnect = async () => {
    if (!confirm("Disconnect Google Tasks? Imported tasks will remain.")) return;
    setGoogleLoading(true);
    try {
      await api.googleDisconnect();
      setGoogleStatus(null);
      setSyncResult(null);
      toast.success("Google Tasks disconnected");
    } catch (e: unknown) {
      const msg = typeof e === "string" ? e : (e as { message?: string })?.message ?? JSON.stringify(e);
      toast.error(`Failed to disconnect: ${msg}`);
    } finally {
      setGoogleLoading(false);
    }
  };
  // ─────────────────────────────────────────────────────────────────────────

  const handleExport = async () => {
    try {
      const json = await api.exportTasksJson();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nordtodo-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Tasks exported successfully");
    } catch {
      toast.error("Export failed");
    }
  };

  const handleImport = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const json = await file.text();
        const count = await api.importTasksJson(json);
        toast.success(`Imported ${count} tasks`);
      } catch {
        toast.error("Import failed — check file format");
      }
    };
    input.click();
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
    { id: "general", label: "General", icon: Monitor },
    { id: "keyboard", label: "Shortcuts", icon: Keyboard },
    { id: "integrations", label: "Integrations", icon: Database },
    { id: "data", label: "Data", icon: Download },
    { id: "about", label: "About", icon: Info },
  ];

  return (
    <motion.div
      className="fixed inset-0 z-modal flex items-center justify-center bg-background/60 palette-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={() => setSettingsOpen(false)}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="bg-surface border border-border rounded-xl w-full max-w-2xl mx-4 max-h-[80vh] flex overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        data-testid="settings-panel"
      >
        {/* Left nav */}
        <div className="w-48 flex-shrink-0 bg-background border-r border-border py-4">
          <div className="px-4 mb-4">
            <h2 className="text-sm font-semibold text-text">Settings</h2>
          </div>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-4 py-2 text-sm text-left transition-colors",
                  activeTab === tab.id
                    ? "bg-accent/15 text-accent font-medium"
                    : "text-text-muted hover:text-text hover:bg-surface"
                )}
              >
                <Icon size={13} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
            <h3 className="text-sm font-semibold text-text capitalize">{activeTab}</h3>
            <button
              onClick={() => setSettingsOpen(false)}
              className="p-1.5 rounded text-text-faint hover:text-text hover:bg-surface-2 transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {activeTab === "general" && prefs && (
              <>
                <SettingRow
                  label="Default view on startup"
                  description="Which view to show when the app opens"
                >
                  <select
                    value={prefs.startupView}
                    onChange={(e) => updatePrefs.mutate({ startupView: e.target.value })}
                    className="text-sm bg-surface-2 text-text border border-border rounded px-2 py-1 focus:border-accent outline-none"
                  >
                    {["inbox", "today", "upcoming", "flagged"].map((v) => (
                      <option key={v} value={v} className="bg-surface">
                        {v.charAt(0).toUpperCase() + v.slice(1)}
                      </option>
                    ))}
                  </select>
                </SettingRow>

                <SettingRow
                  label="Reduce motion"
                  description="Minimize animations throughout the app"
                >
                  <Toggle
                    checked={prefs.reduceMotion}
                    onChange={(v) => updatePrefs.mutate({ reduceMotion: v })}
                  />
                </SettingRow>

                <SettingRow
                  label="Compact mode"
                  description="Tighter spacing for task rows"
                >
                  <Toggle
                    checked={prefs.compactMode}
                    onChange={(v) => updatePrefs.mutate({ compactMode: v })}
                  />
                </SettingRow>

                <SettingRow
                  label="Local only mode"
                  description="Never connect to external services"
                >
                  <Toggle
                    checked={prefs.localOnlyMode}
                    onChange={(v) => updatePrefs.mutate({ localOnlyMode: v })}
                  />
                </SettingRow>
              </>
            )}

            {activeTab === "keyboard" && (
              <div className="space-y-3">
                <p className="text-xs text-text-faint mb-4">
                  All shortcuts use Ctrl on Windows/Linux and ⌘ on macOS.
                </p>
                {[
                  ["New task", "Ctrl+N"],
                  ["Command palette", "Ctrl+K"],
                  ["Search", "Ctrl+F"],
                  ["Toggle sidebar", "Ctrl+\\"],
                  ["Settings", "Ctrl+,"],
                  ["Sync integrations", "Ctrl+Shift+G"],
                  ["Navigate list", "↑ / ↓"],
                  ["Open task", "Enter"],
                  ["Complete task", "Space"],
                  ["Close panel", "Esc"],
                ].map(([action, shortcut]) => (
                  <div key={action} className="flex items-center justify-between py-1.5 border-b border-border/50">
                    <span className="text-sm text-text-secondary">{action}</span>
                    <kbd className="text-xs">{shortcut}</kbd>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "integrations" && (
              <div className="space-y-6">
                <SettingRow
                  label="Auto sync interval (seconds)"
                  description="Set 0 to disable automatic pull + push sync."
                >
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={autoSyncInput}
                    onChange={(e) => setAutoSyncInput(e.target.value)}
                    onBlur={() => {
                      const parsed = Number.parseInt(autoSyncInput, 10);
                      const safe = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
                      setAutoSyncInput(String(safe));
                      updatePrefs.mutate({ autoSyncSeconds: safe });
                    }}
                    className="w-24 text-sm bg-surface-3 border border-border rounded-lg px-3 py-1.5 text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                    aria-label="Auto sync seconds"
                  />
                </SettingRow>

                {/* ── Google Tasks ── */}
                <div className="rounded-xl border border-border bg-surface-2 overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <div className="flex items-center gap-2.5">
                      {/* Google G icon */}
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      <span className="text-sm font-medium text-text-primary">Google Tasks</span>
                    </div>
                    {googleStatus?.connected ? (
                      <span className="flex items-center gap-1.5 text-xs text-green-400">
                        <CheckCircle2 size={12} /> Connected
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-text-faint">
                        <AlertCircle size={12} /> Not connected
                      </span>
                    )}
                  </div>

                  <div className="p-4 space-y-4">
                    {googleStatus?.connected ? (
                      /* ── Connected state ── */
                      <>
                        <div className="text-sm text-text-secondary">
                          Signed in as <span className="text-text-primary font-medium">{googleStatus.email}</span>
                        </div>
                        {googleStatus.lastSyncedAt && (
                          <div className="text-xs text-text-faint">
                            Last synced: {new Date(googleStatus.lastSyncedAt).toLocaleString()}
                          </div>
                        )}
                        {syncResult && (
                          <div className="text-xs text-text-secondary bg-surface-3 rounded-lg px-3 py-2 space-y-0.5">
                            <div>Imported: <span className="text-accent">{syncResult.imported}</span></div>
                            <div>Updated: <span className="text-accent">{syncResult.updated}</span></div>
                            <div>Pushed: <span className="text-accent">{syncResult.pushed}</span></div>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={handleGoogleSync}
                            disabled={googleLoading}
                            className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg bg-accent text-nord0 font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors"
                          >
                            {googleLoading
                              ? <Loader2 size={13} className="animate-spin" />
                              : <RefreshCw size={13} />}
                            Sync now
                          </button>
                          <button
                            onClick={handleGoogleDisconnect}
                            disabled={googleLoading}
                            className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg bg-surface-3 text-text-secondary hover:text-red-400 hover:bg-red-400/10 border border-border disabled:opacity-50 transition-colors"
                          >
                            <Unlink size={13} /> Disconnect
                          </button>
                        </div>
                      </>
                    ) : (
                      /* ── Not connected state ── */
                      <>
                        <div className="text-xs text-text-muted space-y-1">
                          <p>Requires a Google Cloud OAuth 2.0 Client ID (Desktop app type).</p>
                          <a
                            href="https://console.cloud.google.com/apis/credentials"
                            target="_blank"
                            rel="noreferrer"
                            className="text-accent underline hover:text-accent/80"
                          >
                            Open Google Cloud Console →
                          </a>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs text-text-muted block">Client ID</label>
                          <input
                            type="text"
                            value={googleClientId}
                            onChange={e => setGoogleClientId(e.target.value)}
                            placeholder="123456789-abc...apps.googleusercontent.com"
                            className="w-full text-sm bg-surface-3 border border-border rounded-lg px-3 py-2 text-text-primary placeholder:text-text-faint focus:outline-none focus:ring-1 focus:ring-accent"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs text-text-muted block">Client Secret</label>
                          <input
                            type="password"
                            value={googleClientSecret}
                            onChange={e => setGoogleClientSecret(e.target.value)}
                            placeholder="GOCSPX-..."
                            className="w-full text-sm bg-surface-3 border border-border rounded-lg px-3 py-2 text-text-primary placeholder:text-text-faint focus:outline-none focus:ring-1 focus:ring-accent"
                          />
                        </div>

                        {!showCodeInput ? (
                          <button
                            onClick={handleGoogleConnect}
                            disabled={googleLoading || !googleClientId.trim()}
                            className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg bg-accent text-nord0 font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors"
                          >
                            {googleLoading
                              ? <Loader2 size={13} className="animate-spin" />
                              : <Link size={13} />}
                            Connect Google Tasks
                          </button>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-xs text-text-muted">
                              Google opened in your browser. After signing in, Google will show you a code on-screen — copy it and paste it here:
                            </p>
                            <input
                              type="text"
                              value={authCode}
                              onChange={e => setAuthCode(e.target.value)}
                              placeholder="4/0AX4XfWh..."
                              className="w-full text-sm bg-surface-3 border border-border rounded-lg px-3 py-2 text-text-primary placeholder:text-text-faint focus:outline-none focus:ring-1 focus:ring-accent"
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={handleGoogleExchange}
                                disabled={googleLoading || !authCode.trim()}
                                className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg bg-accent text-nord0 font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors"
                              >
                                {googleLoading ? <Loader2 size={13} className="animate-spin" /> : null}
                                Complete connection
                              </button>
                              <button
                                onClick={() => { setShowCodeInput(false); setAuthCode(""); }}
                                className="text-sm px-3 py-1.5 rounded-lg bg-surface-3 text-text-secondary hover:bg-surface-3/80 border border-border transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* ── Other integrations (planned) ── */}
                {[
                  { name: "Microsoft To Do", status: "Planned" },
                  { name: "Outlook Calendar", status: "Planned" },
                ].map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between p-3 rounded-lg bg-surface-2 border border-border opacity-50"
                  >
                    <span className="text-sm text-text-secondary">{item.name}</span>
                    <span className="text-xs text-text-faint px-2 py-0.5 bg-surface-3 rounded">{item.status}</span>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "data" && (
              <div className="space-y-4">
                <SettingRow
                  label="Export tasks"
                  description="Download all tasks as a JSON file"
                >
                  <button
                    onClick={handleExport}
                    className="flex items-center gap-2 text-sm px-3 py-1.5 rounded bg-surface-2 text-text-secondary hover:bg-surface-3 border border-border transition-colors"
                  >
                    <Download size={13} />
                    Export JSON
                  </button>
                </SettingRow>

                <SettingRow
                  label="Import tasks"
                  description="Import tasks from a NordTodo JSON backup"
                >
                  <button
                    onClick={handleImport}
                    className="flex items-center gap-2 text-sm px-3 py-1.5 rounded bg-surface-2 text-text-secondary hover:bg-surface-3 border border-border transition-colors"
                  >
                    <Upload size={13} />
                    Import JSON
                  </button>
                </SettingRow>

                <div className="mt-4 p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <p className="text-xs text-warning">
                    Import is additive — it will not overwrite existing tasks.
                    Duplicate IDs are skipped.
                  </p>
                </div>
              </div>
            )}

            {activeTab === "about" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/15 flex items-center justify-center">
                    <span className="text-accent font-bold text-lg">N</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text">Nord Todo</p>
                    <p className="text-xs text-text-muted">v0.1.0 — Tauri + React + Rust</p>
                  </div>
                </div>
                <p className="text-sm text-text-muted leading-relaxed">
                  A minimalist, offline-first desktop task manager built with Tauri v2,
                  React + TypeScript, and Rust. Nord theme throughout.
                </p>
                <div className="text-xs text-text-faint space-y-1">
                  <p>© 2024 NordTodo Contributors</p>
                  <p>MIT License</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Sub-components ───────────────────────────────────────────

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-secondary">{label}</p>
        {description && (
          <p className="text-xs text-text-faint mt-0.5">{description}</p>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative w-9 h-5 rounded-full transition-colors duration-200",
        checked ? "bg-accent" : "bg-surface-3"
      )}
    >
      <motion.span
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
        animate={{ left: checked ? "calc(100% - 18px)" : "2px" }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    </button>
  );
}

