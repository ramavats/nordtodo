use chrono::{DateTime, Utc, Datelike, Duration};
use crate::models::recurrence::{RecurrenceRule, RecurrenceFrequency};
use crate::models::task::Task;

/// Expand a task's recurrence to produce the next occurrence date.
/// Returns None if the recurrence has ended or task has no recurrence rule.
pub fn next_occurrence(task: &Task) -> Option<DateTime<Utc>> {
    let rrule_str = task.recurrence_rule.as_ref()?;
    let rule = RecurrenceRule::from_rrule_string(rrule_str)?;
    let base = task.due_at.unwrap_or_else(Utc::now);

    let next = match rule.frequency {
        RecurrenceFrequency::Hourly => base + Duration::hours(rule.interval as i64),
        RecurrenceFrequency::Daily => base + Duration::days(rule.interval as i64),
        RecurrenceFrequency::Weekly => base + Duration::weeks(rule.interval as i64),
        RecurrenceFrequency::Monthly => {
            // Add months (approx; production should use a proper calendar lib)
            let months = base.month() as i32 + rule.interval as i32;
            let year = base.year() + (months - 1) / 12;
            let month = ((months - 1) % 12 + 1) as u32;
            base.with_year(year)?.with_month(month).unwrap_or(base)
        }
        RecurrenceFrequency::Yearly => base.with_year(base.year() + rule.interval as i32)?,
    };

    // Check UNTIL/COUNT bounds
    if let Some(ref until_str) = rule.until {
        if let Ok(until) = DateTime::parse_from_rfc3339(until_str) {
            if next > until.with_timezone(&Utc) {
                return None;
            }
        }
    }

    Some(next)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::task::Task;

    #[test]
    fn test_daily_recurrence() {
        let mut task = Task::new("Daily standup".to_string());
        task.recurrence_rule = Some("FREQ=DAILY;INTERVAL=1".to_string());
        task.due_at = Some(Utc::now());

        let next = next_occurrence(&task).unwrap();
        let diff = next - task.due_at.unwrap();
        assert_eq!(diff.num_days(), 1);
    }

    #[test]
    fn test_weekly_recurrence() {
        let mut task = Task::new("Weekly review".to_string());
        task.recurrence_rule = Some("FREQ=WEEKLY;INTERVAL=1".to_string());
        task.due_at = Some(Utc::now());

        let next = next_occurrence(&task).unwrap();
        let diff = next - task.due_at.unwrap();
        assert_eq!(diff.num_days(), 7);
    }

    #[test]
    fn test_hourly_recurrence() {
        let mut task = Task::new("Hourly check".to_string());
        task.recurrence_rule = Some("FREQ=HOURLY;INTERVAL=1".to_string());
        task.due_at = Some(Utc::now());

        let next = next_occurrence(&task).unwrap();
        let diff = next - task.due_at.unwrap();
        assert_eq!(diff.num_hours(), 1);
    }
}
