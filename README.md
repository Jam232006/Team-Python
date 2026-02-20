# 🛡️ InsightShield – Behavioral Risk Detection System

![Version](https://img.shields.io/badge/Version-2.0-00ff9f?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Stabilized-6e00ff?style=for-the-badge)
![UI](https://img.shields.io/badge/Design-Obsidian%20%26%20Aurora-ff0055?style=for-the-badge)

## Project Overview
InsightShield is a world-class, full-stack behavioral intelligence system designed to detect early disengagement and "silent failure" risk in students or trainees. By analyzing metadata-driven activity patterns—such as submission delays and inactivity clusters—the system provides mentors and administrators with real-time, actionable insights to intervene before failure occurs.

Powered by a Rule-Based Behavioral Deviation Engine, the system categorizes users into dynamic risk levels (Low, Medium, High) based on their interaction with assignments, quizzes, and the platform itself.

## Core Functional Architecture

### Behavioral Risk Engine
  The system uses a combined scoring system with various factors included but not limited to : submission times, assignment scores, submission frequencies, streaks, quiz scores, and many other factors.

  The optimized formula weights points adaptively for each category and gives a sum average of risk factor, which is used to judge students.

## Alert System
  The alert system is just a notification zone which provides alerts to all three tiers. It has essential info, and is the main way to join a class.
---

## Tech Stack & Infrastructure
- **Frontend**: React 18, Vite, Chart.js, Lucide-React, Framer Motion.
- **Backend**: Express.js (Node.js), RESTful API.
- **Database**: SQLite3 (Persistent behavioral storage).
- **Styling**: Advanced Vanilla CSS (Obsidian Custom Theme).
- **Auth**: JWT (JSON Web Tokens) with Role-Based Access Control (RBAC).

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) installed on your machine.

### Installation & Launch
1. **Clone the Identity**:
   ```bash
   git clone https://github.com/Jam232006/Team-Python.git
   cd Team-Python
   ```

2. **Initialize Backend Intelligence**:
   ```bash
   cd backend
   npm install
   npm run seed  # Populates the behavioral database
   npm start     # Starts API on Port 5000
   ```

3. **Initialize Frontend Portal**:
   ```bash
   cd ../frontend
   npm install
   npm run build 
   npm run dev   
   ```

### Security & Privacy
  -The system only analyzes metadata (timestamps, submission status).
  -Uses a deterministic, rule-based engine which uses pure data for transparent, explainable alerts (No AI based system which can hallucinate or be manipulated easily for such things).
  -Mentors can only see data for their assigned entity squadron.

## Future Scope
  -The assignment system is just a demo - we intend to make this a full extension for existing systems like Classroom from which we can provide full analytics to the end user.
  -Get a server instead of running locally
  -Redis caching and optimization all across the board
  -Make the frontend more complex
---------
v1 Edits:
Added #pragma and write ahead logging for the SQL tables.
pragma-sync, increased cache size (10 MB is enough, maybe?), temp storage w/ RAM, 30 GB MMAP
added more indexes for direct queries
lazy dbs for every server restart, reducing to 0.9 s startup (will be changed later.)
memoized react components for dashboards since they use similar stuff


---
© 2026 Team-Python | InsightShield – Advanced Behavioral Intelligence.
