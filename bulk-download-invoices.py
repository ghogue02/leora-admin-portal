#!/usr/bin/env python3
"""
HAL App Invoice Bulk Downloader
Downloads invoices from halapp.com using reference number range
"""

import requests
import csv
import os
import time
from pathlib import Path
from datetime import datetime
import json

# Configuration
CONFIG = {
    'start_ref': 164847,
    'end_ref': 177697,
    'download_folder': 'invoices',
    'data_folder': 'data',
    'url_template': 'https://www.halapp.com/a/wcb/document/?for_type=customer_invoice&for_id={ref_num}',
    'delay_seconds': 0.5,  # Polite delay between requests
    'timeout': 30,  # Request timeout in seconds
    'session_cookie': None,  # Add your session cookie if authentication is required
}

def setup_directories():
    """Create necessary directories"""
    Path(CONFIG['download_folder']).mkdir(exist_ok=True)
    Path(CONFIG['data_folder']).mkdir(exist_ok=True)
    print(f"📁 Created directories: {CONFIG['download_folder']}, {CONFIG['data_folder']}")

def setup_session():
    """Setup requests session with headers"""
    session = requests.Session()

    # Add realistic headers
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/pdf,text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
    })

    # If you need to add authentication cookies, uncomment and fill in:
    # session.cookies.set('sessionid', 'YOUR_SESSION_COOKIE_VALUE')

    return session

def download_invoice(session, ref_num):
    """Download a single invoice by reference number"""
    url = CONFIG['url_template'].format(ref_num=ref_num)

    try:
        response = session.get(url, timeout=CONFIG['timeout'], allow_redirects=True)

        if response.status_code == 200:
            # Check if we got a PDF (not an error page)
            content_type = response.headers.get('Content-Type', '')

            if 'pdf' in content_type.lower() or response.content.startswith(b'%PDF'):
                # Save the PDF
                filename = f"{CONFIG['download_folder']}/{ref_num}.pdf"
                with open(filename, 'wb') as f:
                    f.write(response.content)

                file_size = len(response.content) / 1024  # KB
                return {
                    'status': 'success',
                    'filename': filename,
                    'size': f"{file_size:.1f} KB",
                    'url': url
                }
            elif 'text/html' in content_type.lower():
                # Got HTML instead of PDF - might be login page or error
                if 'login' in response.url.lower() or 'sign' in response.url.lower():
                    return {
                        'status': 'auth_required',
                        'message': 'Authentication required',
                        'url': url
                    }
                else:
                    return {
                        'status': 'not_found',
                        'message': 'Invoice not found',
                        'url': url
                    }
            else:
                return {
                    'status': 'not_found',
                    'message': f'Unexpected content type: {content_type}',
                    'url': url
                }

        elif response.status_code == 404:
            return {
                'status': 'not_found',
                'message': '404 Not Found',
                'url': url
            }

        elif response.status_code in [401, 403]:
            return {
                'status': 'auth_required',
                'message': f'Authentication error: {response.status_code}',
                'url': url
            }

        else:
            return {
                'status': 'error',
                'message': f'HTTP {response.status_code}',
                'url': url
            }

    except requests.Timeout:
        return {
            'status': 'error',
            'message': 'Request timeout',
            'url': url
        }
    except Exception as e:
        return {
            'status': 'error',
            'message': str(e),
            'url': url
        }

def main():
    """Main download process"""
    setup_directories()

    print("🚀 HAL App Invoice Bulk Downloader")
    print(f"📊 Reference range: {CONFIG['start_ref']} → {CONFIG['end_ref']}")
    print(f"📦 Total numbers to check: {CONFIG['end_ref'] - CONFIG['start_ref'] + 1:,}")
    print(f"⏱️  Delay between requests: {CONFIG['delay_seconds']}s")
    print()

    # Confirm before starting
    response = input("Start download? (y/n): ")
    if response.lower() != 'y':
        print("❌ Cancelled")
        return

    session = setup_session()

    # Statistics
    stats = {
        'successful': 0,
        'not_found': 0,
        'auth_required': 0,
        'errors': 0,
        'total_checked': 0,
        'start_time': time.time(),
    }

    # CSV log file
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    csv_file = f"{CONFIG['data_folder']}/download_log_{timestamp}.csv"

    with open(csv_file, 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(['Reference Number', 'Status', 'Filename/Message', 'Size', 'URL'])

        print(f"\n⬇️  Starting download...\n")

        for ref_num in range(CONFIG['start_ref'], CONFIG['end_ref'] + 1):
            stats['total_checked'] += 1

            result = download_invoice(session, ref_num)

            # Update statistics
            if result['status'] == 'success':
                stats['successful'] += 1
                writer.writerow([
                    ref_num,
                    'Downloaded',
                    result['filename'],
                    result['size'],
                    result['url']
                ])
                print(f"✅ {ref_num}: Downloaded ({result['size']})")

            elif result['status'] == 'not_found':
                stats['not_found'] += 1
                # Only log to CSV, don't print (too noisy)
                writer.writerow([ref_num, 'Not Found', result['message'], '', result['url']])

            elif result['status'] == 'auth_required':
                stats['auth_required'] += 1
                writer.writerow([ref_num, 'Auth Required', result['message'], '', result['url']])
                print(f"🔐 {ref_num}: {result['message']}")

                # If we hit auth error, stop
                if stats['auth_required'] >= 3:
                    print("\n⚠️  Multiple authentication errors detected!")
                    print("You may need to log in manually or provide session cookies.")
                    print("\nTo add authentication:")
                    print("1. Log into halapp.com in your browser")
                    print("2. Open DevTools > Application > Cookies")
                    print("3. Copy the session cookie value")
                    print("4. Add it to CONFIG['session_cookie'] in the script")
                    break

            else:
                stats['errors'] += 1
                writer.writerow([ref_num, 'Error', result['message'], '', result['url']])
                print(f"❌ {ref_num}: {result['message']}")

            # Progress indicator every 100 items
            if stats['total_checked'] % 100 == 0:
                elapsed = time.time() - stats['start_time']
                rate = stats['total_checked'] / elapsed
                remaining = (CONFIG['end_ref'] - ref_num) / rate if rate > 0 else 0

                print(f"\n📊 Progress: {stats['total_checked']:,} checked | "
                      f"{stats['successful']} downloaded | "
                      f"~{remaining/60:.1f}min remaining\n")

            # Polite delay
            time.sleep(CONFIG['delay_seconds'])

    # Final summary
    elapsed = time.time() - stats['start_time']

    print("\n" + "="*60)
    print("📊 DOWNLOAD COMPLETE!")
    print("="*60)
    print(f"✅ Successfully downloaded: {stats['successful']:,}")
    print(f"⚠️  Not found (expected): {stats['not_found']:,}")
    print(f"🔐 Authentication required: {stats['auth_required']}")
    print(f"❌ Errors: {stats['errors']}")
    print(f"📦 Total checked: {stats['total_checked']:,}")
    print(f"⏱️  Time elapsed: {elapsed/60:.1f} minutes")
    print(f"📁 PDFs saved to: {CONFIG['download_folder']}/")
    print(f"📋 Log saved to: {csv_file}")
    print("="*60)

    # Save summary JSON
    summary_file = f"{CONFIG['data_folder']}/download_summary_{timestamp}.json"
    with open(summary_file, 'w') as f:
        json.dump({
            'statistics': stats,
            'config': CONFIG,
            'timestamp': timestamp,
            'elapsed_seconds': elapsed,
        }, f, indent=2)

    print(f"💾 Summary saved to: {summary_file}")

if __name__ == '__main__':
    main()
