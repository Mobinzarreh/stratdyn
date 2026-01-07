#!/bin/bash
# Script to download experiment data from AWS server
# Usage: ./download_experiment_data.sh

# Configuration
KEY_FILE="$HOME/.ssh/career-game.pem"
AWS_HOST="ec2-user@game.code-lab.org"
CONTAINER="stratdyn-app"
LOCAL_DIR="./remote-data"

echo "=== Experiment Data Download Script ==="
echo "Downloading from: $AWS_HOST"
echo "Local directory: $LOCAL_DIR"
echo ""

# Create local directory if it doesn't exist
mkdir -p "$LOCAL_DIR"

# Clean up old data (optional - comment out if you want to keep old files)
echo "Cleaning up old data..."
rm -f "$LOCAL_DIR"/*.csv

# Copy files from Docker container to AWS host
echo "Copying files from Docker container to AWS host..."
ssh -i "$KEY_FILE" "$AWS_HOST" "docker cp $CONTAINER:/app/logs/task_treatment_session1_pilot.csv /home/ec2-user/ 2>/dev/null || echo 'task_treatment_session1_pilot.csv not found'"
ssh -i "$KEY_FILE" "$AWS_HOST" "docker cp $CONTAINER:/app/logs/demographics_survey_treatment_session1_pilot.csv /home/ec2-user/ 2>/dev/null || echo 'demographics_survey_treatment_session1_pilot.csv not found'"
ssh -i "$KEY_FILE" "$AWS_HOST" "docker cp $CONTAINER:/app/logs/postsurvey_treatment_session1_pilot.csv /home/ec2-user/ 2>/dev/null || echo 'postsurvey_treatment_session1_pilot.csv not found'"
ssh -i "$KEY_FILE" "$AWS_HOST" "docker cp $CONTAINER:/app/logs/training_task_treatment_session1_pilot.csv /home/ec2-user/ 2>/dev/null || echo 'training_task_treatment_session1_pilot.csv not found'"

# Download files to local machine
echo "Downloading files to local machine..."
scp -i "$KEY_FILE" "$AWS_HOST:/home/ec2-user/task_treatment_session1_pilot.csv" "$LOCAL_DIR/" 2>/dev/null || echo "task_treatment_session1_pilot.csv not found on server"
scp -i "$KEY_FILE" "$AWS_HOST:/home/ec2-user/demographics_survey_treatment_session1_pilot.csv" "$LOCAL_DIR/" 2>/dev/null || echo "demographics_survey_treatment_session1_pilot.csv not found on server"
scp -i "$KEY_FILE" "$AWS_HOST:/home/ec2-user/postsurvey_treatment_session1_pilot.csv" "$LOCAL_DIR/" 2>/dev/null || echo "postsurvey_treatment_session1_pilot.csv not found on server"
scp -i "$KEY_FILE" "$AWS_HOST:/home/ec2-user/training_task_treatment_session1_pilot.csv" "$LOCAL_DIR/" 2>/dev/null || echo "training_task_treatment_session1_pilot.csv not found on server"

echo ""
echo "Download complete! Files in: $LOCAL_DIR"
ls -la "$LOCAL_DIR"/*.csv 2>/dev/null || echo "No CSV files found"

echo ""
echo "To clear server data for new pilot tests, run:"
echo "ssh -i $KEY_FILE $AWS_HOST 'docker exec $CONTAINER rm -f /app/logs/*.csv'"