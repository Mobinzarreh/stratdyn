#!/bin/bash

# Download script for StratDyn experiment data
# Downloads all CSV files from AWS server to local remote-data directory

echo "🔄 Downloading StratDyn experiment data..."

# Create remote-data directory if it doesn't exist
mkdir -p remote-data

# Download all CSV files from server logs directory
scp -i ~/.ssh/career-game.pem ec2-user@game.code-lab.org:stratdyn/logs/*.csv remote-data/

echo "✅ Download complete! Files saved to remote-data/ directory:"
ls -lh remote-data/*.csv

echo ""
echo "📊 Data summary:"
echo "- Consent logs: $(ls remote-data/consent_log*.csv 2>/dev/null | wc -l) files"
echo "- Task data: $(ls remote-data/task*.csv 2>/dev/null | wc -l) files"
echo "- Survey data: $(ls remote-data/*survey*.csv 2>/dev/null | wc -l) files"
echo "- Training data: $(ls remote-data/training*.csv 2>/dev/null | wc -l) files"