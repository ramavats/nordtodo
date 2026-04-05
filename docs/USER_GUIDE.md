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

### Create Your Own Google OAuth App

If you want your own Google Client ID and Client Secret, do this once:

1. Open Google Cloud Console: `https://console.cloud.google.com/`
2. Create a new project (or select an existing one).
3. Go to `APIs & Services` -> `Library`.
4. Search for `Google Tasks API` and click `Enable`.
5. Go to `APIs & Services` -> `OAuth consent screen`.
6. Choose `External` (or `Internal` for Workspace org), then continue.
7. Fill required app info (app name, support email, developer email).
8. Save and continue through scopes and test users.
9. Add your Google account under `Test users` if app is in testing mode.
10. Go to `APIs & Services` -> `Credentials`.
11. Click `Create Credentials` -> `OAuth client ID`.
12. Choose application type `Desktop app`.
13. Give it a name and create.
14. Copy the generated `Client ID` and `Client Secret`.

Notes:
- You can leave redirect URI handling to the app flow used by NordTodo.
- If Google shows "App not verified", continue with your test user account.

### Connect

1. Open Settings.
2. Go to Integrations.
3. Paste your Google OAuth Client ID and Client Secret.
4. Click `Connect Google Tasks`.
5. Browser opens Google sign-in and consent.
6. Google shows an authorization code.
7. Copy that code into NordTodo and complete connection.
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
