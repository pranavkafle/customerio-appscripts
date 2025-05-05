/**
 * Unsuppress Customer.io people listed in a Google Sheet.
 *
 * Requirements & Setup
 * ────────────────────
 * 1. Create a Google Sheet with:
 *    - A sheet named 'profiles' (or change SHEET_NAME constant)
 *    - A column named 'id' containing Customer.io person IDs
 * 2. Set up your Customer.io API credentials:
 *    - Go to Script Editor → Project Settings → Script Properties
 *    - Add a new property named 'CUSTOMER_IO_TRACK_API_KEY'
 *    - Value should be your 'site_id:api_key' string
 * 3. The v2 Track API limits are respected:
 *    - Each request in a batch ≤ 32 KB
 *    - Each /batch payload ≤ 500 KB
 *
 * How it works
 * ────────────
 * 1. Reads all non-blank IDs, deduplicating with a Set
 * 2. Maps each ID to the minimal unsuppress payload
 * 3. Chunks those payloads so that the JSON for each chunk stays < 500 KB
 * 4. Sends each chunk to /v2/batch with proper Basic auth
 * 5. Logs the response status for every batch
 *
 * You can schedule the main function `unsuppressPersons` in Apps Script → Triggers
 * if you need to run it automatically.
 */

/** Add custom UI menu on spreadsheet open */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Customer.io Tools')
    .addItem('Unsuppress People', 'unsuppressPersons')
    .addToUi();
}

/** Main entry point */
function unsuppressPersons() {
  try {
    const SHEET_NAME      = 'profiles';      // 🔧 change if your sheet is named differently
    const ID_COLUMN_NAME  = 'id';          // 🔧 change if the header is different
    const PROP_KEY        = 'CUSTOMER_IO_TRACK_API_KEY';
    const BATCH_ENDPOINT  = 'https://track.customer.io/api/v2/batch';
    const SIZE_LIMIT      = 500 * 1024;    // 500 KB

    // Fetch & encode API credentials
    const keyString = PropertiesService.getScriptProperties().getProperty(PROP_KEY);
    if (!keyString) {
      throw new Error(`Missing API credentials. Please set up the '${PROP_KEY}' script property with your site_id:api_key.`);
    }
    const headers = {
      'Authorization': 'Basic ' + Utilities.base64Encode(keyString),
      'Content-Type': 'application/json'
    };

    // Read the sheet once in bulk
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) {
      throw new Error(`Sheet "${SHEET_NAME}" not found. Please create a sheet with this name or update the SHEET_NAME constant.`);
    }

    const values    = sheet.getDataRange().getValues();
    const headerRow = values[0];
    const idColIdx  = headerRow.indexOf(ID_COLUMN_NAME);
    if (idColIdx === -1) {
      throw new Error(`Column "${ID_COLUMN_NAME}" not found. Please add a column with this header or update the ID_COLUMN_NAME constant.`);
    }

    const ids = new Set();
    for (let i = 1; i < values.length; i++) {
      const id = values[i][idColIdx];
      if (id) ids.add(String(id).trim());  // deduplicate & coerce to string
    }
    if (ids.size === 0) {
      SpreadsheetApp.getUi().alert('No IDs to unsuppress – nothing to do.');
      return;
    }

    // Build minimal event objects
    const events = [...ids].map(id => ({
      type: 'person',
      identifiers: { id },
      action: 'unsuppress'
    }));

    // Chunk events so that each JSON payload < 500 KB
    const batches = chunkBySize(events, SIZE_LIMIT);
    Logger.log(`Total IDs: %s | Total batches: %s`, events.length, batches.length);

    // Send every batch
    batches.forEach((batchEvents, idx) => {
      const payloadObj = { batch: batchEvents };
      const response   = UrlFetchApp.fetch(BATCH_ENDPOINT, {
        method : 'post',
        headers: headers,
        payload: JSON.stringify(payloadObj),
        muteHttpExceptions: true
      });

      Logger.log('Batch %s | events: %s | status: %s | payload size: %s bytes',
                 idx + 1, batchEvents.length, response.getResponseCode(),
                 JSON.stringify(payloadObj).length);
    });

    SpreadsheetApp.getUi().alert(`Successfully processed ${events.length} IDs in ${batches.length} batches. Check the logs for details.`);
  } catch (error) {
    Logger.log('Error: ' + error.message);
    SpreadsheetApp.getUi().alert('Error: ' + error.message);
  }
}

/**
 * Split an array of events into chunks whose serialized JSON stays below the given byte size.
 * @param {Object[]} events     – event objects (already minimal)
 * @param {number}   sizeLimit  – max bytes per /batch request (500 KB)
 * @returns {Object[][]} array of event-array chunks
 */
function chunkBySize(events, sizeLimit) {
  const chunks = [];
  let chunk   = [];
  let currentSize = 13; // overhead for {"batch":[]} incl. property names & brackets

  events.forEach(event => {
    const eventSize = JSON.stringify(event).length + 1; // +1 for the comma between items
    if (currentSize + eventSize > sizeLimit) {
      chunks.push(chunk);
      chunk = [];
      currentSize = 13;
    }
    chunk.push(event);
    currentSize += eventSize;
  });

  if (chunk.length) chunks.push(chunk);
  return chunks;
}
