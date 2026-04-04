/// Google Tasks adapter — full two-way sync implementation.
/// API reference: https://developers.google.com/tasks/reference/rest

use chrono::{DateTime, Utc};
use reqwest::blocking::Client;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use crate::errors::AppError;
use crate::models::task::{Task, Priority, TaskStatus, TaskSource};

// ─── Google Tasks API types ───────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct GoogleTaskList {
    pub id: String,
    pub title: String,
}

#[derive(Debug, Deserialize)]
struct TaskListsResponse {
    items: Option<Vec<GoogleTaskList>>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct GoogleTask {
    pub id: Option<String>,
    pub title: Option<String>,
    pub notes: Option<String>,
    pub status: Option<String>,     // "needsAction" | "completed"
    pub deleted: Option<bool>,
    pub due: Option<String>,        // RFC3339
    pub completed: Option<String>,  // RFC3339 when completed
    pub updated: Option<String>,    // RFC3339 last update
}

#[derive(Debug, Deserialize)]
struct TasksListResponse {
    items: Option<Vec<GoogleTask>>,
    #[serde(rename = "nextPageToken")]
    next_page_token: Option<String>,
}

#[derive(Debug, Serialize)]
struct GoogleTaskPatch {
    title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    notes: Option<String>,
    status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    due: Option<String>,
}

// ─── Source metadata stored as JSON in source_metadata column ────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct GoogleSourceMeta {
    pub remote_id: String,
    pub list_id: String,
    pub etag: Option<String>,
}

// ─── Adapter ─────────────────────────────────────────────────────────────────

pub struct GoogleTasksAdapter {
    pub client_id: String,
}

impl GoogleTasksAdapter {
    pub fn new(client_id: String) -> Self {
        Self { client_id }
    }

    /// Fetch all task lists, return the first one (usually the default list).
    pub fn get_default_list_id(&self, access_token: &str) -> Result<String, AppError> {
        let client = Client::new();
        let resp = client
            .get("https://tasks.googleapis.com/tasks/v1/users/@me/lists")
            .bearer_auth(access_token)
            .send()
            .map_err(|e| AppError::Integration(format!("List fetch error: {e}")))?;

        if !resp.status().is_success() {
            return Err(AppError::Integration(format!(
                "Google Tasks API error: {}",
                resp.status()
            )));
        }

        let data: TaskListsResponse = resp
            .json()
            .map_err(|e| AppError::Integration(format!("List parse error: {e}")))?;

        data.items
            .and_then(|lists| lists.into_iter().next())
            .map(|l| l.id)
            .ok_or_else(|| AppError::Integration("No task lists found in Google Tasks".to_string()))
    }

    /// Fetch all tasks from a list, optionally filtering by update time.
    pub fn fetch_tasks(
        &self,
        access_token: &str,
        list_id: &str,
        since: Option<DateTime<Utc>>,
    ) -> Result<Vec<GoogleTask>, AppError> {
        let client = Client::new();
        let mut all_tasks = Vec::new();
        let mut page_token: Option<String> = None;
        let since_str = since.map(|s| s.to_rfc3339());

        loop {
            let mut req = client
                .get(format!(
                    "https://tasks.googleapis.com/tasks/v1/lists/{list_id}/tasks"
                ))
                .bearer_auth(access_token)
                .query(&[
                    ("showCompleted", "true"),
                    ("showHidden", "true"),
                    ("showDeleted", "true"),
                    ("maxResults", "100"),
                ]);

            if let Some(ref s) = since_str {
                req = req.query(&[("updatedMin", s.as_str())]);
            }
            if let Some(ref token) = page_token {
                req = req.query(&[("pageToken", token.as_str())]);
            }

            let resp = req
                .send()
                .map_err(|e| AppError::Integration(format!("Tasks fetch error: {e}")))?;

            if !resp.status().is_success() {
                let status = resp.status();
                let body = resp.text().unwrap_or_default();
                return Err(AppError::Integration(format!(
                    "Google Tasks API {status}: {body}"
                )));
            }

            let data: TasksListResponse = resp
                .json()
                .map_err(|e| AppError::Integration(format!("Tasks parse error: {e}")))?;

            if let Some(items) = data.items {
                all_tasks.extend(items);
            }

            match data.next_page_token {
                Some(token) => page_token = Some(token),
                None => break,
            }
        }

        Ok(all_tasks)
    }

    /// Create a new task in Google Tasks. Returns the new remote task ID.
    pub fn create_remote_task(
        &self,
        access_token: &str,
        list_id: &str,
        task: &Task,
    ) -> Result<String, AppError> {
        let client = Client::new();
        let body = GoogleTaskPatch {
            title: task.title.clone(),
            notes: task.notes.clone(),
            status: google_status_for(task),
            due: task.due_at.map(|d| d.to_rfc3339()),
        };

        let resp = client
            .post(format!(
                "https://tasks.googleapis.com/tasks/v1/lists/{list_id}/tasks"
            ))
            .bearer_auth(access_token)
            .json(&body)
            .send()
            .map_err(|e| AppError::Integration(format!("Create task HTTP error: {e}")))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().unwrap_or_default();
            return Err(AppError::Integration(format!(
                "Create task failed {status}: {body}"
            )));
        }

        let created: GoogleTask = resp
            .json()
            .map_err(|e| AppError::Integration(format!("Create task parse error: {e}")))?;

        created
            .id
            .ok_or_else(|| AppError::Integration("No ID in create response".to_string()))
    }

    /// Patch an existing remote task.
    pub fn update_remote_task(
        &self,
        access_token: &str,
        list_id: &str,
        remote_id: &str,
        task: &Task,
    ) -> Result<(), AppError> {
        let client = Client::new();
        let body = GoogleTaskPatch {
            title: task.title.clone(),
            notes: task.notes.clone(),
            status: google_status_for(task),
            due: task.due_at.map(|d| d.to_rfc3339()),
        };

        let resp = client
            .patch(format!(
                "https://tasks.googleapis.com/tasks/v1/lists/{list_id}/tasks/{remote_id}"
            ))
            .bearer_auth(access_token)
            .json(&body)
            .send()
            .map_err(|e| AppError::Integration(format!("Update task HTTP error: {e}")))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().unwrap_or_default();
            return Err(AppError::Integration(format!(
                "Update task failed {status}: {body}"
            )));
        }
        Ok(())
    }

    /// Delete a remote task (404 is treated as success — already gone).
    pub fn delete_remote_task(
        &self,
        access_token: &str,
        list_id: &str,
        remote_id: &str,
    ) -> Result<(), AppError> {
        let client = Client::new();
        let resp = client
            .delete(format!(
                "https://tasks.googleapis.com/tasks/v1/lists/{list_id}/tasks/{remote_id}"
            ))
            .bearer_auth(access_token)
            .send()
            .map_err(|e| AppError::Integration(format!("Delete task HTTP error: {e}")))?;

        let status = resp.status().as_u16();
        if status != 204 && status != 200 && status != 404 {
            return Err(AppError::Integration(format!(
                "Delete task failed: {}",
                resp.status()
            )));
        }
        Ok(())
    }

    /// Map a GoogleTask → local Task (used when importing).
    pub fn map_to_local(&self, g: &GoogleTask, list_id: &str) -> Task {
        let now = Utc::now();
        let remote_id = g.id.clone().unwrap_or_default();

        let status = match g.status.as_deref() {
            Some("completed") => TaskStatus::Completed,
            _ => TaskStatus::Pending,
        };

        let due_at = g.due.as_ref().and_then(|d| {
            DateTime::parse_from_rfc3339(d)
                .ok()
                .map(|dt| dt.with_timezone(&Utc))
        });

        let completed_at = if status == TaskStatus::Completed {
            g.completed.as_ref().and_then(|d| {
                DateTime::parse_from_rfc3339(d)
                    .ok()
                    .map(|dt| dt.with_timezone(&Utc))
            })
        } else {
            None
        };

        let meta = GoogleSourceMeta {
            remote_id: remote_id.clone(),
            list_id: list_id.to_string(),
            etag: None,
        };
        let source_metadata = serde_json::to_string(&meta).ok();

        Task {
            id: Uuid::new_v4().to_string(),
            title: g.title.clone().unwrap_or_else(|| "(Untitled)".to_string()),
            description: None,
            notes: g.notes.clone(),
            status,
            priority: Priority::None,
            source: TaskSource::GoogleCalendar,
            source_metadata,
            due_at,
            start_at: None,
            completed_at,
            reminder_at: None,
            snoozed_until: None,
            created_at: now,
            updated_at: now,
            is_archived: false,
            is_pinned: false,
            is_today: false,
            sort_order: 0,
            parent_task_id: None,
            estimate_minutes: None,
            recurrence_rule: None,
            tags: vec![],
        }
    }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

fn google_status_for(task: &Task) -> String {
    match task.status {
        TaskStatus::Completed => "completed".to_string(),
        _ => "needsAction".to_string(),
    }
}
