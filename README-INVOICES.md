# HAL App Invoice Downloader

Automated script to download invoices from halapp.com for the last 30 days.

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Install Chromium Browser

```bash
npm run install-browsers
```

### 3. Configure Credentials

Create a `config.json` file with your halapp.com credentials:

```bash
cp config.json.example config.json
```

Edit `config.json` and add your credentials:

```json
{
  "username": "your-email@example.com",
  "password": "your-password"
}
```

**Important:** The `config.json` file is already added to `.gitignore` to keep your credentials safe.

## Usage

### Run the Download Script

```bash
npm run download
```

Or directly:

```bash
node download-invoices.js
```

### What It Does

1. **Logs in** to halapp.com using your credentials
2. **Navigates** to the invoice page with the last 30 days date range
3. **Extracts** invoice information (reference number, date, customer, amount)
4. **Downloads** all invoice PDFs
5. **Saves** invoice metadata to a JSON file

### Output

- **Invoices folder**: `./invoices/` - Contains downloaded PDF files
- **Data folder**: `./data/` - Contains JSON metadata with invoice details

## Configuration

Edit the `CONFIG` object in `download-invoices.js` to customize:

- `headless`: Set to `true` to run without opening a browser window
- `downloadDir`: Change where invoices are saved
- `loginUrl`: Update if the login page URL is different

## Troubleshooting

### Login Issues

If automatic login fails:

1. The script will keep the browser window open
2. Manually log in through the browser
3. Press Enter in the terminal to continue

### Need to Update Login Selectors

If the login form fields have different names, inspect the page and update the `loginSelectors` array in the script around line 75.

### Invoice Table Structure

The script tries to extract data from HTML tables. If the invoice page structure is different, you may need to update the `page.evaluate()` section around line 130 to match the actual HTML structure.

### Debugging

Set `headless: false` in the CONFIG to see what the browser is doing. The script includes helpful console messages showing progress.

## Manual Customization

### Change Date Range

By default, the script downloads invoices from the last 30 days. To change this, modify the `getDateRange()` function in `download-invoices.js`.

### Specific Invoice Selection

To download specific invoices instead of all, you can modify the script to filter the `invoices` array based on criteria like customer name, amount, or date.

## Security Notes

- Never commit `config.json` to version control
- The config file is excluded in `.gitignore`
- Consider using environment variables for production use
- Your credentials are only stored locally

## Requirements

- Node.js 14 or higher
- Internet connection
- Valid halapp.com account credentials
