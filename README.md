# Nord Todo

A minimalist, offline-first desktop task manager built with **Tauri v2**, **React + TypeScript**, and **Rust**. Nord theme throughout. No cloud required.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| **Rust** | 1.70+ | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org) or via `nvm` |
| **Tauri CLI** | v2 | `cargo install tauri-cli --version "^2"` |
| **System deps** | — | See [Tauri prerequisites](https://tauri.app/start/prerequisites/) |

### Linux (Ubuntu/Debian) system dependencies
```bash
sudo apt-get install -y \
  libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

### macOS
```bash
xcode-select --install
```

### Windows
Install [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) and [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).

---

## Setup

```bash
# Clone the repo
git clone https://github.com/your-org/nordtodo
cd nordtodo

# Install Node dependencies
npm install

# Start development (Tauri + Vite hot-reload)
npm run tauri dev
```

The app will open in a native window. The SQLite database is created at:
- **Linux/macOS**: `~/.local/share/nordtodo/nordtodo.db`
- **Windows**: `%APPDATA%\nordtodo\nordtodo.db`

---

## Build for production

```bash
npm run tauri build
```

Output binaries are in `src-tauri/target/release/bundle/`.

---

## Running Tests

### Frontend (Vitest)
```bash
npm run test              # watch mode
npm run test:coverage     # coverage report
```

### Rust (cargo test)
```bash
cd src-tauri
cargo test                # all unit + integration tests
cargo test -- --nocapture # with output
```

---

## Project Structure

```
nordtodo/
├── src/                         # React + TypeScript frontend
│   ├── App.tsx
│   ├── main.tsx
│   ├── components/
│   │   ├── layout/              # AppShell, TopBar
│   │   └── ui/                  # EmptyState, Skeleton, UndoToast, Onboarding
│   ├── features/
│   │   ├── tasks/               # TaskView, TaskCard, QuickAdd, TaskDetailPanel, TaskListHeader
│   │   ├── sidebar/             # Sidebar, NavRow, SectionDivider
│   │   ├── command-palette/     # CommandPalette
│   │   ├── settings/            # SettingsPanel
│   │   ├── search/              # (debounced search via TaskView)
│   │   └── integrations/        # (placeholder tabs in Settings)
│   ├── hooks/
│   │   ├── useTasks.ts          # TanStack Query + mutation hooks
│   │   ├── useKeyboard.ts       # Global + list keyboard handlers
│   │   ├── useDebounce.ts
│   │   └── usePreferences.ts
│   ├── lib/
│   │   ├── tauriApi.ts          # Single file for all invoke() calls
│   │   └── utils.ts             # cn(), date utils, priority config
│   ├── store/
│   │   ├── appStore.ts          # Zustand — navigation, panels, search, selection
│   │   ├── sidebarStore.ts      # Zustand persist — sidebar state
│   │   ├── taskStore.ts         # Zustand — optimistic updates
│   │   └── undoStore.ts         # Zustand — undo stack
│   ├── styles/
│   │   └── globals.css          # Tailwind directives + Nord CSS variables
│   ├── types/
│   │   └── index.ts             # Zod schemas + TypeScript types
│   └── test/
│       ├── setup.ts
│       ├── utils.test.ts
│       └── store.test.ts
│
├── src-tauri/                   # Rust / Tauri backend
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── build.rs
│   └── src/
│       ├── main.rs              # Binary entry point
│       ├── lib.rs               # App setup, command registration
│       ├── commands/            # Tauri command handlers
│       │   ├── tasks.rs
│       │   ├── tags.rs
│       │   ├── preferences.rs
│       │   ├── search.rs
│       │   └── export.rs
│       ├── db/
│       │   ├── connection.rs    # open_database(), seed_dev_data()
│       │   └── migrations.rs   # All SQL migrations
│       ├── models/
│       │   ├── task.rs          # Task, CreateTaskInput, UpdateTaskInput, TaskQuery
│       │   ├── tag.rs
│       │   ├── reminder.rs
│       │   ├── recurrence.rs
│       │   ├── preferences.rs
│       │   ├── integration.rs
│       │   └── sync.rs
│       ├── repositories/
│       │   ├── task.rs          # SQL queries, FTS5 search, smart views
│       │   ├── tag.rs
│       │   └── preferences.rs
│       ├── services/
│       │   ├── recurrence_service.rs
│       │   └── reminder_service.rs
│       ├── integrations/
│       │   ├── adapter.rs       # IntegrationAdapter trait
│       │   ├── google.rs        # Google Calendar (stub)
│       │   └── microsoft.rs     # Microsoft To Do (stub)
│       ├── errors/mod.rs        # AppError enum, AppResult<T>
│       └── config/mod.rs
│
├── tailwind.config.ts           # Full Nord palette + design tokens
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| New task | `Ctrl+N` (or `⌘+N`) |
| Command palette | `Ctrl+K` |
| Search | `Ctrl+F` |
| Toggle sidebar | `Ctrl+\` |
| Settings | `Ctrl+,` |
| Navigate list | `↑ / ↓` |
| Open task | `Enter` |
| Complete task | `Space` |
| Close panel | `Esc` |

---

## Architecture Decisions

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full design rationale, sync architecture, and integration guide.
