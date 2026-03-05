"""
FitLife PWA - Flask Backend
Serves the frontend and provides REST API endpoints.
Database: CSV files
Auth: JWT (with optional Firebase token support)
"""
import os
import sys
import json
from datetime import datetime
from functools import wraps

from flask import Flask, jsonify, request, send_from_directory, abort
from flask_cors import CORS

sys.path.insert(0, os.path.dirname(__file__))
from utils.csv_handler import (
    read_all, write_row, update_rows, delete_rows, find_one, find_many,
    gen_id, now_iso, today_str, PREDEFINED_CHALLENGES
)
from utils.auth import (
    hash_password, verify_password, generate_jwt, decode_jwt
)
from utils.ai_coach import (
    get_daily_suggestion, get_daily_quote, get_ai_plan, get_coach_response,
    WORKOUT_LIBRARY, BREATHING_EXERCISES
)

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path="")

_ALLOWED_ORIGINS = ["https://sushantfit.com", "https://www.sushantfit.com"]
if os.environ.get("FLASK_ENV", "development") != "production":
    _ALLOWED_ORIGINS += ["http://localhost:5000", "http://127.0.0.1:5000"]

CORS(app, resources={r"/api/*": {"origins": _ALLOWED_ORIGINS}})

# ---------------------------------------------------------------------------
# Auth middleware
# ---------------------------------------------------------------------------

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return jsonify({"error": "Authorization required"}), 401
        token = auth.split(" ", 1)[1]
        try:
            payload = decode_jwt(token)
        except Exception:
            return jsonify({"error": "Invalid or expired token"}), 401
        request.user_id = payload["sub"]
        request.user_email = payload.get("email", "")
        return f(*args, **kwargs)
    return decorated


# ---------------------------------------------------------------------------
# Frontend serving
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    return send_from_directory(FRONTEND_DIR, "index.html")

@app.route("/<path:path>")
def static_files(path):
    full = os.path.join(FRONTEND_DIR, path)
    if os.path.isfile(full):
        return send_from_directory(FRONTEND_DIR, path)
    return send_from_directory(FRONTEND_DIR, "index.html")


# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------

@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    name = (data.get("name") or "User").strip()

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    existing = find_one("users", lambda r: r["email"] == email)
    if existing:
        return jsonify({"error": "Email already registered"}), 409

    user_id = gen_id()
    user = {
        "id": user_id,
        "email": email,
        "name": name,
        "password_hash": hash_password(password),
        "firebase_uid": "",
        "avatar": "🏃",
        "level": "1",
        "xp": "0",
        "created_at": now_iso(),
        "fitness_level": data.get("fitness_level", "beginner"),
    }
    write_row("users", user)
    token = generate_jwt(user_id, email)
    return jsonify({"token": token, "user": _safe_user(user)}), 201


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    user = find_one("users", lambda r: r["email"] == email)
    if not user or not verify_password(password, user["password_hash"]):
        return jsonify({"error": "Invalid email or password"}), 401

    token = generate_jwt(user["id"], email)
    return jsonify({"token": token, "user": _safe_user(user)})


@app.route("/api/auth/firebase", methods=["POST"])
def firebase_auth():
    """Login/register via Firebase ID token."""
    data = request.get_json() or {}
    firebase_uid = data.get("uid") or ""
    email = (data.get("email") or "").strip().lower()
    name = data.get("name") or "User"

    if not firebase_uid or not email:
        return jsonify({"error": "uid and email required"}), 400

    user = find_one("users", lambda r: r.get("firebase_uid") == firebase_uid or r["email"] == email)
    if not user:
        user_id = gen_id()
        user = {
            "id": user_id, "email": email, "name": name,
            "password_hash": "", "firebase_uid": firebase_uid,
            "avatar": "🏃", "level": "1", "xp": "0",
            "created_at": now_iso(), "fitness_level": "beginner",
        }
        write_row("users", user)
    elif user.get("firebase_uid") != firebase_uid:
        update_rows("users", lambda r: r["id"] == user["id"],
                    lambda r: r.update({"firebase_uid": firebase_uid}))

    token = generate_jwt(user["id"], email)
    return jsonify({"token": token, "user": _safe_user(user)})


@app.route("/api/auth/me", methods=["GET"])
@require_auth
def get_me():
    user = find_one("users", lambda r: r["id"] == request.user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(_safe_user(user))


@app.route("/api/auth/me", methods=["PUT"])
@require_auth
def update_me():
    data = request.get_json() or {}
    allowed = ["name", "avatar", "fitness_level"]
    update_rows("users", lambda r: r["id"] == request.user_id,
                lambda r: r.update({k: v for k, v in data.items() if k in allowed}))
    user = find_one("users", lambda r: r["id"] == request.user_id)
    return jsonify(_safe_user(user))


def _safe_user(u):
    return {k: v for k, v in u.items() if k not in ("password_hash",)}


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

@app.route("/api/dashboard", methods=["GET"])
@require_auth
def dashboard():
    uid = request.user_id
    today = today_str()

    # Runs today
    runs_today = find_many("runs", lambda r: r["user_id"] == uid and r["date"] == today)
    total_distance = sum(float(r.get("distance_km") or 0) for r in runs_today)
    total_calories_run = sum(float(r.get("calories") or 0) for r in runs_today)

    # Nutrition today
    nutrition_today = find_many("nutrition", lambda r: r["user_id"] == uid and r["date"] == today)
    total_calories_food = sum(float(n.get("calories") or 0) for n in nutrition_today)
    total_water = sum(float(n.get("water_ml") or 0) for n in nutrition_today)

    # Mood today
    mood_today = find_many("mood", lambda r: r["user_id"] == uid and r["date"] == today)
    mood = mood_today[-1] if mood_today else None

    # Habits today
    habits = find_many("habits", lambda r: r["user_id"] == uid and r["is_active"] == "True")
    habit_logs_today = find_many("habit_logs", lambda r: r["user_id"] == uid and r["date"] == today and r["completed"] == "True")
    completed_habit_ids = {h["habit_id"] for h in habit_logs_today}

    # Streak
    streak = _calculate_streak(uid)

    # User info for XP/level
    user = find_one("users", lambda r: r["id"] == uid)
    xp = int(user.get("xp") or 0)
    level = int(user.get("level") or 1)

    # Weekly runs
    weekly_runs = _get_weekly_runs(uid)

    return jsonify({
        "today": {
            "distance_km": round(total_distance, 2),
            "calories_burned": round(total_calories_run),
            "calories_food": round(total_calories_food),
            "water_ml": round(total_water),
            "mood": mood,
            "habits_total": len(habits),
            "habits_completed": len(completed_habit_ids),
        },
        "streak": streak,
        "xp": xp,
        "level": level,
        "weekly_runs": weekly_runs,
        "quote": get_daily_quote(),
    })


def _calculate_streak(user_id):
    from datetime import date, timedelta
    logs = find_many("habit_logs", lambda r: r["user_id"] == user_id and r["completed"] == "True")
    dates = sorted({l["date"] for l in logs}, reverse=True)
    if not dates:
        return 0
    streak = 0
    current = date.today()
    for d_str in dates:
        try:
            d = date.fromisoformat(d_str)
        except ValueError:
            continue
        if d == current:
            streak += 1
            current -= timedelta(days=1)
        elif d == current - timedelta(days=0):
            pass
        else:
            break
    return streak


def _get_weekly_runs(user_id):
    from datetime import date, timedelta
    result = []
    for i in range(6, -1, -1):
        d = (date.today() - timedelta(days=i)).isoformat()
        runs = find_many("runs", lambda r, _d=d: r["user_id"] == user_id and r["date"] == _d)
        result.append({
            "date": d,
            "distance_km": round(sum(float(r.get("distance_km") or 0) for r in runs), 2),
            "calories": round(sum(float(r.get("calories") or 0) for r in runs)),
        })
    return result


# ---------------------------------------------------------------------------
# Running Tracker
# ---------------------------------------------------------------------------

@app.route("/api/runs", methods=["GET"])
@require_auth
def get_runs():
    uid = request.user_id
    runs = find_many("runs", lambda r: r["user_id"] == uid)
    runs.sort(key=lambda r: r.get("date", ""), reverse=True)
    return jsonify(runs)


@app.route("/api/runs", methods=["POST"])
@require_auth
def add_run():
    uid = request.user_id
    data = request.get_json() or {}
    dist = float(data.get("distance_km") or 0)
    duration = float(data.get("duration_sec") or 0)
    pace = round(duration / 60 / dist, 2) if dist > 0 else 0
    calories = round(dist * 70)  # ~70 kcal per km (rough estimate)

    run = {
        "id": gen_id(),
        "user_id": uid,
        "date": data.get("date") or today_str(),
        "distance_km": str(round(dist, 2)),
        "duration_sec": str(round(duration)),
        "pace": str(pace),
        "calories": str(calories),
        "route_json": json.dumps(data.get("route") or []),
        "avg_heart_rate": str(data.get("avg_heart_rate") or 0),
    }
    write_row("runs", run)
    _award_xp(uid, 20, "Run logged")
    return jsonify(run), 201


@app.route("/api/runs/personal-bests", methods=["GET"])
@require_auth
def personal_bests():
    runs = find_many("runs", lambda r: r["user_id"] == request.user_id)
    if not runs:
        return jsonify({})
    best_dist = max(runs, key=lambda r: float(r.get("distance_km") or 0))
    fastest = min((r for r in runs if float(r.get("distance_km") or 0) >= 1),
                  key=lambda r: float(r.get("pace") or 9999), default=None)
    return jsonify({
        "best_distance": best_dist,
        "fastest_pace": fastest,
        "total_runs": len(runs),
        "total_distance": round(sum(float(r.get("distance_km") or 0) for r in runs), 2),
    })


# ---------------------------------------------------------------------------
# Habits
# ---------------------------------------------------------------------------

@app.route("/api/habits", methods=["GET"])
@require_auth
def get_habits():
    uid = request.user_id
    habits = find_many("habits", lambda r: r["user_id"] == uid and r["is_active"] == "True")
    today = today_str()
    logs = find_many("habit_logs", lambda r: r["user_id"] == uid and r["date"] == today)
    completed = {l["habit_id"] for l in logs if l["completed"] == "True"}
    for h in habits:
        h["completed_today"] = h["id"] in completed
        h["streak"] = _habit_streak(h["id"], uid)
    return jsonify(habits)


@app.route("/api/habits", methods=["POST"])
@require_auth
def create_habit():
    data = request.get_json() or {}
    habit = {
        "id": gen_id(),
        "user_id": request.user_id,
        "name": data.get("name") or "New Habit",
        "icon": data.get("icon") or "✅",
        "category": data.get("category") or "general",
        "target_days": str(data.get("target_days") or 7),
        "created_at": now_iso(),
        "is_active": "True",
    }
    write_row("habits", habit)
    return jsonify(habit), 201


@app.route("/api/habits/<habit_id>/log", methods=["POST"])
@require_auth
def log_habit(habit_id):
    uid = request.user_id
    data = request.get_json() or {}
    date = data.get("date") or today_str()
    completed = str(data.get("completed", True))

    existing = find_one("habit_logs",
                        lambda r: r["habit_id"] == habit_id and r["user_id"] == uid and r["date"] == date)
    if existing:
        update_rows("habit_logs",
                    lambda r: r["habit_id"] == habit_id and r["user_id"] == uid and r["date"] == date,
                    lambda r: r.update({"completed": completed}))
    else:
        write_row("habit_logs", {
            "id": gen_id(), "habit_id": habit_id, "user_id": uid,
            "date": date, "completed": completed,
        })

    if completed == "True":
        _award_xp(uid, 10, "Habit completed")

    return jsonify({"status": "ok", "completed": completed == "True"})


@app.route("/api/habits/<habit_id>", methods=["DELETE"])
@require_auth
def delete_habit(habit_id):
    update_rows("habits",
                lambda r: r["id"] == habit_id and r["user_id"] == request.user_id,
                lambda r: r.update({"is_active": "False"}))
    return jsonify({"status": "deleted"})


@app.route("/api/habits/stats", methods=["GET"])
@require_auth
def habit_stats():
    uid = request.user_id
    habits = find_many("habits", lambda r: r["user_id"] == uid and r["is_active"] == "True")
    logs = find_many("habit_logs", lambda r: r["user_id"] == uid and r["completed"] == "True")
    total_completions = len(logs)
    by_habit = {}
    for h in habits:
        hc = len([l for l in logs if l["habit_id"] == h["id"]])
        by_habit[h["name"]] = hc
    return jsonify({"total_completions": total_completions, "by_habit": by_habit})


def _habit_streak(habit_id, user_id):
    from datetime import date, timedelta
    logs = find_many("habit_logs",
                     lambda r: r["habit_id"] == habit_id and r["user_id"] == user_id and r["completed"] == "True")
    dates = sorted({l["date"] for l in logs}, reverse=True)
    if not dates:
        return 0
    streak = 0
    current = date.today()
    for d_str in dates:
        try:
            d = date.fromisoformat(d_str)
        except ValueError:
            continue
        if d == current:
            streak += 1
            current -= timedelta(days=1)
        else:
            break
    return streak


# ---------------------------------------------------------------------------
# Habit Suggestions
# ---------------------------------------------------------------------------

@app.route("/api/suggestions", methods=["GET"])
@require_auth
def suggestions():
    uid = request.user_id
    user = find_one("users", lambda r: r["id"] == uid)
    fitness_level = user.get("fitness_level", "beginner") if user else "beginner"

    today = today_str()
    logs = find_many("habit_logs", lambda r: r["user_id"] == uid and r["date"] == today and r["completed"] == "True")
    habit_names = []
    for l in logs:
        h = find_one("habits", lambda r, hid=l["habit_id"]: r["id"] == hid)
        if h:
            habit_names.append(h["name"])

    suggs = get_daily_suggestion(fitness_level, habit_names)
    return jsonify({"suggestions": suggs, "quote": get_daily_quote()})


# ---------------------------------------------------------------------------
# Nutrition
# ---------------------------------------------------------------------------

@app.route("/api/nutrition", methods=["GET"])
@require_auth
def get_nutrition():
    uid = request.user_id
    date = request.args.get("date") or today_str()
    entries = find_many("nutrition", lambda r: r["user_id"] == uid and r["date"] == date)
    totals = {
        "calories": round(sum(float(e.get("calories") or 0) for e in entries)),
        "protein_g": round(sum(float(e.get("protein_g") or 0) for e in entries), 1),
        "carbs_g": round(sum(float(e.get("carbs_g") or 0) for e in entries), 1),
        "fats_g": round(sum(float(e.get("fats_g") or 0) for e in entries), 1),
        "water_ml": round(sum(float(e.get("water_ml") or 0) for e in entries)),
    }
    return jsonify({"entries": entries, "totals": totals})


@app.route("/api/nutrition", methods=["POST"])
@require_auth
def add_nutrition():
    data = request.get_json() or {}
    entry = {
        "id": gen_id(),
        "user_id": request.user_id,
        "date": data.get("date") or today_str(),
        "meal_type": data.get("meal_type") or "snack",
        "food_name": data.get("food_name") or "Food",
        "calories": str(data.get("calories") or 0),
        "protein_g": str(data.get("protein_g") or 0),
        "carbs_g": str(data.get("carbs_g") or 0),
        "fats_g": str(data.get("fats_g") or 0),
        "water_ml": str(data.get("water_ml") or 0),
    }
    write_row("nutrition", entry)
    return jsonify(entry), 201


@app.route("/api/nutrition/<entry_id>", methods=["DELETE"])
@require_auth
def delete_nutrition(entry_id):
    delete_rows("nutrition",
                lambda r: r["id"] == entry_id and r["user_id"] == request.user_id)
    return jsonify({"status": "deleted"})


# ---------------------------------------------------------------------------
# Sleep
# ---------------------------------------------------------------------------

@app.route("/api/sleep", methods=["GET"])
@require_auth
def get_sleep():
    uid = request.user_id
    entries = find_many("sleep", lambda r: r["user_id"] == uid)
    entries.sort(key=lambda r: r.get("date", ""), reverse=True)
    return jsonify(entries[:30])


@app.route("/api/sleep", methods=["POST"])
@require_auth
def add_sleep():
    data = request.get_json() or {}
    sleep_time = data.get("sleep_time") or "22:00"
    wake_time = data.get("wake_time") or "06:00"
    try:
        from datetime import datetime as dt
        s = dt.strptime(sleep_time, "%H:%M")
        w = dt.strptime(wake_time, "%H:%M")
        diff = (w - s).seconds / 3600
        if diff < 0:
            diff += 24
    except Exception:
        diff = 0

    entry = {
        "id": gen_id(),
        "user_id": request.user_id,
        "date": data.get("date") or today_str(),
        "sleep_time": sleep_time,
        "wake_time": wake_time,
        "duration_h": str(round(diff, 1)),
        "quality": str(data.get("quality") or 3),
        "notes": data.get("notes") or "",
    }
    write_row("sleep", entry)
    return jsonify(entry), 201


# ---------------------------------------------------------------------------
# Mood
# ---------------------------------------------------------------------------

@app.route("/api/mood", methods=["GET"])
@require_auth
def get_mood():
    uid = request.user_id
    entries = find_many("mood", lambda r: r["user_id"] == uid)
    entries.sort(key=lambda r: r.get("date", ""), reverse=True)
    return jsonify(entries[:30])


@app.route("/api/mood", methods=["POST"])
@require_auth
def log_mood():
    data = request.get_json() or {}
    MOOD_LABELS = {1: "😢 Terrible", 2: "😞 Bad", 3: "😐 Neutral", 4: "😊 Good", 5: "😄 Excellent"}
    score = int(data.get("mood_score") or 3)
    entry = {
        "id": gen_id(),
        "user_id": request.user_id,
        "date": data.get("date") or today_str(),
        "mood_score": str(score),
        "mood_label": MOOD_LABELS.get(score, "😐 Neutral"),
        "notes": data.get("notes") or "",
    }
    write_row("mood", entry)
    return jsonify(entry), 201


# ---------------------------------------------------------------------------
# Goals
# ---------------------------------------------------------------------------

@app.route("/api/goals", methods=["GET"])
@require_auth
def get_goals():
    goals = find_many("goals", lambda r: r["user_id"] == request.user_id)
    goals.sort(key=lambda r: r.get("created_at", ""), reverse=True)
    return jsonify(goals)


@app.route("/api/goals", methods=["POST"])
@require_auth
def create_goal():
    data = request.get_json() or {}
    goal = {
        "id": gen_id(),
        "user_id": request.user_id,
        "title": data.get("title") or "New Goal",
        "description": data.get("description") or "",
        "category": data.get("category") or "general",
        "target_value": str(data.get("target_value") or 0),
        "current_value": "0",
        "unit": data.get("unit") or "",
        "deadline": data.get("deadline") or "",
        "status": "active",
        "created_at": now_iso(),
    }
    write_row("goals", goal)
    return jsonify(goal), 201


@app.route("/api/goals/<goal_id>", methods=["PUT"])
@require_auth
def update_goal(goal_id):
    data = request.get_json() or {}
    allowed = ["current_value", "status", "title", "description", "deadline"]
    update_rows("goals",
                lambda r: r["id"] == goal_id and r["user_id"] == request.user_id,
                lambda r: r.update({k: str(v) for k, v in data.items() if k in allowed}))
    goal = find_one("goals", lambda r: r["id"] == goal_id)
    return jsonify(goal)


@app.route("/api/goals/<goal_id>", methods=["DELETE"])
@require_auth
def delete_goal(goal_id):
    delete_rows("goals", lambda r: r["id"] == goal_id and r["user_id"] == request.user_id)
    return jsonify({"status": "deleted"})


# ---------------------------------------------------------------------------
# Challenges
# ---------------------------------------------------------------------------

@app.route("/api/challenges", methods=["GET"])
@require_auth
def get_challenges():
    all_ch = read_all("challenges")
    uid = request.user_id
    user_challenges = find_many("user_challenges", lambda r: r["user_id"] == uid)
    uc_map = {uc["challenge_id"]: uc for uc in user_challenges}
    result = []
    for ch in all_ch:
        ch["user_status"] = uc_map.get(ch["id"], {}).get("status", "not_started")
        ch["user_progress"] = uc_map.get(ch["id"], {}).get("progress", "0")
        result.append(ch)
    return jsonify(result)


@app.route("/api/challenges/<challenge_id>/join", methods=["POST"])
@require_auth
def join_challenge(challenge_id):
    uid = request.user_id
    existing = find_one("user_challenges",
                        lambda r: r["user_id"] == uid and r["challenge_id"] == challenge_id)
    if existing:
        return jsonify({"error": "Already joined"}), 409

    write_row("user_challenges", {
        "id": gen_id(), "user_id": uid, "challenge_id": challenge_id,
        "start_date": today_str(), "progress": "0",
        "status": "in_progress", "completed_at": "",
    })
    return jsonify({"status": "joined"})


@app.route("/api/challenges/<challenge_id>/progress", methods=["PUT"])
@require_auth
def update_challenge_progress(challenge_id):
    uid = request.user_id
    data = request.get_json() or {}
    progress = str(data.get("progress") or 0)

    ch = find_one("challenges", lambda r: r["id"] == challenge_id)
    status = "in_progress"
    completed_at = ""
    if ch and int(progress) >= int(ch.get("duration_days") or 0):
        status = "completed"
        completed_at = now_iso()
        xp = int(ch.get("xp_reward") or 0)
        _award_xp(uid, xp, f"Completed challenge: {ch['title']}")
        badge = ch.get("badge") or ""
        if badge:
            _award_badge(uid, badge)

    update_rows("user_challenges",
                lambda r: r["user_id"] == uid and r["challenge_id"] == challenge_id,
                lambda r: r.update({"progress": progress, "status": status, "completed_at": completed_at}))
    return jsonify({"progress": progress, "status": status})


# ---------------------------------------------------------------------------
# Friends & Social
# ---------------------------------------------------------------------------

@app.route("/api/friends", methods=["GET"])
@require_auth
def get_friends():
    uid = request.user_id
    friendships = find_many("friends",
                            lambda r: (r["user_id"] == uid or r["friend_id"] == uid) and r["status"] == "accepted")
    result = []
    for f in friendships:
        other_id = f["friend_id"] if f["user_id"] == uid else f["user_id"]
        other = find_one("users", lambda r, oid=other_id: r["id"] == oid)
        if other:
            result.append({
                "id": f["id"],
                "user": _safe_user(other),
                "streak": _calculate_streak(other_id),
            })
    return jsonify(result)


@app.route("/api/friends/requests", methods=["GET"])
@require_auth
def get_friend_requests():
    uid = request.user_id
    requests_in = find_many("friends",
                            lambda r: r["friend_id"] == uid and r["status"] == "pending")
    result = []
    for f in requests_in:
        sender = find_one("users", lambda r, sid=f["user_id"]: r["id"] == sid)
        if sender:
            result.append({"id": f["id"], "user": _safe_user(sender)})
    return jsonify(result)


@app.route("/api/friends/add", methods=["POST"])
@require_auth
def add_friend():
    uid = request.user_id
    data = request.get_json() or {}
    friend_email = (data.get("email") or "").strip().lower()
    friend = find_one("users", lambda r: r["email"] == friend_email)
    if not friend:
        return jsonify({"error": "User not found"}), 404
    if friend["id"] == uid:
        return jsonify({"error": "Cannot add yourself"}), 400

    existing = find_one("friends",
                        lambda r: (r["user_id"] == uid and r["friend_id"] == friend["id"]) or
                                  (r["user_id"] == friend["id"] and r["friend_id"] == uid))
    if existing:
        return jsonify({"error": "Already friends or request pending"}), 409

    write_row("friends", {
        "id": gen_id(), "user_id": uid, "friend_id": friend["id"],
        "status": "pending", "created_at": now_iso(),
    })
    return jsonify({"status": "request_sent"})


@app.route("/api/friends/<friendship_id>/accept", methods=["POST"])
@require_auth
def accept_friend(friendship_id):
    update_rows("friends",
                lambda r: r["id"] == friendship_id and r["friend_id"] == request.user_id,
                lambda r: r.update({"status": "accepted"}))
    return jsonify({"status": "accepted"})


@app.route("/api/friends/<friendship_id>", methods=["DELETE"])
@require_auth
def remove_friend(friendship_id):
    uid = request.user_id
    delete_rows("friends",
                lambda r: r["id"] == friendship_id and
                          (r["user_id"] == uid or r["friend_id"] == uid))
    return jsonify({"status": "removed"})


@app.route("/api/leaderboard", methods=["GET"])
@require_auth
def leaderboard():
    users = read_all("users")
    board = []
    for u in users:
        uid = u["id"]
        runs = find_many("runs", lambda r, _uid=uid: r["user_id"] == _uid)
        dist = round(sum(float(r.get("distance_km") or 0) for r in runs), 1)
        board.append({
            "id": uid,
            "name": u.get("name", "User"),
            "avatar": u.get("avatar", "🏃"),
            "level": u.get("level", "1"),
            "xp": int(u.get("xp") or 0),
            "total_distance": dist,
            "streak": _calculate_streak(uid),
        })
    board.sort(key=lambda x: x["xp"], reverse=True)
    return jsonify(board[:20])


# ---------------------------------------------------------------------------
# Workouts
# ---------------------------------------------------------------------------

@app.route("/api/workouts", methods=["GET"])
@require_auth
def get_workouts():
    level = request.args.get("level") or "all"
    if level == "all":
        result = []
        for lvl, wlist in WORKOUT_LIBRARY.items():
            for w in wlist:
                w["level"] = lvl
                result.append(w)
    else:
        result = [{**w, "level": level} for w in WORKOUT_LIBRARY.get(level, [])]
    return jsonify(result)


@app.route("/api/workouts/log", methods=["POST"])
@require_auth
def log_workout():
    data = request.get_json() or {}
    entry = {
        "id": gen_id(),
        "user_id": request.user_id,
        "date": data.get("date") or today_str(),
        "workout_id": data.get("workout_id") or "",
        "duration_min": str(data.get("duration_min") or 0),
        "calories": str(data.get("calories") or 0),
        "notes": data.get("notes") or "",
    }
    write_row("workout_sessions", entry)
    _award_xp(request.user_id, 15, "Workout completed")
    return jsonify(entry), 201


# ---------------------------------------------------------------------------
# Reminders
# ---------------------------------------------------------------------------

@app.route("/api/reminders", methods=["GET"])
@require_auth
def get_reminders():
    return jsonify(find_many("reminders", lambda r: r["user_id"] == request.user_id))


@app.route("/api/reminders", methods=["POST"])
@require_auth
def create_reminder():
    data = request.get_json() or {}
    reminder = {
        "id": gen_id(),
        "user_id": request.user_id,
        "type": data.get("type") or "workout",
        "title": data.get("title") or "Reminder",
        "time": data.get("time") or "08:00",
        "days": json.dumps(data.get("days") or ["Mon", "Tue", "Wed", "Thu", "Fri"]),
        "enabled": "True",
    }
    write_row("reminders", reminder)
    return jsonify(reminder), 201


@app.route("/api/reminders/<reminder_id>", methods=["PUT"])
@require_auth
def update_reminder(reminder_id):
    data = request.get_json() or {}
    update_rows("reminders",
                lambda r: r["id"] == reminder_id and r["user_id"] == request.user_id,
                lambda r: r.update({k: str(v) for k, v in data.items() if k in ["enabled", "time", "title"]}))
    return jsonify({"status": "updated"})


@app.route("/api/reminders/<reminder_id>", methods=["DELETE"])
@require_auth
def delete_reminder(reminder_id):
    delete_rows("reminders",
                lambda r: r["id"] == reminder_id and r["user_id"] == request.user_id)
    return jsonify({"status": "deleted"})


# ---------------------------------------------------------------------------
# Progress Analytics
# ---------------------------------------------------------------------------

@app.route("/api/analytics", methods=["GET"])
@require_auth
def analytics():
    uid = request.user_id
    from datetime import date, timedelta

    # Last 30 days
    thirty_days = [(date.today() - timedelta(days=i)).isoformat() for i in range(29, -1, -1)]

    runs_by_day = []
    for d in thirty_days:
        r = find_many("runs", lambda x, _d=d: x["user_id"] == uid and x["date"] == _d)
        runs_by_day.append({"date": d, "distance_km": round(sum(float(x.get("distance_km") or 0) for x in r), 2)})

    nutrition_by_day = []
    for d in thirty_days:
        n = find_many("nutrition", lambda x, _d=d: x["user_id"] == uid and x["date"] == _d)
        nutrition_by_day.append({"date": d, "calories": round(sum(float(x.get("calories") or 0) for x in n))})

    mood_by_day = []
    for d in thirty_days:
        m = find_many("mood", lambda x, _d=d: x["user_id"] == uid and x["date"] == _d)
        avg = round(sum(float(x.get("mood_score") or 3) for x in m) / len(m), 1) if m else None
        mood_by_day.append({"date": d, "score": avg})

    sleep_by_day = []
    for d in thirty_days:
        s = find_many("sleep", lambda x, _d=d: x["user_id"] == uid and x["date"] == _d)
        avg = round(sum(float(x.get("duration_h") or 0) for x in s) / len(s), 1) if s else None
        sleep_by_day.append({"date": d, "hours": avg})

    goals = find_many("goals", lambda r: r["user_id"] == uid)
    completed_goals = len([g for g in goals if g.get("status") == "completed"])
    goal_rate = round(completed_goals / len(goals) * 100) if goals else 0

    return jsonify({
        "runs": runs_by_day,
        "nutrition": nutrition_by_day,
        "mood": mood_by_day,
        "sleep": sleep_by_day,
        "goals": {"total": len(goals), "completed": completed_goals, "completion_rate": goal_rate},
    })


# ---------------------------------------------------------------------------
# Mental Health
# ---------------------------------------------------------------------------

@app.route("/api/mental/breathing", methods=["GET"])
def get_breathing():
    return jsonify(BREATHING_EXERCISES)


@app.route("/api/mental/quote", methods=["GET"])
def daily_quote():
    return jsonify(get_daily_quote())


# ---------------------------------------------------------------------------
# Gamification & Rewards
# ---------------------------------------------------------------------------

@app.route("/api/rewards", methods=["GET"])
@require_auth
def get_rewards():
    rewards = find_many("rewards", lambda r: r["user_id"] == request.user_id)
    badges = find_many("badges", lambda r: r["user_id"] == request.user_id)
    user = find_one("users", lambda r: r["id"] == request.user_id)
    return jsonify({
        "rewards": rewards,
        "badges": badges,
        "xp": int(user.get("xp") or 0) if user else 0,
        "level": int(user.get("level") or 1) if user else 1,
    })


def _award_xp(user_id, xp_amount, reason=""):
    user = find_one("users", lambda r: r["id"] == user_id)
    if not user:
        return
    new_xp = int(user.get("xp") or 0) + xp_amount
    new_level = max(1, new_xp // 100 + 1)
    update_rows("users", lambda r: r["id"] == user_id,
                lambda r: r.update({"xp": str(new_xp), "level": str(new_level)}))
    write_row("rewards", {
        "id": gen_id(), "user_id": user_id, "type": "xp",
        "title": reason or "XP Earned", "points": str(xp_amount),
        "earned_at": now_iso(), "redeemed": "False",
    })


def _award_badge(user_id, badge_name):
    existing = find_one("badges",
                        lambda r: r["user_id"] == user_id and r["badge_name"] == badge_name)
    if not existing:
        write_row("badges", {
            "id": gen_id(), "user_id": user_id,
            "badge_name": badge_name, "earned_at": now_iso(),
        })


# ---------------------------------------------------------------------------
# AI Coach
# ---------------------------------------------------------------------------

@app.route("/api/ai/plan", methods=["GET"])
@require_auth
def ai_plan():
    uid = request.user_id
    user = find_one("users", lambda r: r["id"] == uid)
    fitness_level = user.get("fitness_level", "beginner") if user else "beginner"
    goals = find_many("goals", lambda r: r["user_id"] == uid and r["status"] == "active")
    runs = find_many("runs", lambda r: r["user_id"] == uid)
    plan = get_ai_plan(fitness_level, goals, runs)
    return jsonify(plan)


@app.route("/api/ai/chat", methods=["POST"])
@require_auth
def ai_chat():
    uid = request.user_id
    data = request.get_json() or {}
    message = (data.get("message") or "").strip()
    if not message:
        return jsonify({"error": "Message required"}), 400

    user = find_one("users", lambda r: r["id"] == uid)
    context = {
        "fitness_level": user.get("fitness_level", "beginner") if user else "beginner",
        "streak": _calculate_streak(uid),
    }

    write_row("chat_messages", {
        "id": gen_id(), "user_id": uid, "role": "user",
        "message": message, "timestamp": now_iso(),
    })

    response = get_coach_response(message, context)

    write_row("chat_messages", {
        "id": gen_id(), "user_id": uid, "role": "assistant",
        "message": response, "timestamp": now_iso(),
    })

    return jsonify({"response": response})


@app.route("/api/ai/history", methods=["GET"])
@require_auth
def ai_chat_history():
    messages = find_many("chat_messages", lambda r: r["user_id"] == request.user_id)
    messages.sort(key=lambda r: r.get("timestamp", ""))
    return jsonify(messages[-50:])


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "app": "FitLife PWA", "version": "1.0.0"})


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_ENV", "production") == "development"
    app.run(host="0.0.0.0", port=port, debug=debug)
