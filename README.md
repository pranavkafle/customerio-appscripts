# Customer.io Google Apps Script Tools

A collection of Google Apps Script tools for working with Customer.io, starting with a bulk unsuppress tool.

## Unsuppress Tool

This tool allows you to unsuppress multiple Customer.io people at once using data from a Google Sheet.

### Features

- Bulk unsuppress Customer.io people from a Google Sheet
- Automatic batching to respect API limits
- Deduplication of IDs
- User-friendly error handling and logging
- Easy to set up and use

### Setup Instructions

1. **Create a Google Sheet**
   - Create a new Google Sheet
   - Name one sheet 'profiles' (or update the `SHEET_NAME` constant in the script)
   - Add a column named 'id' containing Customer.io person IDs

2. **Set up the Script**
   - Open the Google Sheet
   - Go to Extensions → Apps Script
   - Copy the contents of `unsupress.js` into the script editor
   - Save the project

3. **Configure API Credentials**
   - In the Apps Script editor, go to Project Settings → Script Properties
   - Add a new property:
     - Name: `CUSTOMER_IO_TRACK_API_KEY`
     - Value: Your Customer.io credentials in the format `site_id:api_key`

4. **Run the Script**
   - Return to your Google Sheet
   - Refresh the page
   - You should see a new menu item "Customer.io Tools"
   - Click "Unsuppress People" to run the script

### Usage Notes

- The script will process all non-blank IDs in the 'id' column
- Duplicate IDs are automatically removed
- The script batches requests to stay within Customer.io's API limits
- Results are logged in the Apps Script execution log
- You can schedule the script to run automatically using Apps Script triggers

### API Limits

The script respects Customer.io's v2 Track API limits:
- Each request in a batch ≤ 32 KB
- Each /batch payload ≤ 500 KB

### Troubleshooting

If you encounter errors:
1. Check that your API credentials are correctly set in Script Properties
2. Verify that your sheet has the correct name and column header
3. Check the execution log for detailed error messages
4. Ensure your IDs are valid Customer.io person IDs

## License

MIT License - feel free to use and modify as needed. 