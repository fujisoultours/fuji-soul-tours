/**
 * Google Apps Script for Group Tour Waitlist
 *
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Go to https://script.google.com and create a new project
 * 2. Paste this entire code into Code.gs
 * 3. Update SPREADSHEET_ID with your Google Sheet ID
 * 4. Update SHEET_NAME if needed
 * 5. Deploy → New Deployment → Web App
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 6. Copy the deployment URL and update GROUP_WAITLIST_ENDPOINT in group-tour.html
 */

const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE'; // Replace with your Sheet ID
const SHEET_NAME = 'GroupTourWaitlist';
const FROM_EMAIL = 'fujisoultours@gmail.com';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = getOrCreateSheet();

    // Append row
    sheet.appendRow([
      new Date(),
      data.name,
      data.email,
      data.guests,
      data.week,
      'active'
    ]);

    // Send confirmation email
    sendConfirmationEmail(data);

    // Get counts per week
    const counts = getWeekCounts(sheet);

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, counts: counts }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const sheet = getOrCreateSheet();
    const counts = getWeekCounts(sheet);

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, counts: counts }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['Timestamp', 'Name', 'Email', 'Guests', 'Week', 'Status']);
    sheet.getRange('1:1').setFontWeight('bold');
  }
  return sheet;
}

function getWeekCounts(sheet) {
  const data = sheet.getDataRange().getValues();
  const counts = {};

  // Skip header row
  for (let i = 1; i < data.length; i++) {
    const week = data[i][4]; // Week column
    const guests = parseInt(data[i][3]) || 1; // Guests column
    const status = data[i][5]; // Status column

    if (status === 'active' && week) {
      counts[week] = (counts[week] || 0) + guests;
    }
  }

  return counts;
}

function sendConfirmationEmail(data) {
  const subject = 'You\'re on the Group Tour Waitlist! — Fuji Soul Tours';

  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
      <div style="text-align: center; padding: 24px 0; border-bottom: 2px solid #0077B6;">
        <h1 style="font-size: 20px; margin: 0; color: #0077B6;">Fuji Soul Tours</h1>
        <p style="font-size: 13px; color: #6B6B6B; margin: 4px 0 0;">Small Group Tour Waitlist</p>
      </div>

      <div style="padding: 28px 0;">
        <p style="font-size: 16px;">Hi ${data.name},</p>

        <p style="font-size: 15px; line-height: 1.7;">
          Thank you for joining the waitlist for our <strong>Small Group Mt. Fuji Tour</strong>!
          You're signed up for: <strong>${data.week}</strong> with <strong>${data.guests}</strong> guest(s).
        </p>

        <div style="background: #EEF4F8; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <h2 style="font-size: 15px; margin: 0 0 12px; color: #0077B6;">What happens next?</h2>
          <ul style="font-size: 14px; line-height: 1.8; padding-left: 20px; margin: 0;">
            <li>Once <strong>15 travelers</strong> sign up for your preferred week, the tour is confirmed.</li>
            <li>We will set a <strong>fixed date, fixed time, and fixed itinerary</strong> within that week.</li>
            <li>You'll receive an email with all the details as soon as it's confirmed.</li>
            <li>You only pay once the tour is confirmed — no risk to you.</li>
          </ul>
        </div>

        <p style="font-size: 14px; line-height: 1.7; color: #6B6B6B;">
          We'll keep updating itinerary details, pricing, and other information on our website.
          Check back at <a href="https://www.fujisoultours.com/group-tour" style="color: #0077B6;">fujisoultours.com/group-tour</a> for the latest updates.
        </p>

        <p style="font-size: 15px; margin-top: 24px;">
          See you at Mt. Fuji!<br>
          <strong>Takumu</strong> — Your Guide
        </p>
      </div>

      <div style="border-top: 1px solid #DEE8EE; padding: 16px 0; text-align: center;">
        <p style="font-size: 12px; color: #6B6B6B; margin: 0;">
          Fuji Soul Tours ·
          <a href="mailto:fujisoultours@gmail.com" style="color: #6B6B6B;">fujisoultours@gmail.com</a> ·
          <a href="https://www.instagram.com/fujisoultours/" style="color: #6B6B6B;">Instagram</a>
        </p>
      </div>
    </div>
  `;

  GmailApp.sendEmail(data.email, subject, '', {
    htmlBody: htmlBody,
    from: FROM_EMAIL,
    name: 'Fuji Soul Tours',
    bcc: FROM_EMAIL
  });
}
