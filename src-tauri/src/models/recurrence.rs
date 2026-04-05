use serde::{Deserialize, Serialize};

/// iCal RRULE-compatible recurrence model
/// We store the raw RRULE string in tasks.recurrence_rule
/// This module provides parsing/serialization helpers

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum RecurrenceFrequency {
    Hourly,
    Daily,
    Weekly,
    Monthly,
    Yearly,
}

impl RecurrenceFrequency {
    pub fn to_rrule(&self) -> &'static str {
        match self {
            RecurrenceFrequency::Hourly => "HOURLY",
            RecurrenceFrequency::Daily => "DAILY",
            RecurrenceFrequency::Weekly => "WEEKLY",
            RecurrenceFrequency::Monthly => "MONTHLY",
            RecurrenceFrequency::Yearly => "YEARLY",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecurrenceRule {
    pub frequency: RecurrenceFrequency,
    pub interval: u32,            // every N days/weeks/months
    pub count: Option<u32>,       // stop after N occurrences
    pub until: Option<String>,    // stop after this date (ISO8601)
    pub by_day: Option<Vec<String>>, // MO,TU,WE... for weekly
    pub by_month_day: Option<Vec<i32>>, // 1-31
}

impl RecurrenceRule {
    /// Serialize to iCal RRULE string format
    /// e.g. "FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR"
    pub fn to_rrule_string(&self) -> String {
        let mut parts = vec![
            format!("FREQ={}", self.frequency.to_rrule()),
            format!("INTERVAL={}", self.interval),
        ];
        if let Some(count) = self.count {
            parts.push(format!("COUNT={}", count));
        }
        if let Some(until) = &self.until {
            parts.push(format!("UNTIL={}", until));
        }
        if let Some(by_day) = &self.by_day {
            parts.push(format!("BYDAY={}", by_day.join(",")));
        }
        if let Some(by_month_day) = &self.by_month_day {
            let days: Vec<String> = by_month_day.iter().map(|d| d.to_string()).collect();
            parts.push(format!("BYMONTHDAY={}", days.join(",")));
        }
        parts.join(";")
    }

    /// Parse from iCal RRULE string
    pub fn from_rrule_string(s: &str) -> Option<RecurrenceRule> {
        let mut freq = None;
        let mut interval = 1u32;
        let mut count = None;
        let mut until = None;
        let mut by_day = None;
        let mut by_month_day = None;

        for part in s.split(';') {
            let mut kv = part.splitn(2, '=');
            let key = kv.next()?;
            let val = kv.next().unwrap_or("");
            match key {
                "FREQ" => {
                    freq = Some(match val {
                        "HOURLY" => RecurrenceFrequency::Hourly,
                        "DAILY" => RecurrenceFrequency::Daily,
                        "WEEKLY" => RecurrenceFrequency::Weekly,
                        "MONTHLY" => RecurrenceFrequency::Monthly,
                        "YEARLY" => RecurrenceFrequency::Yearly,
                        _ => return None,
                    });
                }
                "INTERVAL" => {
                    interval = val.parse().unwrap_or(1);
                }
                "COUNT" => {
                    count = val.parse().ok();
                }
                "UNTIL" => {
                    until = Some(val.to_string());
                }
                "BYDAY" => {
                    by_day = Some(val.split(',').map(String::from).collect());
                }
                "BYMONTHDAY" => {
                    by_month_day =
                        Some(val.split(',').filter_map(|d| d.parse().ok()).collect());
                }
                _ => {}
            }
        }

        Some(RecurrenceRule {
            frequency: freq?,
            interval,
            count,
            until,
            by_day,
            by_month_day,
        })
    }

    /// Human-readable description (e.g. "Every week on Mon, Wed, Fri")
    pub fn human_label(&self) -> String {
        let freq = match self.frequency {
            RecurrenceFrequency::Hourly => "hour",
            RecurrenceFrequency::Daily => "day",
            RecurrenceFrequency::Weekly => "week",
            RecurrenceFrequency::Monthly => "month",
            RecurrenceFrequency::Yearly => "year",
        };
        if self.interval == 1 {
            format!("Every {}", freq)
        } else {
            format!("Every {} {}s", self.interval, freq)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rrule_roundtrip() {
        let rule = RecurrenceRule {
            frequency: RecurrenceFrequency::Weekly,
            interval: 1,
            count: None,
            until: None,
            by_day: Some(vec!["MO".to_string(), "WE".to_string(), "FR".to_string()]),
            by_month_day: None,
        };
        let s = rule.to_rrule_string();
        assert_eq!(s, "FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR");
        let parsed = RecurrenceRule::from_rrule_string(&s).unwrap();
        assert_eq!(parsed.frequency, RecurrenceFrequency::Weekly);
        assert_eq!(parsed.interval, 1);
    }

    #[test]
    fn test_human_label() {
        let rule = RecurrenceRule {
            frequency: RecurrenceFrequency::Daily,
            interval: 1,
            count: None,
            until: None,
            by_day: None,
            by_month_day: None,
        };
        assert_eq!(rule.human_label(), "Every day");
    }

    #[test]
    fn test_parse_hourly_rrule() {
        let parsed = RecurrenceRule::from_rrule_string("FREQ=HOURLY;INTERVAL=1").unwrap();
        assert_eq!(parsed.frequency, RecurrenceFrequency::Hourly);
        assert_eq!(parsed.interval, 1);
    }
}
