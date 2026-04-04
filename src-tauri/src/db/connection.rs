use std::path::Path;
use std::sync::{Arc, Mutex};
use rusqlite::Connection;
use crate::errors::AppError;
use crate::db::migrations::get_migrations;

/// Thread-safe database connection wrapper.
/// We use a single connection with WAL mode, which is the correct
/// approach for Tauri's single-user desktop scenario.
pub type DbConnection = Arc<Mutex<Connection>>;

/// Open (or create) the SQLite database and run all pending migrations.
pub fn open_database(db_path: &Path) -> Result<DbConnection, AppError> {
    // Ensure parent directory exists
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| AppError::Io(format!("Failed to create DB directory: {e}")))?;
    }

    let mut conn = Connection::open(db_path)
        .map_err(|e| AppError::Database(format!("Failed to open database: {e}")))?;

    // Enable WAL mode for better concurrent read performance
    conn.execute_batch("PRAGMA journal_mode=WAL;")
        .map_err(|e| AppError::Database(format!("Failed to set WAL mode: {e}")))?;

    // Enable foreign key enforcement
    conn.execute_batch("PRAGMA foreign_keys=ON;")
        .map_err(|e| AppError::Database(format!("Failed to enable foreign keys: {e}")))?;

    // Set busy timeout (5 seconds) to handle any transient locking
    conn.execute_batch("PRAGMA busy_timeout=5000;")
        .map_err(|e| AppError::Database(format!("Failed to set busy timeout: {e}")))?;

    // Run migrations
    let migrations = get_migrations();
    migrations
        .to_latest(&mut conn)
        .map_err(|e| AppError::Migration(e.to_string()))?;

    log::info!("Database initialized at {:?}", db_path);

    Ok(Arc::new(Mutex::new(conn)))
}

/// Seed the database with sample data for development/first run.
pub fn seed_dev_data(db: &DbConnection) -> Result<(), AppError> {
    use crate::models::task::{Task, Priority, TaskStatus};
    use crate::repositories::task::TaskRepository;

    let conn = db.lock().map_err(|_| AppError::Internal("Lock poisoned".to_string()))?;
    let repo = TaskRepository;

    // Check if already seeded
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM tasks", [], |row| row.get(0))
        .map_err(AppError::from)?;

    if count > 0 {
        return Ok(()); // already has data
    }

    drop(conn); // release lock before batch insert

    let now = chrono::Utc::now();
    let yesterday = now - chrono::Duration::days(1);
    let tomorrow = now + chrono::Duration::days(1);
    let next_week = now + chrono::Duration::days(7);

    let mut tasks = vec![
        {
            let mut t = Task::new("Review Q2 roadmap with engineering team".to_string());
            t.priority = Priority::High;
            t.is_today = true;
            t.due_at = Some(now);
            t.notes = Some("Focus on mobile priorities and tech debt backlog".to_string());
            t
        },
        {
            let mut t = Task::new("Write architecture docs for sync module".to_string());
            t.priority = Priority::Medium;
            t.is_today = true;
            t.due_at = Some(tomorrow);
            t
        },
        {
            let mut t = Task::new("Set up CI pipeline for the monorepo".to_string());
            t.priority = Priority::High;
            t.due_at = Some(tomorrow);
            t
        },
        {
            let mut t = Task::new("Respond to PR reviews on frontend".to_string());
            t.priority = Priority::Urgent;
            t.is_today = true;
            t.due_at = Some(yesterday); // overdue!
            t
        },
        {
            let mut t = Task::new("Buy groceries".to_string());
            t.priority = Priority::None;
            t
        },
        {
            let mut t = Task::new("Read chapter 4 of The Pragmatic Programmer".to_string());
            t.due_at = Some(next_week);
            t.estimate_minutes = Some(90);
            t
        },
        {
            let mut t = Task::new("Renew domain name nordtodo.app".to_string());
            t.due_at = Some(next_week);
            t.priority = Priority::Medium;
            t
        },
        {
            let mut t = Task::new("Record intro video for Polkadot hackathon submission".to_string());
            t.priority = Priority::High;
            t.due_at = Some(next_week);
            t
        },
        {
            let mut t = Task::new("Call mom on Sunday".to_string());
            t.recurrence_rule = Some("FREQ=WEEKLY;INTERVAL=1;BYDAY=SU".to_string());
            t
        },
        {
            let mut t = Task::new("Weekly review".to_string());
            t.recurrence_rule = Some("FREQ=WEEKLY;INTERVAL=1;BYDAY=FR".to_string());
            t.notes = Some("Review what I accomplished and plan next week".to_string());
            t
        },
    ];

    // Mark one as completed
    let mut completed_task = Task::new("Set up Tauri dev environment".to_string());
    completed_task.status = TaskStatus::Completed;
    completed_task.completed_at = Some(yesterday);
    tasks.push(completed_task);

    let conn = db.lock().map_err(|_| AppError::Internal("Lock poisoned".to_string()))?;
    for task in &tasks {
        repo.insert(&conn, task)?;
    }
    log::info!("Seeded {} dev tasks", tasks.len());

    Ok(())
}
