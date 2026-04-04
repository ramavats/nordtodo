use serde::{Deserialize, Serialize};

/// Persisted user preferences (stored as a single JSON row in `preferences` table)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserPreferences {
    pub default_smart_view: String,  // e.g. "inbox"
    pub sidebar_expanded: bool,
    pub sidebar_width: u32,          // px, for future resizable sidebar
    pub reduce_motion: bool,
    pub startup_view: String,        // view to open on launch
    pub theme: String,               // locked to "nord" for now; architected for future
    pub local_only_mode: bool,
    pub first_run_complete: bool,
    pub sort_by: String,
    pub sort_dir: String,
    pub show_completed: bool,
    pub compact_mode: bool,
    #[serde(default)]
    pub auto_sync_seconds: u32,
    #[serde(default)]
    pub google_client_id: String,
    #[serde(default)]
    pub google_client_secret: String,
}

impl Default for UserPreferences {
    fn default() -> Self {
        UserPreferences {
            default_smart_view: "today".to_string(),
            sidebar_expanded: true,
            sidebar_width: 224,
            reduce_motion: false,
            startup_view: "today".to_string(),
            theme: "nord".to_string(),
            local_only_mode: true,
            first_run_complete: false,
            sort_by: "due_at".to_string(),
            sort_dir: "asc".to_string(),
            show_completed: false,
            compact_mode: false,
            auto_sync_seconds: 0,
            google_client_id: String::new(),
            google_client_secret: String::new(),
        }
    }
}

/// Sidebar navigation state — persisted across sessions
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SidebarState {
    pub expanded: bool,
    pub active_section: String,
    pub pinned_tags: Vec<String>,
}

impl Default for SidebarState {
    fn default() -> Self {
        SidebarState {
            expanded: true,
            active_section: "inbox".to_string(),
            pinned_tags: vec![],
        }
    }
}
