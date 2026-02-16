# 🛡️ InsightShield – Behavioral Risk Detection System

![Version](https://img.shields.io/badge/Version-2.0-00ff9f?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Stabilized-6e00ff?style=for-the-badge)
![UI](https://img.shields.io/badge/Design-Obsidian%20%26%20Aurora-ff0055?style=for-the-badge)

## 🌌 Project Overview
**InsightShield** is a world-class, full-stack behavioral intelligence system designed to detect early disengagement and "silent failure" risk in students or trainees. By analyzing metadata-driven activity patterns—such as submission delays and inactivity clusters—the system provides mentors and administrators with real-time, actionable insights to intervene before failure occurs.

Powered by a **Rule-Based Behavioral Deviation Engine**, the system categorizes users into dynamic risk levels (Low, Medium, High) based on their interaction with assignments, quizzes, and the platform itself.

---

## 💎 World-Class UI/UX: "Obsidian & Aurora"
InsightShield features a premium, high-performance interface designed for maximum visual impact and data density:
- **Obsidian Cards**: 40px backdrop blurs with ultra-refined glassmorphism.
- **Aurora Mesh**: A dynamic, shifting radial gradient background for deep visual immersion.
- **Bento-Grid Dashboards**: State-of-the-art modular layouts for high-speed data interpretation.
- **Hyper-Interactions**: Custom micro-animations and neon-glow focus states.

---

## 🛠️ Core Functional Architecture

### 1. Multi-Role Ecosystem
- **Admin Terminal**: Global network intelligence, risk distribution clusters, and critical alert monitoring.
- **Mentor Console**: Squadron-level monitoring with node scanning and engagement probability metrics.
- **Student Terminal**: Personal activity logger with performance trajectory visualization.

### 2. Behavioral Risk Engine (The Logic)
The system calculates a **Total Risk Score** based on three primary metrics:
- **Metric 1: Submission Integrity**
  - On-time: 0 points
  - 1–2 days late: +1 point
  - Missed: +3 points
- **Metric 2: Activity Deviation**
  - Compared against a user-specific 4-week baseline.
  - 10% drop: +1 | 25% drop: +2 | 40%+ drop: +3
- **Metric 3: Temporal Inactivity**
  - 3 days: +1 | 7 days: +2 | 14 days: +4

**Classification Logic**:
- `0–3`: **CLEAR (Low)**
- `4–6`: **ATTENTION (Medium)**
- `7+`: **CRITICAL (High)** triggers automatic mentor alerts.

---

## 🚀 Tech Stack & Infrastructure
- **Frontend**: React 18, Vite, Chart.js, Lucide-React, Framer Motion.
- **Backend**: Express.js (Node.js), RESTful API.
- **Database**: SQLite3 (Persistent behavioral storage).
- **Styling**: Advanced Vanilla CSS (Obsidian Custom Theme).
- **Auth**: JWT (JSON Web Tokens) with Role-Based Access Control (RBAC).

---

## 🔑 Getting Started

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
   npm run build # Generates optimized production assets
   npm run dev   # Or serve the build
   ```

### Demo Protocols
| Role | Identifier | Security Key |
| :--- | :--- | :--- |
| **Admin** | `admin@insight.com` | `password123` |
| **Mentor** | `sarah@insight.com` | `password123` |
| **Student** | `bob@student.com` | `password123` |

---

## 🛡️ Security & Privacy
- **No Private Scanning**: The system only analyzes metadata (timestamps, submission status).
- **Zero AI Dependency**: Uses a deterministic, rule-based engine for transparent, explainable alerts.
- **Role Isolation**: Mentors can only see data for their assigned entity squadron.

---
© 2026 Team-Python | InsightShield – Advanced Behavioral Intelligence.
