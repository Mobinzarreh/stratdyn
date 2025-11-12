# Phase 2: Traefik Configuration Guide

## Overview

Phase 2 adds Traefik as a reverse proxy to provide:
- ✅ Automatic HTTPS with Let's Encrypt SSL certificates
- ✅ Domain routing: `https://game.code-lab.org` → your app
- ✅ Automatic HTTP → HTTPS redirect
- ✅ Professional production setup

## Two Deployment Options

### Option 1: Simple Deployment (Recommended First)

Use `docker-compose.simple.yml` for initial testing:

```bash
# On AWS server
docker-compose -f docker-compose.simple.yml up -d --build
```

**Pros:**
- ✅ Quick to set up
- ✅ Easy to test
- ✅ No DNS/SSL configuration needed

**Cons:**
- ❌ No HTTPS (only HTTP)
- ❌ Access via IP:3000 or game.code-lab.org:3000
- ❌ Not production-ready for real participants

### Option 2: Traefik (Production)

Use `docker-compose.yml` with Traefik:

```bash
# On AWS server
docker-compose up -d --build
```

**Pros:**
- ✅ Professional HTTPS access
- ✅ Clean URL: https://game.code-lab.org
- ✅ Automatic SSL certificates
- ✅ Production-ready

**Cons:**
- ⚠️ Requires DNS configuration (Dr. Grogan)
- ⚠️ Requires ports 80/443 open in AWS security group
- ⚠️ Needs valid email for Let's Encrypt

## Prerequisites for Traefik

Before enabling Traefik, ensure:

1. **DNS is configured**: `game.code-lab.org` points to AWS server IP
   ```bash
   # Test DNS resolution
   nslookup game.code-lab.org
   # Should return AWS server IP
   ```

2. **Ports are open** in AWS Security Group:
   - Port 80 (HTTP) - for Let's Encrypt validation
   - Port 443 (HTTPS) - for HTTPS traffic
   - Port 3000 can be closed (Traefik handles routing)

3. **Update email** in docker-compose.yml:
   ```yaml
   - "--certificatesresolvers.letsencrypt.acme.email=your-email@example.com"
   ```
   Change to your real email address.

## Step-by-Step: Enabling Traefik

### Step 1: Verify Prerequisites

```bash
# On AWS server, check DNS
nslookup game.code-lab.org

# Check if ports 80/443 are accessible (from your local machine)
curl -I http://game.code-lab.org
curl -I https://game.code-lab.org
```

### Step 2: Update Email in docker-compose.yml

```bash
# Edit the file
nano docker-compose.yml

# Find this line and update email:
- "--certificatesresolvers.letsencrypt.acme.email=your-email@example.com"

# Save and exit (Ctrl+X, Y, Enter)
```

### Step 3: Create SSL Certificate Storage

```bash
mkdir -p letsencrypt
chmod 600 letsencrypt
```

### Step 4: Deploy with Traefik

```bash
# Stop any running containers
docker-compose down

# Start with Traefik
docker-compose up -d --build

# Watch logs
docker-compose logs -f
```

### Step 5: Verify HTTPS Works

```bash
# From your local machine
curl -I https://game.code-lab.org

# Should see:
# HTTP/2 200
# (various headers)
```

Open in browser: https://game.code-lab.org
- ✅ Should show your app
- ✅ Should have valid SSL certificate (lock icon)
- ✅ Should auto-redirect from HTTP to HTTPS

## Troubleshooting Traefik

### DNS not resolving

```bash
# Check DNS
nslookup game.code-lab.org

# If it doesn't work, contact Dr. Grogan
# DNS might not be configured yet
```

**Solution**: Use simple deployment until DNS is ready

### Ports not accessible

```bash
# Check if ports are open
sudo netstat -tulpn | grep -E ':80|:443'

# Check AWS security group settings
# Ask Dr. Grogan to open ports 80 and 443
```

### SSL certificate not generated

Check logs:
```bash
docker-compose logs traefik | grep -i error
```

Common issues:
- Email not updated in config
- Port 80 blocked (needed for Let's Encrypt validation)
- DNS not pointing to correct IP
- Domain already has SSL certificate from another source

### "Bad Gateway" error

```bash
# Check if stratdyn app is running
docker ps

# Check app logs
docker-compose logs stratdyn
```

The app container might have crashed. Check logs for errors.

### Dashboard not accessible

If you enabled Traefik dashboard (port 8080):
```bash
# Check if port is exposed
docker ps | grep traefik

# Access dashboard at:
# http://game.code-lab.org:8080 or http://IP:8080
```

## Configuration Details

### docker-compose.yml Structure

```yaml
traefik:
  # Traefik image and configuration
  command:
    - Docker provider: Reads labels from containers
    - Entrypoints: HTTP (80) and HTTPS (443)
    - ACME/Let's Encrypt: Automatic SSL
    - HTTP redirect: Forces HTTPS
  volumes:
    - Docker socket: Monitors containers
    - letsencrypt/: Stores SSL certificates

stratdyn:
  # Your application
  labels:
    - traefik.enable: Tell Traefik to route to this
    - Host rule: Route game.code-lab.org here
    - TLS: Use Let's Encrypt certificates
```

### Traefik Labels Explained

```yaml
# Enable Traefik for this container
traefik.enable=true

# Route requests from game.code-lab.org
traefik.http.routers.stratdyn.rule=Host(`game.code-lab.org`)

# Use HTTPS entrypoint
traefik.http.routers.stratdyn.entrypoints=websecure

# Use Let's Encrypt for SSL
traefik.http.routers.stratdyn.tls.certresolver=letsencrypt

# Tell Traefik which port the app uses internally
traefik.http.services.stratdyn.loadbalancer.server.port=3000
```

## Switching Between Simple and Traefik

### Currently using simple, want to add Traefik:

```bash
# Stop simple deployment
docker-compose -f docker-compose.simple.yml down

# Start with Traefik
docker-compose up -d --build
```

### Currently using Traefik, want to disable it:

```bash
# Stop Traefik deployment
docker-compose down

# Use simple deployment
docker-compose -f docker-compose.simple.yml up -d --build
```

## Coordinating with Dr. Grogan

When ready for Phase 2, ask Dr. Grogan to:

1. ✅ **Verify DNS**: Confirm `game.code-lab.org` points to your AWS instance
2. ✅ **Open ports**: Ensure AWS security group allows ports 80 and 443
3. ✅ **Test access**: Verify firewall rules don't block HTTPS
4. ✅ **Review setup**: Check your Traefik configuration together

You can share this file and the docker-compose.yml with him.

## Data Persistence with Traefik

All your data remains safe:
- ✅ CSV logs: Still in `./logs/`
- ✅ Experiment data: Still in `./data/`
- ✅ SSL certificates: Stored in `./letsencrypt/`

Everything survives container restarts.

## Security Notes

- 🔒 Let's Encrypt certificates auto-renew every 90 days
- 🔒 HTTP automatically redirects to HTTPS (no unencrypted traffic)
- 🔒 Traefik dashboard should be password-protected for production
- 🔒 Keep `letsencrypt/acme.json` secure (contains private keys)

## Quick Reference

```bash
# Deploy without Traefik (simple)
docker-compose -f docker-compose.simple.yml up -d --build

# Deploy with Traefik (production)
docker-compose up -d --build

# Check Traefik logs
docker-compose logs -f traefik

# Check app logs
docker-compose logs -f stratdyn

# View all running containers
docker ps

# Stop everything
docker-compose down

# View Traefik dashboard (if enabled)
http://game.code-lab.org:8080
```

## When to Use Each Option

**Use Simple (`docker-compose.simple.yml`):**
- ⭐ Initial deployment and testing
- ⭐ Before DNS is configured
- ⭐ For development/debugging
- ⭐ When Dr. Grogan hasn't opened ports yet

**Use Traefik (`docker-compose.yml`):**
- ⭐ Real participant sessions
- ⭐ After DNS points to your server
- ⭐ When ports 80/443 are open
- ⭐ Production deployment

## Next Steps After Phase 2

Once Traefik is working:
1. ✅ Test with real participants
2. ✅ Monitor SSL certificate renewal (automatic)
3. ✅ Set up log rotation (see logs/README.md)
4. ✅ Configure backups for experiment data
5. ✅ Add monitoring/alerting (optional)

---

**Ready to Deploy?**

1. **Start with Simple**: Test basic deployment first
2. **Coordinate with Dr. Grogan**: Get DNS and ports ready
3. **Enable Traefik**: Switch to production setup
4. **Test thoroughly**: Verify HTTPS and routing work
5. **Run experiment**: You're production-ready! 🚀
