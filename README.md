# FitLife PWA

A comprehensive fitness tracking Progressive Web App (PWA) with full web and mobile web support.

## 🚀 Features

- **🏃 Running Tracker** – GPS tracking, distance, time, pace, route map, personal bests
- **✅ Habit Tracker** – Custom habits, streak tracking, completion analytics
- **💡 Daily Suggestions** – AI/rule-based personalized fitness habit suggestions
- **📊 Personal Dashboard** – Steps, calories, water, mood, weekly progress summary
- **🥗 Nutrition Tracker** – Meals, calorie counter, macronutrient breakdown, water intake
- **🏋️ Workout Library** – Beginner/Intermediate/Advanced workouts by category
- **🏆 Fitness Challenges** – 7-day, 30-day, monthly challenges with XP rewards
- **🧠 Mental Health** – Mood tracking, meditation timer, breathing exercises, motivational quotes
- **📈 Progress Analytics** – 30-day charts for runs, nutrition, mood, sleep
- **🎯 Goal Setting** – Custom goals with deadlines and progress tracking
- **🔔 Smart Reminders** – Workout, water, sleep, custom push notifications
- **😴 Sleep Tracker** – Log sleep time, quality rating, weekly analysis
- **🏅 Gamification** – XP points, levels, badges, achievement system
- **👥 Social Features** – Friends, leaderboard, friend requests
- **🤖 AI Fitness Coach** – Personalized plans, chat assistant, workout suggestions
- **📱 PWA Support** – Install on mobile, offline support, push notifications

## ⚡ Quick Start (Local Testing)

```bash
# 1. Install backend dependencies
cd backend
pip install -r requirements.txt

# 2. Start the server
python app.py
```

The app will be available at **http://localhost:5000**

### Sample API Calls (curl)

```bash
# Health check
curl http://localhost:5000/api/health

# Register a new user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test User"}'

# Login and get token
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# Get dashboard
curl http://localhost:5000/api/dashboard \
  -H "Authorization: Bearer $TOKEN"

# Log a run
curl -X POST http://localhost:5000/api/runs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"distance_km":5.0,"duration_sec":1500,"date":"2025-01-01"}'
```

### Deploy to Render (free tier)

1. Fork this repository
2. Go to [render.com](https://render.com) → **New Web Service**
3. Connect your repo – Render auto-detects `render.yaml`
4. Click **Deploy** – your app will be live
5. Point your DNS for `sushantfit.com` to the Render service, then the app will be available at **https://sushantfit.com**

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3 (custom), Vanilla JavaScript |
| Backend | Python 3.9+ (Flask) |
| Database | CSV files |
| Auth | JWT + Firebase Auth (optional) |
| Maps | Google Maps API |
| Charts | Chart.js |
| PWA | Service Worker + Web App Manifest |

## 📁 Project Structure

```
fitlife/
├── frontend/
│   ├── index.html          # Main SPA HTML
│   ├── manifest.json       # PWA manifest
│   ├── service-worker.js   # Offline + caching
│   ├── css/
│   │   └── style.css       # Dark theme stylesheet
│   ├── js/
│   │   ├── app.js          # App controller & utilities
│   │   ├── auth.js         # Authentication
│   │   ├── dashboard.js    # Dashboard & charts
│   │   ├── running.js      # Run tracker + GPS
│   │   ├── habits.js       # Habit tracker
│   │   ├── nutrition.js    # Nutrition logging
│   │   ├── social.js       # Friends & leaderboard
│   │   ├── challenges.js   # Fitness challenges
│   │   ├── mental-health.js # Mood, meditation, breathing
│   │   ├── sleep.js        # Sleep tracker
│   │   ├── goals.js        # Goal setting
│   │   ├── ai-coach.js     # AI coach chat
│   │   ├── gamification.js # XP, badges, rewards
│   │   ├── analytics.js    # Progress charts
│   │   ├── workouts.js     # Workout library
│   │   ├── reminders.js    # Smart reminders
│   │   └── profile.js      # User profile
│   └── icons/              # PWA icons (all sizes)
├── backend/
│   ├── app.py              # Flask app with all API endpoints
│   ├── requirements.txt    # Python dependencies
│   ├── .env.example        # Environment variables template
│   ├── data/               # CSV database files (auto-created)
│   └── utils/
│       ├── csv_handler.py  # CSV CRUD operations
│       ├── auth.py         # JWT & Firebase auth
│       └── ai_coach.py     # Rule-based AI suggestions
└── README.md
```

## 🔧 Setup & Installation

### Prerequisites
- Python 3.9+
- Modern web browser with JavaScript enabled

### Backend Setup

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Copy env file and configure
cp .env.example .env
# Edit .env with your API keys

# Run the server
python app.py
```

The server will start on `http://localhost:5000`

### Generate PWA Icons

```bash
cd frontend
python generate_icons.py
```

### Configure APIs (Optional)

**Google Maps** (for run route tracking):
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Maps JavaScript API
3. Get your API key
4. In `frontend/index.html`, uncomment the Maps script tag and replace `YOUR_GOOGLE_MAPS_API_KEY`

**Firebase Authentication** (for Google login):
1. Create project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication → Google provider
3. Get your Firebase config
4. In `frontend/js/app.js`, update `FIREBASE_CONFIG`
5. In `frontend/index.html`, uncomment the Firebase script tags

## 🌐 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login with email/password |
| POST | `/api/auth/firebase` | Login with Firebase token |
| GET | `/api/dashboard` | Dashboard stats |
| GET/POST | `/api/runs` | Running data |
| GET/POST | `/api/habits` | Habit management |
| POST | `/api/habits/:id/log` | Log habit completion |
| GET/POST | `/api/nutrition` | Nutrition logging |
| GET/POST | `/api/sleep` | Sleep tracking |
| GET/POST | `/api/mood` | Mood logging |
| GET/POST | `/api/goals` | Goal management |
| GET | `/api/challenges` | Fitness challenges |
| GET | `/api/leaderboard` | Global leaderboard |
| GET | `/api/workouts` | Workout library |
| GET | `/api/analytics` | 30-day analytics |
| POST | `/api/ai/chat` | AI coach chat |
| GET | `/api/ai/plan` | AI fitness plan |
| GET | `/api/rewards` | XP, badges, rewards |

## 📱 PWA Installation

1. Open the app in a mobile browser (Chrome, Safari)
2. Look for "Add to Home Screen" or the install banner
3. Tap Install – the app will behave like a native app

## 🗄️ Database

All data is stored in CSV files in `backend/data/`:
- `users.csv` – User accounts
- `runs.csv` – Running sessions
- `habits.csv` – User habits
- `habit_logs.csv` – Daily habit completion
- `nutrition.csv` – Meal logs
- `sleep.csv` – Sleep records
- `mood.csv` – Mood entries
- `goals.csv` – User goals
- `challenges.csv` – Available challenges
- `user_challenges.csv` – Challenge progress
- `friends.csv` – Friend relationships
- `rewards.csv` – XP rewards history
- `badges.csv` – Earned badges
- `reminders.csv` – User reminders
- `workout_sessions.csv` – Completed workouts
- `chat_messages.csv` – AI coach chat history

## 🎨 UI Design

- **Dark theme** with glassmorphism effects
- **Gradient accents** for visual hierarchy  
- **Mobile-first** responsive layout
- **Bottom navigation** for mobile, side navigation for desktop
- **Smooth animations** and transitions
- Single-page application (SPA) with section-based navigation

## 🔒 Security

- Passwords hashed with PBKDF2-HMAC-SHA256
- JWT tokens for API authentication (7-day expiry)
- CORS enabled for cross-origin API access
- Input validation on all endpoints
- No sensitive data in client-side storage beyond JWT token

## 📄 License

MIT License - Free to use and modify
