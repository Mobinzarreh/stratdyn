# AWS Data Download & Verification Guide

## Overview
This guide documents the process for downloading experiment data from AWS and verifying that the 0 value handling fixes are working correctly.

## Prerequisites
- SSH private key: `~/.ssh/career-game.pem`
- AWS server access: `game.code-lab.org`
- Download script: `download_experiment_data.sh`

## Quick Download Command

```bash
cd /home/mzarreh/projects2/stratdyn
./download_experiment_data.sh
```

## Detailed Download Process

### Step 1: Run the Download Script
```bash
# Make script executable (first time only)
chmod +x download_experiment_data.sh

# Run the download
./download_experiment_data.sh
```

### Step 2: Verify Downloaded Files
```bash
# Check downloaded files
ls -la remote-data/

# Expected files:
# - task_treatment_session1_pilot.csv (main experiment data)
# - demographics_survey_treatment_session1_pilot.csv
# - postsurvey_treatment_session1_pilot.csv
# - training_task_treatment_session1_pilot.csv
```

### Step 3: Analyze the Data
```bash
# Check data structure
wc -l remote-data/task_treatment_session1_pilot.csv
head -1 remote-data/task_treatment_session1_pilot.csv

# View sample data
head -5 remote-data/task_treatment_session1_pilot.csv
```

## Data Verification Checklist

### ✅ CSV Structure Verification
- [ ] **Headers present:** `uiTaskNumber`, `uiIndividualDifficulty`, `uiPairedDifficulty`
- [ ] **Column count:** 27 columns total
- [ ] **Data rows:** Multiple rows of experiment data

### ✅ 0 Value Handling Verification

#### Intention Values
```bash
# Check for intention = 0
grep -E ",0," remote-data/task_treatment_session1_pilot.csv | head -3
```
- [ ] **Expected:** `0` values appear (not empty strings)
- [ ] **Example:** `...,0,1767991930728,3.816,...`

#### uPercentile Values
```bash
# Check for uPercentile = 0
cut -d',' -f13 remote-data/task_treatment_session1_pilot.csv | grep "^0$" | head -3
```
- [ ] **Expected:** `0` values in uPercentile column
- [ ] **user01 baseline:** Tasks 1-4 should show `0` (0% difficulty)

#### uiIndividualDifficulty Values
```bash
# Check for uiIndividualDifficulty = 0
cut -d',' -f16 remote-data/task_treatment_session1_pilot.csv | grep "^0$" | head -3
```
- [ ] **Expected:** `0` values in uiIndividualDifficulty column
- [ ] **Critical check:** user01's early tasks should show `0`

#### uiPairedDifficulty Values
```bash
# Check for uiPairedDifficulty = 0
cut -d',' -f17 remote-data/task_treatment_session1_pilot.csv | grep "^0$" | head -3
```
- [ ] **Expected:** `0` values in uiPairedDifficulty column
- [ ] **Partner data:** Should show partner's difficulty percentile

### ✅ Data Quality Checks

#### User Pair Consistency
```bash
# Check user01 and user02 data pairing
grep "user01" remote-data/task_treatment_session1_pilot.csv | wc -l
grep "user02" remote-data/task_treatment_session1_pilot.csv | wc -l
```
- [ ] **Expected:** Similar number of rows for paired users

#### Task Numbering
```bash
# Check uiTaskNumber progression
cut -d',' -f5,6 remote-data/task_treatment_session1_pilot.csv | grep -v "task," | sort | uniq
```
- [ ] **Expected:** Sequential uiTaskNumber values (1, 2, 3, ...)

#### Score Calculations
```bash
# Check score values are reasonable
cut -d',' -f24,25,26 remote-data/task_treatment_session1_pilot.csv | grep -v "pointsEarned" | head -5
```
- [ ] **Expected:** Points earned, penalties, and net scores
- [ ] **Note:** 0 values should be included in calculations

## Troubleshooting

### No Data Downloaded
```bash
# Check if files exist on server
ssh -i ~/.ssh/career-game.pem ec2-user@game.code-lab.org "ls -la stratdyn/logs/"

# Check file permissions
ssh -i ~/.ssh/career-game.pem ec2-user@game.code-lab.org "docker exec stratdyn-app ls -la /app/logs/"
```

### Empty CSV Files
```bash
# Check if application is running
curl -I https://game.code-lab.org/

# Check application logs
ssh -i ~/.ssh/career-game.pem ec2-user@game.code-lab.org "cd stratdyn && docker-compose logs stratdyn | tail -20"
```

### Missing 0 Values (Regression)
If 0 values are missing again:
```bash
# Check if old container is running
ssh -i ~/.ssh/career-game.pem ec2-user@game.code-lab.org "docker exec stratdyn-app grep -A 2 'userDecision.intention' /app/stratdyn.js"

# Expected: explicit null checks (!== undefined && !== null)
# Problem: old code with (value || '')
```

## Recent Fixes Applied

### Issue: 0 Values Treated as Missing Data
**Problem:** JavaScript's falsy evaluation treated `0` as missing data
**Root Cause:** CSV writing used `(value || '')` patterns
**Solution:** Replaced with explicit checks `(value !== undefined && value !== null ? value : '')`

### Critical Data Points Now Correctly Logged:
- ✅ **Intention = 0** (participant choices)
- ✅ **uPercentile = 0** (0% difficulty - user01 baseline tasks)
- ✅ **uiIndividualDifficulty = 0** (user's difficulty percentile)
- ✅ **uiPairedDifficulty = 0** (partner's difficulty percentile)
- ✅ **Score calculations** including 0-point tasks

## Data Analysis Commands

### Extract Specific User Data
```bash
# user01 data only
grep "user01" remote-data/task_treatment_session1_pilot.csv > user01_data.csv

# user02 data only
grep "user02" remote-data/task_treatment_session1_pilot.csv > user02_data.csv
```

### Check for Data Anomalies
```bash
# Find empty intention values (should be rare now)
cut -d',' -f9 remote-data/task_treatment_session1_pilot.csv | grep "^$" | wc -l

# Find empty uPercentile values (should be 0 now)
cut -d',' -f13 remote-data/task_treatment_session1_pilot.csv | grep "^$" | wc -l
```

### Statistical Summary
```bash
# Count intention value frequencies
cut -d',' -f9 remote-data/task_treatment_session1_pilot.csv | grep -v "^$" | sort | uniq -c

# Count uPercentile value frequencies
cut -d',' -f13 remote-data/task_treatment_session1_pilot.csv | grep -v "^$" | sort | uniq -c
```

## File Locations

### Local Files
- `remote-data/task_treatment_session1_pilot.csv` - Main experiment data
- `remote-data/demographics_survey_treatment_session1_pilot.csv` - Demographics
- `remote-data/postsurvey_treatment_session1_pilot.csv` - Post-survey responses
- `remote-data/training_task_treatment_session1_pilot.csv` - Training task data

### AWS Server Files
- `/home/ec2-user/stratdyn/logs/task_treatment_session1_pilot.csv`
- Container path: `/app/logs/task_treatment_session1_pilot.csv`

## Contact Information
- **Developer**: Mobin Zarreh
- **Project**: StratDyn Strategic Decision Making Experiment
- **Data Collection**: https://game.code-lab.org/
- **AWS Server**: game.code-lab.org (54.196.227.82)

---

*Last verified: January 9, 2026*
*Data integrity: ✅ All 0 values properly logged*
*Download method: ✅ Automated script working*</content>
<parameter name="filePath">/home/mzarreh/projects2/stratdyn/AWS_DATA_DOWNLOAD_GUIDE.md