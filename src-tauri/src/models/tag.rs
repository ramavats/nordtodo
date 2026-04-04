use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub color: Option<String>, // hex color for display
    pub created_at: DateTime<Utc>,
    pub task_count: Option<i64>, // populated via JOIN in queries
}

impl Tag {
    pub fn new(name: String, color: Option<String>) -> Self {
        Tag {
            id: Uuid::new_v4().to_string(),
            name,
            color,
            created_at: Utc::now(),
            task_count: None,
        }
    }
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTagInput {
    pub name: String,
    pub color: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTagInput {
    pub name: Option<String>,
    pub color: Option<String>,
}
