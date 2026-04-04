use chrono::Utc;
use rusqlite::Connection;
use crate::errors::AppError;

/// Check for due reminders and return their task IDs.
/// Called periodically from the app's background loop.
pub fn check_due_reminders(conn: &Connection) -> Result<Vec<String>, AppError> {
    let now = Utc::now().to_rfc3339();
    let mut stmt = conn.prepare(
        "SELECT task_id FROM reminders WHERE status = 'pending' AND remind_at <= ?1"
    )?;
    let ids = stmt.query_map([&now], |row| row.get(0))?
        .collect::<Result<Vec<String>, _>>()?;
    Ok(ids)
}

/// Mark a reminder as fired
pub fn fire_reminder(conn: &Connection, reminder_id: &str) -> Result<(), AppError> {
    conn.execute(
        "UPDATE reminders SET status = 'fired' WHERE id = ?1",
        [reminder_id],
    )?;
    Ok(())
}
