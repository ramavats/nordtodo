/// Google Tasks integration commands.
/// OAuth2 PKCE flow + two-way sync.
///
/// Flow:
///   1. Frontend calls `google_auth_url` → gets a URL + PKCE state
///   2. URL opens in system browser via Tauri shell
///   3. Google redirects to nordtodo://auth?code=...&state=...
///   4. Frontend calls `google_exchange_code` with the code + state
///   5. Tokens stored in integration_accounts table
///   6. Frontend calls `sync_google_tasks` to pull/push

use tauri::State;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::Utc;
use crate::db::DbConnection;
use crate::errors::AppError;
use crate::integrations::oauth::{
    build_auth_url, exchange_code, refresh_access_token,
};
use crate::integrations::google::GoogleTasksAdapter;
use crate::repositories::TaskRepository;

// The redirect URI registered in Google Cloud Console.
// For desktop apps, use the loopback address or a custom scheme.
// We use a custom Tauri deep-link URI scheme.
// OOB redirect: Google shows the code directly on-screen — no localhost server needed.
// This is the correct approach for native desktop apps that can't receive HTTP callbacks.
const REDIRECT_URI: &str = "urn:ietf:wg:oauth:2.0:oob";

// ─── Credential store ─────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
struct GoogleCredentials {
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub expires_at: Option<String>,
    pub client_secret: String,
    pub default_list_id: Option<String>,
    pub last_synced_at: Option<String>,
}

// ─── Return types ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct AuthUrlResponse {
    pub url: String,
    pub state: String, // random nonce — frontend must pass back on exchange
}

#[derive(Debug, Serialize)]
pub struct IntegrationStatus {
    pub connected: bool,
    pub email: Option<String>,
    pub last_synced_at: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct SyncResult {
    pub imported: i64,
    pub updated: i64,
    pub pushed: i64,
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

fn get_client_id(conn: &rusqlite::Connection) -> Result<String, AppError> {
    use crate::repositories::PreferencesRepository;
    let prefs = PreferencesRepository.get(conn)?;
    if prefs.google_client_id.is_empty() {
        return Err(AppError::Config(
            "Google Client ID not set. Add it in Settings → Integrations.".to_string()
        ));
    }
    Ok(prefs.google_client_id)
}

fn get_client_secret(conn: &rusqlite::Connection) -> Result<String, AppError> {
    use crate::repositories::PreferencesRepository;
    let prefs = PreferencesRepository.get(conn)?;
    if prefs.google_client_secret.is_empty() {
        return Err(AppError::Config(
            "Google Client Secret not set. Add it in Settings → Integrations.".to_string()
        ));
    }
    Ok(prefs.google_client_secret)
}

fn load_credentials(conn: &rusqlite::Connection) -> Result<Option<GoogleCredentials>, AppError> {
    let result: rusqlite::Result<String> = conn.query_row(
        "SELECT credentials_json FROM integration_accounts WHERE provider = 'google_calendar' LIMIT 1",
        [],
        |row| row.get(0),
    );

    match result {
        Ok(json) => {
            let creds: GoogleCredentials = serde_json::from_str(&json)
                .map_err(|e| AppError::Integration(format!("Cred parse error: {e}")))?;
            Ok(Some(creds))
        }
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(AppError::Database(e.to_string())),
    }
}

fn save_credentials(conn: &rusqlite::Connection, creds: &GoogleCredentials, email: Option<&str>) -> Result<(), AppError> {
    let json = serde_json::to_string(creds)
        .map_err(|e| AppError::Integration(format!("Cred serialize error: {e}")))?;

    let now = Utc::now().to_rfc3339();
    let display = email.unwrap_or("Google Account");

    // Check if row already exists
    let exists: bool = conn
        .query_row(
            "SELECT COUNT(*) FROM integration_accounts WHERE provider = 'google_calendar'",
            [],
            |row| row.get::<_, i64>(0),
        )
        .map(|n| n > 0)
        .unwrap_or(false);

    if exists {
        conn.execute(
            "UPDATE integration_accounts SET display_name = ?1, email = ?2, status = 'connected', credentials_json = ?3 WHERE provider = 'google_calendar'",
            rusqlite::params![display, email, json],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;
    } else {
        let id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO integration_accounts (id, provider, display_name, email, status, credentials_json, created_at) VALUES (?1, 'google_calendar', ?2, ?3, 'connected', ?4, ?5)",
            rusqlite::params![id, display, email, json, now],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;
    }

    Ok(())
}

/// Ensure we have a valid (non-expired) access token, refreshing if needed.
fn get_valid_token(conn: &rusqlite::Connection, creds: &mut GoogleCredentials, client_id: &str) -> Result<String, AppError> {
    // Check expiry
    let expired = creds.expires_at.as_ref().map(|exp| {
        DateTime::parse_from_rfc3339(exp)
            .map(|dt| dt < chrono::Utc::now() + chrono::Duration::seconds(60))
            .unwrap_or(true)
    }).unwrap_or(false);

    if expired {
        let refresh = creds.refresh_token.as_deref().ok_or_else(|| {
            AppError::Unauthorized("No refresh token — please reconnect Google Tasks".to_string())
        })?;

        let token_resp = refresh_access_token(client_id, &creds.client_secret, refresh)?;
        creds.access_token = token_resp.access_token.clone();
        if let Some(exp_in) = token_resp.expires_in {
            creds.expires_at = Some(
                (Utc::now() + chrono::Duration::seconds(exp_in)).to_rfc3339()
            );
        }
        save_credentials(conn, creds, None)?;
    }

    Ok(creds.access_token.clone())
}

use chrono::DateTime;

// ─── Tauri commands ───────────────────────────────────────────────────────────

/// Step 1: Generate an OAuth2 authorization URL.
/// Frontend opens this URL in the system browser.
/// Google will display the auth code directly on-screen (OOB flow).
#[tauri::command]
pub fn google_auth_url(db: State<DbConnection>) -> Result<AuthUrlResponse, AppError> {
    let conn = db.lock().map_err(|_| AppError::Internal("DB lock poisoned".to_string()))?;
    let client_id = get_client_id(&conn)?;
    let state = Uuid::new_v4().to_string();
    let url = build_auth_url(&client_id);
    Ok(AuthUrlResponse { url, state })
}

/// Step 2: Exchange the authorization code for tokens.
/// Called by the frontend after catching the redirect.
#[tauri::command]
pub fn google_exchange_code(db: State<DbConnection>, code: String) -> Result<IntegrationStatus, AppError> {
    let conn = db.lock().map_err(|_| AppError::Internal("DB lock poisoned".to_string()))?;
    let client_id = get_client_id(&conn)?;
    let client_secret = get_client_secret(&conn)?;

    let token_resp = exchange_code(&client_id, &client_secret, code.trim())?;

    let access_token = token_resp.access_token.clone();

    // Fetch default list ID
    let adapter = GoogleTasksAdapter::new(client_id.clone());
    let list_id = adapter.get_default_list_id(&access_token)?;

    // Fetch user email
    let email = fetch_google_email(&access_token).ok();

    let creds = GoogleCredentials {
        access_token,
        refresh_token: token_resp.refresh_token,
        expires_at: token_resp.expires_in.map(|s| {
            (Utc::now() + chrono::Duration::seconds(s)).to_rfc3339()
        }),
        client_secret,
        default_list_id: Some(list_id),
        last_synced_at: None,
    };

    save_credentials(&conn, &creds, email.as_deref())?;

    Ok(IntegrationStatus {
        connected: true,
        email,
        last_synced_at: None,
    })
}

/// Get current integration connection status.
#[tauri::command]
pub fn google_status(db: State<DbConnection>) -> Result<IntegrationStatus, AppError> {
    let conn = db.lock().map_err(|_| AppError::Internal("DB lock poisoned".to_string()))?;

    let result: rusqlite::Result<(String, Option<String>, Option<String>)> = conn.query_row(
        "SELECT status, email, last_sync_at FROM integration_accounts WHERE provider = 'google_calendar' LIMIT 1",
        [],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
    );

    match result {
        Ok((status, email, last_sync)) => Ok(IntegrationStatus {
            connected: status == "connected",
            email,
            last_synced_at: last_sync,
        }),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(IntegrationStatus {
            connected: false,
            email: None,
            last_synced_at: None,
        }),
        Err(e) => Err(AppError::Database(e.to_string())),
    }
}

/// Disconnect Google Tasks — remove credentials but keep imported tasks.
#[tauri::command]
pub fn google_disconnect(db: State<DbConnection>) -> Result<(), AppError> {
    let conn = db.lock().map_err(|_| AppError::Internal("DB lock poisoned".to_string()))?;
    conn.execute(
        "DELETE FROM integration_accounts WHERE provider = 'google_calendar'",
        [],
    )
    .map_err(|e| AppError::Database(e.to_string()))?;
    Ok(())
}

/// Full two-way sync with Google Tasks.
/// - Pulls remote tasks not yet local (import)
/// - Pushes local tasks with source=GoogleCalendar that changed (push)
/// - Marks completed tasks as completed on both sides
#[tauri::command]
pub fn sync_google_tasks(db: State<DbConnection>) -> Result<SyncResult, AppError> {
    let conn = db.lock().map_err(|_| AppError::Internal("DB lock poisoned".to_string()))?;
    let client_id = get_client_id(&conn)?;

    let mut creds = load_credentials(&conn)?
        .ok_or_else(|| AppError::Unauthorized("Google Tasks not connected".to_string()))?;

    let access_token = get_valid_token(&conn, &mut creds, &client_id)?;

    let list_id = creds.default_list_id.as_deref()
        .ok_or_else(|| AppError::Integration("No default list ID — try disconnecting and reconnecting".to_string()))?
        .to_string();

    let adapter = GoogleTasksAdapter::new(client_id);
    let repo = TaskRepository;
    let now = Utc::now().to_rfc3339();

    let mut imported = 0i64;
    let mut updated = 0i64;
    let mut pushed = 0i64;

    // ── PULL: fetch all remote tasks ──────────────────────────────────────────
    let remote_tasks = adapter.fetch_tasks(&access_token, &list_id, None)?;

    for g_task in &remote_tasks {
        let remote_id = match &g_task.id {
            Some(id) => id.clone(),
            None => continue,
        };

        // Check if we already have this task by source_metadata remote_id
        let existing: rusqlite::Result<(String, String)> = conn.query_row(
            "SELECT id, status FROM tasks
             WHERE source = 'google_calendar'
             AND json_extract(source_metadata, '$.remote_id') = ?1
             AND status != 'deleted'
             LIMIT 1",
            rusqlite::params![remote_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        );

        match existing {
            Ok((local_id, local_status)) => {
                // Task exists — sync status if remote changed
                let remote_status = match g_task.status.as_deref() {
                    Some("completed") => "completed",
                    _ => "pending",
                };
                if remote_status != local_status {
                    conn.execute(
                        "UPDATE tasks SET status = ?1, updated_at = ?2 WHERE id = ?3",
                        rusqlite::params![remote_status, now, local_id],
                    )
                    .map_err(|e| AppError::Database(e.to_string()))?;
                    updated += 1;
                }
            }
            Err(rusqlite::Error::QueryReturnedNoRows) => {
                // New task — import it
                let local_task = adapter.map_to_local(g_task, &list_id);
                repo.insert(&conn, &local_task)?;
                imported += 1;
            }
            Err(e) => return Err(AppError::Database(e.to_string())),
        }
    }

    // ── PUSH: find local Google Tasks that need pushing ───────────────────────
    // Tasks with source=google_calendar and sync_status='pending_push'
    let pending_push: Vec<(String, Option<String>, String, String)> = {
        let mut stmt = conn
            .prepare(
                "SELECT id, source_metadata, title, status FROM tasks
                 WHERE source = 'google_calendar'
                 AND sync_status = 'pending_push'
                 AND status != 'deleted'",
            )
            .map_err(|e| AppError::Database(e.to_string()))?;

        let rows: Vec<_> = stmt.query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, Option<String>>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
            ))
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .filter_map(|r| r.ok())
        .collect();
        rows
    };

    for (local_id, meta_json, title, status) in pending_push {
        if let Some(meta_str) = meta_json {
            if let Ok(meta) = serde_json::from_str::<serde_json::Value>(&meta_str) {
                if let Some(remote_id) = meta["remote_id"].as_str() {
                    let google_status = if status == "completed" { "completed" } else { "needsAction" };
                    let patch = serde_json::json!({
                        "title": title,
                        "status": google_status,
                    });

                    let client = reqwest::blocking::Client::new();
                    let _ = client
                        .patch(format!(
                            "https://tasks.googleapis.com/tasks/v1/lists/{list_id}/tasks/{remote_id}"
                        ))
                        .bearer_auth(&access_token)
                        .json(&patch)
                        .send();

                    conn.execute(
                        "UPDATE tasks SET sync_status = 'synced', updated_at = ?1 WHERE id = ?2",
                        rusqlite::params![now, local_id],
                    )
                    .map_err(|e| AppError::Database(e.to_string()))?;

                    pushed += 1;
                }
            }
        }
    }

    // Update last_sync_at
    conn.execute(
        "UPDATE integration_accounts SET last_sync_at = ?1 WHERE provider = 'google_calendar'",
        rusqlite::params![now],
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(SyncResult { imported, updated, pushed })
}

// ─── Private helpers ──────────────────────────────────────────────────────────

fn fetch_google_email(access_token: &str) -> Result<String, AppError> {
    let client = reqwest::blocking::Client::new();
    let resp = client
        .get("https://www.googleapis.com/oauth2/v3/userinfo")
        .bearer_auth(access_token)
        .send()
        .map_err(|e| AppError::Integration(format!("Userinfo error: {e}")))?;

    let data: serde_json::Value = resp
        .json()
        .map_err(|e| AppError::Integration(format!("Userinfo parse error: {e}")))?;

    data["email"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| AppError::Integration("No email in userinfo response".to_string()))
}
