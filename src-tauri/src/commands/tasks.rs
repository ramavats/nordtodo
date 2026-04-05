use tauri::State;
use chrono::Utc;
use crate::db::DbConnection;
use crate::errors::AppError;
use crate::models::task::{
    Task, CreateTaskInput, UpdateTaskInput, TaskQuery, BulkActionInput, BulkAction,
    TaskStatus, TaskSource,
};
use crate::services::recurrence_service;
use crate::repositories::TaskRepository;

type DbState<'a> = State<'a, DbConnection>;

/// List tasks with smart view filtering, sorting, and search
#[tauri::command]
pub fn get_tasks(db: DbState, query: TaskQuery) -> Result<Vec<Task>, AppError> {
    let conn = db.lock().map_err(|_| AppError::Internal("DB lock poisoned".to_string()))?;
    let repo = TaskRepository;
    repo.find_all(&conn, &query)
}

/// Get a single task by ID
#[tauri::command]
pub fn get_task(db: DbState, id: String) -> Result<Task, AppError> {
    let conn = db.lock().map_err(|_| AppError::Internal("DB lock poisoned".to_string()))?;
    let repo = TaskRepository;
    repo.find_by_id(&conn, &id)
}

/// Create a new task
#[tauri::command]
pub fn create_task(db: DbState, input: CreateTaskInput) -> Result<Task, AppError> {
    // Validate
    if input.title.trim().is_empty() {
        return Err(AppError::Validation("Task title cannot be empty".to_string()));
    }
    if input.title.len() > 500 {
        return Err(AppError::Validation("Task title too long (max 500 chars)".to_string()));
    }

    let conn = db.lock().map_err(|_| AppError::Internal("DB lock poisoned".to_string()))?;
    let repo = TaskRepository;

    let mut task = Task::new(input.title.trim().to_string());
    task.description = input.description;
    task.priority = input.priority.unwrap_or_default();
    task.due_at = input.due_at;
    task.start_at = input.start_at;
    task.reminder_at = input.reminder_at;
    task.parent_task_id = input.parent_task_id;
    task.estimate_minutes = input.estimate_minutes;
    task.notes = input.notes;
    task.recurrence_rule = input.recurrence_rule;
    task.is_today = input.is_today.unwrap_or(false);
    task.sort_order = chrono::Utc::now().timestamp_millis();

    // Use due_at as sort_order base if set for natural ordering
    if let Some(due) = task.due_at {
        task.sort_order = due.timestamp_millis();
    }

    repo.insert(&conn, &task)?;

    // Sync tags
    if let Some(ref tags) = input.tags {
        if !tags.is_empty() {
            repo.sync_tags(&conn, &task.id, tags)?;
            // Re-fetch to include tags
            return repo.find_by_id(&conn, &task.id);
        }
    }

    Ok(task)
}

/// Update a task
#[tauri::command]
pub fn update_task(db: DbState, id: String, input: UpdateTaskInput) -> Result<Task, AppError> {
    if let Some(ref title) = input.title {
        if title.trim().is_empty() {
            return Err(AppError::Validation("Task title cannot be empty".to_string()));
        }
    }
    let conn = db.lock().map_err(|_| AppError::Internal("DB lock poisoned".to_string()))?;
    let repo = TaskRepository;
    repo.update(&conn, &id, &input)
}

/// Complete a task (shorthand for update_task with status=completed)
#[tauri::command]
pub fn complete_task(db: DbState, id: String) -> Result<Task, AppError> {
    let conn = db.lock().map_err(|_| AppError::Internal("DB lock poisoned".to_string()))?;
    let repo = TaskRepository;
    complete_task_with_recurrence(&conn, &repo, &id)
}

/// Reopen a completed task
#[tauri::command]
pub fn reopen_task(db: DbState, id: String) -> Result<Task, AppError> {
    let conn = db.lock().map_err(|_| AppError::Internal("DB lock poisoned".to_string()))?;
    let repo = TaskRepository;
    let input = UpdateTaskInput {
        status: Some(TaskStatus::Pending),
        title: None, description: None, priority: None, due_at: None,
        start_at: None, reminder_at: None, snoozed_until: None,
        is_archived: None, is_pinned: None, is_today: None,
        estimate_minutes: None, notes: None, recurrence_rule: None,
        tags: None, sort_order: None,
    };
    repo.update(&conn, &id, &input)
}

/// Soft-delete a task
#[tauri::command]
pub fn delete_task(db: DbState, id: String) -> Result<(), AppError> {
    let conn = db.lock().map_err(|_| AppError::Internal("DB lock poisoned".to_string()))?;
    let repo = TaskRepository;
    repo.soft_delete(&conn, &id)
}

/// Duplicate a task (creates a copy with a new ID)
#[tauri::command]
pub fn duplicate_task(db: DbState, id: String) -> Result<Task, AppError> {
    let conn = db.lock().map_err(|_| AppError::Internal("DB lock poisoned".to_string()))?;
    let repo = TaskRepository;

    let original = repo.find_by_id(&conn, &id)?;
    let mut copy = original.clone();
    copy.id = uuid::Uuid::new_v4().to_string();
    copy.title = format!("{} (copy)", original.title);
    copy.status = crate::models::task::TaskStatus::Pending;
    copy.completed_at = None;
    copy.is_pinned = false;
    copy.is_today = false;
    copy.sort_order = chrono::Utc::now().timestamp_millis();
    copy.created_at = chrono::Utc::now();
    copy.updated_at = chrono::Utc::now();

    repo.insert(&conn, &copy)?;
    repo.sync_tags(&conn, &copy.id, &original.tags)?;
    repo.find_by_id(&conn, &copy.id)
}

/// Get task counts for sidebar badges
#[tauri::command]
pub fn get_task_counts(db: DbState) -> Result<serde_json::Value, AppError> {
    let conn = db.lock().map_err(|_| AppError::Internal("DB lock poisoned".to_string()))?;
    let repo = TaskRepository;
    repo.get_counts(&conn)
}

/// Bulk actions on multiple tasks
#[tauri::command]
pub fn bulk_action(db: DbState, input: BulkActionInput) -> Result<i64, AppError> {
    let conn = db.lock().map_err(|_| AppError::Internal("DB lock poisoned".to_string()))?;
    let repo = TaskRepository;

    let _now = chrono::Utc::now().to_rfc3339();
    let mut affected = 0i64;

    for id in &input.task_ids {
        let result = match &input.action {
            BulkAction::Complete => {
                complete_task_with_recurrence(&conn, &repo, id).map(|_| ())
            }
            BulkAction::Archive => {
                let upd = UpdateTaskInput {
                    is_archived: Some(true),
                    status: Some(TaskStatus::Archived),
                    title: None, description: None, priority: None,
                    due_at: None, start_at: None, reminder_at: None,
                    snoozed_until: None, is_pinned: None, is_today: None,
                    estimate_minutes: None, notes: None, recurrence_rule: None,
                    tags: None, sort_order: None,
                };
                repo.update(&conn, id, &upd).map(|_| ())
            }
            BulkAction::Delete => repo.soft_delete(&conn, id),
            BulkAction::SetPriority(p) => {
                let upd = UpdateTaskInput {
                    priority: Some(p.clone()),
                    title: None, description: None, status: None,
                    due_at: None, start_at: None, reminder_at: None,
                    snoozed_until: None, is_archived: None, is_pinned: None,
                    is_today: None, estimate_minutes: None, notes: None,
                    recurrence_rule: None, tags: None, sort_order: None,
                };
                repo.update(&conn, id, &upd).map(|_| ())
            }
            BulkAction::SetToday(v) => {
                let upd = UpdateTaskInput {
                    is_today: Some(*v),
                    title: None, description: None, status: None,
                    priority: None, due_at: None, start_at: None,
                    reminder_at: None, snoozed_until: None, is_archived: None,
                    is_pinned: None, estimate_minutes: None, notes: None,
                    recurrence_rule: None, tags: None, sort_order: None,
                };
                repo.update(&conn, id, &upd).map(|_| ())
            }
        };

        if result.is_ok() {
            affected += 1;
        }
    }

    Ok(affected)
}

fn complete_task_with_recurrence(
    conn: &rusqlite::Connection,
    repo: &TaskRepository,
    id: &str,
) -> Result<Task, AppError> {
    let original = repo.find_by_id(conn, id)?;
    let input = UpdateTaskInput {
        status: Some(TaskStatus::Completed),
        title: None, description: None, priority: None, due_at: None,
        start_at: None, reminder_at: None, snoozed_until: None,
        is_archived: None, is_pinned: None, is_today: None,
        estimate_minutes: None, notes: None, recurrence_rule: None,
        tags: None, sort_order: None,
    };
    let completed = repo.update(conn, id, &input)?;

    // Recurring tasks spawn the next pending occurrence when completed.
    if original.status != TaskStatus::Completed {
        if let Some(next_due) = recurrence_service::next_occurrence(&original) {
            let mut next = original.clone();
            let now = Utc::now();

            next.id = uuid::Uuid::new_v4().to_string();
            next.status = TaskStatus::Pending;
            next.completed_at = None;
            next.due_at = Some(next_due);
            next.created_at = now;
            next.updated_at = now;
            next.sort_order = next_due.timestamp_millis();
            next.is_today = false;

            // Spawned recurrence instances are local canonical tasks and can later sync as creates.
            next.source = TaskSource::Local;
            next.source_metadata = None;

            repo.insert(conn, &next)?;
            if !original.tags.is_empty() {
                repo.sync_tags(conn, &next.id, &original.tags)?;
            }
        }
    }

    Ok(completed)
}
