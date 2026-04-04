use tauri::State;
use crate::db::DbConnection;
use crate::errors::AppError;
use crate::models::task::{Task, TaskQuery};
use crate::repositories::TaskRepository;

/// Global search — queries tasks via FTS5 index
#[tauri::command]
pub fn search_tasks(db: State<DbConnection>, query: String, limit: Option<i64>) -> Result<Vec<Task>, AppError> {
    if query.trim().is_empty() {
        return Ok(vec![]);
    }
    let conn = db.lock().map_err(|_| AppError::Internal("DB lock".to_string()))?;
    let repo = TaskRepository;
    let q = TaskQuery {
        search: Some(query),
        limit: Some(limit.unwrap_or(20)),
        include_archived: Some(false),
        ..Default::default()
    };
    repo.find_all(&conn, &q)
}
