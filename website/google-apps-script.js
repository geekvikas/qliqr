/**
 * qliqr Waitlist & Survey — Google Apps Script Backend
 *
 * SETUP:
 * 1. Create a new Google Sheet with two tabs: "Waitlist" and "Survey"
 * 2. In the Waitlist tab, add headers in row 1:
 *    timestamp | name | email | role | country | handle
 * 3. In the Survey tab, add headers in row 1:
 *    timestamp | q1_adLength | q2_minPrize | q3_gamesPerDay | q4_shareability | q5_features
 * 4. Go to Extensions > Apps Script
 * 5. Paste this entire file
 * 6. Click Deploy > New deployment > Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 7. Copy the deployment URL
 * 8. Set it in your website: window.QLIQR_API_URL = 'YOUR_URL_HERE'
 *    (or add a <script> tag before the main script in index.html)
 */

const SHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

function doGet(e) {
  const action = e.parameter.action;

  if (action === 'count') {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Waitlist');
    const count = Math.max(0, sheet.getLastRow() - 1); // minus header row
    return ContentService
      .createTextOutput(JSON.stringify({ count: count }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Default: return count
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Waitlist');
  const count = Math.max(0, sheet.getLastRow() - 1);
  return ContentService
    .createTextOutput(JSON.stringify({ count: count }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (data.action === 'waitlist') {
      return handleWaitlist(data);
    }

    if (data.action === 'survey') {
      return handleSurvey(data);
    }

    return jsonResponse({ error: 'Unknown action' }, 400);

  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

function handleWaitlist(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Waitlist');

  // Deduplicate by email
  const emails = sheet.getRange(2, 3, Math.max(1, sheet.getLastRow() - 1), 1).getValues();
  for (let i = 0; i < emails.length; i++) {
    if (emails[i][0] === data.email) {
      const count = Math.max(0, sheet.getLastRow() - 1);
      return jsonResponse({ ok: true, duplicate: true, count: count });
    }
  }

  // Append row
  sheet.appendRow([
    data.timestamp || new Date().toISOString(),
    data.name || '',
    data.email,
    data.role || '',
    data.country || '',
    data.handle || '',
  ]);

  const count = Math.max(0, sheet.getLastRow() - 1);
  return jsonResponse({ ok: true, count: count });
}

function handleSurvey(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Survey');

  sheet.appendRow([
    data.timestamp || new Date().toISOString(),
    data.q1_adLength || '',
    data.q2_minPrize || '',
    data.q3_gamesPerDay || '',
    data.q4_shareability || '',
    data.q5_features || '',
  ]);

  return jsonResponse({ ok: true });
}

function jsonResponse(obj, code) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
