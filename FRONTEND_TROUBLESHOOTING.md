# Frontend Not Loading - Troubleshooting Guide

## ✅ Server Status: WORKING
- Container is running correctly
- Web server responds with HTTP 200
- HTML content is being served properly
- API endpoints are accessible

## 🔧 Client-Side Troubleshooting Steps

### 1. **Check the Correct URL**
Make sure you're accessing the right URL:

✅ **CORRECT**: `http://localhost:34400/web/`
❌ **WRONG**: `http://localhost:34400/` (missing `/web/`)
❌ **WRONG**: `http://127.0.0.1:34400/web/`
❌ **WRONG**: `https://localhost:34400/web/` (HTTPS instead of HTTP)

### 2. **Clear Browser Cache**
The frontend files might be cached. Try:

1. **Hard refresh**: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)
2. **Clear browser cache**: F12 → Application → Storage → Clear Storage
3. **Try incognito/private mode**
4. **Try a different browser**

### 3. **Check Browser Console**
Open Developer Tools (F12) and check for errors:

1. Go to `http://localhost:34400/web/`
2. Press F12 to open Developer Tools
3. Click on **Console** tab
4. Look for any red error messages
5. Check **Network** tab for failed requests

### 4. **Firewall/Antivirus Issues**
- Windows Firewall might be blocking port 34400
- Antivirus software might be interfering
- Try temporarily disabling Windows Defender/firewall

### 5. **Docker Desktop Issues**
- Make sure Docker Desktop is running
- Try restarting Docker Desktop
- Check if other containers work on different ports

### 6. **Test Different Access Methods**

Try these URLs in order:
```
http://localhost:34400/web/
http://127.0.0.1:34400/web/
http://host.docker.internal:34400/web/
```

### 7. **Test API Endpoints First**
Before testing the web interface, verify these work:
```
http://localhost:34400/discover.json
http://localhost:34400/lineup_status.json
http://localhost:34400/device.xml
```

If these don't work, it's a connectivity issue.
If they work but `/web/` doesn't, it's a frontend-specific issue.

## 🐛 **Common Issues & Solutions**

### Issue: "This site can't be reached"
**Cause**: Port not accessible
**Solution**: 
- Check if container is running: `docker ps`
- Restart container: `docker-compose restart`
- Try different browser

### Issue: Blank white page
**Cause**: JavaScript/CSS not loading
**Solution**:
- Check browser console for errors
- Clear browser cache completely
- Try incognito mode

### Issue: "Connection refused"
**Cause**: Service not listening on port
**Solution**:
- Check container logs: `docker-compose logs threadfin`
- Verify port mapping in docker-compose.yml
- Restart Docker Desktop

### Issue: Page loads but looks broken
**Cause**: CSS/JS files not loading from CDN
**Solution**:
- Check internet connection
- Look for blocked CDN requests in Network tab
- Try different DNS servers

## 📋 **Quick Test Commands**

Run these commands to test connectivity:

```bash
# Test container is running
docker ps | grep threadfin

# Test basic connectivity  
curl -I http://localhost:34400/discover.json

# Test web interface
curl -s http://localhost:34400/web/ | head -10

# Check container logs
docker-compose logs threadfin | tail -10
```

## 🎯 **Most Likely Solutions**

Based on the diagnosis, try these in order:

1. **Use correct URL**: `http://localhost:34400/web/` (note the `/web/` path)
2. **Clear browser cache** and try incognito mode
3. **Check browser console** for JavaScript errors
4. **Try different browser** (Chrome, Firefox, Edge)
5. **Restart Docker Desktop** if other solutions don't work

## 🔧 **Container Configuration Fixed**

The following issues were resolved in docker-compose.yml:

✅ **Fixed network mode**: Removed `network_mode: host` (doesn't work on Docker Desktop for Windows)
✅ **Added port mapping**: `34400:34400` now properly mapped
✅ **Enabled debug logging**: `THREADFIN_DEBUG=1` for troubleshooting
✅ **Removed fixed domain**: Let Docker handle domain resolution

The server is working perfectly - the issue is client-side accessibility.