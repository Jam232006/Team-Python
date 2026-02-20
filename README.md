# InsightShield - Behavioral Risk Detection System

## Purpose

InsightShield identifies at-risk students through behavioral pattern analysis. The system detects early signs of disengagement by analyzing submission patterns, activity streaks, and assignment performance to categorize students into risk levels (Low, Medium, High) and provide mentors with actionable intervention points.

## Key Metrics

- **Build Time**: 1.88s (production-optimized)
- **Bundle Size**: 487KB (153KB gzipped)
- **Startup Time**: 0.9s (lazy database initialization)
- **Code Reduction**: 54% reduction through modular architecture
- **Risk Categories**: 3 levels (Low, Medium, High)
- **Algorithm**: Rule-based scoring engine (deterministic, explainable)

## Core Features

### Risk Detection Engine
Analyzes multiple behavioral factors:
- Submission timing patterns
- Assignment completion rates
- Activity streak tracking
- Performance trends
- Engagement frequency

Weights each factor to compute an aggregate risk score for transparent, explainable alerts.

### Alert System
Automated notification system that flags concerning patterns and provides mentors with real-time alerts for intervention.

### Student Analytics
Detailed per-student profiles with risk trends, question-level breakdowns, and activity history.

**Note**: The current assignment creation/submission system is a temporary demo, so everything might not work. Production deployment will integrate with existing platforms (Google Classroom, Canvas, etc.) to pull assignment data and provide analytics as an extension layer.

## Tech Stack

- **Frontend**: React 18, Vite, Chart.js, custom CSS
- **Backend**: Express.js, Node.js
- **Database**: SQLite3 with WAL mode, pragma optimizations
- **Auth**: JWT with role-based access control

---

## Getting Started

### Prerequisites
- Node.js installed on your machine

### Quick Launch (Recommended)

**Clone the repository:**
```bash
git clone https://github.com/Jam232006/Team-Python.git
cd Team-Python
```

**Run the demo launcher:**

Windows:
```bash
quick-launch.bat
```

Mac/Linux:
```bash
chmod +x quick-launch.sh
./quick-launch.sh
```

The launcher automatically installs dependencies, starts servers, and opens the application at http://localhost:5173

### Manual Installation

**Backend:**
```bash
cd backend
npm install
npm run seed    # Populate demo database
npm start       # Start server on port 5000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev     # Start dev server on port 5173
```

### Demo Credentials
- Mentor: sarah@insight.com / password123
- Student (High Risk): daksh@insight.com / password123
- Student (Low Risk): arjun@insight.com / password123

## Project Structure

```
Team-Python/
├── quick-launch.bat   # Windows one-click launcher
├── quick-launch.sh    # Mac/Linux one-click launcher
├── backend/           # Core application server
├── frontend/          # Core application UI
└── demo/              # Demo/testing materials (NOT production code)
    ├── docs/          # Hackathon/judge documentation
    └── seed-data/     # Demo database seeding files (copies)
```

**Note:** The `demo/` directory contains all temporary demonstration materials. In production, this entire directory should be excluded.

## Architecture Notes

- Metadata-only analysis (timestamps, submission status, scores)
- Deterministic rule-based engine for transparent decisions
- Role-based data access (mentors see only their assigned classes)
- SQLite optimizations: WAL mode, 10MB cache, memory temp storage, indexed queries
- Memoized React components for dashboard performance

## Future Development

- Integration with existing LMS platforms (Google Classroom, Canvas)
- Deployment to production server environment
- Redis caching layer
- Enhanced frontend visualizations

---
