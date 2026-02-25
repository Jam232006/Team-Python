## For Judges & Reviewers

### Quick Launch (30 Seconds)

**Windows:**
```bash
cd Team-Python
quick-launch.bat
```

**Mac/Linux:**
```bash
cd Team-Python
chmod +x quick-launch.sh
./quick-launch.sh
```

The script automatically installs dependencies, starts both servers, and opens http://localhost:5173

### Manual Setup (If Needed)

```bash
# Clone or extract the project
cd Team-Python

# Terminal 1: Start Backend
cd backend
npm install
node seed.js
node server.js

# Terminal 2: Start Frontend
cd frontend
npm install
npm run dev
```

**Access**: Open http://localhost:5173

### Test Accounts

| Role | Email | Password |
|------|-------|----------|
| **Mentor** | sarah@insight.com | password123 |
| **Student (High Risk)** | daksh@insight.com | password123 |
| **Student (Good)** | arjun@insight.com | password123 |

## Performance Metrics

- **Build Time**: ~2 seconds
- **Bundle Size**: 487KB (gzipped: 153KB)
- **Code Reduction**: 2,078 lines (54%)
- **Load Time**: <1 second
- **Database**: SQLite (zero-config)
- **Dependencies**: Minimal, well-maintained

---

## Questions for Team

Available for Q&A about:
- Risk scoring algorithm details
- Scalability considerations
- LMS integration approaches
- Future ML/AI enhancements
- Deployment strategies
- Privacy & security measures

---

## Quick Commands

```bash
# Reseed database with fresh data
cd backend && node seed.js

# Rebuild frontend
cd frontend && npm run build

# Check for errors
cd backend && node server.js  # Should show "Server running on port 5000"
cd frontend && npm run dev     # Should open http://localhost:5173

# Export logs
node server.js > backend.log 2>&1
```

---

## Support

- **Documentation**: See `/README.md`
- **Issues**: Check console for detailed error messages
- **Database**: Delete `/backend/database.sqlite` and run `node seed.js` to reset
