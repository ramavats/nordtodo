use rusqlite::{Connection, params};
use crate::errors::AppError;
use crate::models::preferences::UserPreferences;

pub struct PreferencesRepository;

impl PreferencesRepository {
    pub fn get(&self, conn: &Connection) -> Result<UserPreferences, AppError> {
        let data: String = conn.query_row(
            "SELECT data FROM preferences WHERE id = 1",
            [],
            |row| row.get(0),
        ).map_err(AppError::from)?;

        let prefs = if data.trim() == "{}" || data.is_empty() {
            UserPreferences::default()
        } else {
            serde_json::from_str(&data)
                .unwrap_or_else(|_| UserPreferences::default())
        };

        Ok(prefs)
    }

    pub fn set(&self, conn: &Connection, prefs: &UserPreferences) -> Result<UserPreferences, AppError> {
        let data = serde_json::to_string(prefs)?;
        conn.execute(
            "INSERT INTO preferences (id, data) VALUES (1, ?1)
             ON CONFLICT(id) DO UPDATE SET data = excluded.data",
            params![data],
        )?;
        Ok(prefs.clone())
    }

    pub fn update_partial(&self, conn: &Connection, patch: serde_json::Value) -> Result<UserPreferences, AppError> {
        let mut current = self.get(conn)?;
        let mut current_val = serde_json::to_value(&current)?;

        // Merge patch into current value
        if let (Some(obj), serde_json::Value::Object(patch_map)) = (current_val.as_object_mut(), &patch) {
            for (k, v) in patch_map {
                obj.insert(k.clone(), v.clone());
            }
        }

        current = serde_json::from_value(current_val)?;
        self.set(conn, &current)
    }
}
