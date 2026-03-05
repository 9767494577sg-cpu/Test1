"""
Rule-based and simple AI fitness suggestions & coaching.
"""
from datetime import datetime


HABIT_SUGGESTIONS = {
    "beginner": [
        {"icon": "🚶", "title": "Walk 5,000 steps", "category": "cardio", "description": "Start with a gentle 5,000 step daily goal."},
        {"icon": "💧", "title": "Drink 2L of water", "category": "hydration", "description": "Stay hydrated throughout the day."},
        {"icon": "🧘", "title": "10-minute stretching", "category": "flexibility", "description": "Morning stretch routine to improve flexibility."},
        {"icon": "😴", "title": "Sleep 8 hours", "category": "sleep", "description": "Aim for 7-8 hours of quality sleep."},
        {"icon": "🥗", "title": "Eat 2 servings of vegetables", "category": "nutrition", "description": "Add vegetables to lunch and dinner."},
    ],
    "intermediate": [
        {"icon": "🏃", "title": "Run 3km", "category": "cardio", "description": "30-minute moderate intensity run."},
        {"icon": "💧", "title": "Drink 2.5L of water", "category": "hydration", "description": "Increase hydration for active days."},
        {"icon": "🏋️", "title": "30-minute strength workout", "category": "strength", "description": "Upper or lower body strength session."},
        {"icon": "🧘", "title": "15-minute yoga", "category": "flexibility", "description": "Improve flexibility and reduce stress."},
        {"icon": "🚴", "title": "20-minute cycling", "category": "cardio", "description": "Low impact cardio workout."},
    ],
    "advanced": [
        {"icon": "🏃", "title": "Run 10km", "category": "cardio", "description": "Long distance run to build endurance."},
        {"icon": "🏋️", "title": "60-minute strength training", "category": "strength", "description": "Compound lifts + isolation exercises."},
        {"icon": "🏊", "title": "30-minute swim", "category": "cardio", "description": "Full body low impact cardio."},
        {"icon": "💧", "title": "Drink 3L of water", "category": "hydration", "description": "Hydration is critical for intense training."},
        {"icon": "🔥", "title": "HIIT session 20 min", "category": "cardio", "description": "High intensity interval training for fat burn."},
    ],
}

WORKOUT_LIBRARY = {
    "beginner": [
        {"id": "w1", "name": "Beginner Full Body", "category": "strength", "duration": 20, "calories": 150,
         "exercises": ["10 push-ups", "15 squats", "10 lunges each leg", "30s plank", "20 jumping jacks"],
         "description": "A simple full body workout perfect for beginners."},
        {"id": "w2", "name": "Morning Walk & Stretch", "category": "cardio", "duration": 30, "calories": 120,
         "exercises": ["5 min warm-up walk", "10 min brisk walk", "5 min cool-down", "10 min full body stretch"],
         "description": "Start your day with a gentle walk and stretch session."},
        {"id": "w3", "name": "Beginner Yoga", "category": "yoga", "duration": 20, "calories": 80,
         "exercises": ["Mountain pose", "Child's pose", "Cat-cow stretch", "Downward dog", "Warrior I"],
         "description": "Basic yoga poses for beginners to improve flexibility."},
    ],
    "intermediate": [
        {"id": "w4", "name": "Intermediate HIIT", "category": "hiit", "duration": 25, "calories": 300,
         "exercises": ["30s burpees", "30s mountain climbers", "30s jump squats", "30s high knees", "30s rest - repeat 4x"],
         "description": "High intensity interval training to boost metabolism."},
        {"id": "w5", "name": "Upper Body Strength", "category": "strength", "duration": 40, "calories": 250,
         "exercises": ["3x10 bench press", "3x10 bent over rows", "3x12 shoulder press", "3x12 bicep curls", "3x15 tricep dips"],
         "description": "Build upper body strength with compound and isolation movements."},
        {"id": "w6", "name": "5K Run Training", "category": "cardio", "duration": 35, "calories": 350,
         "exercises": ["5 min walk warm-up", "3km at conversational pace", "1km at tempo pace", "1km cool-down walk"],
         "description": "Train for your first 5K run."},
    ],
    "advanced": [
        {"id": "w7", "name": "Advanced HIIT Blast", "category": "hiit", "duration": 30, "calories": 450,
         "exercises": ["1 min burpees", "1 min plyo push-ups", "1 min box jumps", "1 min battle ropes", "30s rest - repeat 5x"],
         "description": "Extreme HIIT for advanced athletes."},
        {"id": "w8", "name": "Heavy Leg Day", "category": "strength", "duration": 60, "calories": 400,
         "exercises": ["4x5 back squat", "4x5 deadlift", "3x10 leg press", "3x12 Romanian deadlift", "3x15 calf raises"],
         "description": "Heavy compound leg workout for strength and mass."},
        {"id": "w9", "name": "Marathon Prep Run", "category": "cardio", "duration": 90, "calories": 700,
         "exercises": ["10 min warm-up", "60 min long slow run", "10 min cool-down", "10 min stretching"],
         "description": "Long run session for marathon preparation."},
    ],
}

MOTIVATIONAL_QUOTES = [
    {"quote": "The only bad workout is the one that didn't happen.", "author": "Unknown"},
    {"quote": "Take care of your body. It's the only place you have to live.", "author": "Jim Rohn"},
    {"quote": "An hour of training gives you an endorphin boost for hours afterward.", "author": "Unknown"},
    {"quote": "Fitness is not about being better than someone else. It's about being better than you used to be.", "author": "Unknown"},
    {"quote": "The groundwork for all happiness is good health.", "author": "Leigh Hunt"},
    {"quote": "Pain is temporary. Quitting lasts forever.", "author": "Lance Armstrong"},
    {"quote": "Your body can stand almost anything. It's your mind that you have to convince.", "author": "Unknown"},
    {"quote": "A one-hour workout is 4% of your day. No excuses.", "author": "Unknown"},
    {"quote": "Success is walking from failure to failure with no loss of enthusiasm.", "author": "Winston Churchill"},
    {"quote": "The difference between try and triumph is a little umph.", "author": "Marvin Phillips"},
    {"quote": "What seems impossible today will one day become your warm-up.", "author": "Unknown"},
    {"quote": "Don't wish for a good body, work for it.", "author": "Unknown"},
    {"quote": "The hardest lift of all is lifting your butt off the couch.", "author": "Unknown"},
    {"quote": "Strength does not come from the body. It comes from the will of the soul.", "author": "Unknown"},
    {"quote": "Run when you can, walk if you have to, crawl if you must; just never give up.", "author": "Dean Karnazes"},
]

BREATHING_EXERCISES = [
    {"name": "Box Breathing", "description": "Inhale 4s → Hold 4s → Exhale 4s → Hold 4s", "cycles": 5, "benefit": "Reduces stress & anxiety"},
    {"name": "4-7-8 Breathing", "description": "Inhale 4s → Hold 7s → Exhale 8s", "cycles": 4, "benefit": "Promotes sleep & relaxation"},
    {"name": "Diaphragmatic Breathing", "description": "Deep belly breaths - inhale 5s → exhale 5s", "cycles": 10, "benefit": "Improves oxygen flow"},
    {"name": "Alternate Nostril", "description": "Close right nostril, inhale left → close left, exhale right → repeat", "cycles": 5, "benefit": "Balances nervous system"},
]


def get_daily_suggestion(fitness_level: str, completed_today: list) -> list:
    """Return habit suggestions based on fitness level, excluding already completed ones."""
    level = fitness_level.lower() if fitness_level else "beginner"
    if level not in HABIT_SUGGESTIONS:
        level = "beginner"
    suggestions = HABIT_SUGGESTIONS[level]
    return [s for s in suggestions if s["title"] not in completed_today]


def get_daily_quote() -> dict:
    day_of_year = datetime.utcnow().timetuple().tm_yday
    return MOTIVATIONAL_QUOTES[day_of_year % len(MOTIVATIONAL_QUOTES)]


def get_ai_plan(fitness_level: str, goals: list, recent_runs: list) -> dict:
    """
    Rule-based 'AI' fitness plan generator.
    Returns a weekly plan tailored to fitness level and goals.
    """
    level = (fitness_level or "beginner").lower()
    workouts = WORKOUT_LIBRARY.get(level, WORKOUT_LIBRARY["beginner"])

    plan = {
        "weekly_plan": [],
        "tips": [],
        "rest_days": [6, 7],  # Saturday, Sunday default
    }

    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    workout_idx = 0

    for i, day in enumerate(days):
        if i % 2 == 0 and workout_idx < len(workouts):
            plan["weekly_plan"].append({
                "day": day,
                "type": "workout",
                "workout": workouts[workout_idx]["name"],
                "duration": workouts[workout_idx]["duration"],
                "category": workouts[workout_idx]["category"],
            })
            workout_idx += 1
        else:
            plan["weekly_plan"].append({
                "day": day,
                "type": "active_recovery",
                "workout": "Light walk or stretching",
                "duration": 20,
                "category": "recovery",
            })

    if level == "beginner":
        plan["tips"] = [
            "Start slow and gradually increase intensity",
            "Focus on form over speed",
            "Take rest days seriously - recovery is part of training",
            "Stay consistent - 3-4 sessions/week is great for beginners",
        ]
    elif level == "intermediate":
        plan["tips"] = [
            "Add progressive overload to your strength workouts",
            "Track your runs to see pace improvements",
            "Include one long run per week",
            "Fuel properly before and after workouts",
        ]
    else:
        plan["tips"] = [
            "Periodize your training - hard weeks followed by deload weeks",
            "Monitor heart rate variability for recovery",
            "Cross-train to prevent overuse injuries",
            "Consider working with a coach for optimal performance",
        ]

    return plan


def get_coach_response(user_message: str, context: dict) -> str:
    """Simple rule-based chatbot responses for the AI coach."""
    msg = user_message.lower().strip()
    fitness_level = context.get("fitness_level", "beginner")
    streak = context.get("streak", 0)

    if any(w in msg for w in ["hello", "hi", "hey", "start"]):
        return f"Hi there! 💪 I'm your AI Fitness Coach. I see you're at the {fitness_level} level with a {streak}-day streak. How can I help you today? You can ask me about workouts, nutrition, recovery, or motivation!"

    if any(w in msg for w in ["tired", "exhausted", "sore", "rest"]):
        return "Listen to your body! 🌟 It sounds like you might need a rest day. Rest is when your muscles actually grow and repair. Try some light stretching, foam rolling, or a gentle walk. Your body will thank you tomorrow!"

    if any(w in msg for w in ["weight loss", "lose weight", "fat", "slim"]):
        return "For weight loss, the key is a calorie deficit combined with regular exercise. 🔥 I recommend:\n• 150-300 min of cardio per week\n• 2-3 strength sessions weekly\n• Track your nutrition\n• Stay in a 300-500 calorie daily deficit\nConsistency over perfection!"

    if any(w in msg for w in ["muscle", "strength", "bulk", "gain"]):
        return "Building muscle requires progressive overload and adequate protein! 💪\n• Aim for 1.6-2.2g protein per kg bodyweight\n• Lift 3-4x per week with progressive overload\n• Sleep 7-9 hours for muscle recovery\n• Track your lifts to see progress\nPatience is key - muscle building takes time!"

    if any(w in msg for w in ["run", "running", "cardio", "jog"]):
        if fitness_level == "beginner":
            return "For beginner runners, I recommend the run-walk method! 🏃\n• Alternate 1 min running + 2 min walking\n• Gradually increase running intervals each week\n• Aim for 3 sessions per week\n• Invest in good running shoes\nYou'll be running 5K before you know it!"
        return "Great running goals! 🏃 For your level, focus on:\n• Building your base with easy runs (70% of training)\n• Add one tempo run per week\n• Include weekly long run to build endurance\n• Rest at least one day between hard sessions"

    if any(w in msg for w in ["nutrition", "eat", "diet", "food", "meal"]):
        return "Nutrition is the foundation of fitness! 🥗\n• Eat mostly whole foods\n• Aim for 25-30g protein per meal\n• Complex carbs before workouts\n• Healthy fats for hormones\n• Don't skip meals before workouts\nTrack your meals in the Nutrition section for better insights!"

    if any(w in msg for w in ["sleep", "insomnia", "tired"]):
        return "Sleep is your secret weapon for fitness! 😴\n• Aim for 7-9 hours per night\n• Keep consistent sleep/wake times\n• Avoid screens 1 hour before bed\n• Cool, dark room for better sleep\n• Log your sleep in the Sleep Tracker section"

    if any(w in msg for w in ["motivat", "inspiration", "give up", "quit", "hard"]):
        return f"You've got this! 🌟 You're on a {streak}-day streak - that's incredible commitment! Remember why you started. Progress isn't always visible day to day, but it's happening. Every workout counts, even the short ones. The hardest step is always getting started. Keep going!"

    if any(w in msg for w in ["plan", "schedule", "routine", "workout plan"]):
        return f"I've generated a personalized {fitness_level} plan for you! Check the 'AI Fitness Coach' section for your full weekly schedule. It includes:\n• Workout sessions tailored to your level\n• Active recovery days\n• Progression tips\nWant me to adjust anything specific?"

    if any(w in msg for w in ["streak", "points", "badge", "reward", "xp"]):
        return f"You have a {streak}-day streak - keep it going! 🔥 Earn XP by:\n• Completing daily habits (+10 XP each)\n• Logging runs (+20 XP)\n• Finishing challenges (+50-500 XP)\n• 7-day streak bonus (+50 XP)\n• 30-day streak bonus (+200 XP)\nLevel up to unlock exclusive badges!"

    return "That's a great question! 🤔 I'm here to help with workouts, nutrition, recovery, motivation, and more. Try asking me about:\n• 'Give me a workout plan'\n• 'How do I lose weight?'\n• 'I feel tired today'\n• 'Nutrition tips'\n• 'How to improve my running?'"
