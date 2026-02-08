# StratDyn Application - Project Structure & Component Reference

> **Last Updated:** December 30, 2025  
> **Branch:** feature/ui-intention-finalchoice  
> **Commit:** c43baab+

---

## Overview

StratDyn is a **behavioral research experiment platform** for studying strategic decision-making in collaborative design tasks. The application implements a game-theoretic experiment where paired participants make decisions that affect both their own and their partner's scores.

**Key Features:**
- Treatment vs Control group assignment
- Partner pairing system with synchronized task progression
- Two-stage decision process (Intention → Final Choice)
- 25 focal tasks + 5 distraction tasks + 5 training tasks
- Real-time admin monitoring and control

---

## Directory Structure

```
stratdyn/
├── bin/                    # Server entry point
├── data/                   # Configuration and credentials
├── logs/                   # CSV output files
├── local-folder/           # Local development storage
├── node_modules/           # Dependencies (gitignored)
├── public/                 # Frontend assets
│   ├── Design_images/      # Task design images (A, B, C, Y folders)
│   └── images/             # Static images
├── utils/                  # Utility modules
├── *.md                    # Documentation files
└── [root files]            # Core application files
```

---

## Core Application Files

### Backend

| File | Lines | Description |
|------|-------|-------------|
| **stratdyn.js** | ~1577 | **Main experiment logic module.** Handles all Socket.IO events, user authentication, task progression, scoring, CSV logging, and admin controls. This is the heart of the application. |
| **app.js** | ~31 | **Express application setup.** Configures Express server, static file serving, and Socket.IO integration. Imports and initializes `stratdyn.js`. |
| **bin/www** | ~90 | **Server entry point.** Standard Express generator file that creates HTTP server, sets port, and handles server errors. Run via `npm start`. |
| **package.json** | ~16 | **Node.js project manifest.** Defines dependencies (express, socket.io, lodash), scripts, and project metadata. |
| **package-lock.json** | — | Locked dependency versions for reproducible builds. |

### Frontend

| File | Lines | Description |
|------|-------|-------------|
| **public/index.html** | ~1045 | **Main UI template.** Contains all screen layouts: welcome, login modal, consent, briefing, demographics survey, intention stage, choice stage, post-survey, thank you, and admin dashboard. Uses Bootstrap 5. |
| **public/index.js** | ~1092 | **Client-side logic.** Handles Socket.IO communication, timer system, form validation, screen transitions, percentile visualizations, and admin controls. |
| **public/style.css** | 0 | Empty file. All styles are inline in HTML or from Bootstrap CDN. |

### Utilities

| File | Lines | Description |
|------|-------|-------------|
| **utils/calculations.js** | ~143 | **Percentile calculation module.** Exports `calculateUPercentile()`, `calculateRPercentile()`, `calculateRiskDominance()`, and `getTaskUValue()`. Core math for experiment scoring. |

---

## Data Files

### Active Configuration

| File | Description |
|------|-------------|
| **data/experiment.json** | **Master experiment configuration.** Contains tasks array (32 tasks with options, u-values, payoffs), user assignments (task order per user), partner mappings, distraction task settings, and runtime decisions storage. |
| **data/userCredentials.json** | **User authentication.** Maps usernames to passcodes and group assignments (treatment/control). Example: `{"user01": {"passcode": "pass01", "group": "treatment"}}` |
| **data/adminCredentials.json** | **Admin authentication.** Single admin password. Example: `{"admin": "attila"}` |

### Backup/Reference Files

| File | Description |
|------|-------------|
| **data/experiment_new.json** | Alternative experiment configuration (reference). |
| **data/experiment_old_backup.json** | Previous experiment configuration backup. |
| **data/userCredentials_new.json** | Alternative credentials (reference). |
| **data/userCredentials_old_backup.json** | Previous credentials backup. |

---

## Log Files (Output)

All CSV logs are written to the `logs/` directory with filenames based on group and session.

| File Pattern | Description |
|--------------|-------------|
| **task_{group}_{session}.csv** | Main experiment data: timestamps, username, partner, task label, intention value, u/r percentiles, final choice, points earned, penalties, net score. |
| **training_task_{group}_{session}.csv** | Training task data (separate for analysis exclusion). Same format as task log. |
| **demographics_survey_{group}_{session}.csv** | Demographics responses: age, gender, education, experience, etc. (8 questions). |
| **postsurvey_{group}_{session}.csv** | Post-experiment survey: 9 Likert-scale questions about collaboration experience. |
| **decline_log.csv** | Consent decline events with timestamps and usernames. |
| **reschedule_log.csv** | Reschedule requests with contact information. |
| **README.md** | Documentation for log file formats. |

---

## Deployment Files

### Docker

| File | Description |
|------|-------------|
| **Dockerfile** | Node.js 18 Alpine image, production build with npm ci, exposes port 3000. |
| **docker-compose.yml** | **Production deployment.** Full setup with Traefik reverse proxy, Let's Encrypt SSL, domain routing (game.code-lab.org), persistent volumes for data and logs. |
| **docker-compose.simple.yml** | **Simple deployment.** Direct port exposure without Traefik, for testing or local Docker deployment. |
| **.dockerignore** | Excludes node_modules, logs, .git from Docker build context. |
| **.env.example** | Example environment variables for deployment. |

### Configuration

| File | Description |
|------|-------------|
| **.gitignore** | Git ignore patterns: node_modules, logs, .env, etc. |

---

## Documentation Files

### Essential Guides

| File | Description |
|------|-------------|
| **README.md** | Project overview, quick start, and basic usage. |
| **ADMIN_GUIDE.md** | Admin dashboard usage: login, user monitoring, navigation controls, reset functionality. |
| **QUICKSTART.md** | Rapid setup guide for developers. |
| **TESTING_GUIDE.md** | Testing procedures and checklists. |
| **PRE_TESTING_CHECKLIST.md** | Pre-experiment verification steps. |

### Deployment Guides

| File | Description |
|------|-------------|
| **DEPLOYMENT.md** | General deployment instructions. |
| **AWS_QUICKSTART.md** | AWS-specific deployment with EC2, Docker, domain setup. |
| **TRAEFIK_GUIDE.md** | Traefik reverse proxy configuration for SSL and routing. |
| **RESTART_GUIDE.md** | How to restart the application after changes. |

### Technical Documentation

| File | Description |
|------|-------------|
| **CONTROL_VS_TREATMENT.md** | Explains the difference between treatment and control groups (R-percentile visibility). |
| **PAIRING_LOGIC.md** | Documents partner pairing algorithm and task assignment strategy. |
| **INDEPENDENT_USER_SOLUTION.md** | Architecture for independent user progression (vs synchronized mode). |

### Historical/Reference

| File | Description |
|------|-------------|
| **BUG_FIX_AUTO_ADVANCE.md** | Documents fix for auto-advance between stages. |
| **BUG_FIX_PARTNER_SYNC.md** | Documents fix for partner synchronization issues. |
| **MULTI_USER_FIXES.md** | Documents fixes for multi-user scenarios. |
| **BACKEND_COMPLETE.md** | Backend completion milestone notes. |
| **FRONTEND_COMPLETE.md** | Frontend completion milestone notes. |
| **ROBOT_REMOVAL_COMPLETE.md** | Documents removal of robot/AI partner feature. |
| **FEEDBACK_1_RANDOMIZATION.md** | Feedback implementation: option randomization. |
| **FEEDBACK_2_IMPLEMENTATION.md** | Feedback implementation: additional features. |
| **IMPLEMENTATION_PROGRESS.md** | Development progress tracking. |
| **FUNDAMENTAL_ISSUES_ANALYSIS.md** | Analysis of core issues during development. |
| **TESTING_NOW.md** | Current testing status/notes. |
| **data_access_guide.txt** | Guide for accessing experiment data. |

---

## Development/Debug Files

These files were created during development for testing and debugging. They are not required for production but kept for reference.

| File | Lines | Description |
|------|-------|-------------|
| **stratdyn_old.js** | 628 | Previous version of main logic (before major refactoring). |
| **stratdyn.js.backup** | — | Backup of stratdyn.js before changes. |
| **check_task5.js** | 44 | Debug script to investigate Task 5 assignment issues. |
| **verify_fix.js** | 43 | Verification script for percentile consistency fix. |
| **test_user02_consistency.js** | 50 | Test script for user02 intention→choice consistency. |
| **apply_csv_fix.py** | 232 | Python script that applied CSV deferred writing fix. |
| **generate_assignments.py** | 320 | Utility to generate user task assignments. Useful for adding new users. |
| **debug_output.log** | — | Debug log output from testing. |
| **server.log** | — | Server output log. |
| **server_debug.log** | — | Detailed server debug log. |

---

## Frontend Assets

### Design Images

Located in `public/Design_images/`:

| Folder | Description |
|--------|-------------|
| **A/** | Design option A images for all tasks |
| **B/** | Design option B images for all tasks |
| **C/** | Design option C images for all tasks |
| **Y/** | Design option Y (default/safe) images for all tasks |

Image naming convention: `design_{taskNumber}.png` (e.g., `design_1.png`, `design_2.png`)

### Static Images

Located in `public/images/`:

| File | Description |
|------|-------------|
| **ASU_VT.png** | University logo for welcome screen |

### Unused Assets

| File | Description |
|------|-------------|
| **public/robotImage.jpg** | Robot image from removed AI partner feature |
| **public/trial1.html** | Early prototype (demographics form) |
| **public/trial2.html** | Another prototype (~975 lines) |
| **public/index_alkim.html** | Earlier version of index.html |
| **public/interface_design.html** | Interface mockup/prototype |

---

## Key Socket.IO Events

### Client → Server

| Event | Description |
|-------|-------------|
| `login` | User/admin authentication |
| `submit-consent` | Consent form with agree/decline |
| `submit-briefing` | Briefing completion |
| `submit-demographics-survey` | Demographics data (8 questions) |
| `submit-intention` | Part 1 intention (0-100 scale) |
| `submit-finaldecision` | Part 2 final choice (A/B/C/Y) |
| `submit-postsurvey` | Post-experiment survey (9 questions) |
| `admin-move-users` | Admin navigation control |
| `admin-reset-all` | Admin full reset |

### Server → Client

| Event | Description |
|-------|-------------|
| `show-design-task` | Send task data for intention/choice stage |
| `show-consent-screen` | Display consent form |
| `show-briefing-screen` | Display study instructions |
| `show-demographics-survey-screen` | Display demographics form |
| `show-postsurvey-screen` | Display post-survey |
| `show-thank-you-screen` | Display completion message |
| `partner-waiting` | Notify that partner hasn't finished |
| `partner-ready` | Notify that partner is ready |
| `force-reload` | Force page refresh (after reset) |
| `update-admin-status` | Send user status to admin dashboard |

---

## Environment & Dependencies

### Node.js Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| express | ^4.18.2 | Web framework |
| socket.io | ^4.6.1 | Real-time communication |
| lodash | ^4.17.21 | Utility functions |
| debug | ~2.6.9 | Debug logging |
| cookie-parser | ~1.4.4 | Cookie handling |
| http-errors | ~1.6.3 | HTTP error creation |
| morgan | ~1.9.1 | HTTP request logging |

### Runtime Requirements

- Node.js 18+
- Port 3000 (internal)
- Persistent storage for `data/` and `logs/`

---

## Production Checklist

- [ ] Verify `data/experiment.json` has correct task assignments
- [ ] Verify `data/userCredentials.json` has all participant accounts
- [ ] Ensure `logs/` directory exists and is writable
- [ ] Test full user flow with one pair
- [ ] Verify CSV files are created correctly
- [ ] Test admin dashboard functionality
- [ ] Backup clean data files before experiment

---

## License

See [LICENSE](LICENSE) file.
