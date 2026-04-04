// Service layer — business logic that spans multiple repositories or models.
// Currently thin; grows as features expand (recurrence expansion, reminders, etc.)

pub mod recurrence_service;
pub mod reminder_service;
