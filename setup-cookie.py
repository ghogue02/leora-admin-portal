#!/usr/bin/env python3
"""
Interactive Session Cookie Setup Helper
Guides you through extracting and testing your halapp.com session cookie
"""

import requests
import json
from pathlib import Path

def print_instructions():
    """Print detailed instructions for getting the cookie"""
    print("=" * 70)
    print("🍪 HAL App Session Cookie Setup")
    print("=" * 70)
    print()
    print("Follow these steps to get your session cookie:")
    print()
    print("1️⃣  Open your browser and go to: https://www.halapp.com")
    print("   Make sure you're LOGGED IN")
    print()
    print("2️⃣  Open Developer Tools:")
    print("   • Chrome/Edge: Press F12 or Cmd+Option+I (Mac) / Ctrl+Shift+I (Win)")
    print("   • Firefox: Press F12 or Cmd+Option+I (Mac) / Ctrl+Shift+I (Win)")
    print("   • Safari: Cmd+Option+I (Mac)")
    print()
    print("3️⃣  Navigate to Cookies:")
    print("   • Chrome/Edge: Click 'Application' tab → 'Cookies' → 'https://www.halapp.com'")
    print("   • Firefox: Click 'Storage' tab → 'Cookies' → 'https://www.halapp.com'")
    print("   • Safari: Click 'Storage' tab → 'Cookies' → 'www.halapp.com'")
    print()
    print("4️⃣  Find and copy ALL cookies. Common names include:")
    print("   • sessionid")
    print("   • session")
    print("   • PHPSESSID")
    print("   • connect.sid")
    print("   • csrftoken")
    print("   • Any other authentication-related cookies")
    print()
    print("5️⃣  Copy the cookie NAME and VALUE for each cookie")
    print()
    print("=" * 70)
    print()

def collect_cookies():
    """Interactively collect cookies from user"""
    cookies = {}

    print("Let's collect your cookies. Enter them one at a time.")
    print("When you're done, just press Enter without typing anything.")
    print()

    while True:
        print("-" * 70)
        cookie_name = input("Cookie Name (or press Enter if done): ").strip()

        if not cookie_name:
            if cookies:
                break
            else:
                print("⚠️  You need to enter at least one cookie!")
                continue

        cookie_value = input(f"Cookie Value for '{cookie_name}': ").strip()

        if cookie_value:
            cookies[cookie_name] = cookie_value
            print(f"✅ Added: {cookie_name}")
        else:
            print("⚠️  Empty value, skipping...")

    return cookies

def test_cookies(cookies):
    """Test if the cookies work"""
    print()
    print("=" * 70)
    print("🧪 Testing your cookies...")
    print("=" * 70)

    # Test URL - try to access a document
    test_url = "https://www.halapp.com/a/wcb/sales/customer-invoice/"

    session = requests.Session()

    # Add cookies to session
    for name, value in cookies.items():
        session.cookies.set(name, value, domain='www.halapp.com')

    # Add headers
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
    })

    try:
        print(f"📡 Testing access to: {test_url}")
        response = session.get(test_url, timeout=10)

        print(f"📊 Response Status: {response.status_code}")
        print(f"📄 Content Type: {response.headers.get('Content-Type', 'unknown')}")

        # Check if we're logged in
        if response.status_code == 200:
            # Check for login indicators
            response_text = response.text.lower()

            if 'login' in response.url.lower() or 'sign in' in response_text:
                print("❌ FAILED: Redirected to login page")
                print("   Your cookies may be invalid or expired.")
                return False
            elif 'orders' in response_text or 'invoice' in response_text:
                print("✅ SUCCESS: Authentication working!")
                print("   You're logged in and can access the invoice page.")
                return True
            else:
                print("⚠️  UNCERTAIN: Got a response but can't confirm login status")
                print("   Response URL:", response.url)
                return None
        elif response.status_code in [401, 403]:
            print("❌ FAILED: Authentication error")
            return False
        else:
            print(f"⚠️  Unexpected status code: {response.status_code}")
            return None

    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return False

def save_cookies(cookies):
    """Save cookies to a config file"""
    config_file = Path('cookie-config.json')

    with open(config_file, 'w') as f:
        json.dump(cookies, f, indent=2)

    print()
    print("=" * 70)
    print(f"💾 Cookies saved to: {config_file}")
    print("=" * 70)
    print()
    print("Now updating bulk-download-invoices.py...")

    return config_file

def update_download_script(cookies):
    """Update the download script with cookies"""
    script_path = Path('bulk-download-invoices.py')

    if not script_path.exists():
        print("⚠️  Could not find bulk-download-invoices.py")
        return

    # Read the current script
    with open(script_path, 'r') as f:
        script_content = f.read()

    # Find and update the setup_session function
    cookie_code = "\n".join([
        f"    session.cookies.set('{name}', '{value}', domain='www.halapp.com')"
        for name, value in cookies.items()
    ])

    # Look for the comment line to replace
    marker = "    # If you need to add authentication cookies, uncomment and fill in:"

    if marker in script_content:
        # Replace the old cookie setup section
        import re

        # Find the section between the marker and the return statement
        pattern = r"(    # If you need to add authentication cookies.*?\n)(.*?)(    return session)"

        replacement = f"\\1{cookie_code}\n\n\\3"

        new_content = re.sub(pattern, replacement, script_content, flags=re.DOTALL)

        with open(script_path, 'w') as f:
            f.write(new_content)

        print(f"✅ Updated: {script_path}")
        print()
        print("Your cookies have been added to the script!")
    else:
        print("⚠️  Could not automatically update script")
        print("Please manually add these cookies to setup_session():")
        print()
        print(cookie_code)

def main():
    print_instructions()

    input("Press Enter when you're ready to enter your cookies...")
    print()

    cookies = collect_cookies()

    if not cookies:
        print("❌ No cookies entered. Exiting.")
        return

    print()
    print(f"📋 Collected {len(cookies)} cookie(s):")
    for name in cookies.keys():
        print(f"   • {name}")

    # Test the cookies
    test_result = test_cookies(cookies)

    if test_result is True:
        print()
        save_path = save_cookies(cookies)
        update_download_script(cookies)

        print("=" * 70)
        print("🎉 Setup Complete!")
        print("=" * 70)
        print()
        print("You can now run the bulk download script:")
        print("   python3 bulk-download-invoices.py")
        print()

    elif test_result is False:
        print()
        print("=" * 70)
        print("⚠️  Cookie Test Failed")
        print("=" * 70)
        print()
        print("The cookies don't seem to work. Please try:")
        print("1. Make sure you're logged into halapp.com")
        print("2. Copy ALL cookies from the site (not just one)")
        print("3. Make sure the cookies haven't expired")
        print("4. Try running this script again")
        print()

        save_anyway = input("Save cookies anyway? (y/n): ").lower()
        if save_anyway == 'y':
            save_cookies(cookies)
            update_download_script(cookies)
    else:
        print()
        print("⚠️  Couldn't verify cookies, but they might work.")
        save_cookies(cookies)
        update_download_script(cookies)
        print()
        print("Try running: python3 bulk-download-invoices.py")

if __name__ == '__main__':
    main()
