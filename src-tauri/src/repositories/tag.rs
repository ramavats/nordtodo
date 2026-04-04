use rusqlite::{Connection, params};
use crate::errors::AppError;
use crate::models::tag::{Tag, CreateTagInput, UpdateTagInput};

pub struct TagRepository;

impl TagRepository {
    fn row_to_tag(row: &rusqlite::Row<'_>) -> rusqlite::Result<Tag> {
        let created_str: Option<String> = row.get("created_at").ok();
        let created_at = created_str
            .and_then(|s| chrono::DateTime::parse_from_rfc3339(&s).ok())
            .map(|dt| dt.with_timezone(&chrono::Utc))
            .unwrap_or_else(chrono::Utc::now);

        Ok(Tag {
            id: row.get("id")?,
            name: row.get("name")?,
            color: row.get("color").ok().flatten(),
            created_at,
            task_count: row.get("task_count").ok(),
        })
    }

    pub fn find_all(&self, conn: &Connection) -> Result<Vec<Tag>, AppError> {
        let mut stmt = conn.prepare(
            r#"SELECT t.*,
                      COUNT(tt.task_id) as task_count
               FROM tags t
               LEFT JOIN task_tags tt ON tt.tag_id = t.id
               GROUP BY t.id
               ORDER BY t.name ASC"#,
        )?;
        let tags = stmt.query_map([], Self::row_to_tag)?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(tags)
    }

    pub fn find_by_id(&self, conn: &Connection, id: &str) -> Result<Tag, AppError> {
        conn.query_row(
            r#"SELECT t.*, COUNT(tt.task_id) as task_count
               FROM tags t LEFT JOIN task_tags tt ON tt.tag_id = t.id
               WHERE t.id = ?1 GROUP BY t.id"#,
            params![id],
            Self::row_to_tag,
        ).map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => AppError::NotFound(format!("Tag {id} not found")),
            e => AppError::from(e),
        })
    }

    pub fn create(&self, conn: &Connection, input: &CreateTagInput) -> Result<Tag, AppError> {
        let tag = Tag::new(input.name.clone(), input.color.clone());
        conn.execute(
            "INSERT INTO tags (id, name, color) VALUES (?1, ?2, ?3)",
            params![tag.id, tag.name, tag.color],
        )?;
        self.find_by_id(conn, &tag.id)
    }

    pub fn update(&self, conn: &Connection, id: &str, input: &UpdateTagInput) -> Result<Tag, AppError> {
        let mut sets = vec![];
        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = vec![];

        if let Some(ref name) = input.name {
            params_vec.push(Box::new(name.clone()));
            sets.push(format!("name = ?{}", params_vec.len()));
        }
        if let Some(ref color) = input.color {
            params_vec.push(Box::new(color.clone()));
            sets.push(format!("color = ?{}", params_vec.len()));
        }

        if sets.is_empty() {
            return self.find_by_id(conn, id);
        }

        params_vec.push(Box::new(id.to_string()));
        let idx = params_vec.len();
        let sql = format!("UPDATE tags SET {} WHERE id = ?{idx}", sets.join(", "));
        let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
        conn.execute(&sql, params_refs.as_slice())?;
        self.find_by_id(conn, id)
    }

    pub fn delete(&self, conn: &Connection, id: &str) -> Result<(), AppError> {
        let affected = conn.execute("DELETE FROM tags WHERE id = ?1", params![id])?;
        if affected == 0 {
            return Err(AppError::NotFound(format!("Tag {id} not found")));
        }
        Ok(())
    }
}
