use tauri::State;
use crate::db::DbConnection;
use crate::errors::AppError;
use crate::models::task::{Task, TaskQuery};
use crate::repositories::TaskRepository;

/// Export all tasks as JSON string (for import/backup)
#[tauri::command]
pub fn export_tasks_json(db: State<DbConnection>) -> Result<String, AppError> {
    let conn = db.lock().map_err(|_| AppError::Internal("DB lock".to_string()))?;
    let repo = TaskRepository;
    let query = TaskQuery {
        include_archived: Some(true),
        ..Default::default()
    };
    let tasks = repo.find_all(&conn, &query)?;
    serde_json::to_string_pretty(&tasks).map_err(AppError::from)
}

/// Import tasks from JSON string (from backup or another device)
/// This is additive — it inserts tasks that don't exist yet (by ID).
#[tauri::command]
pub fn import_tasks_json(db: State<DbConnection>, json: String) -> Result<i64, AppError> {
    let tasks: Vec<Task> = serde_json::from_str(&json)?;
    let conn = db.lock().map_err(|_| AppError::Internal("DB lock".to_string()))?;
    let repo = TaskRepository;

    let mut imported = 0i64;
    for task in &tasks {
        // Only insert if not already present
        let exists: bool = conn.query_row(
            "SELECT COUNT(*) FROM tasks WHERE id = ?1",
            rusqlite::params![task.id],
            |row| row.get::<_, i64>(0),
        ).map(|c| c > 0).unwrap_or(false);

        if !exists {
            repo.insert(&conn, task)?;
            if !task.tags.is_empty() {
                repo.sync_tags(&conn, &task.id, &task.tags)?;
            }
            imported += 1;
        }
    }

    Ok(imported)
}
