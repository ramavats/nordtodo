# NordTodo — Architecture Overview

## 1. System Architecture

```
┌────────────────────────────────────────────────────────┐
│                  React + TypeScript (Vite)              │
│                                                        │
│  ┌──────────┐  ┌────────────┐  ┌────────────────────┐ │
│  │ Zustand  │  │  TanStack  │  │   Framer Motion    │ │
│  │  Store   │  │   Query    │  │   Animations       │ │
│  └──────────┘  └────────────┘  └────────────────────┘ │
│              ↕ invoke()                                │
├──────────── Tauri IPC Boundary ────────────────────────┤
│                                                        │
│                  Rust / Tauri v2                       │
│                                                        │
│  ┌──────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │Commands  │  │Repositories  │  │   Services      │  │
│  └──────────┘  └──────────────┘  └─────────────────┘  │
│              ↕ rusqlite                                │
│  ┌──────────────────────────────────────────────────┐  │
│  │          SQLite (WAL mode, FTS5)                 │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

## 2. Data Flow

### Write path (optimistic)
```
User action → Zustand applyOptimistic() → UI updates instantly
           → TanStack Query mutation → invoke("update_task")
           → Rust command → Repository → SQLite
           → on success: clearOptimistic + invalidate query
           → on error: clearOptimistic + rollback + toast
```

### Read path
```
Component renders → useTaskList(query) → TanStack Query cache
                 → if stale: invoke("get_tasks", query)
                 → Rust command → Repository.find_all()
                 → SQL with smart view filter + FTS5 search
                 → JSON → TypeScript (Zod validated on critical paths)
```

## 3. Database Design

### Schema key decisions
- **Tasks table** uses `TEXT` affinity for all dates (ISO8601 UTC strings).
  SQLite's date functions work on these strings directly.
- **FTS5 virtual table** (`tasks_fts`) synced via triggers for zero-latency search.
- **Soft delete**: tasks have `status = 'deleted'`, never physically removed.
- **Archive**: `is_archived = 1` + `status = 'archived'` — separate from delete.
- **Sync metadata columns** (`local_version`, `remote_version`, `sync_status`, `last_synced_at`)
  are already on the tasks table so sync can be added without migration.
- **Tags** use a normalized junction table (`task_tags`) with cascade deletes.
  Tag names are denormalized into `GROUP_CONCAT` for fast list display.

### Smart Views (SQL)
Each smart view is a named WHERE clause applied server-side in Rust:
- `inbox` → `status = 'pending' AND is_archived = 0`
- `today` → `pending AND (is_today = 1 OR due_at ≤ today)`
- `upcoming` → `pending AND due_at BETWEEN tomorrow AND +7 days`
- `overdue` → `pending AND due_at < today`
- `flagged` → `is_pinned = 1 AND pending`
- `completed` → `status = 'completed'`

## 4. Frontend State Architecture

Three distinct state layers:

| Layer | Tool | Responsibility |
|-------|------|----------------|
| **Server state** | TanStack Query | Task data, tags, preferences — source of truth from SQLite |
| **UI state** | Zustand (appStore) | Active view, panels, palette, search, selection |
| **Optimistic** | Zustand (taskStore) | Temporary patches applied before server confirms |
| **Persistence** | Zustand + persist | Sidebar expanded/collapsed state |

### Why Zustand over Redux/Context
- Zero boilerplate, co-located store definitions
- Immer middleware for safe mutable updates
- Selective subscriptions prevent unnecessary re-renders
- `zustand/persist` for sidebar state without localStorage restrictions

### Query Key Structure
```ts
taskKeys.all           // ['tasks']
taskKeys.list(query)   // ['tasks', 'list', { smartView, search, ... }]
taskKeys.detail(id)    // ['tasks', 'detail', '550e8400-...']
taskKeys.counts()      // ['tasks', 'counts']
```

## 5. Component Architecture

```
AppShell
├── Sidebar                  (motion.nav, width transition)
│   ├── NavRow × N          (system views)
│   └── NavRow × N          (tags)
│
├── TopBar                   (search, palette, settings triggers)
│
├── TaskView                 (main content area)
│   ├── QuickAdd             (react-hook-form, priority picker)
│   ├── TaskListHeader       (filter chips, sort selector)
│   └── TaskCard × N        (memoized, AnimatePresence exit)
│       └── TaskContextMenu  (inline, motion.div)
│
├── TaskDetailPanel          (AnimatePresence width slide)
│   ├── PriorityPicker
│   ├── TagInput
│   └── DetailField × N
│
├── CommandPalette           (modal, keyboard navigation)
├── SettingsPanel            (modal, tab nav)
├── OnboardingOverlay        (modal, step wizard)
└── UndoToast                (AnimatePresence, auto-dismiss)
```

## 6. Rust Module Responsibilities

| Module | Responsibility |
|--------|---------------|
| `commands/` | Thin Tauri command handlers — validate input, call repository, return result |
| `repositories/` | All SQL — no business logic, parameterized queries only |
| `services/` | Business logic spanning multiple repos (recurrence expansion, reminders) |
| `models/` | Pure data types + ser/de. Zero database imports. |
| `db/` | Connection setup, migrations, seeding |
| `integrations/` | Provider adapters — implement `IntegrationAdapter` trait |
| `errors/` | Single `AppError` enum that serializes to JSON for Tauri |
| `config/` | Environment config, paths |

## 7. Error Handling Contract

All Tauri commands return `Result<T, AppError>`.
`AppError` implements `Serialize`, so errors arrive as structured JSON on the frontend:
```json
{ "code": "NotFound", "message": "Task abc not found" }
```
The frontend receives typed errors via TanStack Query's `onError` callback and displays user-friendly messages via `react-hot-toast`.

## 8. Animation System

All animations use Framer Motion (the library formerly known as Framer Motion — same API).

### Spring presets used
| Context | Config |
|---------|--------|
| Sidebar width | `damping: 30, stiffness: 250` |
| Task card entry/exit | `damping: 30, stiffness: 300` |
| Detail panel | `damping: 30, stiffness: 250` |
| Modal/palette | `damping: 30, stiffness: 350` |
| Micro-interactions | `stiffness: 500, damping: 20` |
| Layout shifts | `damping: 30, stiffness: 200` |

### Reduced motion
- CSS: `@media (prefers-reduced-motion: reduce)` disables transitions globally
- User preference: `prefs.reduceMotion` adds `.reduce-motion` class to root
- All Framer Motion animations respect `useReducedMotion()` hook (can be wired in)

---

## 9. Adding Google Calendar Integration

### Phase 1 (Read-only — 3-4 days)

1. **Add deps** to `src-tauri/Cargo.toml`:
   ```toml
   oauth2 = "4"
   reqwest = { version = "0.12", features = ["json"] }
   ```

2. **Implement OAuth2 flow** in `src/integrations/google.rs`:
   ```rust
   // Use tauri-plugin-shell to open browser for OAuth2 callback
   // Store tokens in OS keychain via tauri-plugin-stronghold
   ```

3. **Fetch events** from `https://www.googleapis.com/calendar/v3/calendars/primary/events`

4. **Map** `GoogleCalendarEvent → ImportedCalendarEvent` using the existing `map_to_task()` adapter

5. **Add a new Tauri command** `sync_google_calendar` that:
   - Reads tokens from keychain
   - Calls Google API
   - Upserts into `calendar_events` table
   - Optionally auto-creates local tasks

6. **Frontend**: Add "Connect Google Calendar" button in Settings → Integrations

### Phase 2 (Two-way sync)
- Implement `push_task()` in `GoogleCalendarAdapter`
- Process `sync_queue` table in a background tokio task
- Add `ConflictStrategy::LastWriteWins` resolution

### Mapping
| Google Calendar Field | Local Task Field |
|----------------------|-----------------|
| `summary` | `title` |
| `description` | `description` |
| `end.dateTime` | `due_at` |
| `start.dateTime` | `start_at` |
| `id` | `source_metadata.event_id` |

---

## 10. Adding Microsoft To Do / Outlook

### Microsoft Graph API endpoints
```
GET /me/todo/lists                        → task lists
GET /me/todo/lists/{listId}/tasks         → tasks
GET /me/events                            → calendar events
PATCH /me/todo/lists/{listId}/tasks/{id}  → update task
```

### Auth
- Use Microsoft Identity Platform OAuth2 (MSAL)
- Scopes: `Tasks.ReadWrite`, `Calendars.Read`
- Same adapter pattern as Google — implement `MicrosoftAdapter`

---

## 11. Sync Architecture (Future-Proof Design)

The current data model already includes sync metadata on every task:
```sql
local_version   INTEGER NOT NULL DEFAULT 1,    -- increments on every local write
remote_version  TEXT,                           -- etag/version from provider
sync_status     TEXT NOT NULL DEFAULT 'local_only',
last_synced_at  TEXT
```

### Proposed sync flow
```
Local write → increment local_version → add to sync_queue
Background worker (tokio::spawn):
  1. Drain sync_queue WHERE integration_id = X
  2. For each item:
     a. If op=create/update → provider.push_task(account, task)
        → on 200: mark sync_status='synced', store remote_version
        → on 409 (conflict): compare versions → apply ConflictStrategy
     b. If op=delete → provider.delete_remote(account, id)
  3. Poll remote for changes (incremental sync with syncToken/deltaToken)
  4. Merge remote changes → apply ConflictStrategy
```

### Conflict resolution
| Strategy | When to use |
|----------|-------------|
| `LocalWins` | User prefers local edits over remote |
| `RemoteWins` | Remote is authoritative (read-only mode) |
| `LastWriteWins` | Compare `updated_at` timestamps |
| `Manual` | Show conflict UI to user |

---

## 12. Tradeoffs & Design Decisions

| Decision | Rationale |
|----------|-----------|
| **rusqlite over sqlx** | Simpler sync API for single-writer desktop app; avoids async complexity |
| **Mutex<Connection>** | SQLite is single-writer; Mutex is correct and simpler than connection pool |
| **FTS5 over LIKE search** | Full-text search is dramatically faster and supports prefix matching |
| **Zustand over Redux** | Much less boilerplate; immer middleware gives safe mutations; no context re-render issues |
| **TanStack Query over SWR** | Better TypeScript, mutation lifecycle hooks, query key factories |
| **Framer Motion** | Best spring animation API for React; layout animations out-of-box |
| **ISO8601 text dates** | SQLite doesn't have a native DATE type; text is portable and sortable |
| **Soft delete** | Never lose data; enables undo; safe for future sync |
| **Local version counter** | Enables conflict detection without Lamport clocks or CRDT complexity |
| **IntegrationAdapter trait** | Swappable providers without touching core task logic |
| **Tags denormalized in queries** | GROUP_CONCAT avoids N+1 queries in list views |
| **Optimistic updates** | Instant UI feedback; critical for completion feeling "satisfying" |
| **Nord theme (dark-first)** | Nord is a dark-first palette; matches developer workflow aesthetics |
