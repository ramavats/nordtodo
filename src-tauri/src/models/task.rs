use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Task priority levels, ordered by urgency
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum Priority {
    Urgent,
    High,
    Medium,
    #[default]
    None,
}

impl Priority {
    pub fn from_str(s: &str) -> Priority {
        match s {
            "urgent" => Priority::Urgent,
            "high" => Priority::High,
            "medium" => Priority::Medium,
            _ => Priority::None,
        }
    }
    pub fn to_db_str(&self) -> &'static str {
        match self {
            Priority::Urgent => "urgent",
            Priority::High => "high",
            Priority::Medium => "medium",
            Priority::None => "none",
        }
    }
    pub fn sort_value(&self) -> i32 {
        match self {
            Priority::Urgent => 0,
            Priority::High => 1,
            Priority::Medium => 2,
            Priority::None => 3,
        }
    }
}

/// Task lifecycle status
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum TaskStatus {
    #[default]
    Pending,
    Completed,
    Archived,
    Deleted,
}

impl TaskStatus {
    pub fn from_str(s: &str) -> TaskStatus {
        match s {
            "completed" => TaskStatus::Completed,
            "archived" => TaskStatus::Archived,
            "deleted" => TaskStatus::Deleted,
            _ => TaskStatus::Pending,
        }
    }
    pub fn to_db_str(&self) -> &'static str {
        match self {
            TaskStatus::Pending => "pending",
            TaskStatus::Completed => "completed",
            TaskStatus::Archived => "archived",
            TaskStatus::Deleted => "deleted",
        }
    }
}

/// Where this task originated (local vs. external integrations)
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum TaskSource {
    #[default]
    Local,
    GoogleCalendar,
    MicrosoftTodo,
    OutlookCalendar,
    Notion,
    Imported,
}

impl TaskSource {
    pub fn from_str(s: &str) -> TaskSource {
        match s {
            "google_calendar" => TaskSource::GoogleCalendar,
            "microsoft_todo" => TaskSource::MicrosoftTodo,
            "outlook_calendar" => TaskSource::OutlookCalendar,
            "notion" => TaskSource::Notion,
            "imported" => TaskSource::Imported,
            _ => TaskSource::Local,
        }
    }
    pub fn to_db_str(&self) -> &'static str {
        match self {
            TaskSource::Local => "local",
            TaskSource::GoogleCalendar => "google_calendar",
            TaskSource::MicrosoftTodo => "microsoft_todo",
            TaskSource::OutlookCalendar => "outlook_calendar",
            TaskSource::Notion => "notion",
            TaskSource::Imported => "imported",
        }
    }
}

/// The canonical Task model (maps 1:1 to the `tasks` table)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub status: TaskStatus,
    pub priority: Priority,
    pub source: TaskSource,

    /// JSON blob: { remote_id, calendar_id, etag, ... } — per-integration metadata
    pub source_metadata: Option<String>,

    // Dates — stored as ISO8601 UTC strings in SQLite (TEXT affinity)
    pub due_at: Option<DateTime<Utc>>,
    pub start_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub reminder_at: Option<DateTime<Utc>>,
    pub snoozed_until: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,

    // Organization
    pub is_archived: bool,
    pub is_pinned: bool,
    pub is_today: bool,
    pub sort_order: i64,
    pub parent_task_id: Option<String>,

    // Extra fields
    pub estimate_minutes: Option<i32>,
    pub notes: Option<String>,
    pub recurrence_rule: Option<String>, // iCal RRULE string
    pub tags: Vec<String>,               // denormalized tag names for fast display
}

impl Task {
    pub fn new(title: String) -> Self {
        let now = Utc::now();
        Task {
            id: Uuid::new_v4().to_string(),
            title,
            description: None,
            status: TaskStatus::Pending,
            priority: Priority::None,
            source: TaskSource::Local,
            source_metadata: None,
            due_at: None,
            start_at: None,
            completed_at: None,
            reminder_at: None,
            snoozed_until: None,
            created_at: now,
            updated_at: now,
            is_archived: false,
            is_pinned: false,
            is_today: false,
            sort_order: now.timestamp_millis(),
            parent_task_id: None,
            estimate_minutes: None,
            notes: None,
            recurrence_rule: None,
            tags: vec![],
        }
    }

    pub fn is_overdue(&self) -> bool {
        if self.status != TaskStatus::Pending {
            return false;
        }
        self.due_at
            .map(|d| d < Utc::now())
            .unwrap_or(false)
    }

    pub fn is_due_today(&self) -> bool {
        #[allow(unused_imports)] use chrono::Datelike;
        let today = Utc::now().date_naive();
        self.due_at
            .map(|d| d.date_naive() == today)
            .unwrap_or(false)
    }
}

/// Input for creating a new task
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTaskInput {
    pub title: String,
    pub description: Option<String>,
    pub priority: Option<Priority>,
    pub due_at: Option<DateTime<Utc>>,
    pub start_at: Option<DateTime<Utc>>,
    pub reminder_at: Option<DateTime<Utc>>,
    pub parent_task_id: Option<String>,
    pub estimate_minutes: Option<i32>,
    pub notes: Option<String>,
    pub recurrence_rule: Option<String>,
    pub tags: Option<Vec<String>>,
    pub is_today: Option<bool>,
}

/// Input for updating an existing task (all fields optional)
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTaskInput {
    pub title: Option<String>,
    pub description: Option<String>,
    pub status: Option<TaskStatus>,
    pub priority: Option<Priority>,
    pub due_at: Option<Option<DateTime<Utc>>>,
    pub start_at: Option<Option<DateTime<Utc>>>,
    pub reminder_at: Option<Option<DateTime<Utc>>>,
    pub snoozed_until: Option<Option<DateTime<Utc>>>,
    pub is_archived: Option<bool>,
    pub is_pinned: Option<bool>,
    pub is_today: Option<bool>,
    pub estimate_minutes: Option<Option<i32>>,
    pub notes: Option<String>,
    pub recurrence_rule: Option<Option<String>>,
    pub tags: Option<Vec<String>>,
    pub sort_order: Option<i64>,
}

/// Query parameters for listing/filtering tasks
#[derive(Debug, Deserialize, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct TaskQuery {
    pub smart_view: Option<String>,  // "inbox" | "today" | "upcoming" | "completed" | ...
    pub status: Option<TaskStatus>,
    pub priority: Option<Priority>,
    pub search: Option<String>,
    pub tag: Option<String>,
    pub parent_task_id: Option<String>,
    pub include_archived: Option<bool>,
    pub sort_by: Option<String>,     // "due_at" | "priority" | "created_at" | "sort_order"
    pub sort_dir: Option<String>,    // "asc" | "desc"
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

/// Reorder payload for drag-and-drop
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReorderTaskInput {
    pub task_id: String,
    pub new_sort_order: i64,
}

/// Bulk action input
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BulkActionInput {
    pub task_ids: Vec<String>,
    pub action: BulkAction,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum BulkAction {
    Complete,
    Archive,
    Delete,
    SetPriority(Priority),
    SetToday(bool),
}
