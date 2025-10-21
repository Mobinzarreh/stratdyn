# Quick Restart Commands for stratdyn

## ✅ Recommended: Graceful Restart
```bash
pkill -f "node.*www" && sleep 2 && npm start
```

**Why this works:**
- `pkill -f "node.*www"` - Kills only the stratdyn server (not ALL node processes)
- `sleep 2` - Gives time for port to be released
- `npm start` - Starts the server normally (shows output)

---

## 🎯 Background Mode (No Output)
```bash
pkill -f "node.*www" && sleep 2 && npm start > /dev/null 2>&1 &
```

**Why this works:**
- Same as above but runs in background
- `> /dev/null 2>&1` - Hides all output
- `&` - Runs in background
- Good for testing when you don't need to see logs

---

## 🔍 Check if Server is Running
```bash
ps aux | grep "node.*www" | grep -v grep
```

**Output shows:**
- PID (process ID)
- Memory usage
- Running time
- Confirms server is active

---

## 🛑 Stop Server Only
```bash
pkill -f "node.*www"
```

---

## ⚠️ Why NOT to Use `pkill -9 node`

**Problem:** `pkill -9 node` kills ALL node processes including:
- VS Code extensions (running in Node)
- Other development tools
- Any node scripts you have running
- Can crash VS Code or other tools!

**Better:** Use `-f "node.*www"` to target only the stratdyn server

---

## 📋 Complete Workflow

### 1. Make Code Changes
Edit `stratdyn.js`, `index.html`, etc.

### 2. Restart Server
```bash
pkill -f "node.*www" && sleep 2 && npm start
```

### 3. Test in Browser
- Refresh page (F5)
- Or hard refresh (Ctrl+Shift+R) to clear cache

### 4. Check Server Logs
Server output shows:
- "New user userXX - starting at demographics"
- "userXX completed task Y. Advancing to index Z"
- Any errors or issues

---

## 🚀 Quick One-Liner (From Any Directory)
```bash
pkill -f "node.*www" && sleep 2 && cd /home/mzarreh/projects2/stratdyn && npm start
```

---

## 💡 Pro Tips

### Clear Old Test Data Before Testing
```bash
pkill -f "node.*www" && \
mkdir -p test_backups/$(date +%Y%m%d_%H%M%S) && \
mv *_session1.csv test_backups/$(date +%Y%m%d_%H%M%S)/ 2>/dev/null; \
npm start
```

### Check What's Running on Port 3000
```bash
lsof -i :3000
```

### Force Kill if Server is Stuck
```bash
pkill -9 -f "node.*www"
```
(Only use if normal `pkill` doesn't work)

---

## 📝 Summary

**DO THIS:**
```bash
pkill -f "node.*www" && sleep 2 && npm start
```

**DON'T DO THIS:**
```bash
pkill -9 node  # ❌ Kills everything!
```

**IF SERVER WON'T STOP:**
```bash
pkill -9 -f "node.*www"  # ✅ Force kill only stratdyn
```
