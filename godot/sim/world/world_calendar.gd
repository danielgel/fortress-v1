class_name WorldCalendar
extends RefCounted
## Derives the in-game date from the global tick counter. Port of src/world/calendar.ts.

enum Season { SPRING, SUMMER, AUTUMN, WINTER }

const SEASON_NAMES: Array[String] = ["Spring", "Summer", "Autumn", "Winter"]
const TICKS_PER_HOUR := 25
const HOURS_PER_DAY := 24
const TICKS_PER_DAY := TICKS_PER_HOUR * HOURS_PER_DAY  # 600
const DAYS_PER_SEASON := 12

var tick := 0


func _init(t := 0) -> void:
	tick = t


func day() -> int:
	return tick / TICKS_PER_DAY


func hour() -> int:
	return (tick / TICKS_PER_HOUR) % HOURS_PER_DAY


func day_of_season() -> int:
	return day() % DAYS_PER_SEASON


func season() -> Season:
	return (day() / DAYS_PER_SEASON) % 4 as Season


func year() -> int:
	return 1 + day() / (DAYS_PER_SEASON * 4)


## 0..1 progress through the year, starting at the beginning of spring.
func year_progress() -> float:
	return float(day() % (DAYS_PER_SEASON * 4)) / (DAYS_PER_SEASON * 4)


func is_night() -> bool:
	return hour() < 6 or hour() >= 20


## 0 (full day) .. 1 (deep night), smooth.
func darkness() -> float:
	var h := float(tick) / TICKS_PER_HOUR
	var t := fmod(h, 24) / 24
	return clampf(0.5 + 0.9 * cos(t * PI * 2), 0, 1)


func describe() -> String:
	return "%s %d, Year %d  %02d:00" % [SEASON_NAMES[season()], day_of_season() + 1, year(), hour()]
