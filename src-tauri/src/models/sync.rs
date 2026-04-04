use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Sync state metadata attached to each task
/// This enables conflict-free sync without major architectural changes
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncState {
    pub entity_id: String,
    pub entity_type: SyncEntityType,
    pub sync_status: SyncStatus,
    pub last_synced_at: Option<DateTime<Utc>>,
    pub local_version: i64,     // increment on every local mutation
    pub remote_version: Option<String>, // etag/version from provider
    pub conflict_strategy: ConflictStrategy,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SyncEntityType {
    Task,
    Tag,
    Preference,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SyncStatus {
    /// Local only, never synced
    LocalOnly,
    /// Synced and up to date
    Synced,
    /// Pending push to remote
    PendingPush,
    /// Pending pull from remote  
    PendingPull,
    /// Conflict detected, needs resolution
    Conflict,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ConflictStrategy {
    /// Local changes always win
    LocalWins,
    /// Remote changes always win
    RemoteWins,
    /// Last writer wins (based on updated_at)
    LastWriteWins,
    /// User must resolve manually
    Manual,
}

/// Queue item for pending sync operations
/// The sync queue is processed by a background worker when connectivity is available
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncQueueItem {
    pub id: i64,
    pub entity_type: SyncEntityType,
    pub entity_id: String,
    pub operation: SyncOperation,
    pub integration_id: String,
    pub payload: Option<String>, // serialized entity
    pub attempts: i32,
    pub last_attempt_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SyncOperation {
    Create,
    Update,
    Delete,
}
