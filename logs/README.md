# Logs Directory

This directory contains all CSV experiment data files generated during sessions.

## Log Files Structure

### Session-based Files

All CSV files follow the naming pattern: `{type}_{group}_{sessionId}.csv`

**Main Task Data:**
- `task_treatment_session1.csv` - Treatment group main experiment data (tasks 2-31)
- `task_control_session1.csv` - Control group main experiment data (tasks 2-31)
- `training_task_treatment_session1.csv` - Treatment group training data (tasks 0-1)
- `training_task_control_session1.csv` - Control group training data (tasks 0-1)

**Survey Data:**
- `demographics_survey_{group}_{session}.csv` - Demographics information
- `presurvey_{group}_{session}.csv` - Pre-experiment survey responses
- `postsurvey_{group}_{session}.csv` - Post-experiment survey responses

**Event Logs:**
- `decline_log.csv` - Records when participants decline consent
- `reschedule_log.csv` - Stores reschedule requests and contact info

## CSV Column Descriptions

### Task Files (task_*.csv, training_task_*.csv)

```
timestamp          - Unix timestamp when task was completed
username           - Participant identifier (e.g., user01)
group              - treatment or control
partner            - Partner's username
task               - Task label (e.g., "Task 3")
intention          - Collaboration intention (0-100 scale)
intentionTimestamp - When intention was submitted
uValue             - Individual difficulty value (0-1)
uPercentile        - Individual difficulty percentile (0-100)
rValue             - Paired difficulty R value (0-1)
rPercentile        - Paired difficulty percentile (0-100)
finalChoice        - Selected option (A, B, C, or Y)
finalChoiceTimestamp - When final choice was submitted
pointsEarned       - Raw points from outcome
pointsLostPenalty  - Penalty points for time overruns
scoreNet           - Net score (pointsEarned - pointsLostPenalty)
partnerChoice      - Partner's selected option
partnerScore       - Partner's net score
```

### Demographics Survey Files

```
timestamp - When survey was submitted
username  - Participant identifier
group     - treatment or control
age       - Age range selection
gender    - Gender selection
education - Education level
... (other demographic fields)
```

### Pre/Post Survey Files

```
timestamp  - When survey was submitted
username   - Participant identifier
group      - treatment or control
question_1 - Response to question 1
question_2 - Response to question 2
... (9 questions total)
```

### Event Log Files

**decline_log.csv:**
```
timestamp - ISO timestamp
username  - Who declined
group     - treatment or control
event     - Event type (DECLINED_CONSENT)
```

**reschedule_log.csv:**
```
timestamp      - ISO timestamp
username       - Who wants to reschedule
group          - treatment or control
email          - Contact email
phone          - Contact phone
preferredTime  - Preferred time (not currently collected)
```

## Accessing Logs

### During Development (Local)

```bash
# View all log files
ls -lh logs/

# View treatment group task data
cat logs/task_treatment_session1.csv

# Count completed tasks
wc -l logs/task_treatment_session1.csv

# View latest entries
tail logs/task_treatment_session1.csv
```

### On AWS Server (Docker)

```bash
# View logs from host machine
cd /home/ec2-user/stratdyn
ls -lh logs/

# View logs from inside container
docker exec -it stratdyn-app sh
cd /app/logs
ls -lh

# Copy logs from server to local machine
scp -i ~/.ssh/career-game.pem ec2-user@game.code-lab.org:~/stratdyn/logs/*.csv ./local-backup/
```

## Data Persistence

- **Docker volumes**: The `logs/` directory is mounted as a volume in docker-compose.yml
- **Survives restarts**: Log files persist even when containers are stopped/restarted
- **Backup recommended**: Regular backups are recommended before each new session

## Changing Sessions

To start a new experimental session with fresh log files:

1. Edit `stratdyn.js` line ~62:
   ```javascript
   let sessionId = 'session2'; // Change from 'session1'
   ```

2. Restart the server:
   ```bash
   docker-compose down
   docker-compose up -d --build
   ```

New CSV files will be created with the new session ID:
- `task_treatment_session2.csv`
- `task_control_session2.csv`
- etc.

## Log Rotation

### Manual Rotation

Before starting a new session:

```bash
# Backup current logs
mkdir -p logs/archive/session1
mv logs/*_session1.csv logs/archive/session1/

# Or with timestamp
mkdir -p logs/archive/$(date +%Y%m%d_%H%M%S)
mv logs/*.csv logs/archive/$(date +%Y%m%d_%H%M%S)/
```

### Automated Rotation (Advanced)

For production, consider using `logrotate` on the host:

```bash
# /etc/logrotate.d/stratdyn
/home/ec2-user/stratdyn/logs/*.csv {
    daily
    rotate 30
    compress
    missingok
    notifempty
    create 0644 ec2-user ec2-user
}
```

## Security & Privacy

⚠️ **Important**: CSV files contain participant data

- **DO NOT** commit CSV files to Git (already in .gitignore)
- **DO NOT** share logs publicly
- **DO** backup logs to secure storage
- **DO** delete logs after data analysis is complete (per IRB requirements)

## Troubleshooting

### Logs directory not created

```bash
# Create manually
mkdir -p logs
chmod 755 logs
```

### Permission issues in Docker

```bash
# Fix permissions on host
chmod -R 755 logs/
```

### CSV files empty or corrupted

- Check server logs: `docker-compose logs -f`
- Verify participants are completing tasks
- Check file permissions: `ls -l logs/`

### Missing log files

- Ensure `sessionId` in stratdyn.js matches expected value
- Check that server initialized correctly (see server startup logs)
- Verify participants' group assignment (treatment vs control)

## Data Analysis

After collecting data:

1. **Download logs** from AWS server
2. **Verify completeness**: Check row counts match expected participants × tasks
3. **Import to analysis tool**: R, Python, Excel, etc.
4. **Separate training data**: Use `training_task_*.csv` for practice, `task_*.csv` for analysis
5. **Account for penalties**: Use `scoreNet` for ranking, not `pointsEarned`

## Questions?

For technical issues with logging:
- Check `stratdyn.js` lines 60-160 (logging setup)
- Check server console output
- Verify Docker volume mounts in `docker-compose.yml`

For data interpretation:
- See experiment documentation
- Consult with Dr. Grogan

---

**Last Updated**: November 2025  
**Maintained by**: Mobin Zarreh
