# Troubleshooting

## 1. API Requests Are Increasing Too Fast

### Symptoms

- Google API dashboard request counters increase rapidly.
- High `TaskService.Patch` or `TaskService.Update` counts.

### Causes

- Auto sync interval is too short.
- Repeated failures on the same remote updates.
- Large task sets with frequent syncs.

### Fix

1. Open Settings -> Integrations.
2. Set Auto sync interval to a higher value (example: 300).
3. Run one manual sync and watch the result.
4. Check that failed tasks are not retried continuously.

Notes:
- `0` disables auto sync.
- One sync still performs list pagination plus pushes for changed tasks.

## 2. App Logs In Automatically After Rebuild or Reinstall

### Why This Happens

Session data is stored in local app data SQLite.  
If that app data remains, the app can reconnect automatically on next run.

### Fix

1. Disconnect Google from Settings -> Integrations.
2. Fully quit the app from tray menu.
3. Delete local app data for app identifier `com.nordtodo.app`.
4. Launch app again.

## 3. Sync Fails Repeatedly

### Symptoms

- Sync toasts show repeated failure.
- Push count stays low while errors remain high in provider dashboard.

### Fix Checklist

1. Verify Google OAuth credentials are correct.
2. Reconnect integration.
3. Run manual sync once.
4. Confirm interval is not too aggressive.
5. Check local network and firewall restrictions.

## 4. Closing Window Does Not Exit App

This is expected.

- Window close hides to system tray.
- Use tray menu `Quit` to terminate app.

## 5. Data Missing After Import

Import is additive and ID-aware.

- Existing IDs are skipped.
- Import does not force-override all local rows.

If you need a true clean restore:
1. Backup current data.
2. Remove local app database.
3. Start app fresh.
4. Import backup.

## 6. High CPU or Sluggish UI

Checklist:
1. Reduce auto sync frequency.
2. Disable integrations temporarily.
3. Keep app updated.
4. Restart app to clear transient state.

## 7. Developer Build Behaves Differently From Release

Development builds may seed sample data on first run.  
Release builds should not seed that data.

## 8. Collecting Useful Bug Report Data

When reporting an issue, include:
- OS and version
- App version
- Exact action sequence
- Sync result counts (`imported`, `updated`, `pushed`)
- Whether auto sync is enabled and interval value

