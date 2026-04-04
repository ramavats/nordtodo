use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ReminderStatus {
    Pending,
    Fired,
    Dismissed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Reminder {
    pub id: String,
    pub task_id: String,
    pub remind_at: DateTime<Utc>,
    pub status: ReminderStatus,
    pub created_at: DateTime<Utc>,
}

impl Reminder {
    pub fn new(task_id: String, remind_at: DateTime<Utc>) -> Self {
        Reminder {
            id: Uuid::new_v4().to_string(),
            task_id,
            remind_at,
            status: ReminderStatus::Pending,
            created_at: Utc::now(),
        }
    }
}
