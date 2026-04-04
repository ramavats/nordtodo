use crate::errors::AppError;
use crate::models::task::Task;
use crate::models::integration::{IntegrationAccount, ImportedCalendarEvent};

/// The canonical adapter interface every integration must implement.
/// This decouples the sync engine from provider-specific logic.
/// Currently uses async_trait for future async support; Tauri commands
/// will call these from tokio::spawn or a dedicated sync thread.
pub trait IntegrationAdapter: Send + Sync {
    /// Test connectivity and return provider user info
    fn test_connection(&self, account: &IntegrationAccount) -> Result<String, AppError>;

    /// Fetch remote tasks/events and return as ImportedCalendarEvents
    fn fetch_remote(
        &self,
        account: &IntegrationAccount,
        since: Option<chrono::DateTime<chrono::Utc>>,
    ) -> Result<Vec<ImportedCalendarEvent>, AppError>;

    /// Map a remote ImportedCalendarEvent to a local Task.
    /// This is the provider-specific "translation layer".
    fn map_to_task(&self, event: &ImportedCalendarEvent) -> Task;

    /// Push a local task change to the remote provider.
    /// Initially read-only — this returns Err(Unauthorized) until two-way sync is enabled.
    fn push_task(&self, _account: &IntegrationAccount, _task: &Task) -> Result<(), AppError> {
        Err(AppError::Unauthorized(
            "Two-way sync not yet enabled for this provider".to_string(),
        ))
    }

    /// Provider identifier string
    fn provider_id(&self) -> &'static str;
}
