use std::path::PathBuf;

/// Application configuration constants and runtime config.
pub struct AppConfig {
    pub db_path: PathBuf,
    pub app_dir: PathBuf,
    pub log_level: String,
    pub is_dev: bool,
}

impl AppConfig {
    pub fn new(app_dir: PathBuf) -> Self {
        let is_dev = cfg!(debug_assertions);
        let db_path = app_dir.join("nordtodo.db");

        AppConfig {
            db_path,
            app_dir,
            log_level: if is_dev {
                "debug".to_string()
            } else {
                "warn".to_string()
            },
            is_dev,
        }
    }
}

/// Database configuration — connection pool size, timeouts, etc.
pub struct DbConfig {
    pub max_connections: u32,
    pub busy_timeout_ms: u64,
    pub enable_wal: bool,
    pub enable_foreign_keys: bool,
}

impl Default for DbConfig {
    fn default() -> Self {
        DbConfig {
            max_connections: 1, // SQLite performs best single-writer
            busy_timeout_ms: 5000,
            enable_wal: true,
            enable_foreign_keys: true,
        }
    }
}
