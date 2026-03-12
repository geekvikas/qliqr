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
 *
 * IMPORTANT: After ANY code change, you must create a NEW deployment version:
 *   Deploy > Manage deployments > Edit (pencil icon) > Version: New version > Deploy
 *   (Simply saving the script is NOT enough — you must update the deployment.)
 */

function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Waitlist');
  var lastRow = sheet.getLastRow();
  var count = lastRow > 1 ? lastRow - 1 : 0;

  var output = JSON.stringify({ count: count });
  return ContentService
    .createTextOutput(output)
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    if (data.action === 'waitlist') {
      return handleWaitlist(data);
    }

    if (data.action === 'survey') {
      return handleSurvey(data);
    }

    return makeResponse({ error: 'Unknown action' });

  } catch (err) {
    return makeResponse({ error: err.toString() });
  }
}

function handleWaitlist(data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Waitlist');
  var lastRow = sheet.getLastRow();

  // Deduplicate by email — only check if there are data rows
  if (lastRow > 1) {
    var emails = sheet.getRange(2, 3, lastRow - 1, 1).getValues();
    for (var i = 0; i < emails.length; i++) {
      if (emails[i][0] === data.email) {
        return makeResponse({ ok: true, duplicate: true, count: lastRow - 1 });
      }
    }
  }

  // Append row
  sheet.appendRow([
    data.timestamp || new Date().toISOString(),
    data.name || '',
    data.email || '',
    data.role || '',
    data.country || '',
    data.handle || '',
  ]);

  var newCount = sheet.getLastRow() - 1;
  return makeResponse({ ok: true, count: newCount });
}

function handleSurvey(data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Survey');

  sheet.appendRow([
    data.timestamp || new Date().toISOString(),
    data.q1_adLength || '',
    data.q2_minPrize || '',
    data.q3_gamesPerDay || '',
    data.q4_shareability || '',
    data.q5_features || '',
  ]);

  return makeResponse({ ok: true });
}

function makeResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
