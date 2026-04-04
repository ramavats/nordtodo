use rusqlite_migration::{Migrations, M};

/// All database migrations in order.
/// Never modify an existing migration — always add new ones.
/// Each M::up() call is idempotent when applied via migrations crate.
pub fn get_migrations() -> Migrations<'static> {
    Migrations::new(vec![
        // --- v1: Core schema ---
        M::up(r#"
            -- Tasks (primary entity)
            CREATE TABLE IF NOT EXISTS tasks (
                id              TEXT PRIMARY KEY NOT NULL,
                title           TEXT NOT NULL,
                description     TEXT,
                status          TEXT NOT NULL DEFAULT 'pending'
                                    CHECK(status IN ('pending','completed','archived','deleted')),
                priority        TEXT NOT NULL DEFAULT 'none'
                                    CHECK(priority IN ('urgent','high','medium','none')),
                source          TEXT NOT NULL DEFAULT 'local',
                source_metadata TEXT,       -- JSON blob

                -- Dates (stored as ISO8601 UTC text)
                due_at          TEXT,
                start_at        TEXT,
                completed_at    TEXT,
                reminder_at     TEXT,
                snoozed_until   TEXT,
                created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
                updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),

                -- Organization
                is_archived     INTEGER NOT NULL DEFAULT 0,
                is_pinned       INTEGER NOT NULL DEFAULT 0,
                is_today        INTEGER NOT NULL DEFAULT 0,
                sort_order      INTEGER NOT NULL DEFAULT 0,
                parent_task_id  TEXT REFERENCES tasks(id) ON DELETE SET NULL,

                -- Extra
                estimate_minutes INTEGER,
                notes           TEXT,
                recurrence_rule TEXT,       -- iCal RRULE string

                -- Sync metadata (future-proof)
                local_version   INTEGER NOT NULL DEFAULT 1,
                remote_version  TEXT,
                sync_status     TEXT NOT NULL DEFAULT 'local_only',
                last_synced_at  TEXT
            );

            -- Indexes for common queries
            CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
            CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON tasks(due_at);
            CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
            CREATE INDEX IF NOT EXISTS idx_tasks_is_today ON tasks(is_today);
            CREATE INDEX IF NOT EXISTS idx_tasks_is_pinned ON tasks(is_pinned);
            CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
            CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_task_id);
            CREATE INDEX IF NOT EXISTS idx_tasks_sort ON tasks(sort_order);
            CREATE INDEX IF NOT EXISTS idx_tasks_title_fts ON tasks(title); -- covered by FTS below

            -- Full-text search via FTS5
            CREATE VIRTUAL TABLE IF NOT EXISTS tasks_fts USING fts5(
                title,
                description,
                notes,
                content='tasks',
                content_rowid='rowid'
            );

            -- FTS triggers to keep index in sync
            CREATE TRIGGER IF NOT EXISTS tasks_ai AFTER INSERT ON tasks BEGIN
                INSERT INTO tasks_fts(rowid, title, description, notes)
                VALUES (new.rowid, new.title, new.description, new.notes);
            END;
            CREATE TRIGGER IF NOT EXISTS tasks_au AFTER UPDATE ON tasks BEGIN
                INSERT INTO tasks_fts(tasks_fts, rowid, title, description, notes)
                VALUES ('delete', old.rowid, old.title, old.description, old.notes);
                INSERT INTO tasks_fts(rowid, title, description, notes)
                VALUES (new.rowid, new.title, new.description, new.notes);
            END;
            CREATE TRIGGER IF NOT EXISTS tasks_ad AFTER DELETE ON tasks BEGIN
                INSERT INTO tasks_fts(tasks_fts, rowid, title, description, notes)
                VALUES ('delete', old.rowid, old.title, old.description, old.notes);
            END;

            -- Tags
            CREATE TABLE IF NOT EXISTS tags (
                id          TEXT PRIMARY KEY NOT NULL,
                name        TEXT NOT NULL UNIQUE,
                color       TEXT,
                created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
            );

            -- Task <-> Tag junction
            CREATE TABLE IF NOT EXISTS task_tags (
                task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
                tag_id  TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
                PRIMARY KEY (task_id, tag_id)
            );
            CREATE INDEX IF NOT EXISTS idx_task_tags_task ON task_tags(task_id);
            CREATE INDEX IF NOT EXISTS idx_task_tags_tag ON task_tags(tag_id);

            -- Reminders
            CREATE TABLE IF NOT EXISTS reminders (
                id          TEXT PRIMARY KEY NOT NULL,
                task_id     TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
                remind_at   TEXT NOT NULL,
                status      TEXT NOT NULL DEFAULT 'pending'
                                CHECK(status IN ('pending','fired','dismissed')),
                created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
            );
            CREATE INDEX IF NOT EXISTS idx_reminders_task ON reminders(task_id);
            CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders(status, remind_at);

            -- User preferences (single-row table)
            CREATE TABLE IF NOT EXISTS preferences (
                id      INTEGER PRIMARY KEY CHECK(id = 1),  -- enforce singleton
                data    TEXT NOT NULL DEFAULT '{}'          -- JSON blob
            );
            INSERT OR IGNORE INTO preferences(id, data) VALUES (1, '{}');

            -- Integration accounts
            CREATE TABLE IF NOT EXISTS integration_accounts (
                id              TEXT PRIMARY KEY NOT NULL,
                provider        TEXT NOT NULL,
                display_name    TEXT NOT NULL,
                email           TEXT,
                status          TEXT NOT NULL DEFAULT 'disconnected',
                credentials_json TEXT,         -- encrypted in production
                last_sync_at    TEXT,
                created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
            );

            -- Imported calendar events
            CREATE TABLE IF NOT EXISTS calendar_events (
                id              TEXT PRIMARY KEY NOT NULL,
                integration_id  TEXT NOT NULL REFERENCES integration_accounts(id) ON DELETE CASCADE,
                remote_id       TEXT NOT NULL,
                title           TEXT NOT NULL,
                description     TEXT,
                start_at        TEXT NOT NULL,
                end_at          TEXT NOT NULL,
                is_all_day      INTEGER NOT NULL DEFAULT 0,
                calendar_name   TEXT,
                linked_task_id  TEXT REFERENCES tasks(id) ON DELETE SET NULL,
                raw_data        TEXT,
                created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
                updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
                UNIQUE(integration_id, remote_id)
            );

            -- Sync queue for pending operations
            CREATE TABLE IF NOT EXISTS sync_queue (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                entity_type     TEXT NOT NULL,
                entity_id       TEXT NOT NULL,
                operation       TEXT NOT NULL CHECK(operation IN ('create','update','delete')),
                integration_id  TEXT NOT NULL,
                payload         TEXT,
                attempts        INTEGER NOT NULL DEFAULT 0,
                last_attempt_at TEXT,
                created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
            );
        "#),

        // --- v2: Updated_at trigger ---
        M::up(r#"
            -- Auto-update updated_at on task change
            CREATE TRIGGER IF NOT EXISTS tasks_updated_at
            AFTER UPDATE ON tasks
            WHEN NEW.updated_at = OLD.updated_at
            BEGIN
                UPDATE tasks SET updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now'),
                                 local_version = OLD.local_version + 1
                WHERE id = NEW.id;
            END;
        "#),
    ])
}
