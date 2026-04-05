# NordTodo

NordTodo is a desktop task manager built with Tauri v2, React, TypeScript, and Rust.  
It is designed for fast local-first task management with optional Google Tasks sync.

## Why NordTodo

- Offline-first architecture with local SQLite storage
- Native desktop app with low overhead
- Fast keyboard-driven flow for capture, review, and completion
- Optional Google Tasks integration for two-way sync
- Clear separation between frontend state and Rust data layer

## Stack

- Frontend: React 18, TypeScript, Vite, TanStack Query, Zustand, Tailwind
- Backend: Rust, Tauri v2, rusqlite
- Data: SQLite (WAL mode + FTS5)
- Animations: Framer Motion

## Quick Start

### Prerequisites

- Node.js 18+
- Rust (stable)
- Tauri system prerequisites: [https://tauri.app/start/prerequisites/](https://tauri.app/start/prerequisites/)

### Install and Run

```bash
git clone https://github.com/your-org/nordtodo.git
cd nordtodo
npm install
npm run tauri dev
```

### Build

```bash
npm run tauri build
```

Build artifacts are generated under `src-tauri/target/release/bundle/`.

## Core Features

- Smart views: Inbox, Today, Upcoming, Overdue, Flagged, Completed
- Fast capture and keyboard navigation
- Optimistic task updates for responsive UI
- Full text search with SQLite FTS5
- Tagging support
- Undo for destructive actions
- Google Tasks integration with manual and interval sync

## Keyboard Shortcuts

| Action | Shortcut |
|---|---|
| New task | `Ctrl+N` |
| Command palette | `Ctrl+K` |
| Search | `Ctrl+F` |
| Toggle sidebar | `Ctrl+\` |
| Settings | `Ctrl+,` |
| Toggle productive mode | `Ctrl+Shift+P` |
| Sync integrations | `Ctrl+Shift+G` |
| Open task | `Enter` |
| Complete task | `Space` |
| Close panel | `Esc` |

On macOS, use `Cmd` in place of `Ctrl`.

## Documentation

- User guide: [docs/USER_GUIDE.md](./docs/USER_GUIDE.md)
- Troubleshooting: [docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)
- Architecture: [ARCHITECTURE.md](./ARCHITECTURE.md)

Google setup details:
- See `Create Your Own Google OAuth App` in [docs/USER_GUIDE.md](./docs/USER_GUIDE.md) for Client ID and Client Secret setup.

## Important Notes

- The app stores user data in the OS app data directory for the app identifier `com.nordtodo.app`.
- In development builds, sample tasks are auto-seeded on first run.
- Closing the main window hides the app to tray. Use tray menu `Quit` to exit fully.
- Google credentials and tokens are currently stored in local app data SQLite. Treat local machine access as sensitive.
- Auto sync intervals that are too short can generate high API request volume. Use a moderate interval.

## Testing

```bash
npm run test
npm run test:coverage
```

```bash
cd src-tauri
cargo test
```

## Repository Layout

```text
src/        React frontend
src-tauri/  Rust backend and Tauri app
docs/       End-user documentation
```
