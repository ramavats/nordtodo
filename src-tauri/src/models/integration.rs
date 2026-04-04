use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Represents a connected external account (Google, Microsoft, etc.)
/// Token storage is abstracted — tokens should be stored in OS keychain in production.
/// For this foundation, we store an opaque `credentials_json` blob.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IntegrationAccount {
    pub id: String,
    pub provider: IntegrationProvider,
    pub display_name: String,
    pub email: Option<String>,
    pub status: IntegrationStatus,
    /// Opaque JSON: { access_token, refresh_token, expires_at, ... }
    /// In production, move this to OS keychain via tauri-plugin-stronghold or system keyring.
    #[serde(skip_serializing)] // Never expose tokens to frontend
    pub credentials_json: Option<String>,
    pub last_sync_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

impl IntegrationAccount {
    pub fn new(provider: IntegrationProvider, display_name: String) -> Self {
        IntegrationAccount {
            id: Uuid::new_v4().to_string(),
            provider,
            display_name,
            email: None,
            status: IntegrationStatus::Disconnected,
            credentials_json: None,
            last_sync_at: None,
            created_at: Utc::now(),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum IntegrationProvider {
    GoogleCalendar,
    MicrosoftTodo,
    OutlookCalendar,
    Notion,
    AppleReminders,
}

impl IntegrationProvider {
    pub fn to_db_str(&self) -> &'static str {
        match self {
            IntegrationProvider::GoogleCalendar => "google_calendar",
            IntegrationProvider::MicrosoftTodo => "microsoft_todo",
            IntegrationProvider::OutlookCalendar => "outlook_calendar",
            IntegrationProvider::Notion => "notion",
            IntegrationProvider::AppleReminders => "apple_reminders",
        }
    }
    pub fn display_name(&self) -> &'static str {
        match self {
            IntegrationProvider::GoogleCalendar => "Google Calendar",
            IntegrationProvider::MicrosoftTodo => "Microsoft To Do",
            IntegrationProvider::OutlookCalendar => "Outlook Calendar",
            IntegrationProvider::Notion => "Notion",
            IntegrationProvider::AppleReminders => "Apple Reminders",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum IntegrationStatus {
    Connected,
    Disconnected,
    Error,
    Syncing,
    TokenExpired,
}

/// Imported calendar event (read-only from external source)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportedCalendarEvent {
    pub id: String,
    pub integration_id: String,
    pub remote_id: String,
    pub title: String,
    pub description: Option<String>,
    pub start_at: DateTime<Utc>,
    pub end_at: DateTime<Utc>,
    pub is_all_day: bool,
    pub calendar_name: Option<String>,
    pub linked_task_id: Option<String>,
    pub raw_data: Option<String>, // raw JSON from provider
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
