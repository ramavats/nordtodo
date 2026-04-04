/// Microsoft To Do + Outlook Calendar integration adapter (stub — read-only phase 1)
///
/// Implementation roadmap:
/// Phase 1: OAuth2 via Microsoft Identity Platform (MSAL)
///           Microsoft To Do: GET /me/todo/lists/{listId}/tasks
///           Outlook Calendar: GET /me/events
/// Phase 2: Link and display in app
/// Phase 3: Two-way sync
///
/// Dependencies to add:
///   Same as Google: oauth2, reqwest, tauri-plugin-stronghold

use crate::errors::AppError;
use crate::models::integration::{IntegrationAccount, ImportedCalendarEvent};
use crate::models::task::{Task, TaskSource};
use crate::integrations::adapter::IntegrationAdapter;

pub struct MicrosoftAdapter;

impl IntegrationAdapter for MicrosoftAdapter {
    fn provider_id(&self) -> &'static str { "microsoft_todo" }

    fn test_connection(&self, _account: &IntegrationAccount) -> Result<String, AppError> {
        Err(AppError::Integration("Microsoft integration not yet enabled. See integrations/microsoft.rs for the roadmap.".to_string()))
    }

    fn fetch_remote(
        &self,
        _account: &IntegrationAccount,
        _since: Option<chrono::DateTime<chrono::Utc>>,
    ) -> Result<Vec<ImportedCalendarEvent>, AppError> {
        Err(AppError::Integration("Microsoft fetch not yet implemented".to_string()))
    }

    fn map_to_task(&self, event: &ImportedCalendarEvent) -> Task {
        let mut task = Task::new(event.title.clone());
        task.description = event.description.clone();
        task.due_at = Some(event.end_at);
        task.start_at = Some(event.start_at);
        task.source = TaskSource::MicrosoftTodo;
        task.source_metadata = Some(serde_json::json!({
            "event_id": event.remote_id,
        }).to_string());
        task
    }
}
