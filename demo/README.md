# Demo Files

This directory contains all demonstration and testing materials. These files are NOT part of the core application and are used solely for hackathon presentations, judging, and testing.

## Directory Structure

### scripts/
(Quick launch scripts moved to root directory for visibility)

See root directory for:
- `quick-launch.bat` - Windows launcher
- `quick-launch.sh` - Mac/Linux launcher

### docs/
Documentation for judges and evaluators:
- `JUDGE_QUICK_START.md` - Quick start guide for hackathon judges

### seed-data/
Demo data generation scripts (copies for reference):
- `seed.js` - Database seeding script
- `seedData.js` - Demo student data (8 students with varied risk profiles)
- `questions.js` - Sample assignment questions

**Note:** The original seed files remain in `backend/` and `backend/data/` for actual use. These are reference copies to clearly indicate what data is temporary/demo content.

## Production Deployment

In a production environment:
- Remove or ignore this entire `demo/` directory
- Replace seed data with real LMS integration
- Remove quick-launch scripts (use proper deployment tools)
- Implement production authentication system
