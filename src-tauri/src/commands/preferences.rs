use tauri::State;
use crate::db::DbConnection;
use crate::errors::AppError;
use crate::models::preferences::UserPreferences;
use crate::repositories::PreferencesRepository;

#[tauri::command]
pub fn get_preferences(db: State<DbConnection>) -> Result<UserPreferences, AppError> {
    let conn = db.lock().map_err(|_| AppError::Internal("DB lock".to_string()))?;
    PreferencesRepository.get(&conn)
}

#[tauri::command]
pub fn set_preferences(db: State<DbConnection>, prefs: UserPreferences) -> Result<UserPreferences, AppError> {
    let conn = db.lock().map_err(|_| AppError::Internal("DB lock".to_string()))?;
    PreferencesRepository.set(&conn, &prefs)
}

#[tauri::command]
pub fn update_preferences(db: State<DbConnection>, patch: serde_json::Value) -> Result<UserPreferences, AppError> {
    let conn = db.lock().map_err(|_| AppError::Internal("DB lock".to_string()))?;
    PreferencesRepository.update_partial(&conn, patch)
}
