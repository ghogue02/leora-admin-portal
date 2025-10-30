# How to Get Your Session Cookie

The bulk download script needs authentication. Here's how to get your session cookie:

## Steps

1. **Open halapp.com in your browser** and log in

2. **Open Developer Tools**:
   - Chrome/Edge: Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
   - Firefox: Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
   - Safari: Enable Developer menu first, then press `Cmd+Option+I`

3. **Go to the Application/Storage tab**:
   - Chrome/Edge: Click "Application" tab → "Cookies" → "https://www.halapp.com"
   - Firefox: Click "Storage" tab → "Cookies" → "https://www.halapp.com"
   - Safari: Click "Storage" tab → "Cookies" → "www.halapp.com"

4. **Find the session cookie**:
   Look for cookies named something like:
   - `sessionid`
   - `session`
   - `PHPSESSID`
   - `connect.sid`
   - Or any cookie that looks like authentication

5. **Copy the cookie value**:
   - Click on the cookie name
   - Copy the entire "Value" field

6. **Update the script**:
   Open `bulk-download-invoices.py` and find this section (around line 15):

   ```python
   'session_cookie': None,  # Add your session cookie if authentication is required
   ```

   Change it to:

   ```python
   'session_cookie': 'YOUR_COOKIE_VALUE_HERE',
   ```

   Or, for multiple cookies, update the `setup_session()` function (around line 35):

   ```python
   # Uncomment and fill in:
   session.cookies.set('sessionid', 'YOUR_SESSION_COOKIE_VALUE')
   session.cookies.set('csrftoken', 'YOUR_CSRF_TOKEN_VALUE')  # if needed
   ```

7. **Run the script again**:
   ```bash
   python3 bulk-download-invoices.py
   ```

## Alternative: Use the Playwright Script

If getting cookies is too complex, you can use the Playwright script (`download-invoices.js`) which logs in automatically with your username and password:

```bash
npm install
npm run install-browsers
cp config.json.example config.json
# Edit config.json with your credentials
npm run download
```

## Security Note

- Session cookies are sensitive! Don't commit them to git
- Cookies expire after some time, so you may need to refresh them
- Never share your session cookie with others
