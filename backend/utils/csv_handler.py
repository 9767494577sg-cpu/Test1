"""
CSV database utility for FitLife PWA
All data is stored in CSV files in the data/ directory.
"""
import csv
import os
import uuid
from datetime import datetime

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")

SCHEMAS = {
    "users": ["id", "email", "name", "password_hash", "firebase_uid", "avatar",
              "level", "xp", "created_at", "fitness_level"],
    "runs": ["id", "user_id", "date", "distance_km", "duration_sec", "pace",
             "calories", "route_json", "avg_heart_rate"],
    "habits": ["id", "user_id", "name", "icon", "category", "target_days",
               "created_at", "is_active"],
    "habit_logs": ["id", "habit_id", "user_id", "date", "completed"],
    "nutrition": ["id", "user_id", "date", "meal_type", "food_name",
                  "calories", "protein_g", "carbs_g", "fats_g", "water_ml"],
    "sleep": ["id", "user_id", "date", "sleep_time", "wake_time",
              "duration_h", "quality", "notes"],
    "goals": ["id", "user_id", "title", "description", "category",
              "target_value", "current_value", "unit", "deadline", "status", "created_at"],
    "challenges": ["id", "title", "description", "category", "duration_days",
                   "xp_reward", "badge"],
    "user_challenges": ["id", "user_id", "challenge_id", "start_date",
                        "progress", "status", "completed_at"],
    "friends": ["id", "user_id", "friend_id", "status", "created_at"],
    "mood": ["id", "user_id", "date", "mood_score", "mood_label", "notes"],
    "rewards": ["id", "user_id", "type", "title", "points", "earned_at", "redeemed"],
    "badges": ["id", "user_id", "badge_name", "earned_at"],
    "reminders": ["id", "user_id", "type", "title", "time", "days", "enabled"],
    "workout_sessions": ["id", "user_id", "date", "workout_id", "duration_min",
                         "calories", "notes"],
    "chat_messages": ["id", "user_id", "role", "message", "timestamp"],
}

PREDEFINED_CHALLENGES = [
    {"id": "c1", "title": "7-Day Plank Challenge", "description": "Complete a plank every day for 7 days, increasing duration each day", "category": "strength", "duration_days": "7", "xp_reward": "150", "badge": "Plank Master"},
    {"id": "c2", "title": "30-Day Weight Loss", "description": "Follow a structured workout plan for 30 days to achieve weight loss", "category": "cardio", "duration_days": "30", "xp_reward": "500", "badge": "Transformation Hero"},
    {"id": "c3", "title": "Monthly Running Competition", "description": "Run the most kilometers this month and top the leaderboard", "category": "running", "duration_days": "30", "xp_reward": "300", "badge": "Road Warrior"},
    {"id": "c4", "title": "10,000 Steps Daily", "description": "Hit 10,000 steps every day for a week", "category": "walking", "duration_days": "7", "xp_reward": "100", "badge": "Step Champion"},
    {"id": "c5", "title": "21-Day Meditation", "description": "Meditate for at least 10 minutes daily for 21 days", "category": "mental", "duration_days": "21", "xp_reward": "200", "badge": "Zen Master"},
]

def ensure_csv(name):
    """Create CSV file with headers if it doesn't exist."""
    os.makedirs(DATA_DIR, exist_ok=True)
    path = os.path.join(DATA_DIR, f"{name}.csv")
    if not os.path.exists(path):
        with open(path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=SCHEMAS[name])
            writer.writeheader()
        if name == "challenges":
            for ch in PREDEFINED_CHALLENGES:
                write_row("challenges", ch)
    return path

def read_all(name):
    """Read all rows from a CSV file."""
    path = ensure_csv(name)
    with open(path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return list(reader)

def write_row(name, row):
    """Append a row to a CSV file."""
    path = ensure_csv(name)
    with open(path, "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=SCHEMAS[name])
        writer.writerow(row)

def update_rows(name, match_fn, update_fn):
    """Update rows matching match_fn with update_fn."""
    path = ensure_csv(name)
    rows = read_all(name)
    updated = []
    for row in rows:
        if match_fn(row):
            update_fn(row)
        updated.append(row)
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=SCHEMAS[name])
        writer.writeheader()
        writer.writerows(updated)

def delete_rows(name, match_fn):
    """Delete rows matching match_fn."""
    path = ensure_csv(name)
    rows = read_all(name)
    remaining = [r for r in rows if not match_fn(r)]
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=SCHEMAS[name])
        writer.writeheader()
        writer.writerows(remaining)

def find_one(name, match_fn):
    """Find first row matching match_fn."""
    for row in read_all(name):
        if match_fn(row):
            return row
    return None

def find_many(name, match_fn):
    """Find all rows matching match_fn."""
    return [r for r in read_all(name) if match_fn(r)]

def gen_id():
    return str(uuid.uuid4())

def now_iso():
    return datetime.utcnow().isoformat()

def today_str():
    return datetime.utcnow().strftime("%Y-%m-%d")
