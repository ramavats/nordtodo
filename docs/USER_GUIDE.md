# NordTodo User Guide

## 1. What NordTodo Is

NordTodo is a desktop task app that stores data locally and can optionally sync with Google Tasks.

It is built for:
- Fast keyboard-first task management
- Local-first reliability
- Optional cloud sync when needed

## 2. First Launch

On first launch, you can start adding tasks immediately.  
The app is usable without any account connection.

Important behavior:
- In development builds, sample tasks may be added automatically.
- In production builds, your task list starts empty unless imported or synced.

## 3. Core Workflow

1. Add tasks quickly from the main task view.
2. Use Smart Views to focus by context (Inbox, Today, Upcoming, Overdue, Flagged, Completed).
3. Open a task to edit notes, due date, priority, and tags.
4. Complete tasks from keyboard or task row controls.
5. Use search for fast retrieval.

## 4. Keyboard Shortcuts

| Action | Shortcut |
|---|---|
| New task | `Ctrl+N` |
| Command palette | `Ctrl+K` |
| Search | `Ctrl+F` |
| Toggle sidebar | `Ctrl+\` |
| Settings | `Ctrl+,` |
| Toggle productive mode | `Ctrl+Shift+P` |
| Sync integrations | `Ctrl+Shift+G` |
| Open selected task | `Enter` |
| Complete selected task | `Space` |
| Close open panel | `Esc` |

On macOS, use `Cmd` instead of `Ctrl`.

## 5. Google Tasks Integration

### Connect

1. Open Settings.
2. Go to Integrations.
3. Enter Google OAuth Client ID and Client Secret.
4. Start connection and complete authorization.
5. Run a sync.

### What Sync Does

Sync has three operations:
- Import: remote Google tasks that are not local
- Update: remote changes applied to local linked tasks
- Push: local changes sent to Google for linked tasks

### Sync Interval Guidance

- `0` seconds means auto sync is disabled.
- Use a moderate interval such as 120-600 seconds for normal usage.
- Very short intervals can increase API request volume quickly.

## 6. Data Storage and Privacy

NordTodo stores data in local SQLite in the OS app data location for app identifier `com.nordtodo.app`.

Stored data includes:
- Tasks, tags, preferences
- Integration account metadata
- Google auth credentials and tokens for sync

Important:
- Data is local to the machine profile.
- Reinstalling the app without deleting app data can keep your previous login/session.
- Do not share your local app data directory.

## 7. Backup and Restore

### Export

Use Settings -> Data -> Export JSON.

### Import

Use Settings -> Data -> Import JSON.

Import behavior:
- Import is additive.
- Existing IDs are skipped.
- It does not fully replace your database.

For full machine migration:
- Export JSON from old machine.
- Install app on new machine.
- Import JSON.
- Reconnect integrations if needed.

## 8. App Lifecycle Notes

- Clicking window close hides app to system tray.
- To fully exit, use tray menu `Quit`.
- Background app activity may continue while app is hidden.

## 9. Safe Defaults for Most Users

Recommended settings:
- Auto sync interval: 300 seconds
- Productive mode: on during focus sessions
- Local only mode: on if you do not need integrations

## 10. When to Use Local Only Mode

Enable local only mode if you want:
- No integration traffic
- Fully offline task workflow
- Minimal external dependencies

## 11. Versioning and Updates

Before updating:
1. Export JSON backup.
2. Note your integration settings.
3. Update app.
4. Run one manual sync.

## 12. Need Help

If behavior looks wrong, start with:
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
