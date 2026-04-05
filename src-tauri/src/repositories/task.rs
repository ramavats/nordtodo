use rusqlite::{Connection, params, Row};
use chrono::{DateTime, Utc};
use crate::errors::AppError;
use crate::models::task::{
    Task, TaskStatus, Priority, TaskSource, TaskQuery, UpdateTaskInput,
};

pub struct TaskRepository;

impl TaskRepository {
    /// Map a database row to a Task
    fn row_to_task(row: &Row<'_>) -> rusqlite::Result<Task> {
        let status_str: String = row.get("status")?;
        let priority_str: String = row.get("priority")?;
        let source_str: String = row.get("source")?;

        // Parse optional datetime strings
        let parse_dt = |s: Option<String>| -> Option<DateTime<Utc>> {
            s.and_then(|s| DateTime::parse_from_rfc3339(&s).ok().map(|dt| dt.with_timezone(&Utc)))
        };

        // Tags are stored as comma-separated in a joined column
        let tags_str: Option<String> = row.get("tags").ok();
        let tags = tags_str
            .unwrap_or_default()
            .split(',')
            .filter(|s| !s.is_empty())
            .map(String::from)
            .collect();

        Ok(Task {
            id: row.get("id")?,
            title: row.get("title")?,
            description: row.get("description")?,
            status: TaskStatus::from_str(&status_str),
            priority: Priority::from_str(&priority_str),
            source: TaskSource::from_str(&source_str),
            source_metadata: row.get("source_metadata")?,
            due_at: parse_dt(row.get("due_at").ok().flatten()),
            start_at: parse_dt(row.get("start_at").ok().flatten()),
            completed_at: parse_dt(row.get("completed_at").ok().flatten()),
            reminder_at: parse_dt(row.get("reminder_at").ok().flatten()),
            snoozed_until: parse_dt(row.get("snoozed_until").ok().flatten()),
            created_at: parse_dt(row.get("created_at").ok())
                .unwrap_or_else(Utc::now),
            updated_at: parse_dt(row.get("updated_at").ok())
                .unwrap_or_else(Utc::now),
            is_archived: row.get::<_, i32>("is_archived").map(|v| v != 0).unwrap_or(false),
            is_pinned: row.get::<_, i32>("is_pinned").map(|v| v != 0).unwrap_or(false),
            is_today: row.get::<_, i32>("is_today").map(|v| v != 0).unwrap_or(false),
            sort_order: row.get("sort_order").unwrap_or(0),
            parent_task_id: row.get("parent_task_id").ok().flatten(),
            estimate_minutes: row.get("estimate_minutes").ok().flatten(),
            notes: row.get("notes")?,
            recurrence_rule: row.get("recurrence_rule").ok().flatten(),
            tags,
        })
    }

    /// Insert a new task
    pub fn insert(&self, conn: &Connection, task: &Task) -> Result<(), AppError> {
        conn.execute(
            r#"INSERT INTO tasks (
                id, title, description, status, priority, source, source_metadata,
                due_at, start_at, completed_at, reminder_at, snoozed_until,
                created_at, updated_at, is_archived, is_pinned, is_today,
                sort_order, parent_task_id, estimate_minutes, notes, recurrence_rule
            ) VALUES (
                ?1, ?2, ?3, ?4, ?5, ?6, ?7,
                ?8, ?9, ?10, ?11, ?12,
                ?13, ?14, ?15, ?16, ?17,
                ?18, ?19, ?20, ?21, ?22
            )"#,
            params![
                task.id,
                task.title,
                task.description,
                task.status.to_db_str(),
                task.priority.to_db_str(),
                task.source.to_db_str(),
                task.source_metadata,
                task.due_at.map(|d| d.to_rfc3339()),
                task.start_at.map(|d| d.to_rfc3339()),
                task.completed_at.map(|d| d.to_rfc3339()),
                task.reminder_at.map(|d| d.to_rfc3339()),
                task.snoozed_until.map(|d| d.to_rfc3339()),
                task.created_at.to_rfc3339(),
                task.updated_at.to_rfc3339(),
                task.is_archived as i32,
                task.is_pinned as i32,
                task.is_today as i32,
                task.sort_order,
                task.parent_task_id,
                task.estimate_minutes,
                task.notes,
                task.recurrence_rule,
            ],
        )?;
        Ok(())
    }

    /// Get a task by ID (includes denormalized tags)
    pub fn find_by_id(&self, conn: &Connection, id: &str) -> Result<Task, AppError> {
        let task = conn.query_row(
            r#"SELECT t.*,
                      GROUP_CONCAT(tg.name, ',') as tags
               FROM tasks t
               LEFT JOIN task_tags tt ON tt.task_id = t.id
               LEFT JOIN tags tg ON tg.id = tt.tag_id
               WHERE t.id = ?1 AND t.status != 'deleted'
               GROUP BY t.id"#,
            params![id],
            Self::row_to_task,
        ).map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => AppError::NotFound(format!("Task {id} not found")),
            e => AppError::from(e),
        })?;
        Ok(task)
    }

    /// List tasks with filtering, sorting, and pagination
    pub fn find_all(&self, conn: &Connection, query: &TaskQuery) -> Result<Vec<Task>, AppError> {
        let mut conditions: Vec<String> = vec!["t.status != 'deleted'".to_string()];
        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        // Smart view filter
        if let Some(ref view) = query.smart_view {
            let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
            let _tomorrow = (chrono::Utc::now() + chrono::Duration::days(1))
                .format("%Y-%m-%d").to_string();
            let week_end = (chrono::Utc::now() + chrono::Duration::days(7))
                .format("%Y-%m-%d").to_string();

            match view.as_str() {
                "inbox" => {
                    conditions.push("t.is_archived = 0 AND t.status = 'pending'".to_string());
                }
                "today" => {
                    conditions.push(
                        format!("t.is_archived = 0 AND t.status = 'pending' AND (t.is_today = 1 OR (t.due_at IS NOT NULL AND DATE(t.due_at) <= '{today}'))")
                    );
                }
                "upcoming" => {
                    conditions.push(
                        format!("t.is_archived = 0 AND t.status = 'pending' AND t.due_at IS NOT NULL AND DATE(t.due_at) > '{today}' AND DATE(t.due_at) <= '{week_end}'")
                    );
                }
                "overdue" => {
                    conditions.push(
                        format!("t.is_archived = 0 AND t.status = 'pending' AND t.due_at IS NOT NULL AND DATE(t.due_at) < '{today}'")
                    );
                }
                "completed" => {
                    conditions.push("t.status = 'completed'".to_string());
                }
                "archived" => {
                    conditions.push("t.is_archived = 1 OR t.status = 'archived'".to_string());
                }
                "no_date" => {
                    conditions.push("t.status = 'pending' AND t.due_at IS NULL AND t.is_archived = 0".to_string());
                }
                "flagged" => {
                    conditions.push("t.is_pinned = 1 AND t.status = 'pending'".to_string());
                }
                "all" => {
                    if query.include_archived != Some(true) {
                        conditions.push("t.is_archived = 0 AND t.status != 'archived'".to_string());
                    }
                }
                _ => {}
            }
        }

        // Status filter (overrides smart view if set)
        if let Some(ref status) = query.status {
            conditions.push(format!("t.status = '{}'", status.to_db_str()));
        }

        // Priority filter
        if let Some(ref priority) = query.priority {
            conditions.push(format!("t.priority = '{}'", priority.to_db_str()));
        }

        // Tag filter
        if let Some(ref tag) = query.tag {
            params_vec.push(Box::new(tag.clone()));
            let idx = params_vec.len();
            conditions.push(format!(
                "EXISTS (SELECT 1 FROM task_tags tt2 JOIN tags tg2 ON tg2.id = tt2.tag_id WHERE tt2.task_id = t.id AND tg2.name = ?{idx})"
            ));
        }

        // Parent task filter
        if let Some(ref parent_id) = query.parent_task_id {
            params_vec.push(Box::new(parent_id.clone()));
            let idx = params_vec.len();
            conditions.push(format!("t.parent_task_id = ?{idx}"));
        }

        // Full-text search
        let fts_join = if let Some(ref search) = query.search {
            if !search.trim().is_empty() {
                let search_term = format!("\"{}\"*", search.trim());
                params_vec.push(Box::new(search_term));
                let idx = params_vec.len();
                conditions.push(format!("t.rowid IN (SELECT rowid FROM tasks_fts WHERE tasks_fts MATCH ?{idx})"));
                "".to_string()
            } else {
                "".to_string()
            }
        } else {
            "".to_string()
        };

        let where_clause = if conditions.is_empty() {
            "1=1".to_string()
        } else {
            conditions.join(" AND ")
        };

        // Sort
        let sort_by = query.sort_by.as_deref().unwrap_or("sort_order");
        let sort_dir = query.sort_dir.as_deref().unwrap_or("asc");
        let order_clause = match sort_by {
            "due_at" => format!("t.is_pinned DESC, t.due_at {sort_dir} NULLS LAST, t.sort_order ASC"),
            "priority" => format!("t.is_pinned DESC, CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END {sort_dir}"),
            "created_at" => format!("t.is_pinned DESC, t.created_at {sort_dir}"),
            "title" => format!("t.is_pinned DESC, t.title {sort_dir}"),
            _ => format!("t.is_pinned DESC, t.sort_order {sort_dir}"),
        };

        let limit = query.limit.unwrap_or(1000);
        let offset = query.offset.unwrap_or(0);

        let sql = format!(
            r#"SELECT t.*,
                      GROUP_CONCAT(tg.name, ',') as tags
               FROM tasks t
               LEFT JOIN task_tags tt ON tt.task_id = t.id
               LEFT JOIN tags tg ON tg.id = tt.tag_id
               {fts_join}
               WHERE {where_clause}
               GROUP BY t.id
               ORDER BY {order_clause}
               LIMIT {limit} OFFSET {offset}"#
        );

        let mut stmt = conn.prepare(&sql)?;

        // Build params slice
        let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();

        let tasks = stmt.query_map(params_refs.as_slice(), Self::row_to_task)?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(tasks)
    }

    /// Update a task
    pub fn update(&self, conn: &Connection, id: &str, input: &UpdateTaskInput) -> Result<Task, AppError> {
        // Build partial update
        let mut sets: Vec<String> = vec![];
        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = vec![];

        macro_rules! add_field {
            ($field:expr, $val:expr) => {
                if let Some(v) = $val {
                    params_vec.push(Box::new(v));
                    sets.push(format!("{} = ?{}", $field, params_vec.len()));
                }
            };
        }

        macro_rules! add_nullable_field {
            ($field:expr, $val:expr) => {
                if let Some(v) = $val {
                    params_vec.push(Box::new(v));
                    sets.push(format!("{} = ?{}", $field, params_vec.len()));
                }
            };
        }

        macro_rules! add_opt_field {
            ($field:expr, $val:expr) => {
                if let Some(v) = $val {
                    params_vec.push(Box::new(v.map(|d: DateTime<Utc>| d.to_rfc3339())));
                    sets.push(format!("{} = ?{}", $field, params_vec.len()));
                }
            };
        }

        add_field!("title", input.title.clone());
        add_nullable_field!("description", input.description.clone());
        add_nullable_field!("notes", input.notes.clone());

        if let Some(ref s) = input.status {
            let v = s.to_db_str().to_string();
            params_vec.push(Box::new(v));
            sets.push(format!("status = ?{}", params_vec.len()));

            // Set completed_at when completing
            if s == &TaskStatus::Completed {
                let now = Utc::now().to_rfc3339();
                params_vec.push(Box::new(now));
                sets.push(format!("completed_at = ?{}", params_vec.len()));
            }
        }

        if let Some(ref p) = input.priority {
            let v = p.to_db_str().to_string();
            params_vec.push(Box::new(v));
            sets.push(format!("priority = ?{}", params_vec.len()));
        }

        add_opt_field!("due_at", input.due_at);
        add_opt_field!("start_at", input.start_at);
        add_opt_field!("reminder_at", input.reminder_at);
        add_opt_field!("snoozed_until", input.snoozed_until);

        if let Some(v) = input.is_archived { params_vec.push(Box::new(v as i32)); sets.push(format!("is_archived = ?{}", params_vec.len())); }
        if let Some(v) = input.is_pinned { params_vec.push(Box::new(v as i32)); sets.push(format!("is_pinned = ?{}", params_vec.len())); }
        if let Some(v) = input.is_today { params_vec.push(Box::new(v as i32)); sets.push(format!("is_today = ?{}", params_vec.len())); }
        if let Some(v) = input.sort_order { params_vec.push(Box::new(v)); sets.push(format!("sort_order = ?{}", params_vec.len())); }
        add_nullable_field!("estimate_minutes", input.estimate_minutes);

        if let Some(ref rr) = input.recurrence_rule {
            params_vec.push(Box::new(rr.clone()));
            sets.push(format!("recurrence_rule = ?{}", params_vec.len()));
        }

        if sets.is_empty() {
            return self.find_by_id(conn, id);
        }

        // Local edits to Google-linked tasks should be pushed on next sync.
        sets.push("sync_status = CASE WHEN source = 'google_calendar' THEN 'pending_push' ELSE sync_status END".to_string());

        // Always update updated_at
        let now = Utc::now().to_rfc3339();
        params_vec.push(Box::new(now));
        sets.push(format!("updated_at = ?{}", params_vec.len()));

        params_vec.push(Box::new(id.to_string()));
        let id_idx = params_vec.len();

        let sql = format!("UPDATE tasks SET {} WHERE id = ?{id_idx} AND status != 'deleted'", sets.join(", "));
        let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();

        let affected = conn.execute(&sql, params_refs.as_slice())?;
        if affected == 0 {
            return Err(AppError::NotFound(format!("Task {id} not found")));
        }

        // Update tags if provided
        if let Some(ref tag_names) = input.tags {
            self.sync_tags(conn, id, tag_names)?;
        }

        self.find_by_id(conn, id)
    }

    /// Soft delete a task
    pub fn soft_delete(&self, conn: &Connection, id: &str) -> Result<(), AppError> {
        let affected = conn.execute(
            "UPDATE tasks SET status = 'deleted', updated_at = ?1 WHERE id = ?2",
            params![Utc::now().to_rfc3339(), id],
        )?;
        if affected == 0 {
            return Err(AppError::NotFound(format!("Task {id} not found")));
        }
        Ok(())
    }

    /// Sync tags for a task (delete old, insert new)
    pub fn sync_tags(&self, conn: &Connection, task_id: &str, tag_names: &[String]) -> Result<(), AppError> {
        // Remove all existing tags for this task
        conn.execute("DELETE FROM task_tags WHERE task_id = ?1", params![task_id])?;

        for name in tag_names {
            let name = name.trim();
            if name.is_empty() { continue; }

            // Upsert tag
            conn.execute(
                r#"INSERT INTO tags (id, name) VALUES (?1, ?2)
                   ON CONFLICT(name) DO NOTHING"#,
                params![uuid::Uuid::new_v4().to_string(), name],
            )?;

            // Get tag ID
            let tag_id: String = conn.query_row(
                "SELECT id FROM tags WHERE name = ?1",
                params![name],
                |row| row.get(0),
            )?;

            // Insert junction
            conn.execute(
                "INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?1, ?2)",
                params![task_id, tag_id],
            )?;
        }
        Ok(())
    }

    /// Get task count per smart view (for sidebar badges)
    pub fn get_counts(&self, conn: &Connection) -> Result<serde_json::Value, AppError> {
        let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
        let week_end = (chrono::Utc::now() + chrono::Duration::days(7))
            .format("%Y-%m-%d").to_string();

        let inbox: i64 = conn.query_row(
            "SELECT COUNT(*) FROM tasks WHERE status = 'pending' AND is_archived = 0", [], |r| r.get(0))?;
        let today_count: i64 = conn.query_row(
            &format!("SELECT COUNT(*) FROM tasks WHERE status = 'pending' AND is_archived = 0 AND (is_today = 1 OR (due_at IS NOT NULL AND DATE(due_at) <= '{today}'))"),
            [], |r| r.get(0))?;
        let upcoming: i64 = conn.query_row(
            &format!("SELECT COUNT(*) FROM tasks WHERE status = 'pending' AND is_archived = 0 AND due_at IS NOT NULL AND DATE(due_at) > '{today}' AND DATE(due_at) <= '{week_end}'"),
            [], |r| r.get(0))?;
        let overdue: i64 = conn.query_row(
            &format!("SELECT COUNT(*) FROM tasks WHERE status = 'pending' AND is_archived = 0 AND due_at IS NOT NULL AND DATE(due_at) < '{today}'"),
            [], |r| r.get(0))?;
        let completed: i64 = conn.query_row(
            "SELECT COUNT(*) FROM tasks WHERE status = 'completed'", [], |r| r.get(0))?;
        let flagged: i64 = conn.query_row(
            "SELECT COUNT(*) FROM tasks WHERE is_pinned = 1 AND status = 'pending'", [], |r| r.get(0))?;

        Ok(serde_json::json!({
            "inbox": inbox,
            "today": today_count,
            "upcoming": upcoming,
            "overdue": overdue,
            "completed": completed,
            "flagged": flagged,
        }))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;
    use crate::db::migrations::get_migrations;
    use crate::models::task::{Task, CreateTaskInput, UpdateTaskInput, Priority, TaskStatus};

    fn test_conn() -> Connection {
        let mut conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys=ON;").unwrap();
        let migrations = get_migrations();
        migrations.to_latest(&mut conn).unwrap();
        conn
    }

    #[test]
    fn test_insert_and_find() {
        let conn = test_conn();
        let repo = TaskRepository;
        let task = Task::new("Test task".to_string());
        repo.insert(&conn, &task).unwrap();
        let found = repo.find_by_id(&conn, &task.id).unwrap();
        assert_eq!(found.title, "Test task");
        assert_eq!(found.status, TaskStatus::Pending);
    }

    #[test]
    fn test_update_status() {
        let conn = test_conn();
        let repo = TaskRepository;
        let task = Task::new("Complete me".to_string());
        repo.insert(&conn, &task).unwrap();

        let input = UpdateTaskInput {
            status: Some(TaskStatus::Completed),
            title: None, description: None, priority: None, due_at: None,
            start_at: None, reminder_at: None, snoozed_until: None,
            is_archived: None, is_pinned: None, is_today: None,
            estimate_minutes: None, notes: None, recurrence_rule: None,
            tags: None, sort_order: None,
        };
        let updated = repo.update(&conn, &task.id, &input).unwrap();
        assert_eq!(updated.status, TaskStatus::Completed);
        assert!(updated.completed_at.is_some());
    }

    #[test]
    fn test_soft_delete() {
        let conn = test_conn();
        let repo = TaskRepository;
        let task = Task::new("Delete me".to_string());
        repo.insert(&conn, &task).unwrap();
        repo.soft_delete(&conn, &task.id).unwrap();

        // Should not be findable after soft delete
        let result = repo.find_by_id(&conn, &task.id);
        assert!(result.is_err());
    }

    #[test]
    fn test_get_counts() {
        let conn = test_conn();
        let repo = TaskRepository;
        let mut task = Task::new("Pinned task".to_string());
        task.is_pinned = true;
        repo.insert(&conn, &task).unwrap();

        let counts = repo.get_counts(&conn).unwrap();
        assert_eq!(counts["inbox"], 1);
        assert_eq!(counts["flagged"], 1);
    }
}
