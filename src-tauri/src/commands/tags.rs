use tauri::State;
use crate::db::DbConnection;
use crate::errors::AppError;
use crate::models::tag::{Tag, CreateTagInput, UpdateTagInput};
use crate::repositories::TagRepository;

#[tauri::command]
pub fn get_tags(db: State<DbConnection>) -> Result<Vec<Tag>, AppError> {
    let conn = db.lock().map_err(|_| AppError::Internal("DB lock".to_string()))?;
    TagRepository.find_all(&conn)
}

#[tauri::command]
pub fn create_tag(db: State<DbConnection>, input: CreateTagInput) -> Result<Tag, AppError> {
    if input.name.trim().is_empty() {
        return Err(AppError::Validation("Tag name cannot be empty".to_string()));
    }
    let conn = db.lock().map_err(|_| AppError::Internal("DB lock".to_string()))?;
    TagRepository.create(&conn, &input)
}

#[tauri::command]
pub fn update_tag(db: State<DbConnection>, id: String, input: UpdateTagInput) -> Result<Tag, AppError> {
    let conn = db.lock().map_err(|_| AppError::Internal("DB lock".to_string()))?;
    TagRepository.update(&conn, &id, &input)
}

#[tauri::command]
pub fn delete_tag(db: State<DbConnection>, id: String) -> Result<(), AppError> {
    let conn = db.lock().map_err(|_| AppError::Internal("DB lock".to_string()))?;
    TagRepository.delete(&conn, &id)
}
